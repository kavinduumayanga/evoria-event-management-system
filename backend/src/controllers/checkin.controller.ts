import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { createNotificationRecord } from '../utils/notification.helper';

const scanSchema = z.object({
  qrCodeValue: z.string().min(1),
});

const manualCheckInSchema = z.object({
  attendanceNote: z.string().trim().max(500).optional(),
});

const ensureEventOwnership = async (eventId: string, hostAdminId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) throw new AppError('Not authorized for this event', 403);
  return event;
};

const ensureQrTokenForBooking = async (bookingId: string) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) return null;

  if (booking.qrCodeValue) return booking;

  for (let i = 0; i < 10; i++) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await BookingModel.exists({ qrCodeValue: token });
    if (!exists) {
      booking.qrCodeValue = token;
      await booking.save();
      return booking;
    }
  }

  throw new AppError('Failed to generate QR token', 500);
};

const validateCheckInEligibility = (booking: any) => {
  if (booking.bookingStatus === 'cancelled') {
    throw new AppError('Cancelled bookings cannot be checked in', 400);
  }
  if (booking.bookingStatus !== 'confirmed') {
    throw new AppError('Only confirmed bookings can be checked in', 400);
  }
  if (booking.approvalStatus && booking.approvalStatus !== 'approved') {
    throw new AppError('Booking approval is pending or rejected', 400);
  }
};

export const getBookingQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookingId = String(req.params.bookingId);
    let booking = await ensureQrTokenForBooking(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (req.user!.role === 'attendee' && booking.userId !== req.user!.id) {
      return next(new AppError('Not authorized to view this QR code', 403));
    }

    if (req.user!.role === 'host_admin') {
      await ensureEventOwnership(booking.eventId, req.user!.id);
      booking = await ensureQrTokenForBooking(bookingId);
      if (!booking) return next(new AppError('Booking not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        bookingId: booking.id,
        qrCodeValue: booking.qrCodeValue,
        qrData: booking.qrCodeValue,
        bookingStatus: booking.bookingStatus,
        checkInStatus: booking.checkInStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const scanCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrCodeValue } = scanSchema.parse(req.body);
    const booking = await BookingModel.findOne({ qrCodeValue });

    if (!booking) {
      return res.status(404).json({
        status: 'invalid',
        message: 'Invalid QR code',
      });
    }

    await ensureEventOwnership(booking.eventId, req.user!.id);
    validateCheckInEligibility(booking);

    if (booking.checkInStatus === 'checked_in') {
      return res.status(409).json({
        status: 'duplicate',
        message: 'Attendee already checked in',
        data: {
          bookingId: booking.id,
          checkedInAt: booking.checkedInAt,
        },
      });
    }

    booking.checkInStatus = 'checked_in';
    booking.checkedInAt = new Date();
    booking.checkedInBy = req.user!.id;
    booking.checkInMethod = 'qr';
    await booking.save();

    await createNotificationRecord({
      userId: booking.userId,
      eventId: booking.eventId,
      title: 'Check-in Successful',
      message: `You have been checked in for booking ${booking.id}.`,
      type: 'checkin',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
      createdBy: req.user!.id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Check-in successful',
      data: {
        bookingId: booking.id,
        checkInStatus: booking.checkInStatus,
        checkedInAt: booking.checkedInAt,
        checkedInBy: booking.checkedInBy,
        checkInMethod: booking.checkInMethod,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodErr = error as z.ZodError<any>;
      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400));
    }
    next(error);
  }
};

export const manualCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookingId = String(req.params.bookingId);
    const { attendanceNote } = manualCheckInSchema.parse(req.body || {});
    const booking = await BookingModel.findById(bookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    await ensureEventOwnership(booking.eventId, req.user!.id);
    validateCheckInEligibility(booking);

    if (booking.checkInStatus === 'checked_in') {
      return res.status(409).json({
        status: 'duplicate',
        message: 'Attendee already checked in',
        data: {
          bookingId: booking.id,
          checkedInAt: booking.checkedInAt,
        },
      });
    }

    booking.checkInStatus = 'checked_in';
    booking.checkedInAt = new Date();
    booking.checkedInBy = req.user!.id;
    booking.checkInMethod = 'manual';
    if (attendanceNote) booking.attendanceNote = attendanceNote;
    await booking.save();

    await createNotificationRecord({
      userId: booking.userId,
      eventId: booking.eventId,
      title: 'Check-in Recorded',
      message: `A manual check-in was recorded for booking ${booking.id}.`,
      type: 'checkin',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
      createdBy: req.user!.id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Manual check-in successful',
      data: { booking: booking.toJSON() },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodErr = error as z.ZodError<any>;
      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400));
    }
    next(error);
  }
};

export const getEventAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    await ensureEventOwnership(eventId, req.user!.id);

    const bookings = await BookingModel.find({ eventId }).sort({ createdAt: -1 });
    const userIds = Array.from(new Set(bookings.map((b) => b.userId)));
    const ticketIds = Array.from(new Set(bookings.map((b) => b.ticketTypeId)));

    const [users, tickets] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }).select('name email'),
      TicketTypeModel.find({ _id: { $in: ticketIds } }).select('name'),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const ticketMap = new Map(tickets.map((t) => [t.id, t]));

    const attendanceRecords = bookings.map((booking) => {
      const user = userMap.get(booking.userId);
      const ticket = ticketMap.get(booking.ticketTypeId);
      return {
        bookingId: booking.id,
        attendeeName: user?.name || 'Unknown attendee',
        attendeeEmail: user?.email || 'Unknown email',
        ticketName: ticket?.name || 'Unknown ticket',
        bookingStatus: booking.bookingStatus,
        approvalStatus: booking.approvalStatus,
        rsvpStatus: booking.rsvpStatus,
        checkInStatus: booking.checkInStatus,
        checkedInAt: booking.checkedInAt,
        checkInMethod: booking.checkInMethod || null,
        attendanceNote: booking.attendanceNote || null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: attendanceRecords.length,
      data: { attendance: attendanceRecords },
    });
  } catch (error) {
    next(error);
  }
};
