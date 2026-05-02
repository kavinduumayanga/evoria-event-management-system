import { Request, Response, NextFunction } from 'express';
import { EventModel } from '../models/Event';
import { RegistrationModel } from '../models/Registration';
import { BookingModel } from '../models/Booking';
import { ReminderModel } from '../models/Reminder';
import { ReviewModel } from '../models/Review';
import { CheckInHistoryModel } from '../models/CheckInHistory';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { canManageEvent } from '../utils/eventPermissions';

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (!canManageEvent(userId, event)) {
    throw new AppError('Not authorized for this event', 403);
  }
  return event;
};

const round = (value: number) => Math.round(value * 100) / 100;

export const getEventDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const event = await ensureCanManageEvent(eventId, req.user!.id);

    const [
      registrations,
      bookings,
      remindersCount,
      reviewSummary,
      recentRegistrationDocs,
      recentBookingDocs,
      recentCheckInHistory,
    ] = await Promise.all([
      RegistrationModel.find({ eventId }),
      BookingModel.find({ eventId }),
      ReminderModel.countDocuments({ eventId }),
      ReviewModel.aggregate([
        { $match: { eventId } },
        {
          $group: {
            _id: '$eventId',
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
      RegistrationModel.find({ eventId })
        .sort({ registeredAt: -1, createdAt: -1 })
        .limit(8)
        .select('id name email status registeredAt checkedInAt'),
      BookingModel.find({ eventId })
        .sort({ createdAt: -1 })
        .limit(8)
        .select('id userId bookingStatus approvalStatus rsvpStatus checkInStatus createdAt checkedInAt quantity totalAmount'),
      CheckInHistoryModel.find({ eventId })
        .sort({ scannedAt: -1 })
        .limit(10),
    ]);

    const registrationStatusCounts = registrations.reduce((acc, registration) => {
      const status = String(registration.status || 'pending');
      acc[status] = Number(acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bookingPending = bookings.filter((booking) => booking.approvalStatus === 'pending' || booking.bookingStatus === 'pending').length;
    const bookingGoing = bookings.filter((booking) => (
      booking.bookingStatus !== 'cancelled'
      && booking.approvalStatus === 'approved'
      && booking.rsvpStatus === 'going'
      && booking.isWaitlisted !== true
    )).length;
    const bookingDeclined = bookings.filter((booking) => (
      booking.bookingStatus === 'cancelled'
      || booking.approvalStatus === 'rejected'
      || booking.rsvpStatus === 'not_going'
    )).length;
    const bookingCheckedIn = bookings.filter((booking) => booking.checkInStatus === 'checked_in').length;

    const registrationTotal = registrations.length;
    const bookingTotal = bookings.length;
    const totalRegistrations = registrationTotal > 0 ? registrationTotal : bookingTotal;

    const pendingCount = registrationTotal > 0
      ? Number(registrationStatusCounts.pending || 0)
      : bookingPending;
    const goingCount = registrationTotal > 0
      ? Number(registrationStatusCounts.going || 0)
      : bookingGoing;
    const declinedCount = registrationTotal > 0
      ? Number(registrationStatusCounts.declined || 0) + Number(registrationStatusCounts.not_going || 0)
      : bookingDeclined;
    const checkedInCount = registrationTotal > 0
      ? Number(registrationStatusCounts.checked_in || 0)
      : bookingCheckedIn;

    const ticketsSold = bookings
      .filter((booking) => booking.bookingStatus !== 'cancelled' && booking.isWaitlisted !== true)
      .reduce((sum, booking) => sum + Number(booking.quantity || 0), 0);

    const revenue = bookings
      .filter((booking) => booking.bookingStatus !== 'cancelled' && booking.isWaitlisted !== true)
      .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);

    const capacityTotal = Number(event.capacity || 0);
    const capacityUsedCount = Math.max(Number(event.bookingCount || 0), totalRegistrations);
    const capacityUsedPercentage = capacityTotal > 0
      ? round((capacityUsedCount / capacityTotal) * 100)
      : 0;

    const recentRegistrations = recentRegistrationDocs.length > 0
      ? recentRegistrationDocs.map((registration) => ({
          id: registration.id,
          source: 'registration',
          name: registration.name,
          email: registration.email,
          status: registration.status,
          registeredAt: registration.registeredAt,
          checkedInAt: registration.checkedInAt || null,
        }))
      : (() => {
          const userIds = Array.from(new Set(recentBookingDocs.map((booking) => booking.userId)));
          return userIds.length
            ? []
            : [];
        })();

    let fallbackBookingRegistrations: Array<Record<string, unknown>> = [];
    if (recentRegistrations.length === 0 && recentBookingDocs.length > 0) {
      const userIds = Array.from(new Set(recentBookingDocs.map((booking) => booking.userId)));
      const users = await UserModel.find({ _id: { $in: userIds } }).select('id name email');
      const userMap = new Map(users.map((user) => [user.id, user]));

      fallbackBookingRegistrations = recentBookingDocs.map((booking) => {
        const user = userMap.get(booking.userId);
        const derivedStatus = booking.checkInStatus === 'checked_in'
          ? 'checked_in'
          : booking.rsvpStatus === 'not_going'
            ? 'not_going'
            : booking.approvalStatus === 'rejected'
              ? 'declined'
              : booking.approvalStatus === 'pending'
                ? 'pending'
                : 'going';

        return {
          id: booking.id,
          source: 'booking',
          name: user?.name || 'Guest',
          email: user?.email || 'Unknown',
          status: derivedStatus,
          registeredAt: booking.createdAt,
          checkedInAt: booking.checkedInAt || null,
        };
      });
    }

    const scanUserIds = Array.from(new Set(
      recentCheckInHistory
        .map((scan) => String(scan.scannedBy || '').trim())
        .filter(Boolean),
    ));
    const registrationIds = Array.from(new Set(
      recentCheckInHistory
        .map((scan) => String(scan.registrationId || '').trim())
        .filter(Boolean),
    ));

    const [scanUsers, scanRegistrations] = await Promise.all([
      scanUserIds.length
        ? UserModel.find({ _id: { $in: scanUserIds } }).select('id name email')
        : [],
      registrationIds.length
        ? RegistrationModel.find({ _id: { $in: registrationIds } }).select('id name email')
        : [],
    ]);

    const scanUserMap = new Map(scanUsers.map((user) => [user.id, user]));
    const registrationMap = new Map(scanRegistrations.map((registration) => [registration.id, registration]));

    const recentCheckIns = recentCheckInHistory.map((scan) => {
      const scanner = scanUserMap.get(scan.scannedBy);
      const registration = scan.registrationId ? registrationMap.get(scan.registrationId) : null;

      return {
        id: scan.id,
        qrCodeValue: scan.qrCodeValue,
        result: scan.result,
        reason: scan.reason,
        scannedAt: scan.scannedAt,
        scannedBy: {
          id: scan.scannedBy,
          name: scanner?.name || 'Staff',
          email: scanner?.email || null,
        },
        guest: registration
          ? {
              registrationId: registration.id,
              name: registration.name,
              email: registration.email,
            }
          : null,
      };
    });

    const summary = reviewSummary[0] || { averageRating: 0, totalReviews: 0 };

    res.status(200).json({
      status: 'success',
      data: {
        totalRegistrations,
        pendingCount,
        goingCount,
        declinedCount,
        checkedInCount,
        capacity: {
          used: capacityUsedCount,
          total: capacityTotal,
          percentage: capacityUsedPercentage,
        },
        ticketsSold,
        revenue: round(revenue),
        remindersCount,
        feedback: {
          averageRating: round(Number(summary.averageRating || 0)),
          totalReviews: Number(summary.totalReviews || 0),
        },
        recentRegistrations: recentRegistrations.length > 0 ? recentRegistrations : fallbackBookingRegistrations,
        recentCheckIns,
      },
    });
  } catch (error) {
    next(error);
  }
};
