import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { TicketTypeModel } from '../models/TicketType';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';
import { createNotificationRecord } from '../utils/notification.helper';
import {
  calculateTicketPrice,
  validateTicketAvailability,
  validateUnlockCode,
} from '../utils/ticketPricing';

const bookingSchema = z.object({
  eventId: z.string().trim().min(1, 'eventId is required'),
  ticketTypeId: z.string().trim().min(1, 'ticketTypeId is required'),
  quantity: z.number().int().positive('quantity must be greater than 0'),
  promoCode: z.string().trim().optional(),
  unlockCode: z.string().trim().optional(),
  customAnswers: z.array(z.object({
    questionId: z.string().trim().min(1),
    answer: z.string().trim().min(1),
  })).optional(),
  rsvpStatus: z.enum(['going', 'not_going']).optional(),
}).strict();

const ensureBookableEvent = async (eventId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  if (event.status !== 'published') {
    throw new AppError('Cannot book an event that is not published', 400);
  }

  if (event.visibility === 'private') {
    throw new AppError('Private events cannot be booked', 403);
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
  const qrCodeValue = await generateUniqueQrCodeValue();

  const newBookingDoc = await BookingModel.create({
    userId,
    eventId,
    ticketTypeId: ticket.id,
    quantity,
    totalAmount,
    bookingStatus: 'confirmed',
    bookingDate,
    rsvpStatus,
    approvalStatus,
    checkInStatus: 'not_checked_in',
    checkedInAt: null,
    checkedInBy: null,
    checkInMethod: null,
    qrCodeValue,
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

const ensureHostOwnsEvent = async (eventId: string, hostAdminId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) {
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

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bookingSchema.parse(req.body);
    const event = await ensureBookableEvent(validatedData.eventId);
    const ticket = await ensureTicketForEvent(validatedData.ticketTypeId, validatedData.eventId);

    validateUnlockCode(ticket as any, validatedData.unlockCode);
    validateTicketAvailability(ticket as any, validatedData.quantity);
    await validateMaxPerUser(req.user!.id, ticket.id, ticket.maxPerUser, validatedData.quantity);

    const pricing = calculateTicketPrice(
      ticket as any,
      validatedData.quantity,
      validatedData.promoCode,
    );

    // Free tickets are immediately confirmed; paid tickets use mock payment simulation in-app.
    const newBookingDoc = await createConfirmedBooking(
      req.user!.id,
      validatedData.eventId,
      event.requiresApproval ? 'pending' : 'approved',
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
    const bookings = await BookingModel.find();
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
      if (req.user!.role !== 'host_admin') {
        return next(new AppError('Not authorized to view this booking', 403));
      }

      const event = await EventModel.findById(booking.eventId);
      if (!event || event.hostAdminId !== req.user!.id) {
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
    await ensureHostOwnsEvent(eventId, req.user!.id);
    const bookings = await BookingModel.find({ eventId });
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map((booking) => booking.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

const cancelAndRestoreInventory = async (bookingId: string) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  if (booking.bookingStatus === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }

  const updatedBooking = await BookingModel.findByIdAndUpdate(
    booking.id,
    {
      bookingStatus: 'cancelled',
      checkInStatus: 'not_checked_in',
      checkedInAt: null,
      checkedInBy: null,
      checkInMethod: null,
    },
    { new: true }
  );

  const ticket = await TicketTypeModel.findById(booking.ticketTypeId);
  if (ticket) {
    await TicketTypeModel.findByIdAndUpdate(ticket.id, {
      soldCount: Math.max(0, ticket.soldCount - booking.quantity),
    });
  }

  await adjustEventBookingCount(booking.eventId, -booking.quantity);

  return { booking, updatedBooking };
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingModel.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id) {
      if (req.user!.role !== 'host_admin') {
        return next(new AppError('Not authorized to cancel this booking', 403));
      }

      const event = await EventModel.findById(booking.eventId);
      if (!event || event.hostAdminId !== req.user!.id) {
        return next(new AppError('Not authorized to cancel this booking', 403));
      }
    }

    const { updatedBooking } = await cancelAndRestoreInventory(booking.id);

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

    res.status(200).json({ status: 'success', data: { booking: updatedBooking!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const refundBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { booking, updatedBooking } = await cancelAndRestoreInventory(req.params.id as string);

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
      data: { booking: updatedBooking!.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};
