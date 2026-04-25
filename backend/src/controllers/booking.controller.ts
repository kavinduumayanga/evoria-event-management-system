import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/JsonRepository';
import { Booking, TicketType } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const bookingRepo = new JsonRepository<Booking>('bookings.json');
const ticketRepo = new JsonRepository<TicketType>('ticketTypes.json');

const bookingSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().min(1),
});

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bookingSchema.parse(req.body);

    const ticket = await ticketRepo.findById(validatedData.ticketTypeId);
    if (!ticket) return next(new AppError('Ticket not found', 404));
    
    if (ticket.eventId !== validatedData.eventId) {
       return next(new AppError('Ticket does not belong to this event', 400));
    }

    if (ticket.quantity < ticket.soldCount + validatedData.quantity) {
      return next(new AppError('Not enough tickets available', 400));
    }

    const totalAmount = ticket.price * validatedData.quantity;

    const newBooking: Booking = {
      id: uuidv4(),
      userId: req.user!.id,
      ...validatedData,
      totalAmount,
      bookingStatus: 'confirmed',
      bookingDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await bookingRepo.create(newBooking);

    // Update ticket sold count
    await ticketRepo.update(ticket.id, { soldCount: ticket.soldCount + validatedData.quantity });

    res.status(201).json({ status: 'success', data: { booking: newBooking } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingRepo.findAll();
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await bookingRepo.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to view this booking', 403));
    }

    res.status(200).json({ status: 'success', data: { booking } });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingRepo.find((b) => b.userId === req.user!.id);
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
  } catch (error) {
    next(error);
  }
};

export const getEventBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingRepo.find((b) => b.eventId === req.params.eventId);
    res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await bookingRepo.findById(req.params.id as string);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to cancel this booking', 403));
    }

    if (booking.bookingStatus === 'cancelled') {
      return next(new AppError('Booking is already cancelled', 400));
    }

    const updatedBooking = await bookingRepo.update((req.params.id as string), { bookingStatus: 'cancelled' });

    // Update ticket sold count (decrease)
    const ticket = await ticketRepo.findById(booking.ticketTypeId);
    if (ticket) {
      await ticketRepo.update(ticket.id, { soldCount: Math.max(0, ticket.soldCount - booking.quantity) });
    }

    res.status(200).json({ status: 'success', data: { booking: updatedBooking } });
  } catch (error) {
    next(error);
  }
};
