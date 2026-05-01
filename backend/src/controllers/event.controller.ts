import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { SessionModel } from '../models/Session';
import { BookingModel } from '../models/Booking';
import { UserModel } from '../models/User';
import { VenueModel } from '../models/Venue';
import { AppError } from '../utils/appError';
import { EventCustomQuestion, EventStatus, EventType, EventVisibility } from '../types';
import { canManageEvent, isEventOwner, manageableEventQuery } from '../utils/eventPermissions';
import { getEventRegistrationQuestions } from '../utils/eventRegistrationFields';

const EVENT_TYPES = ['online', 'physical', 'hybrid'] as const;
const EVENT_VISIBILITIES = ['public', 'private', 'unlisted'] as const;
const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;
const CUSTOM_QUESTION_TYPES = ['text', 'number', 'choice'] as const;

const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['published'],
  published: ['cancelled'],
  cancelled: [],
};

const customQuestionSchema = z.object({
  id: z.string().trim().min(1, 'Custom question id is required'),
  question: z.string().trim().min(1, 'Custom question text is required'),
  type: z.enum(CUSTOM_QUESTION_TYPES),
  required: z.boolean().optional(),
});

const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  date: z.string().trim().min(1, 'Date is required'),
  startTime: z.string().trim().min(1, 'Start time is required'),
  endTime: z.string().trim().min(1, 'End time is required'),
  category: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim()).optional().default([]),
  venueId: z.union([z.string().trim(), z.null()]).optional(),
  type: z.enum(EVENT_TYPES),
  visibility: z.enum(EVENT_VISIBILITIES).default('public'),
  meetingLink: z.union([
    z.string().trim().url('meetingLink must be a valid URL'),
    z.literal(''),
  ]).optional(),
  coverImage: z.string().trim().optional(),
  capacity: z.number().int().positive('Capacity must be greater than 0'),
  priorityAccessEnabled: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  customQuestions: z.array(customQuestionSchema).default([]),
}).strict();

const updateEventSchema = createEventSchema.partial().strict();

const statusUpdateSchema = z.object({
  status: z.enum(EVENT_STATUSES),
}).strict();

const visibilityUpdateSchema = z.object({
  visibility: z.enum(EVENT_VISIBILITIES),
}).strict();

const registrationFieldsUpdateSchema = z.object({
  customQuestions: z.array(customQuestionSchema).default([]),
}).strict();

const addEventAdminSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
}).strict();

interface EventInput {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
  city: string;
  tags: string[];
  venueId: string | null;
  type: EventType;
  visibility: EventVisibility;
  meetingLink?: string;
  coverImage?: string;
  capacity: number;
  priorityAccessEnabled: boolean;
  requiresApproval: boolean;
  customQuestions: EventCustomQuestion[];
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

const normalizeOptionalText = (value: string | undefined): string => {
  if (value === undefined) return '';
  return value.trim();
};

const normalizeTags = (tags: string[] | undefined): string[] => {
  if (!tags) return [];

  return Array.from(new Set(
    tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => tag.toLowerCase())
  ));
};

const normalizeMeetingLink = (meetingLink: string | undefined): string | undefined => {
  if (meetingLink === undefined) return undefined;
  const trimmed = meetingLink.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const slugify = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || 'event';
};

const generateUniquePublicSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0
      ? baseSlug
      : `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const existing = await EventModel.findOne({ publicSlug: candidate }).select('_id');
    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
};

const approvedModerationFilter = () => ({
  moderationStatus: { $ne: 'rejected' },
});

const isIsoLikeDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value.trim());
};

const resolveRequester = async (req: Request): Promise<{ id: string } | null> => {
  if (req.user) return req.user;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role?: string; tokenVersion?: number };
    const currentUser = await UserModel.findById(decoded.id).select('+isActive +isSuspended');
    if (!currentUser || !currentUser.isActive || currentUser.isSuspended) {
      throw new AppError('Unauthorized access. Please log in.', 401);
    }

    return { id: currentUser.id };
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

  const duplicateQuestionIds = new Set<string>();
  for (const customQuestion of eventInput.customQuestions) {
    const normalizedId = customQuestion.id.trim();
    if (duplicateQuestionIds.has(normalizedId)) {
      throw new AppError('Custom question ids must be unique', 400);
    }
    duplicateQuestionIds.add(normalizedId);
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
    category: normalizeOptionalText(validatedData.category),
    city: normalizeOptionalText(validatedData.city),
    tags: normalizeTags(validatedData.tags),
    venueId: normalizeVenueId(validatedData.venueId),
    type: validatedData.type,
    visibility: validatedData.visibility,
    meetingLink: normalizeMeetingLink(validatedData.meetingLink),
    coverImage: normalizeCoverImage(validatedData.coverImage),
    capacity: validatedData.capacity,
    priorityAccessEnabled: validatedData.priorityAccessEnabled,
    requiresApproval: validatedData.requiresApproval,
    customQuestions: validatedData.customQuestions.map((question) => ({
      id: question.id.trim(),
      question: question.question.trim(),
      type: question.type,
      required: question.required ?? false,
    })),
  };
};

const toMergedEventInputForUpdate = (event: any, updates: z.infer<typeof updateEventSchema>): EventInput => {
  return {
    title: updates.title !== undefined ? updates.title.trim() : event.title,
    description: updates.description !== undefined ? updates.description.trim() : event.description,
    date: updates.date !== undefined ? updates.date.trim() : event.date,
    startTime: updates.startTime !== undefined ? updates.startTime.trim() : event.startTime,
    endTime: updates.endTime !== undefined ? updates.endTime.trim() : event.endTime,
    category: updates.category !== undefined ? normalizeOptionalText(updates.category) : (event.category || ''),
    city: updates.city !== undefined ? normalizeOptionalText(updates.city) : (event.city || ''),
    tags: updates.tags !== undefined ? normalizeTags(updates.tags) : normalizeTags(event.tags || []),
    venueId: Object.prototype.hasOwnProperty.call(updates, 'venueId')
      ? normalizeVenueId(updates.venueId)
      : normalizeVenueId(event.venueId),
    type: updates.type !== undefined ? updates.type : event.type,
    visibility: updates.visibility !== undefined ? updates.visibility : event.visibility,
    meetingLink: Object.prototype.hasOwnProperty.call(updates, 'meetingLink')
      ? normalizeMeetingLink(updates.meetingLink)
      : normalizeMeetingLink(event.meetingLink),
    coverImage: Object.prototype.hasOwnProperty.call(updates, 'coverImage')
      ? normalizeCoverImage(updates.coverImage)
      : normalizeCoverImage(event.coverImage),
    capacity: updates.capacity !== undefined ? updates.capacity : event.capacity,
    priorityAccessEnabled: updates.priorityAccessEnabled !== undefined
      ? updates.priorityAccessEnabled
      : Boolean(event.priorityAccessEnabled),
    requiresApproval: updates.requiresApproval !== undefined ? updates.requiresApproval : Boolean(event.requiresApproval),
    customQuestions: updates.customQuestions !== undefined
      ? updates.customQuestions.map((question) => ({
          id: question.id.trim(),
          question: question.question.trim(),
          type: question.type,
          required: question.required ?? false,
        }))
      : getEventRegistrationQuestions(event),
  };
};

const toEventUpdatePayload = (updates: z.infer<typeof updateEventSchema>) => {
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.date !== undefined) payload.date = updates.date.trim();
  if (updates.startTime !== undefined) payload.startTime = updates.startTime.trim();
  if (updates.endTime !== undefined) payload.endTime = updates.endTime.trim();
  if (updates.category !== undefined) payload.category = normalizeOptionalText(updates.category);
  if (updates.city !== undefined) payload.city = normalizeOptionalText(updates.city);
  if (updates.tags !== undefined) payload.tags = normalizeTags(updates.tags);
  if (updates.capacity !== undefined) payload.capacity = updates.capacity;
  if (updates.priorityAccessEnabled !== undefined) payload.priorityAccessEnabled = updates.priorityAccessEnabled;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.visibility !== undefined) payload.visibility = updates.visibility;
  if (updates.requiresApproval !== undefined) payload.requiresApproval = updates.requiresApproval;

  if (Object.prototype.hasOwnProperty.call(updates, 'meetingLink')) {
    payload.meetingLink = normalizeMeetingLink(updates.meetingLink) || '';
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'venueId')) {
    payload.venueId = normalizeVenueId(updates.venueId);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'coverImage')) {
    payload.coverImage = normalizeCoverImage(updates.coverImage) || null;
  }

  if (updates.customQuestions !== undefined) {
    const normalizedQuestions = updates.customQuestions.map((question) => ({
      id: question.id.trim(),
      question: question.question.trim(),
      type: question.type,
      required: question.required ?? false,
    }));
    payload.customQuestions = normalizedQuestions;
    payload.registrationFields = { customQuestions: normalizedQuestions };
  }

  return payload;
};

const ensurePublishable = async (event: any) => {
  const ticketCount = await TicketTypeModel.countDocuments({ eventId: event.id });
  if (ticketCount < 1) {
    throw new AppError('Cannot publish event without at least one ticket', 400);
  }

  if (event.moderationStatus && event.moderationStatus !== 'approved') {
    throw new AppError('Event must be moderation-approved before publishing', 400);
  }

  await validateVenueRules(event.type as EventType, normalizeVenueId(event.venueId));
};

const ensureEventReadableByUser = (event: any, requester: { id: string } | null) => {
  if (requester && canManageEvent(requester.id, event)) return;

  if (event.moderationStatus && event.moderationStatus !== 'approved') {
    throw new AppError('Event is not available', 403);
  }

  if (event.status !== 'published') {
    throw new AppError('Event is not available', 403);
  }

  if (event.visibility !== 'public') {
    throw new AppError('Event is not public', 403);
  }
};

const resolveEventOwnerId = (event: any): string => {
  if (typeof event.ownerId === 'string' && event.ownerId.trim().length > 0) {
    return event.ownerId.trim();
  }

  if (typeof event.hostAdminId === 'string' && event.hostAdminId.trim().length > 0) {
    return event.hostAdminId.trim();
  }

  return '';
};

const parseTagsParam = (rawTags: string | string[] | undefined): string[] => {
  if (!rawTags) return [];

  if (Array.isArray(rawTags)) {
    return normalizeTags(rawTags);
  }

  const commaSplit = rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
  return normalizeTags(commaSplit);
};

const combineDateAndTime = (date: string, time: string): Date => {
  const datePart = date.trim().slice(0, 10);
  const minutes = parseTimeToMinutes(time);
  const baseDate = new Date(`${datePart}T00:00:00.000Z`);
  if (minutes === null || Number.isNaN(baseDate.getTime())) {
    return new Date();
  }

  baseDate.setUTCMinutes(minutes);
  return baseDate;
};

const toIcsDateTime = (value: Date): string => {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const escapeIcsText = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
};

const resolvePublicApiBaseUrl = (req: Request): string => {
  const envBase = (process.env.PUBLIC_API_BASE_URL || '').trim();
  if (envBase.length > 0) {
    return envBase.replace(/\/+$/, '');
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  if (!host) return '/api';

  return `${protocol}://${host}/api`;
};

const isInvitedUserForPrivateEvent = async (userId: string, eventId: string): Promise<boolean> => {
  const inviteExists = await BookingModel.exists({
    userId,
    eventId,
    bookingStatus: { $ne: 'cancelled' },
  });

  return Boolean(inviteExists);
};

const ensurePublicSlugAccess = async (event: any, requester: { id: string } | null) => {
  if (requester && canManageEvent(requester.id, event)) {
    return;
  }

  if (event.visibility === 'private') {
    if (!requester) {
      throw new AppError('This event is private', 403);
    }

    const invited = await isInvitedUserForPrivateEvent(requester.id, event.id);
    if (!invited) {
      throw new AppError('This event is private', 403);
    }

    return;
  }

  if (event.moderationStatus && event.moderationStatus !== 'approved') {
    throw new AppError('Event is not available', 403);
  }

  if (event.status !== 'published') {
    throw new AppError('Event is not available', 403);
  }
};

export const searchEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const tags = parseTagsParam(req.query.tags as string | string[] | undefined);

    const query: Record<string, any> = {
      status: 'published',
      visibility: 'public',
      ...approvedModerationFilter(),
    };

    if (q) {
      const regex = new RegExp(q, 'i');
      query.$or = [{ title: regex }, { description: regex }];
    }

    if (category) {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    if (city) {
      query.city = new RegExp(`^${city}$`, 'i');
    }

    if (tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (date) {
      query.date = { $regex: `^${date}` };
    }

    const events = await EventModel.find(query).sort({ isFeatured: -1, date: 1, startTime: 1 });
    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events: events.map((event) => event.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

export const getTrendingEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limitParam = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 10;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    const events = await EventModel.find({
      status: 'published',
      visibility: 'public',
      ...approvedModerationFilter(),
    })
      .sort({ isFeatured: -1, bookingCount: -1, viewsCount: -1, date: 1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events: events.map((event) => event.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

export const incrementEventView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    ensureEventReadableByUser(event, req.user || null);

    const updatedEvent = await EventModel.findByIdAndUpdate(
      event.id,
      { $inc: { viewsCount: 1 } },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: { event: updatedEvent!.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendedEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const tags = parseTagsParam(req.query.tags as string | string[] | undefined);
    const limitParam = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 8;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 30) : 8;

    let seedCategory = category;
    let seedCity = city;
    let seedTags = tags;

    if (eventId) {
      const seedEvent = await EventModel.findById(eventId);
      if (!seedEvent) return next(new AppError('Event not found', 404));
      ensureEventReadableByUser(seedEvent, req.user || null);

      if (!seedCategory) seedCategory = seedEvent.category || '';
      if (!seedCity) seedCity = seedEvent.city || '';
      if (seedTags.length === 0) seedTags = normalizeTags(seedEvent.tags || []);
    }

    const orConditions: Record<string, unknown>[] = [];
    if (seedCategory) orConditions.push({ category: new RegExp(`^${seedCategory}$`, 'i') });
    if (seedCity) orConditions.push({ city: new RegExp(`^${seedCity}$`, 'i') });
    if (seedTags.length > 0) orConditions.push({ tags: { $in: seedTags } });

    const query: Record<string, any> = {
      status: 'published',
      visibility: 'public',
      ...approvedModerationFilter(),
      ...(eventId ? { _id: { $ne: eventId } } : {}),
      ...(orConditions.length > 0 ? { $or: orConditions } : {}),
    };

    const events = await EventModel.find(query)
      .sort({ isFeatured: -1, bookingCount: -1, viewsCount: -1, date: 1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events: events.map((event) => event.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    const requester = await resolveRequester(req);
    ensureEventReadableByUser(event, requester);

    const startDate = combineDateAndTime(event.date, event.startTime);
    const endDate = combineDateAndTime(event.date, event.endTime);
    let location = event.type === 'online'
      ? (event.meetingLink || 'Online')
      : (event.city || 'Venue');

    if (event.type !== 'online' && event.venueId) {
      const venue = await VenueModel.findById(event.venueId);
      if (venue) {
        location = `${venue.name}, ${venue.city}`;
      }
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Evoria//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@evoria.local`,
      `DTSTAMP:${toIcsDateTime(new Date())}`,
      `DTSTART:${toIcsDateTime(startDate)}`,
      `DTEND:${toIcsDateTime(endDate)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      `LOCATION:${escapeIcsText(location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const shouldDownload = String(req.query.download || '').toLowerCase() === 'true';
    if (shouldDownload) {
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=\"event-${event.id}.ics\"`);
      return res.status(200).send(ics);
    }

    res.status(200).json({
      status: 'success',
      data: {
        title: event.title,
        description: event.description,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location,
        ics,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createEventSchema.parse(req.body);
    const eventInput = toEventInputForCreate(validatedData);
    const publicSlug = await generateUniquePublicSlug(eventInput.title);

    await validateEventData(eventInput);

    const newEventDoc = await EventModel.create({
      ownerId: req.user!.id,
      // Legacy mirror field for compatibility during migration.
      hostAdminId: req.user!.id,
      adminIds: [],
      publicSlug,
      registrationFields: {
        customQuestions: eventInput.customQuestions,
      },
      status: 'draft',
      moderationStatus: 'approved',
      isFlagged: false,
      isFeatured: false,
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

    const query = requester
      ? {
          $or: [
            { status: 'published', visibility: 'public', ...approvedModerationFilter() },
            { ownerId: requester.id },
            { hostAdminId: requester.id },
            { adminIds: requester.id },
          ],
        }
      : { status: 'published', visibility: 'public', ...approvedModerationFilter() };

    const events = await EventModel.find(query).sort({ isFeatured: -1, date: 1, startTime: 1 });
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
    ensureEventReadableByUser(event, requester);

    res.status(200).json({ status: 'success', data: { event: event.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const getPublicEventBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return next(new AppError('Event slug is required', 400));
    }

    const event = await EventModel.findOne({ publicSlug: slug });
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    const requester = await resolveRequester(req);
    await ensurePublicSlugAccess(event, requester);

    const ownerId = resolveEventOwnerId(event);
    const [host, sessions, tickets, venue] = await Promise.all([
      ownerId ? UserModel.findById(ownerId).select('_id name email phone profileImage') : null,
      SessionModel.find({ eventId: event.id }).sort({ sessionDate: 1, startTime: 1 }),
      TicketTypeModel.find({ eventId: event.id, isActive: true }).sort({ price: 1, createdAt: 1 }),
      event.venueId ? VenueModel.findById(event.venueId) : null,
    ]);

    const publicApiBase = resolvePublicApiBaseUrl(req);
    const publicUrl = `${publicApiBase}/public/events/${event.publicSlug}`;
    const isManageableByCurrentUser = requester ? canManageEvent(requester.id, event) : false;

    const ticketOptions = tickets.map((ticket) => {
      const remaining = Math.max(0, Number(ticket.quantity || 0) - Number(ticket.soldCount || 0));
      return {
        id: ticket.id,
        name: ticket.name,
        description: ticket.description || '',
        isFree: Boolean(ticket.isFree),
        price: Number(ticket.price || 0),
        currency: ticket.currency || 'LKR',
        remaining,
        quantity: Number(ticket.quantity || 0),
        soldCount: Number(ticket.soldCount || 0),
        maxPerUser: Number(ticket.maxPerUser || 0),
      };
    });

    const freeRegistrationOptions = ticketOptions.filter((ticket) => ticket.isFree);
    const registrationQuestions = getEventRegistrationQuestions(event);
    const locationLabel = event.type === 'online'
      ? (event.meetingLink || 'Online')
      : venue
        ? `${venue.name}, ${venue.city}`
        : (event.city || 'Venue');

    res.status(200).json({
      status: 'success',
      data: {
        event: {
          id: event.id,
          publicSlug: event.publicSlug,
          publicUrl,
          title: event.title,
          topic: event.category || '',
          image: event.coverImage || null,
          host: host
            ? {
                id: host.id,
                name: host.name,
                email: host.email,
                phone: host.phone || null,
                profileImage: host.profileImage || null,
              }
            : null,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          capacity: Number(event.capacity || 0),
          bookingCount: Number(event.bookingCount || 0),
          type: event.type,
          visibility: event.visibility,
          about: event.description,
          description: event.description,
          location: {
            label: locationLabel,
            city: event.city || '',
            venue: venue
              ? {
                  id: venue.id,
                  name: venue.name,
                  address: venue.address,
                  city: venue.city,
                  type: venue.type,
                  contactInfo: venue.contactInfo || '',
                }
              : null,
            meetingLink: event.meetingLink || '',
          },
          isManageableByCurrentUser,
        },
        agenda: {
          sessions: sessions.map((session) => ({
            id: session.id,
            title: session.title,
            description: session.description || '',
            speakerName: session.speakerName || '',
            sessionDate: session.sessionDate,
            startTime: session.startTime,
            endTime: session.endTime,
            hallOrRoom: session.hallOrRoom || '',
            bannerImage: session.bannerImage || '',
            status: session.status,
          })),
        },
        tickets: ticketOptions,
        freeRegistrationOptions,
        registrationFields: {
          defaultFields: [
            { key: 'name', label: 'Name', required: true },
            { key: 'email', label: 'Email', required: true },
            { key: 'mobile', label: 'Mobile', required: true },
            { key: 'nic', label: 'NIC', required: true },
          ],
          customQuestions: registrationQuestions,
        },
        visibilityInfo: {
          visibility: event.visibility,
          discoveryVisible: event.visibility === 'public',
          accessibleByUrl: event.visibility === 'public' || event.visibility === 'unlisted',
          privateAccess: event.visibility === 'private',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getHostEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Unauthorized access. Please log in.', 401));
    }

    if (req.user.id !== req.params.hostAdminId) {
      return next(new AppError('Not authorized to view this host events list', 403));
    }

    const events = await EventModel.find(manageableEventQuery(req.params.hostAdminId)).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: events.length, data: { events: events.map(e => e.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
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

    if (!isEventOwner(req.user!.id, event)) {
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

    if (!canManageEvent(req.user!.id, event)) {
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

export const updateEventVisibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visibility } = visibilityUpdateSchema.parse(req.body);

    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to update this event visibility', 403));
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      event.id,
      { visibility },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: updatedEvent!.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const updateEventRegistrationFields = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customQuestions } = registrationFieldsUpdateSchema.parse(req.body);

    const event = await EventModel.findById(req.params.eventId as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to update event registration fields', 403));
    }

    const normalizedQuestions = customQuestions.map((question) => ({
      id: question.id.trim(),
      question: question.question.trim(),
      type: question.type,
      required: question.required ?? false,
    }));

    const seenQuestionIds = new Set<string>();
    for (const question of normalizedQuestions) {
      if (seenQuestionIds.has(question.id)) {
        return next(new AppError('Custom question ids must be unique', 400));
      }
      seenQuestionIds.add(question.id);
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      event.id,
      {
        customQuestions: normalizedQuestions,
        registrationFields: { customQuestions: normalizedQuestions },
      },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: updatedEvent!.toJSON(),
        registrationFields: {
          customQuestions: normalizedQuestions,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const toggleEventFeatured = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      event.id,
      { isFeatured: !Boolean(event.isFeatured) },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: updatedEvent!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addEventAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (!isEventOwner(req.user!.id, event)) {
      return next(new AppError('Only the event owner can add event admins', 403));
    }

    const { email } = addEventAdminSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail }).select('_id email');
    if (!user) {
      return next(new AppError('User not found for the provided email', 404));
    }

    const ownerId = resolveEventOwnerId(event);
    if (user.id === ownerId) {
      return next(new AppError('Event owner is already a manager', 400));
    }

    const existingAdmins = Array.from(new Set((event.adminIds || []).map((id: string) => id.trim()).filter(Boolean)));
    if (existingAdmins.includes(user.id)) {
      return next(new AppError('User is already an event admin', 409));
    }

    const nextAdminIds = [...existingAdmins, user.id];

    const updatedEvent = await EventModel.findByIdAndUpdate(
      event.id,
      { adminIds: nextAdminIds },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: updatedEvent!.toJSON(),
        admin: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const removeEventAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await EventModel.findById(req.params.id as string);
    if (!event) return next(new AppError('Event not found', 404));

    if (!isEventOwner(req.user!.id, event)) {
      return next(new AppError('Only the event owner can remove event admins', 403));
    }

    const ownerId = resolveEventOwnerId(event);
    const userId = String(req.params.userId || '').trim();
    if (!userId) {
      return next(new AppError('userId is required', 400));
    }

    if (userId === ownerId) {
      return next(new AppError('Event owner cannot remove themselves', 400));
    }

    const existingAdmins = Array.from(new Set((event.adminIds || []).map((id: string) => id.trim()).filter(Boolean)));
    if (!existingAdmins.includes(userId)) {
      return next(new AppError('User is not an event admin', 404));
    }

    const nextAdminIds = existingAdmins.filter((id) => id !== userId);
    const updatedEvent = await EventModel.findByIdAndUpdate(
      event.id,
      { adminIds: nextAdminIds },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: updatedEvent!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
