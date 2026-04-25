import { Request, Response, NextFunction } from 'express';
import { EventModel } from '../models/Event';
import { Event } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

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
    
    const newEventDoc = await EventModel.create({
      hostAdminId: req.user!.id,
      ...validatedData,
    });

    res.status(201).json({ status: 'success', data: { event: newEventDoc.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await EventModel.find();
    res.status(200).json({ status: 'success', results: events.length, data: { events: events.map(e => e.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));
    res.status(200).json({ status: 'success', data: { event: event.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const getHostEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await EventModel.find({ hostAdminId: req.params.hostAdminId });
    res.status(200).json({ status: 'success', results: events.length, data: { events: events.map(e => e.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(req.params.id as string, req.body, { new: true });
    res.status(200).json({ status: 'success', data: { event: updatedEvent!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to delete this event', 403));
    }

    await EventModel.findByIdAndDelete(req.params.id as string);
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

    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(req.params.id as string, { status }, { new: true });
    res.status(200).json({ status: 'success', data: { event: updatedEvent!.toJSON() } });
  } catch (error) {
    next(error);
  }
};
