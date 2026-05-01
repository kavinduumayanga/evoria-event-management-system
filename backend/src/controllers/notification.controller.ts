import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NotificationModel } from '../models/Notification';
import { BookingModel } from '../models/Booking';
import { UserModel } from '../models/User';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';
import { createNotificationsForUsers } from '../utils/notification.helper';

const notificationCreateSchema = z.object({
  userIds: z.array(z.string()).optional(),
  eventId: z.string().optional(),
  title: z.string().min(2),
  message: z.string().min(2),
  type: z.enum(['booking', 'reminder', 'announcement', 'checkin', 'system']).default('announcement'),
  channel: z.enum(['in_app', 'email_mock', 'sms_mock']).default('in_app'),
  scheduledAt: z.string().optional(),
});

const eventBlastSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(2),
  type: z.enum(['booking', 'reminder', 'announcement', 'checkin', 'system']).default('announcement'),
  channel: z.enum(['in_app', 'email_mock', 'sms_mock']).default('in_app'),
  scheduledAt: z.string().optional(),
});

const ensureEventOwnership = async (eventId: string, hostAdminId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (event.hostAdminId !== hostAdminId) throw new AppError('Not authorized for this event', 403);
  return event;
};

const resolveEventAttendeeIds = async (eventId: string) => {
  const bookings = await BookingModel.find({
    eventId,
    bookingStatus: { $in: ['pending', 'confirmed'] },
    approvalStatus: { $ne: 'rejected' },
  }).select('userId');

  return Array.from(new Set(bookings.map((b) => b.userId)));
};

const resolveNotificationStatus = (scheduledAt?: string) => {
  if (!scheduledAt) {
    return {
      status: 'sent' as const,
      scheduledDate: null as Date | null,
      sentAt: new Date(),
    };
  }

  const parsedDate = new Date(scheduledAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid scheduledAt date', 400);
  }

  if (parsedDate.getTime() > Date.now()) {
    return {
      status: 'scheduled' as const,
      scheduledDate: parsedDate,
      sentAt: null,
    };
  }

  return {
    status: 'sent' as const,
    scheduledDate: parsedDate,
    sentAt: new Date(),
  };
};

export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = notificationCreateSchema.parse(req.body);
    const { status, scheduledDate, sentAt } = resolveNotificationStatus(validated.scheduledAt);

    let recipientIds: string[] = [];

    if (validated.eventId) {
      await ensureEventOwnership(validated.eventId, req.user!.id);
      const attendeeIds = await resolveEventAttendeeIds(validated.eventId);
      recipientIds = recipientIds.concat(attendeeIds);
    }

    if (validated.userIds?.length) {
      recipientIds = recipientIds.concat(validated.userIds);
    }

    recipientIds = Array.from(new Set(recipientIds));

    if (!recipientIds.length) {
      return next(new AppError('At least one recipient is required', 400));
    }

    const recipientsCount = await UserModel.countDocuments({ _id: { $in: recipientIds } });
    if (recipientsCount === 0) {
      return next(new AppError('No valid recipients found', 404));
    }

    const createdDocs = await createNotificationsForUsers(recipientIds, {
      eventId: validated.eventId,
      title: validated.title,
      message: validated.message,
      type: validated.type,
      channel: validated.channel,
      status,
      scheduledAt: scheduledDate,
      sentAt,
      createdBy: req.user!.id,
    });

    const mockChannelMessage = validated.channel === 'email_mock' || validated.channel === 'sms_mock'
      ? 'Mock email/SMS notification recorded successfully'
      : null;

    res.status(201).json({
      status: 'success',
      results: createdDocs.length,
      data: {
        notifications: createdDocs.map((doc) => doc.toJSON()),
      },
      ...(mockChannelMessage ? { message: mockChannelMessage } : {}),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodErr = error as z.ZodError<any>;
      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400));
    }
    next(error);
  }
};

export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: notifications.length,
      data: { notifications: notifications.map((n) => n.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await NotificationModel.findById(req.params.id);
    if (!notification) return next(new AppError('Notification not found', 404));

    if (notification.userId !== req.user!.id) {
      return next(new AppError('Not authorized to update this notification', 403));
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      status: 'success',
      data: { notification: notification.toJSON() },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await NotificationModel.findById(req.params.id);
    if (!notification) return next(new AppError('Notification not found', 404));

    if (notification.userId !== req.user!.id) {
      if (req.user!.role !== 'host_admin') {
        return next(new AppError('Not authorized to delete this notification', 403));
      }

      let allowed = notification.createdBy === req.user!.id;
      if (!allowed && notification.eventId) {
        const event = await EventModel.findById(notification.eventId);
        allowed = !!event && event.hostAdminId === req.user!.id;
      }

      if (!allowed) {
        return next(new AppError('Not authorized to delete this notification', 403));
      }
    }

    await NotificationModel.findByIdAndDelete(notification.id);
    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const eventBlastNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    const validated = eventBlastSchema.parse(req.body);
    const { status, scheduledDate, sentAt } = resolveNotificationStatus(validated.scheduledAt);

    await ensureEventOwnership(eventId, req.user!.id);
    const attendeeIds = await resolveEventAttendeeIds(eventId);

    if (!attendeeIds.length) {
      return next(new AppError('No attendees found for this event', 404));
    }

    const createdDocs = await createNotificationsForUsers(attendeeIds, {
      eventId,
      title: validated.title,
      message: validated.message,
      type: validated.type,
      channel: validated.channel,
      status,
      scheduledAt: scheduledDate,
      sentAt,
      createdBy: req.user!.id,
    });

    const mockChannelMessage = validated.channel === 'email_mock' || validated.channel === 'sms_mock'
      ? 'Mock email/SMS notification recorded successfully'
      : null;

    res.status(201).json({
      status: 'success',
      results: createdDocs.length,
      data: { notifications: createdDocs.map((doc) => doc.toJSON()) },
      ...(mockChannelMessage ? { message: mockChannelMessage } : {}),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodErr = error as z.ZodError<any>;
      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400));
    }
    next(error);
  }
};

export const getEventNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId);
    await ensureEventOwnership(eventId, req.user!.id);

    const notifications = await NotificationModel.find({ eventId }).sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      results: notifications.length,
      data: { notifications: notifications.map((n) => n.toJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

export const processScheduledNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const scheduledNotifications = await NotificationModel.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    });

    if (!scheduledNotifications.length) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        message: 'No scheduled notifications to process',
      });
    }

    const ids = scheduledNotifications.map((notification) => notification.id);
    await NotificationModel.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'sent',
          sentAt: now,
        },
      }
    );

    res.status(200).json({
      status: 'success',
      results: ids.length,
      message: 'Scheduled notifications processed successfully',
    });
  } catch (error) {
    next(error);
  }
};
