import { Request, Response, NextFunction } from 'express';
import { VenueModel } from '../models/Venue';
import { Venue } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const venueSchema = z.object({
  name: z.string().trim().min(2, 'Venue name is required'),
  description: z.string().trim().optional().default(''),
  address: z.string().trim().min(1, 'Address is required'),
  city: z.string().trim().min(1, 'City is required'),
  capacity: z.number().int().positive('Capacity must be greater than 0').optional(),
  lat: z.number().finite().optional().nullable(),
  lng: z.number().finite().optional().nullable(),
  type: z.enum(['physical', 'online', 'hybrid']),
  contactInfo: z.string().trim().max(300).optional().default(''),
}).strict();

const venueUpdateSchema = venueSchema.partial().strict();

const ensureVenueOwnership = (venue: any, userId: string) => {
  const ownerId = typeof venue.ownerId === 'string' ? venue.ownerId.trim() : '';
  if (!ownerId || ownerId !== userId) {
    throw new AppError('Not authorized to manage this venue', 403);
  }
};

export const createVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = venueSchema.parse(req.body);
    const hasLat = typeof validatedData.lat === 'number';
    const hasLng = typeof validatedData.lng === 'number';
    if (hasLat !== hasLng) {
      return next(new AppError('Venue coordinates must include both latitude and longitude', 400));
    }

    const newVenueDoc = await VenueModel.create({
      ownerId: req.user!.id,
      ...validatedData,
      capacity: validatedData.capacity ?? 1,
    });

    res.status(201).json({ status: 'success', data: { venue: newVenueDoc.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) { const zodErr = error as z.ZodError<any>; return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400)); }
    next(error);
  }
};

export const getVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await VenueModel.find({ ownerId: req.user!.id }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: venues.length, data: { venues: venues.map(v => v.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getHostVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostId = String(req.params.hostId || '').trim();
    if (!hostId) {
      return next(new AppError('hostId is required', 400));
    }

    if (req.user!.id !== hostId) {
      return next(new AppError('Not authorized to view these venues', 403));
    }

    const venues = await VenueModel.find({ ownerId: hostId }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: venues.length, data: { venues: venues.map((v) => v.toJSON()) } });
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
    ensureVenueOwnership(venue, req.user!.id);

    const updates = venueUpdateSchema.parse(req.body);
    const hasLat = Object.prototype.hasOwnProperty.call(updates, 'lat');
    const hasLng = Object.prototype.hasOwnProperty.call(updates, 'lng');
    if (hasLat !== hasLng) {
      return next(new AppError('Venue coordinates must include both latitude and longitude', 400));
    }

    if (updates.capacity !== undefined && updates.capacity <= 0) {
      return next(new AppError('Capacity must be greater than 0', 400));
    }

    const updatedVenue = await VenueModel.findByIdAndUpdate(req.params.id as string, updates, { new: true });
    res.status(200).json({ status: 'success', data: { venue: updatedVenue!.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const deleteVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await VenueModel.findById(req.params.id as string);
    if (!venue) return next(new AppError('Venue not found', 404));
    ensureVenueOwnership(venue, req.user!.id);

    await VenueModel.findByIdAndDelete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
