import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { VenueModel } from '../models/Venue';
import { AppError } from '../utils/appError';
import { ApprovalStatus, RsvpStatus } from '../types';
import { createNotificationRecord } from '../utils/notification.helper';
import { validateTicketAvailability } from '../utils/ticketPricing';
import {
  ensureNoActiveWaitlistEntry,
  getNextWaitlistPosition,
  isEventAtCapacityForQuantity,
} from '../utils/waitlist.helper';
import { canManageEvent } from '../utils/eventPermissions';

const registrationSchema = z.object({
  eventId: z.string().trim().min(1, 'eventId is required'),
  ticketTypeId: z.string().trim().min(1, 'ticketTypeId is required'),
  quantity: z.number().int().positive('quantity must be at least 1'),
  allowWaitlist: z.boolean().optional().default(true),
  rsvpStatus: z.enum(['going', 'not_going']).default('going'),
  customAnswers: z.array(z.object({
    questionId: z.string().trim().min(1, 'questionId is required'),
    answer: z.string().trim().min(1, 'answer is required'),
  })).default([]),
}).strict();

const rsvpSchema = z.object({
  rsvpStatus: z.enum(['going', 'not_going']),
}).strict();

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (!canManageEvent(userId, event)) {
    throw new AppError('Not authorized for this event registrations', 403);
  }

  return event;
};

const validateCustomAnswers = (
  eventCustomQuestions: Array<{ id: string; question: string; type: string; required?: boolean }>,
  customAnswers: Array<{ questionId: string; answer: string }>,
) => {
  const questionsById = new Map<string, { required?: boolean }>();
  for (const question of eventCustomQuestions) {
    questionsById.set(question.id, { required: question.required });
  }

  for (const answer of customAnswers) {
    if (!questionsById.has(answer.questionId)) {
      throw new AppError(`Invalid custom question answer: ${answer.questionId}`, 400);
    }
  }

  const requiredQuestions = eventCustomQuestions.filter((question) => question.required);
  for (const requiredQuestion of requiredQuestions) {
    const matchingAnswer = customAnswers.find((answer) => answer.questionId === requiredQuestion.id);
    if (!matchingAnswer || !matchingAnswer.answer.trim()) {
      throw new AppError(`Required question is missing an answer: ${requiredQuestion.question}`, 400);
    }
  }
};

const ensureRegistrationAccess = async (registrationId: string, userId: string) => {
  const registration = await BookingModel.findById(registrationId);
  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  if (registration.userId !== userId) {
    throw new AppError('Not authorized to update this registration', 403);
  }

  return registration;
};

export const createRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registrationSchema.parse(req.body);

    const event = await EventModel.findById(validatedData.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.moderationStatus && event.moderationStatus !== 'approved') {
      return next(new AppError('This event is not approved for registrations', 400));
    }

    if (event.status !== 'published') {
      return next(new AppError('Cannot register for an event that is not published', 400));
    }

    if (event.visibility !== 'public') {
      return next(new AppError('Only public events are open for registrations', 403));
    }

    const ticket = await TicketTypeModel.findById(validatedData.ticketTypeId);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    if (ticket.eventId !== validatedData.eventId) {
      return next(new AppError('Ticket does not belong to this event', 400));
    }

    if (!ticket.isActive) {
      return next(new AppError('Ticket is not active', 400));
    }

    const eventQuestions = (event.customQuestions || []) as Array<{
      id: string;
      question: string;
      type: string;
      required?: boolean;
    }>;

    validateCustomAnswers(eventQuestions, validatedData.customAnswers);

    const existingRegistration = await BookingModel.findOne({
      userId: req.user!.id,
      eventId: validatedData.eventId,
      bookingStatus: { $ne: 'cancelled' },
    }).select('_id isWaitlisted');
    if (existingRegistration) {
      const message = existingRegistration.isWaitlisted
        ? 'You are already on this event waitlist'
        : 'You are already registered for this event';
      return next(new AppError(message, 409));
    }

    const eventAtCapacity = await isEventAtCapacityForQuantity(validatedData.eventId, validatedData.quantity);
    if (eventAtCapacity && !validatedData.allowWaitlist) {
      return next(new AppError('Sold Out / Capacity Full', 409));
    }

    if (!eventAtCapacity) {
      validateTicketAvailability(ticket as any, validatedData.quantity);
    } else {
      if (validatedData.quantity > ticket.quantity) {
        return next(new AppError('Requested quantity exceeds ticket capacity', 400));
      }
      await ensureNoActiveWaitlistEntry(req.user!.id, validatedData.eventId);
    }

    const totalAmount = ticket.price * validatedData.quantity;
    const approvalStatus: ApprovalStatus = event.requiresApproval ? 'pending' : 'approved';
    const rsvpStatus: RsvpStatus = validatedData.rsvpStatus;

    const waitlistPosition = eventAtCapacity
      ? await getNextWaitlistPosition(validatedData.eventId)
      : null;

    const newRegistrationDoc = await BookingModel.create({
      userId: req.user!.id,
      eventId: validatedData.eventId,
      ticketTypeId: validatedData.ticketTypeId,
      quantity: validatedData.quantity,
      totalAmount,
      bookingStatus: eventAtCapacity ? 'pending' : 'confirmed',
      bookingDate: new Date().toISOString(),
      isWaitlisted: eventAtCapacity,
      waitlistPosition,
      wasWaitlisted: eventAtCapacity,
      rsvpStatus,
      approvalStatus: eventAtCapacity ? 'pending' : approvalStatus,
      checkInStatus: 'not_checked_in',
      customAnswers: validatedData.customAnswers.map((answer) => ({
        questionId: answer.questionId.trim(),
        answer: answer.answer.trim(),
      })),
      registrationType: ticket.isFree ? 'free' : 'paid',
    });

    if (!eventAtCapacity) {
      await TicketTypeModel.findByIdAndUpdate(ticket._id, {
        soldCount: ticket.soldCount + validatedData.quantity,
      });
      await EventModel.findByIdAndUpdate(validatedData.eventId, {
        $inc: { bookingCount: validatedData.quantity },
      });
    } else {
      await createNotificationRecord({
        userId: req.user!.id,
        eventId: validatedData.eventId,
        title: 'Added to Waitlist',
        message: `Event full. You were added to waitlist at position ${waitlistPosition}.`,
        type: 'booking',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
      });
    }

    res.status(201).json({
      status: 'success',
      message: eventAtCapacity ? 'Event full - you have been added to the waitlist' : undefined,
      data: {
        registration: newRegistrationDoc.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const updateRegistrationRsvp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rsvpStatus } = rsvpSchema.parse(req.body);
    const registration = await ensureRegistrationAccess(req.params.id as string, req.user!.id);

    if (registration.approvalStatus === 'rejected') {
      return next(new AppError('Rejected registrations cannot update RSVP', 403));
    }

    if (registration.approvalStatus === 'pending' && rsvpStatus === 'going') {
      return next(new AppError('Registration is pending approval. RSVP as going is unavailable until approved.', 403));
    }

    const updatedRegistration = await BookingModel.findByIdAndUpdate(
      registration.id,
      { rsvpStatus },
      { new: true },
    );

    res.status(200).json({ status: 'success', data: { registration: updatedRegistration!.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const getMyRegistrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registrations = await BookingModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    const eventIds = Array.from(new Set(registrations.map((registration) => registration.eventId)));
    const events = await EventModel.find({ _id: { $in: eventIds } })
      .select('_id title date startTime endTime city type venueId');

    const venueIds = Array.from(new Set(
      events
        .map((event) => (typeof event.venueId === 'string' ? event.venueId : null))
        .filter((value): value is string => Boolean(value)),
    ));
    const venues = await VenueModel.find({ _id: { $in: venueIds } }).select('_id name city');

    const eventMap = new Map(events.map((event) => [event.id, event]));
    const venueMap = new Map(venues.map((venue) => [venue.id, venue]));

    const mappedRegistrations = registrations.map((registration) => {
      const event = eventMap.get(registration.eventId);
      const venue = event?.venueId ? venueMap.get(event.venueId) : null;
      const location = event?.type === 'online'
        ? 'Online'
        : venue
          ? `${venue.name}, ${venue.city}`
          : (event?.city || 'Venue');

      return {
        ...registration.toJSON(),
        event: event
          ? {
              id: event.id,
              title: event.title,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              location,
            }
          : null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: mappedRegistrations.length,
      data: { registrations: mappedRegistrations },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventRegistrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureCanManageEvent(req.params.eventId as string, req.user!.id);

    const registrations = await BookingModel.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: registrations.length,
      data: { registrations: registrations.map((registration) => registration.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

const updateApprovalStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
  approvalStatus: ApprovalStatus,
) => {
  try {
    const registration = await BookingModel.findById(req.params.id as string);
    if (!registration) return next(new AppError('Registration not found', 404));

    await ensureCanManageEvent(registration.eventId, req.user!.id);

    if (registration.approvalStatus === approvalStatus) {
      return next(new AppError(`Registration already ${approvalStatus}`, 400));
    }

    const updatePayload: Record<string, unknown> = { approvalStatus };
    if (approvalStatus === 'rejected') {
      updatePayload.rsvpStatus = 'not_going';
    }

    const updatedRegistration = await BookingModel.findByIdAndUpdate(registration.id, updatePayload, { new: true });

    res.status(200).json({ status: 'success', data: { registration: updatedRegistration!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const approveRegistration = async (req: Request, res: Response, next: NextFunction) => {
  return updateApprovalStatus(req, res, next, 'approved');
};

export const rejectRegistration = async (req: Request, res: Response, next: NextFunction) => {
  return updateApprovalStatus(req, res, next, 'rejected');
};
