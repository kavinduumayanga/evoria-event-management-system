import { Request, Response, NextFunction } from 'express';
import { VenueModel } from '../models/Venue';
import { Venue } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

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

    const newVenueDoc = await VenueModel.create(validatedData);

    res.status(201).json({ status: 'success', data: { venue: newVenueDoc.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await VenueModel.find();
    res.status(200).json({ status: 'success', results: venues.length, data: { venues: venues.map(v => v.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await VenueModel.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));
    res.status(200).json({ status: 'success', data: { venue: venue.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const updateVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await VenueModel.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));

    const updatedVenue = await VenueModel.findByIdAndUpdate(req.params.id as string, req.body, { new: true });
    res.status(200).json({ status: 'success', data: { venue: updatedVenue!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const deleteVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await VenueModel.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));

    await VenueModel.findByIdAndDelete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
