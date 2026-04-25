import { Request, Response, NextFunction } from 'express';
import { BookingModel } from '../models/Booking';
import { TicketTypeModel } from '../models/TicketType';
import { Booking, TicketType } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const bookingSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().min(1),
});

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bookingSchema.parse(req.body);

    const ticket = await TicketTypeModel.findById(validatedData.ticketTypeId);
    if (!ticket) return next(new AppError('Ticket not found', 404));
    
    if (ticket.eventId !== validatedData.eventId) {
       return next(new AppError('Ticket does not belong to this event', 400));
    }

    if (ticket.quantity < ticket.soldCount + validatedData.quantity) {
      return next(new AppError('Not enough tickets available', 400));
    }

    const totalAmount = ticket.price * validatedData.quantity;

    const newBookingDoc = await BookingModel.create({
      userId: req.user!.id,
      ...validatedData,
      totalAmount,
      bookingStatus: 'confirmed',
      bookingDate: new Date().toISOString(),
    });

    // Update ticket sold count
    await TicketTypeModel.findByIdAndUpdate(ticket._id, { soldCount: ticket.soldCount + validatedData.quantity });

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
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map(b => b.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getEventBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await BookingModel.find({ eventId: req.params.eventId });
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings: bookings.map(b => b.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingModel.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to cancel this booking', 403));
    }

    if (booking.bookingStatus === 'cancelled') {
      return next(new AppError('Booking is already cancelled', 400));
    }

    const updatedBooking = await BookingModel.findByIdAndUpdate(req.params.id as string, { bookingStatus: 'cancelled' }, { new: true });

    // Update ticket sold count (decrease)
    const ticket = await TicketTypeModel.findById(booking.ticketTypeId);
    if (ticket) {
      await TicketTypeModel.findByIdAndUpdate(ticket._id, { soldCount: Math.max(0, ticket.soldCount - booking.quantity) });
    }

    res.status(200).json({ status: 'success', data: { booking: updatedBooking!.toJSON() } });
  } catch (error) {
    next(error);
  }
};
