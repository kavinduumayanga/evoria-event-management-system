import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RegistrationModel } from '../models/Registration';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';
import { canManageEvent } from '../utils/eventPermissions';
import { sendRegistrationStatusCommunications } from '../utils/registrationCommunication.helper';

const guestStatusValues = ['pending', 'going', 'checked_in', 'not_going', 'declined'] as const;
const bulkActionValues = ['going', 'not_going', 'declined', 'checkin'] as const;

const updateGuestStatusSchema = z.object({
  status: z.enum(guestStatusValues),
}).strict();

const bulkActionSchema = z.object({
  action: z.enum(bulkActionValues),
  ids: z.array(z.string().trim().min(1)).min(1, 'ids must contain at least one registration id'),
}).strict();

const statusTransitions: Record<string, string[]> = {
  pending: ['going', 'not_going', 'declined'],
  going: ['checked_in', 'not_going', 'declined'],
  not_going: ['going', 'declined'],
  declined: ['pending'],
  checked_in: [],
};

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (!canManageEvent(userId, event)) {
    throw new AppError('Not authorized to manage guests for this event', 403);
  }
  return event;
};

const ensureCanManageRegistration = async (registrationId: string, userId: string) => {
  const registration = await RegistrationModel.findById(registrationId);
  if (!registration) throw new AppError('Guest registration not found', 404);
  await ensureCanManageEvent(registration.eventId, userId);
  return registration;
};

const generateUniqueQrCodeValue = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await RegistrationModel.exists({ qrCodeValue: token });
    if (!exists) {
      return token;
    }
  }

  throw new AppError('Failed to generate a unique QR code token', 500);
};

const shouldHaveQr = (status: string) => status === 'going' || status === 'checked_in';

const escapeCsvValue = (value: string | number) => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildGuestQuery = (eventId: string, query: Request['query']) => {
  const mongoQuery: Record<string, any> = { eventId };

  const status = typeof query.status === 'string' ? query.status.trim() : '';
  if (status) {
    if (!(guestStatusValues as readonly string[]).includes(status)) {
      throw new AppError('Invalid status filter', 400);
    }
    mongoQuery.status = status;
  }

  const date = typeof query.date === 'string' ? query.date.trim() : '';
  if (date) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new AppError('Invalid date filter. Use YYYY-MM-DD format.', 400);
    }
    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    mongoQuery.registeredAt = { $gte: dayStart, $lt: nextDay };
  }

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search) {
    const regex = new RegExp(search, 'i');
    mongoQuery.$or = [
      { name: regex },
      { email: regex },
      { mobile: regex },
      { nic: regex },
    ];
  }

  return mongoQuery;
};

const toGuestRecord = (registration: any) => ({
  id: registration.id,
  registrationId: registration.id,
  eventId: registration.eventId,
  userId: registration.userId || null,
  name: registration.name,
  email: registration.email,
  mobile: registration.mobile,
  nic: registration.nic,
  status: registration.status,
  qrCodeValue: registration.qrCodeValue || null,
  checkedInAt: registration.checkedInAt || null,
  checkedInBy: registration.checkedInBy || null,
  checkInMethod: registration.checkInMethod || null,
  attendanceNote: registration.attendanceNote || null,
  registeredAt: registration.registeredAt,
  createdAt: registration.createdAt,
  updatedAt: registration.updatedAt,
});

export const getEventGuests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    await ensureCanManageEvent(eventId, req.user!.id);
    const registrations = await RegistrationModel.find(buildGuestQuery(eventId, req.query))
      .sort({ registeredAt: -1, createdAt: -1 });

    const guests = registrations.map((registration) => toGuestRecord(registration));
    res.status(200).json({
      status: 'success',
      results: guests.length,
      data: { guests },
    });
  } catch (error) {
    next(error);
  }
};

export const updateGuestStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = updateGuestStatusSchema.parse(req.body);
    const registrationId = String(req.params.registrationId || req.params.id || '').trim();
    if (!registrationId) return next(new AppError('registrationId is required', 400));

    const registration = await ensureCanManageRegistration(registrationId, req.user!.id);
    if (registration.status === status) {
      return next(new AppError(`Guest already ${status}`, 400));
    }

    if (!(statusTransitions[registration.status] || []).includes(status)) {
      return next(new AppError(`Invalid status transition from ${registration.status} to ${status}`, 400));
    }

    const updatePayload: Record<string, unknown> = { status };

    if (shouldHaveQr(status) && !registration.qrCodeValue) {
      updatePayload.qrCodeValue = await generateUniqueQrCodeValue();
    }

    if (!shouldHaveQr(status)) {
      updatePayload.qrCodeValue = null;
      updatePayload.checkedInAt = null;
      updatePayload.checkedInBy = null;
      updatePayload.checkInMethod = null;
      updatePayload.attendanceNote = null;
    }

    if (status === 'checked_in') {
      updatePayload.checkedInAt = new Date();
      updatePayload.checkedInBy = req.user!.id;
      updatePayload.checkInMethod = 'manual';
    }

    const updatedRegistration = await RegistrationModel.findByIdAndUpdate(
      registration.id,
      updatePayload,
      { new: true },
    );
    if (!updatedRegistration) return next(new AppError('Guest registration not found after update', 404));

    const event = await EventModel.findById(registration.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    await sendRegistrationStatusCommunications(
      req,
      event,
      updatedRegistration,
      status,
      req.user!.id,
    );

    res.status(200).json({
      status: 'success',
      data: { guest: toGuestRecord(updatedRegistration) },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const getGuestQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registrationId = String(req.params.registrationId || req.params.id || '').trim();
    if (!registrationId) return next(new AppError('registrationId is required', 400));

    const registration = await ensureCanManageRegistration(registrationId, req.user!.id);
    if (!shouldHaveQr(registration.status)) {
      return next(new AppError('QR is available only for going/checked-in guests', 400));
    }

    if (!registration.qrCodeValue) {
      registration.qrCodeValue = await generateUniqueQrCodeValue();
      await registration.save();
    }

    res.status(200).json({
      status: 'success',
      data: {
        registrationId: registration.id,
        qrCodeValue: registration.qrCodeValue,
        qrData: registration.qrCodeValue,
        guestStatus: registration.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markGuestCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registration = await ensureCanManageRegistration(String(req.params.id || '').trim(), req.user!.id);

    if (registration.status === 'declined' || registration.status === 'not_going') {
      return next(new AppError('Declined/Not-going guests cannot be checked in', 400));
    }

    if (registration.status === 'pending') {
      return next(new AppError('Guest must be marked going before check-in', 400));
    }

    if (registration.status === 'checked_in') {
      return next(new AppError('Guest is already checked in', 409));
    }

    if (!registration.qrCodeValue) {
      registration.qrCodeValue = await generateUniqueQrCodeValue();
    }
    registration.status = 'checked_in';
    registration.checkedInAt = new Date();
    registration.checkedInBy = req.user!.id;
    registration.checkInMethod = 'manual';
    await registration.save();

    res.status(200).json({ status: 'success', data: { guest: toGuestRecord(registration) } });
  } catch (error) {
    next(error);
  }
};

export const runBulkGuestAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, ids } = bulkActionSchema.parse(req.body);
    const registrations = await RegistrationModel.find({ _id: { $in: ids } });
    if (registrations.length !== ids.length) {
      return next(new AppError('One or more guest records not found', 404));
    }

    const eventIds = [...new Set(registrations.map((registration) => registration.eventId))];
    const events = await EventModel.find({ _id: { $in: eventIds } }).select('_id ownerId hostAdminId adminIds');
    const eventMap = new Map(events.map((event) => [event.id, event]));

    for (const registration of registrations) {
      const event = eventMap.get(registration.eventId);
      if (!event) return next(new AppError('Event not found for one or more records', 404));
      if (!canManageEvent(req.user!.id, event)) {
        return next(new AppError('Not authorized to manage one or more guest records', 403));
      }
    }

    let updated = 0;
    for (const registration of registrations) {
      if (action === 'checkin') {
        if (
          registration.status === 'declined'
          || registration.status === 'not_going'
          || registration.status === 'checked_in'
          || registration.status === 'pending'
        ) {
          continue;
        }

        if (!registration.qrCodeValue) {
          registration.qrCodeValue = await generateUniqueQrCodeValue();
        }
        registration.status = 'checked_in';
        registration.checkedInAt = new Date();
        registration.checkedInBy = req.user!.id;
        registration.checkInMethod = 'manual';
        await registration.save();
        updated += 1;
        continue;
      }

      if (!(statusTransitions[registration.status] || []).includes(action)) {
        continue;
      }

      registration.status = action;
      if (!shouldHaveQr(action)) {
        registration.qrCodeValue = null;
        registration.checkedInAt = null;
        registration.checkedInBy = null;
        registration.checkInMethod = null;
        registration.attendanceNote = null;
      } else if (!registration.qrCodeValue) {
        registration.qrCodeValue = await generateUniqueQrCodeValue();
      }

      await registration.save();
      updated += 1;
    }

    res.status(200).json({
      status: 'success',
      data: { action, requested: ids.length, updated },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const exportEventGuestsCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    await ensureCanManageEvent(eventId, req.user!.id);
    const registrations = await RegistrationModel.find(buildGuestQuery(eventId, req.query))
      .sort({ registeredAt: -1, createdAt: -1 });

    const header = ['name', 'email', 'mobile', 'nic', 'status', 'registered_at', 'checked_in_at'];
    const rows = registrations.map((registration) => [
      escapeCsvValue(registration.name),
      escapeCsvValue(registration.email),
      escapeCsvValue(registration.mobile),
      escapeCsvValue(registration.nic),
      escapeCsvValue(registration.status),
      escapeCsvValue(new Date(registration.registeredAt).toISOString()),
      escapeCsvValue(registration.checkedInAt ? new Date(registration.checkedInAt).toISOString() : ''),
    ].join(','));

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"guests-${eventId}.csv\"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// Backward-compatible alias.
export const updateGuestApprovalStatus = updateGuestStatus;
