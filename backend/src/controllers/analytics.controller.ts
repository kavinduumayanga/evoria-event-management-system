import { Request, Response, NextFunction } from 'express';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

const ensureHostOwnsEvent = async (eventId: string, hostAdminId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) {
    throw new AppError('Not authorized to access this event analytics', 403);
  }
  return event;
};

export const getEventAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    const event = await ensureHostOwnsEvent(eventId, req.user!.id);
    const bookings = await BookingModel.find({ eventId });

    const totalRegistrations = bookings.length;
    const totalApproved = bookings.filter((booking) => booking.approvalStatus === 'approved').length;
    const totalAttended = bookings.filter((booking) => booking.checkInStatus === 'checked_in').length;
    const totalRevenue = bookings
      .filter((booking) => booking.registrationType === 'paid' && booking.bookingStatus !== 'cancelled')
      .reduce((sum, booking) => sum + booking.totalAmount, 0);
    const ticketsSold = bookings
      .filter((booking) => booking.bookingStatus !== 'cancelled')
      .reduce((sum, booking) => sum + booking.quantity, 0);
    const confirmedBookings = bookings.filter((booking) => booking.bookingStatus === 'confirmed').length;
    const viewsCount = event.viewsCount || 0;
    const conversionRate = viewsCount > 0 ? roundToTwo((confirmedBookings / viewsCount) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalRegistrations,
        totalApproved,
        totalAttended,
        totalRevenue: roundToTwo(totalRevenue),
        ticketsSold,
        conversionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await EventModel.find({ hostAdminId: req.user!.id });
    const eventIds = events.map((event) => event.id);

    if (!eventIds.length) {
      return res.status(200).json({
        status: 'success',
        data: {
          totalEvents: 0,
          totalBookings: 0,
          totalRevenue: 0,
          totalAttendees: 0,
        },
      });
    }

    const bookings = await BookingModel.find({ eventId: { $in: eventIds } });
    const activeBookings = bookings.filter((booking) => booking.bookingStatus !== 'cancelled');

    const totalEvents = events.length;
    const totalBookings = bookings.length;
    const totalRevenue = activeBookings
      .filter((booking) => booking.registrationType === 'paid')
      .reduce((sum, booking) => sum + booking.totalAmount, 0);
    const totalAttendees = new Set(activeBookings.map((booking) => booking.userId)).size;

    res.status(200).json({
      status: 'success',
      data: {
        totalEvents,
        totalBookings,
        totalRevenue: roundToTwo(totalRevenue),
        totalAttendees,
      },
    });
  } catch (error) {
    next(error);
  }
};
