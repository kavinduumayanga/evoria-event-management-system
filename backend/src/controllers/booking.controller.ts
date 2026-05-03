import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { TicketTypeModel } from '../models/TicketType';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';
import { canManageEvent, manageableEventQuery } from '../utils/eventPermissions';
import { createNotificationRecord } from '../utils/notification.helper';
import {
  calculateTicketPrice,
  validateTicketAvailability,
  validateUnlockCode,
} from '../utils/ticketPricing';
import {
  ensureNoActiveWaitlistEntry,
  getNextWaitlistPosition,
  isEventAtCapacityForQuantity,
  normalizeWaitlistPositions,
  promoteNextWaitlistedBooking,
} from '../utils/waitlist.helper';
import {
  getEventRegistrationQuestions,
  validateRegistrationAnswerAgainstQuestion,
} from '../utils/eventRegistrationFields';

const bookingSchema = z.object({
  eventId: z.string().trim().min(1, 'eventId is required'),
  ticketTypeId: z.string().trim().min(1, 'ticketTypeId is required').optional(),
  quantity: z.number().int().positive('quantity must be greater than 0').default(1),
  promoCode: z.string().trim().optional(),
  unlockCode: z.string().trim().optional(),
  allowWaitlist: z.boolean().optional().default(true),
  customAnswers: z.array(z.object({
    questionId: z.string().trim().min(1),
    answer: z.string().trim().min(1),
  })).optional(),
  rsvpStatus: z.enum(['going', 'not_going']).optional(),
}).strict();

const ensureBookableEvent = async (eventId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  if (event.moderationStatus && event.moderationStatus !== 'approved') {
    throw new AppError('This event is not approved for bookings', 400);
  }

  if (event.status !== 'published') {
    throw new AppError('Cannot book an event that is not published', 400);
  }

  if (event.visibility !== 'public') {
    throw new AppError('Only public events can be booked', 403);
  }

  return event;
};

const ensureTicketForEvent = async (ticketTypeId: string, eventId: string) => {
  const ticket = await TicketTypeModel.findById(ticketTypeId);
  if (!ticket) throw new AppError('Ticket not found', 404);

  if (ticket.eventId !== eventId) {
    throw new AppError('Ticket does not belong to this event', 400);
  }

  if (!ticket.isActive) {
    throw new AppError('Ticket is not active', 400);
  }

  return ticket;
};

const normalizePricingMode = (value: unknown): 'free' | 'ticketed' => {
  return value === 'free' ? 'free' : 'ticketed';
};

const ensureFreeRegistrationTicket = async (event: any) => {
  const freeTicket = await TicketTypeModel.findOne({
    eventId: event.id,
    isActive: true,
    isFree: true,
  }).sort({ createdAt: 1, soldCount: 1 });

  if (freeTicket) {
    const desiredQuantity = Math.max(freeTicket.quantity, Number(event.capacity || 1), freeTicket.soldCount || 0, 1);
    if (desiredQuantity !== freeTicket.quantity) {
      freeTicket.quantity = desiredQuantity;
      await freeTicket.save();
    }
    return freeTicket;
  }

  return TicketTypeModel.create({
    eventId: event.id,
    name: 'Free Registration',
    description: 'Auto-generated free registration ticket',
    price: 0,
    currency: 'LKR',
    isFree: true,
    quantity: Math.max(1, Number(event.capacity || 1)),
    soldCount: 0,
    maxPerUser: 1,
    isActive: true,
    promoCodes: [],
  });
};

const validateMaxPerUser = async (userId: string, ticketTypeId: string, maxPerUser: number, requestedQuantity: number) => {
  const existingBookings = await BookingModel.find({
    userId,
    ticketTypeId,
    bookingStatus: { $ne: 'cancelled' },
  });

  const alreadyBookedQuantity = existingBookings.reduce((sum, booking) => sum + booking.quantity, 0);
  if (alreadyBookedQuantity + requestedQuantity > maxPerUser) {
    throw new AppError(`This ticket allows maximum ${maxPerUser} per user`, 400);
  }
};

const generateUniqueQrCodeValue = async () => {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await BookingModel.exists({ qrCodeValue: token });
    if (!exists) return token;
  }

  throw new AppError('Failed to generate a unique QR code token', 500);
};

const adjustEventBookingCount = async (eventId: string, delta: number) => {
  const event = await EventModel.findById(eventId);
  if (!event) return;

  const current = typeof event.bookingCount === 'number' ? event.bookingCount : 0;
  const nextCount = Math.max(0, current + delta);
  await EventModel.findByIdAndUpdate(eventId, { bookingCount: nextCount });
};

const createConfirmedBooking = async (
  userId: string,
  eventId: string,
  approvalStatus: 'pending' | 'approved',
  ticket: any,
  quantity: number,
  totalAmount: number,
  customAnswers: Array<{ questionId: string; answer: string }>,
  rsvpStatus: 'going' | 'not_going',
) => {
  const bookingDate = new Date().toISOString();
  const qrCodeValue = approvalStatus === 'approved'
    ? await generateUniqueQrCodeValue()
    : null;

  const newBookingDoc = await BookingModel.create({
    userId,
    eventId,
    ticketTypeId: ticket.id,
    quantity,
    totalAmount,
    bookingStatus: 'confirmed',
    bookingDate,
    isWaitlisted: false,
    waitlistPosition: null,
    wasWaitlisted: false,
    rsvpStatus,
    approvalStatus,
    checkInStatus: 'not_checked_in',
    checkedInAt: null,
    checkedInBy: null,
    checkInMethod: null,
    qrCodeValue: qrCodeValue || null,
    attendanceNote: undefined,
    customAnswers,
    registrationType: ticket.isFree ? 'free' : 'paid',
  });

  await TicketTypeModel.findByIdAndUpdate(ticket.id, {
    soldCount: ticket.soldCount + quantity,
  });
  await adjustEventBookingCount(eventId, quantity);

  return newBookingDoc;
};

const createWaitlistBooking = async (
  userId: string,
  eventId: string,
  ticket: any,
  quantity: number,
  totalAmount: number,
  customAnswers: Array<{ questionId: string; answer: string }>,
  rsvpStatus: 'going' | 'not_going',
) => {
  await ensureNoActiveWaitlistEntry(userId, eventId);
  const waitlistPosition = await getNextWaitlistPosition(eventId);

  const bookingDate = new Date().toISOString();
  const waitlistBooking = await BookingModel.create({
    userId,
    eventId,
    ticketTypeId: ticket.id,
    quantity,
    totalAmount,
    bookingStatus: 'pending',
    bookingDate,
    isWaitlisted: true,
    waitlistPosition,
    wasWaitlisted: true,
    rsvpStatus,
    approvalStatus: 'pending',
    checkInStatus: 'not_checked_in',
    checkedInAt: null,
    checkedInBy: null,
    checkInMethod: null,
    attendanceNote: undefined,
    customAnswers,
    registrationType: ticket.isFree ? 'free' : 'paid',
  });

  return waitlistBooking;
};

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (!canManageEvent(userId, event)) {
    throw new AppError('Not authorized for this event', 403);
  }
  return event;
};

const handleZodError = (error: unknown, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
  }
  return next(error);
};

const validateCustomAnswers = (
  eventQuestions: Array<{ id: string; question: string; required: boolean; type: string; options: string[] }>,
  customAnswers: Array<{ questionId: string; answer: string }>,
) => {
  const questionsById = new Map(eventQuestions.map((question) => [question.id, question]));

  for (const answer of customAnswers) {
    const matchingQuestion = questionsById.get(answer.questionId);
    if (!matchingQuestion) {
      throw new AppError(`Invalid custom question answer: ${answer.questionId}`, 400);
    }

    if (!validateRegistrationAnswerAgainstQuestion(matchingQuestion, answer.answer)) {
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

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bookingSchema.parse(req.body);
    const event = await ensureBookableEvent(validatedData.eventId);
    const eventQuestions = getEventRegistrationQuestions(event).map((question) => ({
      id: question.id,
      question: question.question,
      required: question.required,
      type: question.type,
      options: question.options || [],
    }));

    validateCustomAnswers(eventQuestions, validatedData.customAnswers || []);

    const existingBooking = await BookingModel.findOne({
      userId: req.user!.id,
      eventId: validatedData.eventId,
      bookingStatus: { $ne: 'cancelled' },
    }).select('_id isWaitlisted');

    if (existingBooking) {
      const message = existingBooking.isWaitlisted
        ? 'You are already on this event waitlist'
        : 'You are already registered for this event';
      return next(new AppError(message, 409));
    }

    const pricingMode = normalizePricingMode(event.pricingMode);
    let ticket: any;

    if (pricingMode === 'free') {
      if (validatedData.promoCode || validatedData.unlockCode) {
        return next(new AppError('Promo code and unlock code are not applicable for free events', 400));
      }

      if (validatedData.ticketTypeId) {
        ticket = await ensureTicketForEvent(validatedData.ticketTypeId, validatedData.eventId);
        if (!ticket.isFree || ticket.price > 0) {
          return next(new AppError('Free events require a free registration ticket', 400));
        }
      } else {
        ticket = await ensureFreeRegistrationTicket(event);
      }
    } else {
      if (!validatedData.ticketTypeId) {
        return next(new AppError('ticketTypeId is required for ticketed events', 400));
      }
      ticket = await ensureTicketForEvent(validatedData.ticketTypeId, validatedData.eventId);
    }

    validateUnlockCode(ticket as any, validatedData.unlockCode);
    await validateMaxPerUser(req.user!.id, ticket.id, ticket.maxPerUser, validatedData.quantity);

    const eventAtCapacity = await isEventAtCapacityForQuantity(validatedData.eventId, validatedData.quantity);
    if (eventAtCapacity && !validatedData.allowWaitlist) {
      return next(new AppError('Sold Out / Capacity Full', 409));
    }

    if (!eventAtCapacity) {
      validateTicketAvailability(ticket as any, validatedData.quantity);
    } else {
      if (ticket.quantity <= 0) {
        return next(new AppError('Ticket is not available for waitlist', 400));
      }

      if (validatedData.quantity > ticket.quantity) {
        return next(new AppError('Requested quantity exceeds ticket capacity', 400));
      }
    }

    const pricing = calculateTicketPrice(
      ticket as any,
      validatedData.quantity,
      pricingMode === 'free' ? undefined : validatedData.promoCode,
    );

    if (eventAtCapacity) {
      const waitlistBooking = await createWaitlistBooking(
        req.user!.id,
        validatedData.eventId,
        ticket,
        validatedData.quantity,
        pricing.finalAmount,
        validatedData.customAnswers || [],
        validatedData.rsvpStatus || 'going',
      );

      await createNotificationRecord({
        userId: req.user!.id,
        eventId: validatedData.eventId,
        title: 'Added to Waitlist',
        message: `Event full. You were added to waitlist at position ${waitlistBooking.waitlistPosition}.`,
        type: 'booking',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
      });

      return res.status(201).json({
        status: 'success',
        message: 'Event full - you have been added to the waitlist',
        data: {
          booking: waitlistBooking.toJSON(),
          waitlist: {
            isWaitlisted: true,
            waitlistPosition: waitlistBooking.waitlistPosition,
          },
        },
      });
    }

    // Free-event registrations stay pending host approval; ticketed bookings are auto-approved after successful checkout.
    const approvalStatusForConfirmedBooking: 'pending' | 'approved' = pricingMode === 'free' ? 'pending' : 'approved';
    const newBookingDoc = await createConfirmedBooking(
      req.user!.id,
      validatedData.eventId,
      approvalStatusForConfirmedBooking,
      ticket,
      validatedData.quantity,
      pricing.finalAmount,
      validatedData.customAnswers || [],
      validatedData.rsvpStatus || 'going',
    );

    await createNotificationRecord({
      userId: req.user!.id,
      eventId: validatedData.eventId,
      title: 'Booking Confirmed',
      message: `Your booking ${newBookingDoc.id} is confirmed.`,
      type: 'booking',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
    });

    res.status(201).json({
      status: 'success',
      data: {
        booking: newBookingDoc.toJSON(),
        payment: {
          success: true,
          message: ticket.isFree ? 'Free ticket booked successfully' : 'Mock payment successful',
          originalAmount: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          totalAmount: pricing.finalAmount,
          currency: pricing.currency,
          promoCode: pricing.appliedPromoCode,
        },
      },
    });
  } catch (error) {
    handleZodError(error, next);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const manageableEvents = await EventModel.find(manageableEventQuery(req.user!.id)).select('_id');
    const manageableEventIds = manageableEvents.map((event) => event.id);

    if (!manageableEventIds.length) {
      return res.status(200).json({ status: 'success', results: 0, data: { bookings: [] } });
    }

    const bookings = await BookingModel.find({ eventId: { $in: manageableEventIds } });
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map((booking) => booking.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingModel.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id) {
      const event = await EventModel.findById(booking.eventId);
      if (!event || !canManageEvent(req.user!.id, event)) {
        return next(new AppError('Not authorized to view this booking', 403));
      }
    }

    res.status(200).json({ status: 'success', data: { booking: booking.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await BookingModel.find({ userId: req.user!.id });
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map((booking) => booking.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getEventBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    await ensureCanManageEvent(eventId, req.user!.id);
    const bookings = await BookingModel.find({ eventId });
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map((booking) => booking.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

const cancelAndRestoreInventory = async (bookingId: string, actedBy?: string) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  if (booking.bookingStatus === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }

  const wasWaitlisted = Boolean(booking.isWaitlisted);
  const wasConfirmed = booking.bookingStatus === 'confirmed' && !wasWaitlisted;

  const updatedBooking = await BookingModel.findByIdAndUpdate(
    booking.id,
    {
      bookingStatus: 'cancelled',
      isWaitlisted: false,
      waitlistPosition: null,
      checkInStatus: 'not_checked_in',
      checkedInAt: null,
      checkedInBy: null,
      checkInMethod: null,
    },
    { new: true }
  );

  if (wasWaitlisted) {
    await normalizeWaitlistPositions(booking.eventId);
    return { booking, updatedBooking, promotedBooking: null };
  }

  if (wasConfirmed) {
    const ticket = await TicketTypeModel.findById(booking.ticketTypeId);
    if (ticket) {
      await TicketTypeModel.findByIdAndUpdate(ticket.id, {
        soldCount: Math.max(0, ticket.soldCount - booking.quantity),
      });
    }

    await adjustEventBookingCount(booking.eventId, -booking.quantity);
  }

  const promotedBooking = await promoteNextWaitlistedBooking(booking.eventId, actedBy);

  return { booking, updatedBooking, promotedBooking };
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingModel.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id) {
      const event = await EventModel.findById(booking.eventId);
      if (!event || !canManageEvent(req.user!.id, event)) {
        return next(new AppError('Not authorized to cancel this booking', 403));
      }
    }

    const { updatedBooking, promotedBooking } = await cancelAndRestoreInventory(booking.id, req.user!.id);

    await createNotificationRecord({
      userId: booking.userId,
      eventId: booking.eventId,
      title: 'Booking Cancelled',
      message: `Your booking ${booking.id} has been cancelled.`,
      type: 'booking',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      data: {
        booking: updatedBooking!.toJSON(),
        promotedBooking: promotedBooking ? promotedBooking.toJSON() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refundBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingBooking = await BookingModel.findById(req.params.id as string);
    if (!existingBooking) return next(new AppError('Booking not found', 404));

    await ensureCanManageEvent(existingBooking.eventId, req.user!.id);

    const { booking, updatedBooking, promotedBooking } = await cancelAndRestoreInventory(req.params.id as string, req.user?.id);

    await createNotificationRecord({
      userId: booking.userId,
      eventId: booking.eventId,
      title: 'Booking Refunded',
      message: `Your booking ${booking.id} has been refunded and cancelled.`,
      type: 'booking',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
    });

    res.status(200).json({
      status: 'success',
      message: 'Refund processed and booking cancelled successfully',
      data: {
        booking: updatedBooking!.toJSON(),
        promotedBooking: promotedBooking ? promotedBooking.toJSON() : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
