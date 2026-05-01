import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { RegistrationModel } from '../models/Registration';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { createNotificationRecord } from '../utils/notification.helper';
import { canManageEvent } from '../utils/eventPermissions';

const scanSchema = z.object({
  qrCodeValue: z.string().trim().min(1, 'qrCodeValue is required'),
}).strict();

const manualCheckInSchema = z.object({
  attendanceNote: z.string().trim().max(500).optional(),
}).strict();

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (!canManageEvent(userId, event)) throw new AppError('Not authorized for this event', 403);
  return event;
};

const shouldHaveRegistrationQr = (status: string) => (
  status === 'going'
  || status === 'ongoing'
  || status === 'checked_in'
);

const validateRegistrationCheckInEligibility = (registration: any) => {
  if (registration.status === 'declined' || registration.status === 'not_going') {
    throw new AppError('Declined/Not-going guests cannot be checked in', 400);
  }

  if (registration.status === 'pending') {
    throw new AppError('Guest must be marked going or ongoing before check-in', 400);
  }
};

const validateBookingCheckInEligibility = (booking: any) => {
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

const generateRegistrationQrCodeValue = async (): Promise<string> => {
  for (let i = 0; i < 10; i += 1) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await RegistrationModel.exists({ qrCodeValue: token });
    if (!exists) return token;
  }

  throw new AppError('Failed to generate a unique QR code token', 500);
};

const generateBookingQrCodeValue = async (): Promise<string> => {
  for (let i = 0; i < 10; i += 1) {
    const token = `qr_${crypto.randomBytes(16).toString('hex')}`;
    const exists = await BookingModel.exists({ qrCodeValue: token });
    if (!exists) return token;
  }

  throw new AppError('Failed to generate a unique QR code token', 500);
};

const ensureQrTokenForBooking = async (bookingId: string) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) return null;

  if (booking.qrCodeValue) return booking;
  booking.qrCodeValue = await generateBookingQrCodeValue();
  await booking.save();
  return booking;
};

const ensureQrTokenForRegistration = async (registrationId: string) => {
  const registration = await RegistrationModel.findById(registrationId);
  if (!registration) return null;

  if (!shouldHaveRegistrationQr(registration.status)) {
    throw new AppError('QR is available only for going/ongoing/checked-in guests', 400);
  }

  if (registration.qrCodeValue) return registration;
  registration.qrCodeValue = await generateRegistrationQrCodeValue();
  await registration.save();
  return registration;
};

export const getBookingQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registrationOrBookingId = String(req.params.bookingId || req.params.registrationId || '').trim();
    if (!registrationOrBookingId) return next(new AppError('registrationId is required', 400));

    const registration = await RegistrationModel.findById(registrationOrBookingId);
    if (registration) {
      await ensureCanManageEvent(registration.eventId, req.user!.id);
      const refreshedRegistration = await ensureQrTokenForRegistration(registration.id);
      if (!refreshedRegistration) return next(new AppError('Guest registration not found', 404));

      return res.status(200).json({
        status: 'success',
        data: {
          registrationId: refreshedRegistration.id,
          qrCodeValue: refreshedRegistration.qrCodeValue,
          qrData: refreshedRegistration.qrCodeValue,
          guestStatus: refreshedRegistration.status,
        },
      });
    }

    let booking = await ensureQrTokenForBooking(registrationOrBookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    if (booking.userId !== req.user!.id) {
      await ensureCanManageEvent(booking.eventId, req.user!.id);
      booking = await ensureQrTokenForBooking(registrationOrBookingId);
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

    const registration = await RegistrationModel.findOne({ qrCodeValue });
    if (registration) {
      await ensureCanManageEvent(registration.eventId, req.user!.id);
      validateRegistrationCheckInEligibility(registration);

      if (registration.status === 'checked_in') {
        return res.status(409).json({
          status: 'duplicate',
          message: 'Guest already checked in',
          data: {
            registrationId: registration.id,
            checkedInAt: registration.checkedInAt,
          },
        });
      }

      registration.status = 'checked_in';
      registration.checkedInAt = new Date();
      registration.checkedInBy = req.user!.id;
      registration.checkInMethod = 'qr';
      await registration.save();

      if (registration.userId) {
        await createNotificationRecord({
          userId: registration.userId,
          eventId: registration.eventId,
          title: 'Check-in Successful',
          message: `You have been checked in for ${registration.eventId}.`,
          type: 'checkin',
          channel: 'in_app',
          status: 'sent',
          sentAt: new Date(),
          createdBy: req.user!.id,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Check-in successful',
        data: {
          registrationId: registration.id,
          checkInStatus: registration.status,
          checkedInAt: registration.checkedInAt,
          checkedInBy: registration.checkedInBy,
          checkInMethod: registration.checkInMethod,
        },
      });
    }

    const booking = await BookingModel.findOne({ qrCodeValue });
    if (!booking) {
      return res.status(404).json({
        status: 'invalid',
        message: 'Invalid QR code',
      });
    }

    await ensureCanManageEvent(booking.eventId, req.user!.id);
    validateBookingCheckInEligibility(booking);

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
    const registrationOrBookingId = String(req.params.bookingId || req.params.registrationId || '').trim();
    if (!registrationOrBookingId) return next(new AppError('registrationId is required', 400));

    const { attendanceNote } = manualCheckInSchema.parse(req.body || {});

    const registration = await RegistrationModel.findById(registrationOrBookingId);
    if (registration) {
      await ensureCanManageEvent(registration.eventId, req.user!.id);
      validateRegistrationCheckInEligibility(registration);

      if (registration.status === 'checked_in') {
        return res.status(409).json({
          status: 'duplicate',
          message: 'Guest already checked in',
          data: {
            registrationId: registration.id,
            checkedInAt: registration.checkedInAt,
          },
        });
      }

      if (!registration.qrCodeValue) {
        registration.qrCodeValue = await generateRegistrationQrCodeValue();
      }
      registration.status = 'checked_in';
      registration.checkedInAt = new Date();
      registration.checkedInBy = req.user!.id;
      registration.checkInMethod = 'manual';
      registration.attendanceNote = attendanceNote || null;
      await registration.save();

      if (registration.userId) {
        await createNotificationRecord({
          userId: registration.userId,
          eventId: registration.eventId,
          title: 'Check-in Recorded',
          message: `A manual check-in was recorded for event ${registration.eventId}.`,
          type: 'checkin',
          channel: 'in_app',
          status: 'sent',
          sentAt: new Date(),
          createdBy: req.user!.id,
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Manual check-in successful',
        data: { registration: registration.toJSON() },
      });
    }

    const booking = await BookingModel.findById(registrationOrBookingId);
    if (!booking) return next(new AppError('Booking not found', 404));

    await ensureCanManageEvent(booking.eventId, req.user!.id);
    validateBookingCheckInEligibility(booking);

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
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    await ensureCanManageEvent(eventId, req.user!.id);
    const registrations = await RegistrationModel.find({ eventId }).sort({ registeredAt: -1, createdAt: -1 });
    if (registrations.length > 0) {
      const attendanceRecords = registrations.map((registration) => ({
        registrationId: registration.id,
        attendeeName: registration.name,
        attendeeEmail: registration.email,
        mobile: registration.mobile,
        nic: registration.nic,
        guestStatus: registration.status,
        checkInStatus: registration.status === 'checked_in' ? 'checked_in' : 'not_checked_in',
        checkedInAt: registration.checkedInAt || null,
        checkedInBy: registration.checkedInBy || null,
        checkInMethod: registration.checkInMethod || null,
        attendanceNote: registration.attendanceNote || null,
        qrCodeValue: registration.qrCodeValue || null,
      }));

      return res.status(200).json({
        status: 'success',
        results: attendanceRecords.length,
        data: { attendance: attendanceRecords },
      });
    }

    const bookings = await BookingModel.find({ eventId }).sort({ createdAt: -1 });
    const userIds = Array.from(new Set(bookings.map((booking) => booking.userId)));
    const ticketIds = Array.from(new Set(bookings.map((booking) => booking.ticketTypeId)));

    const [users, tickets] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }).select('name email'),
      TicketTypeModel.find({ _id: { $in: ticketIds } }).select('name'),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const ticketMap = new Map(tickets.map((ticket) => [ticket.id, ticket]));

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

