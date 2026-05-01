import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { BookingModel } from '../models/Booking';
import { TicketTypeModel } from '../models/TicketType';
import { EventModel } from '../models/Event';
import { createNotificationRecord } from '../utils/notification.helper';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const bookingSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().min(1),
  customAnswers: z.array(z.object({
    questionId: z.string(),
    answer: z.string().min(1),
  })).optional(),
  rsvpStatus: z.enum(['going', 'not_going']).optional(),
});

const generateUniqueQrCodeValue = async () => {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await BookingModel.exists({ qrCodeValue: token });
    if (!exists) return token;
  }

  throw new AppError('Failed to generate a unique QR code token', 500);
};

const ensureHostOwnsEvent = async (eventId: string, hostAdminId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) {
    throw new AppError('Not authorized for this event', 403);
  }
  return event;
};

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bookingSchema.parse(req.body);

    const ticket = await TicketTypeModel.findById(validatedData.ticketTypeId);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    if (ticket.eventId !== validatedData.eventId) {
      return next(new AppError('Ticket does not belong to this event', 400));
    }

    const event = await EventModel.findById(validatedData.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.status !== 'published') {
      return next(new AppError('Booking is only allowed for published events', 400));
    }

    if (event.visibility === 'private' && req.user!.role === 'attendee' && event.hostAdminId !== req.user!.id) {
      return next(new AppError('Private events are not available for booking', 403));
    }

    if (ticket.quantity < ticket.soldCount + validatedData.quantity) {
      return next(new AppError('Not enough tickets available', 400));
    }

    const alreadyBookedCount = await BookingModel.aggregate<{ totalQuantity: number }>([
      {
        $match: {
          userId: req.user!.id,
          ticketTypeId: validatedData.ticketTypeId,
          bookingStatus: { $in: ['pending', 'confirmed'] },
        },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const existingQuantity = alreadyBookedCount[0]?.totalQuantity || 0;
    if (existingQuantity + validatedData.quantity > ticket.maxPerUser) {
      return next(new AppError(`You can only book up to ${ticket.maxPerUser} tickets for this type`, 400));
    }

    const totalAmount = ticket.price * validatedData.quantity;
    const bookingStatus: 'confirmed' = 'confirmed';
    const approvalStatus: 'approved' = 'approved';
    const qrCodeValue = await generateUniqueQrCodeValue();

    const newBookingDoc = await BookingModel.create({
      userId: req.user!.id,
      ...validatedData,
      totalAmount,
      bookingStatus,
      bookingDate: new Date().toISOString(),
      approvalStatus,
      checkInStatus: 'not_checked_in',
      registrationType: ticket.price <= 0 ? 'free' : 'paid',
      qrCodeValue,
      customAnswers: validatedData.customAnswers || [],
      rsvpStatus: validatedData.rsvpStatus || 'going',
    });

    // Update ticket sold count
    await TicketTypeModel.findByIdAndUpdate(ticket._id, { soldCount: ticket.soldCount + validatedData.quantity });

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

    res.status(201).json({ status: 'success', data: { booking: newBookingDoc.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await BookingModel.find();
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map(b => b.toJSON()) } });
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
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map(b => b.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getEventBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    await ensureHostOwnsEvent(eventId, req.user!.id);
    const bookings = await BookingModel.find({ eventId });
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map(b => b.toJSON()) } });
  } catch (error) {
    next(error);
  }
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

    if (booking.bookingStatus === 'cancelled') {
      return next(new AppError('Booking is already cancelled', 400));
    }

    const updatedBooking = await BookingModel.findByIdAndUpdate(
      req.params.id as string,
      {
        bookingStatus: 'cancelled',
        checkInStatus: 'not_checked_in',
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
      },
      { new: true }
    );

    // Update ticket sold count (decrease)
    const ticket = await TicketTypeModel.findById(booking.ticketTypeId);
    if (ticket) {
      await TicketTypeModel.findByIdAndUpdate(ticket._id, { soldCount: Math.max(0, ticket.soldCount - booking.quantity) });
    }

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
