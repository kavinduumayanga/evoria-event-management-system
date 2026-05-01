import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';

const approvalStatusValues = ['pending', 'approved', 'rejected'] as const;
const bookingStatusValues = ['pending', 'confirmed', 'cancelled'] as const;
const checkInStatusValues = ['not_checked_in', 'checked_in'] as const;

const updateGuestStatusSchema = z.object({
  approvalStatus: z.enum(approvalStatusValues),
}).strict();

const bulkActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'checkin']),
  ids: z.array(z.string().trim().min(1)).min(1, 'ids must contain at least one registration id'),
}).strict();

interface GuestRecord {
  id: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  totalAmount: number;
  bookingStatus: string;
  approvalStatus: string;
  rsvpStatus: string;
  checkInStatus: string;
  createdAt: string;
  updatedAt: string;
  guestName: string;
  guestEmail: string;
  ticketName: string;
}

const ensureHostOwnsEvent = async (eventId: string, hostAdminId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) {
    throw new AppError('Not authorized to manage guests for this event', 403);
  }
  return event;
};

const escapeCsvValue = (value: string | number) => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const normalizeSearchRegex = (search: string) => new RegExp(search.trim(), 'i');

const buildGuestQuery = (eventId: string, query: Request['query']) => {
  const mongoQuery: Record<string, any> = { eventId };

  const status = typeof query.status === 'string' ? query.status.trim() : '';
  if (status) {
    if ((approvalStatusValues as readonly string[]).includes(status)) {
      mongoQuery.approvalStatus = status;
    } else if ((bookingStatusValues as readonly string[]).includes(status)) {
      mongoQuery.bookingStatus = status;
    } else if ((checkInStatusValues as readonly string[]).includes(status)) {
      mongoQuery.checkInStatus = status;
    } else {
      throw new AppError('Invalid status filter', 400);
    }
  }

  const date = typeof query.date === 'string' ? query.date.trim() : '';
  if (date) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new AppError('Invalid date filter. Use YYYY-MM-DD format.', 400);
    }
    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    mongoQuery.createdAt = { $gte: dayStart, $lt: nextDay };
  }

  return mongoQuery;
};

const resolveSearchUserIds = async (search: string) => {
  const normalizedSearch = search.trim();
  if (!normalizedSearch) return null;

  const regex = normalizeSearchRegex(normalizedSearch);
  const users = await UserModel.find({
    role: 'attendee',
    $or: [{ name: regex }, { email: regex }],
  }).select('_id');

  return users.map((user) => user.id);
};

const buildGuestRecords = async (
  eventId: string,
  query: Request['query'],
): Promise<GuestRecord[]> => {
  const mongoQuery = buildGuestQuery(eventId, query);

  const search = typeof query.search === 'string' ? query.search : '';
  const searchedUserIds = await resolveSearchUserIds(search);
  if (searchedUserIds && searchedUserIds.length === 0) return [];
  if (searchedUserIds) mongoQuery.userId = { $in: searchedUserIds };

  const registrations = await BookingModel.find(mongoQuery).sort({ createdAt: -1 });
  if (registrations.length === 0) return [];

  const userIds = [...new Set(registrations.map((registration) => registration.userId))];
  const ticketIds = [...new Set(registrations.map((registration) => registration.ticketTypeId))];

  const [users, tickets] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } }).select('_id name email'),
    TicketTypeModel.find({ _id: { $in: ticketIds } }).select('_id name'),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const ticketMap = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  return registrations.map((registration) => {
    const user = userMap.get(registration.userId);
    const ticket = ticketMap.get(registration.ticketTypeId);

    return {
      id: registration.id,
      userId: registration.userId,
      eventId: registration.eventId,
      ticketTypeId: registration.ticketTypeId,
      quantity: registration.quantity,
      totalAmount: registration.totalAmount,
      bookingStatus: registration.bookingStatus,
      approvalStatus: registration.approvalStatus,
      rsvpStatus: registration.rsvpStatus,
      checkInStatus: registration.checkInStatus,
      createdAt: new Date(registration.createdAt).toISOString(),
      updatedAt: new Date(registration.updatedAt).toISOString(),
      guestName: user?.name || 'Unknown',
      guestEmail: user?.email || 'Unknown',
      ticketName: ticket?.name || 'Unknown Ticket',
    };
  });
};

const ensureHostOwnsBookingEvent = async (booking: any, hostAdminId: string) => {
  const event = await EventModel.findById(booking.eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) {
    throw new AppError('Not authorized to manage this guest record', 403);
  }
  return event;
};

export const getEventGuests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureHostOwnsEvent(req.params.eventId as string, req.user!.id);
    const guests = await buildGuestRecords(req.params.eventId as string, req.query);

    res.status(200).json({
      status: 'success',
      results: guests.length,
      data: { guests },
    });
  } catch (error) {
    next(error);
  }
};

export const updateGuestApprovalStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { approvalStatus } = updateGuestStatusSchema.parse(req.body);
    const registration = await BookingModel.findById(req.params.id as string);
    if (!registration) return next(new AppError('Guest record not found', 404));

    await ensureHostOwnsBookingEvent(registration, req.user!.id);

    const updatePayload: Record<string, unknown> = { approvalStatus };
    if (approvalStatus === 'rejected') {
      updatePayload.rsvpStatus = 'not_going';
    }

    const updatedRegistration = await BookingModel.findByIdAndUpdate(
      registration.id,
      updatePayload,
      { new: true },
    );

    res.status(200).json({ status: 'success', data: { guest: updatedRegistration!.toJSON() } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const markGuestCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registration = await BookingModel.findById(req.params.id as string);
    if (!registration) return next(new AppError('Guest record not found', 404));

    await ensureHostOwnsBookingEvent(registration, req.user!.id);

    if (registration.bookingStatus === 'cancelled') {
      return next(new AppError('Cancelled bookings cannot be checked in', 400));
    }

    if (registration.approvalStatus === 'rejected') {
      return next(new AppError('Rejected guests cannot be checked in', 400));
    }

    if (registration.checkInStatus === 'checked_in') {
      return next(new AppError('Guest is already checked in', 400));
    }

    const updatedRegistration = await BookingModel.findByIdAndUpdate(
      registration.id,
      { checkInStatus: 'checked_in' },
      { new: true },
    );

    res.status(200).json({ status: 'success', data: { guest: updatedRegistration!.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const runBulkGuestAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, ids } = bulkActionSchema.parse(req.body);
    const registrations = await BookingModel.find({ _id: { $in: ids } });

    if (registrations.length !== ids.length) {
      return next(new AppError('One or more guest records not found', 404));
    }

    const eventIds = [...new Set(registrations.map((registration) => registration.eventId))];
    const events = await EventModel.find({ _id: { $in: eventIds } }).select('_id hostAdminId');
    const eventMap = new Map(events.map((event) => [event.id, event]));

    for (const registration of registrations) {
      const event = eventMap.get(registration.eventId);
      if (!event) return next(new AppError('Event not found for one or more records', 404));
      if (event.hostAdminId !== req.user!.id) {
        return next(new AppError('Not authorized to manage one or more guest records', 403));
      }
    }

    let updatePayload: Record<string, unknown>;
    let extraQuery: Record<string, unknown> = {};

    if (action === 'approve') {
      updatePayload = { approvalStatus: 'approved' };
    } else if (action === 'reject') {
      updatePayload = { approvalStatus: 'rejected', rsvpStatus: 'not_going' };
    } else {
      updatePayload = { checkInStatus: 'checked_in' };
      extraQuery = {
        bookingStatus: { $ne: 'cancelled' },
        approvalStatus: { $ne: 'rejected' },
      };
    }

    const updateResult = await BookingModel.updateMany(
      { _id: { $in: ids }, ...extraQuery },
      updatePayload,
    );

    res.status(200).json({
      status: 'success',
      data: {
        action,
        requested: ids.length,
        updated: updateResult.modifiedCount,
      },
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
    const eventId = req.params.eventId as string;
    await ensureHostOwnsEvent(eventId, req.user!.id);
    const guests = await buildGuestRecords(eventId, req.query);

    const header = ['name', 'email', 'ticket', 'status', 'rsvp', 'check-in'];
    const rows = guests.map((guest) => [
      escapeCsvValue(guest.guestName),
      escapeCsvValue(guest.guestEmail),
      escapeCsvValue(guest.ticketName),
      escapeCsvValue(guest.approvalStatus),
      escapeCsvValue(guest.rsvpStatus),
      escapeCsvValue(guest.checkInStatus),
    ].join(','));

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"guests-${eventId}.csv\"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
