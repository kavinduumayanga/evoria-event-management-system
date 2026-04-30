import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { UserModel } from '../models/User';
import { VenueModel } from '../models/Venue';
import { AppError } from '../utils/appError';
import { EventStatus, EventType, EventVisibility, Role } from '../types';

const EVENT_TYPES = ['online', 'physical', 'hybrid'] as const;
const EVENT_VISIBILITIES = ['public', 'private', 'unlisted'] as const;
const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;

const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['published'],
  published: ['cancelled'],
  cancelled: [],
};

const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  date: z.string().trim().min(1, 'Date is required'),
  startTime: z.string().trim().min(1, 'Start time is required'),
  endTime: z.string().trim().min(1, 'End time is required'),
  venueId: z.union([z.string().trim(), z.null()]).optional(),
  type: z.enum(EVENT_TYPES),
  visibility: z.enum(EVENT_VISIBILITIES).default('public'),
  coverImage: z.string().trim().optional(),
  capacity: z.number().int().positive('Capacity must be greater than 0'),
}).strict();

const updateEventSchema = createEventSchema.partial().strict();

const statusUpdateSchema = z.object({
  status: z.enum(EVENT_STATUSES),
}).strict();

interface EventInput {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string | null;
  type: EventType;
  visibility: EventVisibility;
  coverImage?: string;
  capacity: number;
}

const parseTimeToMinutes = (value: string): number | null => {
  const cleaned = value.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s?(AM|PM))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (minutes < 0 || minutes > 59) return null;

  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else if (hours !== 12) {
      hours += 12;
    }
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return (hours * 60) + minutes;
};

const normalizeVenueId = (venueId: string | null | undefined): string | null => {
  if (venueId === null || venueId === undefined) return null;
  const trimmed = venueId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCoverImage = (coverImage: string | undefined): string | undefined => {
  if (coverImage === undefined) return undefined;
  const trimmed = coverImage.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isIsoLikeDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value.trim());
};

const resolveRequester = async (req: Request): Promise<{ id: string; role: Role } | null> => {
  if (req.user) return req.user;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: Role };
    const currentUser = await UserModel.findById(decoded.id).select('+isActive');
    if (!currentUser || !currentUser.isActive) {
      throw new AppError('Unauthorized access. Please log in.', 401);
    }

    return {
      id: currentUser.id,
      role: currentUser.role as Role,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired token.', 401);
  }
};

const validateVenueRules = async (type: EventType, venueId: string | null) => {
  if (!EVENT_TYPES.includes(type)) {
    throw new AppError('Event type is invalid', 400);
  }

  if ((type === 'physical' || type === 'hybrid') && !venueId) {
    throw new AppError('Venue is required for physical and hybrid events', 400);
  }

  if (venueId) {
    const venue = await VenueModel.findById(venueId);
    if (!venue) {
      throw new AppError('Selected venue is invalid', 400);
    }
  }
};

const validateEventData = async (eventInput: EventInput) => {
  if (!isIsoLikeDate(eventInput.date)) {
    throw new AppError('Date must be a valid ISO date string', 400);
  }

  const eventDate = new Date(eventInput.date);
  if (Number.isNaN(eventDate.getTime())) {
    throw new AppError('Date must be a valid ISO date string', 400);
  }

  if (eventDate.getTime() <= Date.now()) {
    throw new AppError('Date must be in the future', 400);
  }

  const startMinutes = parseTimeToMinutes(eventInput.startTime);
  const endMinutes = parseTimeToMinutes(eventInput.endTime);

  if (startMinutes === null || endMinutes === null) {
    throw new AppError('startTime and endTime must be in HH:mm or hh:mm AM/PM format', 400);
  }

  if (endMinutes <= startMinutes) {
    throw new AppError('endTime must be greater than startTime', 400);
  }

  if (eventInput.capacity <= 0) {
    throw new AppError('Capacity must be greater than 0', 400);
  }

  await validateVenueRules(eventInput.type, eventInput.venueId);
};

const toEventInputForCreate = (validatedData: z.infer<typeof createEventSchema>): EventInput => {
  return {
    title: validatedData.title.trim(),
    description: validatedData.description.trim(),
    date: validatedData.date.trim(),
    startTime: validatedData.startTime.trim(),
    endTime: validatedData.endTime.trim(),
    venueId: normalizeVenueId(validatedData.venueId),
    type: validatedData.type,
    visibility: validatedData.visibility,
    coverImage: normalizeCoverImage(validatedData.coverImage),
    capacity: validatedData.capacity,
  };
};

const toMergedEventInputForUpdate = (event: any, updates: z.infer<typeof updateEventSchema>): EventInput => {
  return {
    title: updates.title !== undefined ? updates.title.trim() : event.title,
    description: updates.description !== undefined ? updates.description.trim() : event.description,
    date: updates.date !== undefined ? updates.date.trim() : event.date,
    startTime: updates.startTime !== undefined ? updates.startTime.trim() : event.startTime,
    endTime: updates.endTime !== undefined ? updates.endTime.trim() : event.endTime,
    venueId: Object.prototype.hasOwnProperty.call(updates, 'venueId')
      ? normalizeVenueId(updates.venueId)
      : normalizeVenueId(event.venueId),
    type: updates.type !== undefined ? updates.type : event.type,
    visibility: updates.visibility !== undefined ? updates.visibility : event.visibility,
    coverImage: Object.prototype.hasOwnProperty.call(updates, 'coverImage')
      ? normalizeCoverImage(updates.coverImage)
      : normalizeCoverImage(event.coverImage),
    capacity: updates.capacity !== undefined ? updates.capacity : event.capacity,
  };
};

const toEventUpdatePayload = (updates: z.infer<typeof updateEventSchema>) => {
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.date !== undefined) payload.date = updates.date.trim();
  if (updates.startTime !== undefined) payload.startTime = updates.startTime.trim();
  if (updates.endTime !== undefined) payload.endTime = updates.endTime.trim();
  if (updates.capacity !== undefined) payload.capacity = updates.capacity;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.visibility !== undefined) payload.visibility = updates.visibility;

  if (Object.prototype.hasOwnProperty.call(updates, 'venueId')) {
    payload.venueId = normalizeVenueId(updates.venueId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'coverImage')) {
    payload.coverImage = normalizeCoverImage(updates.coverImage) || null;
  }

  return payload;
};

const ensurePublishable = async (event: any) => {
  const ticketCount = await TicketTypeModel.countDocuments({ eventId: event.id });
  if (ticketCount < 1) {
    throw new AppError('Cannot publish event without at least one ticket', 400);
  }

  await validateVenueRules(event.type as EventType, normalizeVenueId(event.venueId));
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createEventSchema.parse(req.body);
    const eventInput = toEventInputForCreate(validatedData);

    await validateEventData(eventInput);

    const newEventDoc = await EventModel.create({
      hostAdminId: req.user!.id,
      status: 'draft',
      ...eventInput,
    });

    res.status(201).json({ status: 'success', data: { event: newEventDoc.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = await resolveRequester(req);

    const query = requester?.role === 'host_admin'
      ? { hostAdminId: requester.id }
      : { status: 'published', visibility: 'public' };

    const events = await EventModel.find(query).sort({ date: 1, startTime: 1 });
    res.status(200).json({ status: 'success', results: events.length, data: { events: events.map(e => e.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    const requester = await resolveRequester(req);
    const isOwner = requester?.role === 'host_admin' && requester.id === event.hostAdminId;

    if (!isOwner) {
      if (event.status !== 'published') {
        return next(new AppError('Event is not available', 403));
      }

      if (event.visibility === 'private') {
        return next(new AppError('Event is private', 403));
      }
    }

    res.status(200).json({ status: 'success', data: { event: event.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const getHostEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'host_admin') {
      return next(new AppError('Not authorized to view host events', 403));
    }

    if (req.user.id !== req.params.hostAdminId) {
      return next(new AppError('Not authorized to view this host events list', 403));
    }

    const events = await EventModel.find({ hostAdminId: req.params.hostAdminId }).sort({ createdAt: -1 });
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

    if (event.status === 'cancelled') {
      return next(new AppError('Cancelled events cannot be edited', 400));
    }

    const updates = updateEventSchema.parse(req.body);
    const updateKeys = Object.keys(updates);

    if (updateKeys.length === 0) {
      return res.status(200).json({ status: 'success', data: { event: event.toJSON() } });
    }

    const mergedEventInput = toMergedEventInputForUpdate(event, updates);
    await validateEventData(mergedEventInput);

    const updatedEvent = await EventModel.findByIdAndUpdate(
      req.params.id as string,
      toEventUpdatePayload(updates),
      { new: true },
    );

    res.status(200).json({ status: 'success', data: { event: updatedEvent!.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
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
    const { status } = statusUpdateSchema.parse(req.body);

    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (event.hostAdminId !== req.user!.id) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    if (event.status === 'cancelled') {
      return next(new AppError('Cancelled events cannot change status', 400));
    }

    const currentStatus = event.status as EventStatus;
    const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus];
    if (!allowedNextStatuses) {
      return next(new AppError('Current event status is invalid', 400));
    }

    if (!allowedNextStatuses.includes(status as EventStatus)) {
      return next(new AppError(`Invalid status transition from ${event.status} to ${status}`, 400));
    }

    if (status === 'published') {
      await ensurePublishable(event);
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      req.params.id as string,
      { status },
      { new: true },
    );

    res.status(200).json({ status: 'success', data: { event: updatedEvent!.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};
