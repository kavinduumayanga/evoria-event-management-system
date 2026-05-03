import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RegistrationModel } from '../models/Registration';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { canManageEvent } from '../utils/eventPermissions';
import {
  getEventRegistrationQuestions,
  validateRegistrationAnswerAgainstQuestion,
} from '../utils/eventRegistrationFields';
import {
  sendPendingRegistrationCommunications,
  sendRegistrationStatusCommunications,
} from '../utils/registrationCommunication.helper';

const registrationAnswerSchema = z.object({
  questionId: z.string().trim().min(1, 'questionId is required'),
  answer: z.string().trim().min(1, 'answer is required'),
}).strict();

const publicRegistrationSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  email: z.string().trim().email('Please provide a valid email address'),
  mobile: z.string().trim().min(1, 'mobile is required'),
  nic: z.string().trim().min(1, 'nic is required'),
  customAnswers: z.array(registrationAnswerSchema).default([]),
}).strict();

const registrationStatusSchema = z.object({
  status: z.enum(['pending', 'going', 'checked_in', 'not_going', 'declined']),
}).strict();

const statusTransitions: Record<string, string[]> = {
  pending: ['going', 'not_going', 'declined'],
  going: ['checked_in', 'not_going', 'declined'],
  not_going: ['going', 'declined'],
  declined: ['pending'],
  checked_in: [],
};

const canTransitionStatus = (currentStatus: string, nextStatus: string) => {
  return (statusTransitions[currentStatus] || []).includes(nextStatus);
};

const shouldHaveQr = (status: string) => status === 'going' || status === 'checked_in';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const generateUniqueQrCodeValue = async (): Promise<string> => {
  for (let i = 0; i < 10; i += 1) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await RegistrationModel.exists({ qrCodeValue: token });
    if (!exists) return token;
  }

  throw new AppError('Failed to generate a unique QR code token', 500);
};

const resolveOptionalRequester = async (req: Request): Promise<{ id: string } | null> => {
  if (req.user?.id) {
    return { id: req.user.id };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await UserModel.findById(decoded.id).select('+isActive +isSuspended');
    if (!user || !user.isActive || user.isSuspended) {
      throw new AppError('Unauthorized access. Please log in.', 401);
    }
    return { id: user.id };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired token.', 401);
  }
};

const ensurePublicEventCanRegister = (event: any) => {
  if (event.moderationStatus && event.moderationStatus !== 'approved') {
    throw new AppError('This event is not available for registration', 403);
  }

  if (event.status !== 'published') {
    throw new AppError('This event is not available for registration', 403);
  }

  if (event.visibility === 'private') {
    throw new AppError('This event is private', 403);
  }
};

const validateCustomAnswers = (
  eventQuestions: Array<{ id: string; question: string; required: boolean; type: string; options?: string[] }>,
  customAnswers: Array<{ questionId: string; answer: string }>,
) => {
  const questionMap = new Map(eventQuestions.map((question) => [question.id, question]));

  for (const answer of customAnswers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw new AppError(`Invalid custom question answer: ${answer.questionId}`, 400);
    }

    if (!validateRegistrationAnswerAgainstQuestion({
      type: question.type,
      options: question.options || [],
    }, answer.answer)) {
      throw new AppError(`Invalid answer for question: ${answer.questionId}`, 400);
    }
  }

  for (const question of eventQuestions) {
    if (!question.required) continue;
    const match = customAnswers.find((answer) => answer.questionId === question.id);
    if (!match || !match.answer.trim()) {
      throw new AppError(`Required question is missing an answer: ${question.question}`, 400);
    }
  }
};

export const createPublicEventRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return next(new AppError('Event slug is required', 400));

    const validatedData = publicRegistrationSchema.parse(req.body);
    const event = await EventModel.findOne({ publicSlug: slug });
    if (!event) return next(new AppError('Event not found', 404));

    ensurePublicEventCanRegister(event);

    const eventQuestions = getEventRegistrationQuestions(event).map((question) => ({
      id: question.id,
      question: question.question,
      type: question.type,
      options: question.options || [],
      required: question.required,
    }));

    validateCustomAnswers(eventQuestions, validatedData.customAnswers);

    const requester = await resolveOptionalRequester(req);
    const normalizedEmail = normalizeEmail(validatedData.email);
    const duplicateFilters: Array<Record<string, unknown>> = [
      { eventId: event.id, emailLower: normalizedEmail },
    ];

    if (requester?.id) {
      duplicateFilters.push({ eventId: event.id, userId: requester.id });
    }

    const existing = await RegistrationModel.findOne({ $or: duplicateFilters }).select('_id userId email');
    if (existing) {
      const duplicateMessage = requester?.id && String(existing.userId || '') === requester.id
        ? 'You are already registered for this event'
        : 'This email is already registered for this event';
      return next(new AppError(duplicateMessage, 409));
    }

    const registration = await RegistrationModel.create({
      eventId: event.id,
      userId: requester?.id || null,
      name: validatedData.name.trim(),
      email: validatedData.email.trim(),
      emailLower: normalizedEmail,
      mobile: validatedData.mobile.trim(),
      nic: validatedData.nic.trim(),
      customAnswers: validatedData.customAnswers.map((answer) => ({
        questionId: answer.questionId.trim(),
        answer: answer.answer.trim(),
      })),
      status: 'pending',
      qrCodeValue: null,
      registeredAt: new Date(),
    });

    await sendPendingRegistrationCommunications(req, event, registration);

    res.status(201).json({
      status: 'success',
      data: {
        registration: registration.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    if (error?.code === 11000) {
      return next(new AppError('A registration already exists for this event', 409));
    }
    next(error);
  }
};

export const getEventRegistrationsForManagers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const event = await EventModel.findById(eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized for this event registrations', 403));
    }

    const registrations = await RegistrationModel.find({ eventId }).sort({ registeredAt: -1, createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: registrations.length,
      data: {
        registrations: registrations.map((registration) => registration.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateRegistrationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = registrationStatusSchema.parse(req.body);
    const registrationId = String(req.params.id || '').trim();
    if (!registrationId) return next(new AppError('registration id is required', 400));

    const registration = await RegistrationModel.findById(registrationId);
    if (!registration) return next(new AppError('Registration not found', 404));

    const event = await EventModel.findById(registration.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to update this registration', 403));
    }

    if (registration.status === status) {
      return next(new AppError(`Registration already ${status}`, 400));
    }

    if (!canTransitionStatus(registration.status, status)) {
      return next(new AppError(`Invalid status transition from ${registration.status} to ${status}`, 400));
    }

    const updatePayload: Record<string, unknown> = { status };

    if (shouldHaveQr(status) && !registration.qrCodeValue) {
      updatePayload.qrCodeValue = await generateUniqueQrCodeValue();
    }

    if (status === 'checked_in') {
      updatePayload.checkedInAt = new Date();
      updatePayload.checkedInBy = req.user!.id;
      updatePayload.checkInMethod = 'manual';
    } else if (status === 'pending' || status === 'not_going' || status === 'declined') {
      updatePayload.checkedInAt = null;
      updatePayload.checkedInBy = null;
      updatePayload.checkInMethod = null;
      updatePayload.attendanceNote = null;
      updatePayload.qrCodeValue = null;
    }

    const updatedRegistration = await RegistrationModel.findByIdAndUpdate(
      registration.id,
      updatePayload,
      { new: true },
    );
    if (!updatedRegistration) return next(new AppError('Registration not found after update', 404));

    await sendRegistrationStatusCommunications(
      req,
      event,
      updatedRegistration,
      status,
      req.user!.id,
    );

    res.status(200).json({
      status: 'success',
      data: {
        registration: updatedRegistration.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};
