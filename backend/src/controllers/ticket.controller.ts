import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/JsonRepository';
import { TicketType, Event } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const ticketRepo = new JsonRepository<TicketType>('ticketTypes.json');
const eventRepo = new JsonRepository<Event>('events.json');

const ticketSchema = z.object({
  eventId: z.string(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  quantity: z.number().min(1),
  maxPerUser: z.number().min(1),
  isActive: z.boolean().default(true),
});

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = ticketSchema.parse(req.body);

    const event = await eventRepo.findById(validatedData.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to add tickets to this event', 403));
    }

    const newTicket: TicketType = {
      id: uuidv4(),
      soldCount: 0,
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ticketRepo.create(newTicket);

    res.status(201).json({ status: 'success', data: { ticket: newTicket } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await ticketRepo.findAll();
    res.status(200).json({ status: 'success', results: tickets.length, data: { tickets } });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await ticketRepo.findById(req.params.id as string);
    if (!ticket) return next(new AppError('Ticket not found', 404));
    res.status(200).json({ status: 'success', data: { ticket } });
  } catch (error) {
    next(error);
  }
};

export const getEventTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await ticketRepo.find((t) => t.eventId === req.params.eventId);
    res.status(200).json({ status: 'success', results: tickets.length, data: { tickets } });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await ticketRepo.findById(req.params.id as string);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    const event = await eventRepo.findById(ticket.eventId);
    if (event?.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this ticket', 403));
    }

    const updatedTicket = await ticketRepo.update((req.params.id as string), req.body);
    res.status(200).json({ status: 'success', data: { ticket: updatedTicket } });
  } catch (error) {
    next(error);
  }
};

export const deleteTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await ticketRepo.findById(req.params.id as string);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    const event = await eventRepo.findById(ticket.eventId);
    if (event?.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to delete this ticket', 403));
    }

    await ticketRepo.delete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
