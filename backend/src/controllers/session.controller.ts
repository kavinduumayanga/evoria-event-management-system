import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/JsonRepository';
import { Session, Event } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const sessionRepo = new JsonRepository<Session>('sessions.json');
const eventRepo = new JsonRepository<Event>('events.json');

const sessionSchema = z.object({
  eventId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  speakerName: z.string().optional(),
  sessionDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  hallOrRoom: z.string().optional(),
  bannerImage: z.string().optional(),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled'),
});

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = sessionSchema.parse(req.body);

    const event = await eventRepo.findById(validatedData.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to add sessions to this event', 403));
    }

    const newSession: Session = {
      id: uuidv4(),
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await sessionRepo.create(newSession);

    res.status(201).json({ status: 'success', data: { session: newSession } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await sessionRepo.findAll();
    res.status(200).json({ status: 'success', results: sessions.length, data: { sessions } });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionRepo.findById(req.params.id as string);
    if (!session) return next(new AppError('Session not found', 404));
    res.status(200).json({ status: 'success', data: { session } });
  } catch (error) {
    next(error);
  }
};

export const getEventSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await sessionRepo.find((s) => s.eventId === req.params.eventId);
    res.status(200).json({ status: 'success', results: sessions.length, data: { sessions } });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionRepo.findById(req.params.id as string);
    if (!session) return next(new AppError('Session not found', 404));

    const event = await eventRepo.findById(session.eventId);
    if (event?.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this session', 403));
    }

    const updatedSession = await sessionRepo.update((req.params.id as string), req.body);
    res.status(200).json({ status: 'success', data: { session: updatedSession } });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionRepo.findById(req.params.id as string);
    if (!session) return next(new AppError('Session not found', 404));

    const event = await eventRepo.findById(session.eventId);
    if (event?.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to delete this session', 403));
    }

    await sessionRepo.delete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
