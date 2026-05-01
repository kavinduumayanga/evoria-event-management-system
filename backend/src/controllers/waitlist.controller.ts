import { Request, Response, NextFunction } from 'express';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { promoteSpecificWaitlistBooking } from '../utils/waitlist.helper';
import { canManageEvent } from '../utils/eventPermissions';

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (!canManageEvent(userId, event)) {
    throw new AppError('Not authorized for this event', 403);
  }

  return event;
};

export const getEventWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    await ensureCanManageEvent(eventId, req.user!.id);

    const waitlist = await BookingModel.find({
      eventId,
      isWaitlisted: true,
      bookingStatus: { $ne: 'cancelled' },
    }).sort({ waitlistPosition: 1, createdAt: 1 });

    const attendeeIds = Array.from(new Set(waitlist.map((entry) => entry.userId)));
    const attendees = await UserModel.find({ _id: { $in: attendeeIds } }).select('_id name email');
    const attendeeMap = new Map(attendees.map((attendee) => [attendee.id, attendee]));

    const data = waitlist.map((entry) => {
      const attendee = attendeeMap.get(entry.userId);
      const json = entry.toJSON() as Record<string, unknown>;

      return {
        ...json,
        attendee: attendee
          ? {
              id: attendee.id,
              name: attendee.name,
              email: attendee.email,
            }
          : null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: data.length,
      data: {
        waitlist: data,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const waitlistBookings = await BookingModel.find({
      userId: req.user!.id,
      $or: [
        { isWaitlisted: true },
        { wasWaitlisted: true, bookingStatus: 'confirmed' },
      ],
    }).sort({ updatedAt: -1 });

    const eventIds = Array.from(new Set(waitlistBookings.map((entry) => entry.eventId)));
    const events = await EventModel.find({ _id: { $in: eventIds } }).select('_id title date startTime endTime');
    const eventMap = new Map(events.map((event) => [event.id, event]));

    const data = waitlistBookings.map((entry) => {
      const event = eventMap.get(entry.eventId);

      return {
        ...entry.toJSON(),
        status: entry.isWaitlisted ? 'waiting' : 'promoted',
        event: event
          ? {
              id: event.id,
              title: event.title,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
            }
          : null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: data.length,
      data: {
        waitlist: data,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const promoteWaitlistBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await BookingModel.findById(req.params.bookingId as string);
    if (!booking) {
      return next(new AppError('Waitlist booking not found', 404));
    }

    await ensureCanManageEvent(booking.eventId, req.user!.id);

    const promoted = await promoteSpecificWaitlistBooking(booking.id, req.user!.id);

    res.status(200).json({
      status: 'success',
      data: {
        booking: promoted!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
