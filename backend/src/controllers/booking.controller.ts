import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { TicketTypeModel } from '../models/TicketType';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';
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

const createConfirmedBooking = async (
  userId: string,
  eventId: string,
  approvalStatus: 'pending' | 'approved',
  ticket: any,
  quantity: number,
  totalAmount: number,
) => {
  const bookingDate = new Date().toISOString();

  const newBookingDoc = await BookingModel.create({
    userId,
    eventId,
    ticketTypeId: ticket.id,
    quantity,
    totalAmount,
    bookingStatus: 'confirmed',
    bookingDate,
    rsvpStatus: 'going',
    approvalStatus,
    checkInStatus: 'not_checked_in',
    customAnswers: [],
    registrationType: ticket.isFree ? 'free' : 'paid',
  });

  await TicketTypeModel.findByIdAndUpdate(ticket.id, {
    soldCount: ticket.soldCount + quantity,
  });

  return newBookingDoc;
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
    );

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

    if (booking.userId !== req.user!.id && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to view this booking', 403));
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
    const bookings = await BookingModel.find({ eventId: req.params.eventId });
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

  const updatedBooking = await BookingModel.findByIdAndUpdate(booking.id, { bookingStatus: 'cancelled' }, { new: true });
  const ticket = await TicketTypeModel.findById(booking.ticketTypeId);
  if (ticket) {
    await TicketTypeModel.findByIdAndUpdate(ticket.id, {
      soldCount: Math.max(0, ticket.soldCount - booking.quantity),
    });
  }

  return updatedBooking;
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingModel.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to cancel this booking', 403));
    }

    const updatedBooking = await cancelAndRestoreInventory(booking.id);
    res.status(200).json({ status: 'success', data: { booking: updatedBooking!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const refundBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedBooking = await cancelAndRestoreInventory(req.params.id as string);
    res.status(200).json({
      status: 'success',
      message: 'Refund processed and booking cancelled successfully',
      data: { booking: updatedBooking!.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};
