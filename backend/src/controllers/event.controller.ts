import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/JsonRepository';
import { Event } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const eventRepo = new JsonRepository<Event>('events.json');

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  venueId: z.string(),
  coverImage: z.string().optional(),
  capacity: z.number().min(1),
  status: z.enum(['draft', 'published', 'cancelled']).default('draft'),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = eventSchema.parse(req.body);
    
    const newEvent: Event = {
      id: uuidv4(),
      hostAdminId: req.user!.id,
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await eventRepo.create(newEvent);

    res.status(201).json({ status: 'success', data: { event: newEvent } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await eventRepo.findAll();
    res.status(200).json({ status: 'success', results: events.length, data: { events } });
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventRepo.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));
    res.status(200).json({ status: 'success', data: { event } });
  } catch (error) {
    next(error);
  }
};

export const getHostEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await eventRepo.find((e) => e.hostAdminId === req.params.hostAdminId);
    res.status(200).json({ status: 'success', results: events.length, data: { events } });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventRepo.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const updatedEvent = await eventRepo.update((req.params.id as string), req.body);
    res.status(200).json({ status: 'success', data: { event: updatedEvent } });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventRepo.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to delete this event', 403));
    }

    await eventRepo.delete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const updateEventStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['draft', 'published', 'cancelled'].includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    const event = await eventRepo.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const updatedEvent = await eventRepo.update((req.params.id as string), { status });
    res.status(200).json({ status: 'success', data: { event: updatedEvent } });
  } catch (error) {
    next(error);
  }
};
