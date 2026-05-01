import { Request, Response, NextFunction } from 'express';
import { SessionModel } from '../models/Session';
import { EventModel } from '../models/Event';
import { Session, Event } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { canManageEvent } from '../utils/eventPermissions';

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

    const event = await EventModel.findById(validatedData.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to add sessions to this event', 403));
    }

    const newSessionDoc = await SessionModel.create(validatedData);

    res.status(201).json({ status: 'success', data: { session: newSessionDoc.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await SessionModel.find();
    res.status(200).json({ status: 'success', results: sessions.length, data: { sessions: sessions.map(s => s.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await SessionModel.findById(req.params.id as string);
    if (!session) return next(new AppError('Session not found', 404));
    res.status(200).json({ status: 'success', data: { session: session.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const getEventSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await SessionModel.find({ eventId: req.params.eventId });
    res.status(200).json({ status: 'success', results: sessions.length, data: { sessions: sessions.map(s => s.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await SessionModel.findById(req.params.id as string);
    if (!session) return next(new AppError('Session not found', 404));

    const event = await EventModel.findById(session.eventId);
    if (!event || !canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to update this session', 403));
    }

    const updatedSession = await SessionModel.findByIdAndUpdate(req.params.id as string, req.body, { new: true });
    res.status(200).json({ status: 'success', data: { session: updatedSession!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await SessionModel.findById(req.params.id as string);
    if (!session) return next(new AppError('Session not found', 404));

    const event = await EventModel.findById(session.eventId);
    if (!event || !canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to delete this session', 403));
    }

    await SessionModel.findByIdAndDelete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
