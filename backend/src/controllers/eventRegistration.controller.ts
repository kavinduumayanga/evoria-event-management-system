import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RegistrationModel } from '../models/Registration';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { canManageEvent } from '../utils/eventPermissions';
import { createNotificationsForUsers } from '../utils/notification.helper';
import { getEventRegistrationQuestions } from '../utils/eventRegistrationFields';

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
  status: z.enum(['pending', 'going', 'not_going', 'declined', 'checked_in']),
}).strict();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const resolveOwnerId = (event: any): string => {
  const ownerId = typeof event?.ownerId === 'string' ? event.ownerId.trim() : '';
  if (ownerId) return ownerId;
  return typeof event?.hostAdminId === 'string' ? event.hostAdminId.trim() : '';
};

const resolveEventManagerIds = (event: any): string[] => {
  const ownerId = resolveOwnerId(event);
  const adminIds = Array.isArray(event?.adminIds) ? event.adminIds : [];
  return Array.from(new Set([ownerId, ...adminIds.map((id: string) => String(id || '').trim())].filter(Boolean)));
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
  eventQuestions: Array<{ id: string; question: string; required: boolean }>,
  customAnswers: Array<{ questionId: string; answer: string }>,
) => {
  const questionMap = new Map(eventQuestions.map((question) => [question.id, question]));

  for (const answer of customAnswers) {
    if (!questionMap.has(answer.questionId)) {
      throw new AppError(`Invalid custom question answer: ${answer.questionId}`, 400);
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
      required: question.required,
    }));

    validateCustomAnswers(eventQuestions, validatedData.customAnswers);

    const normalizedEmail = normalizeEmail(validatedData.email);
    const existing = await RegistrationModel.findOne({
      eventId: event.id,
      emailLower: normalizedEmail,
    }).select('_id');
    if (existing) {
      return next(new AppError('This email is already registered for this event', 409));
    }

    const requester = await resolveOptionalRequester(req);

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

    const managerIds = resolveEventManagerIds(event);
    if (managerIds.length > 0) {
      await createNotificationsForUsers(managerIds, {
        eventId: event.id,
        title: 'New Registration',
        message: `${registration.name} (${registration.email}) submitted a registration for ${event.title}.`,
        type: 'booking',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
      });
    }

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
      return next(new AppError('This email is already registered for this event', 409));
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

    const updatedRegistration = await RegistrationModel.findByIdAndUpdate(
      registration.id,
      { status },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        registration: updatedRegistration!.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};
