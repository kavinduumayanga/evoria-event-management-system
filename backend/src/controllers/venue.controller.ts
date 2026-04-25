import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/JsonRepository';
import { Venue } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const venueRepo = new JsonRepository<Venue>('venues.json');

const venueSchema = z.object({
  name: z.string().min(2),
  address: z.string(),
  city: z.string(),
  capacity: z.number().min(1),
  type: z.enum(['physical', 'online', 'hybrid']),
  contactInfo: z.string().optional(),
});

export const createVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = venueSchema.parse(req.body);

    const newVenue: Venue = {
      id: uuidv4(),
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await venueRepo.create(newVenue);

    res.status(201).json({ status: 'success', data: { venue: newVenue } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await venueRepo.findAll();
    res.status(200).json({ status: 'success', results: venues.length, data: { venues } });
  } catch (error) {
    next(error);
  }
};

export const getVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await venueRepo.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));
    res.status(200).json({ status: 'success', data: { venue } });
  } catch (error) {
    next(error);
  }
};

export const updateVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await venueRepo.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));

    const updatedVenue = await venueRepo.update((req.params.id as string), req.body);
    res.status(200).json({ status: 'success', data: { venue: updatedVenue } });
  } catch (error) {
    next(error);
  }
};

export const deleteVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await venueRepo.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));

    await venueRepo.delete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
