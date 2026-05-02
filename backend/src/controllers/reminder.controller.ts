import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReminderModel } from '../models/Reminder';
import { EventModel } from '../models/Event';
import { RegistrationModel } from '../models/Registration';
import { BookingModel } from '../models/Booking';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';
import { canManageEvent, manageableEventQuery } from '../utils/eventPermissions';
import { sendEmail } from '../services/email.service';
import { reminderTemplate } from '../services/emailTemplates';
import { buildEventEmailContext } from '../utils/eventCommunication.helper';
import { createNotificationsForUsers } from '../utils/notification.helper';

const reminderCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(4000),
  scheduledAt: z.string().trim().min(1),
  channels: z.array(z.enum(['email'])).min(1).default(['email']),
}).strict();

const reminderQuerySchema = z.object({
  status: z.enum(['scheduled', 'sent', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
}).strict();

const reminderProcessSchema = z.object({
  eventId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
}).strict();

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (!canManageEvent(userId, event)) throw new AppError('Not authorized for this event', 403);
  return event;
};

const resolveReminderRecipients = async (eventId: string) => {
  const [registrations, bookings] = await Promise.all([
    RegistrationModel.find({
      eventId,
      status: { $in: ['going', 'checked_in'] },
    }).select('id userId email name status'),
    BookingModel.find({
      eventId,
      bookingStatus: 'confirmed',
      approvalStatus: 'approved',
      rsvpStatus: 'going',
      isWaitlisted: { $ne: true },
    }).select('id userId'),
  ]);

  const bookingUserIds = Array.from(new Set(bookings.map((booking) => booking.userId)));
  const bookingUsers = bookingUserIds.length
    ? await UserModel.find({ _id: { $in: bookingUserIds } }).select('id name email')
    : [];

  const userMap = new Map(bookingUsers.map((user) => [user.id, user]));

  const recipientsByEmail = new Map<string, {
    email: string;
    name: string;
    userId: string | null;
    registrationId: string | null;
  }>();

  for (const registration of registrations) {
    const email = String(registration.email || '').trim().toLowerCase();
    if (!email || recipientsByEmail.has(email)) continue;

    recipientsByEmail.set(email, {
      email: registration.email,
      name: registration.name,
      userId: registration.userId || null,
      registrationId: registration.id,
    });
  }

  for (const booking of bookings) {
    const user = userMap.get(booking.userId);
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email || recipientsByEmail.has(email)) continue;

    recipientsByEmail.set(email, {
      email,
      name: String(user?.name || 'Guest').trim() || 'Guest',
      userId: booking.userId,
      registrationId: booking.id,
    });
  }

  const recipients = Array.from(recipientsByEmail.values());
  const pushUserIds = Array.from(new Set(
    recipients
      .map((recipient) => String(recipient.userId || '').trim())
      .filter(Boolean),
  ));

  return {
    recipients,
    pushUserIds,
  };
};

const processReminder = async (
  reminder: any,
  event: any,
  req: Request,
) => {
  const { recipients } = await resolveReminderRecipients(reminder.eventId);

  if (!recipients.length) {
    await ReminderModel.findByIdAndUpdate(reminder.id, {
      status: 'sent',
      sentAt: new Date(),
      errorMessage: null,
    });

    return {
      recipients: 0,
      emailSent: 0,
      emailFailed: 0,
      pushSent: 0,
      pushFailed: 0,
    };
  }

  const eventContext = await buildEventEmailContext(event, req);

  let emailSent = 0;
  let emailFailed = 0;

  if (reminder.channels.includes('email')) {
    for (const recipient of recipients) {
      const template = reminderTemplate({
        ...eventContext,
        recipientName: recipient.name,
        reminderTitle: reminder.title,
        reminderMessage: reminder.message,
      });

      const result = await sendEmail({
        to: recipient.email,
        subject: `${reminder.title} - ${eventContext.eventName}`,
        html: template.html,
        text: template.text,
        type: 'reminder',
        eventId: reminder.eventId,
        registrationId: recipient.registrationId,
        recipientUserId: recipient.userId,
        createdBy: reminder.createdBy,
        metadata: {
          reminderId: reminder.id,
        },
      });

      if (result.status === 'failed') emailFailed += 1;
      else emailSent += 1;
    }
  }


  if (recipients.length > 0) {
    const userIds = Array.from(new Set(recipients.map(r => r.userId).filter((id): id is string => !!id)));
    if (userIds.length > 0) {
      await createNotificationsForUsers(userIds, {
      eventId: reminder.eventId,
      title: reminder.title,
      message: reminder.message,
      type: 'reminder',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
      createdBy: reminder.createdBy,
    });
  }

  const hasFailures = emailFailed > 0;

  await ReminderModel.findByIdAndUpdate(reminder.id, {
    status: hasFailures ? 'failed' : 'sent',
    sentAt: new Date(),
    errorMessage: hasFailures
      ? `email_failed=${emailFailed}, push_failed=${pushFailed}`
      : null,
  });

  return {
    recipients: recipients.length,
    emailSent,
    emailFailed,
  };
};

export const createEventReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    await ensureCanManageEvent(eventId, req.user!.id);
    const payload = reminderCreateSchema.parse(req.body);

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return next(new AppError('scheduledAt must be a valid date', 400));
    }

    const reminder = await ReminderModel.create({
      eventId,
      title: payload.title,
      message: payload.message,
      scheduledAt,
      channels: Array.from(new Set(payload.channels)),
      status: 'scheduled',
      createdBy: req.user!.id,
      sentAt: null,
    });

    res.status(201).json({
      status: 'success',
      data: {
        reminder: reminder.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }

    next(error);
  }
};

export const getEventReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    await ensureCanManageEvent(eventId, req.user!.id);
    const { status, limit } = reminderQuerySchema.parse(req.query || {});

    const reminders = await ReminderModel.find({
      eventId,
      ...(status ? { status } : {}),
    })
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      results: reminders.length,
      data: {
        reminders: reminders.map((reminder) => reminder.toJSON()),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }

    next(error);
  }
};

export const deleteReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return next(new AppError('id is required', 400));

    const reminder = await ReminderModel.findById(id);
    if (!reminder) return next(new AppError('Reminder not found', 404));

    await ensureCanManageEvent(reminder.eventId, req.user!.id);

    await ReminderModel.findByIdAndDelete(id);
    res.status(200).json({
      status: 'success',
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const processDueReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, limit } = reminderProcessSchema.parse(req.body || {});
    const now = new Date();

    let filterEventIds: string[] = [];
    if (eventId) {
      await ensureCanManageEvent(eventId, req.user!.id);
      filterEventIds = [eventId];
    } else {
      const managedEvents = await EventModel.find(manageableEventQuery(req.user!.id)).select('_id');
      filterEventIds = managedEvents.map((event) => event.id);
    }

    if (!filterEventIds.length) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        message: 'No manageable events found for reminder processing',
      });
    }

    const dueReminders = await ReminderModel.find({
      eventId: { $in: filterEventIds },
      status: 'scheduled',
      scheduledAt: { $lte: now },
    })
      .sort({ scheduledAt: 1 })
      .limit(limit);

    if (!dueReminders.length) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        message: 'No due reminders to process',
      });
    }

    const eventIds = Array.from(new Set(dueReminders.map((reminder) => reminder.eventId)));
    const events = await EventModel.find({ _id: { $in: eventIds } });
    const eventMap = new Map(events.map((event) => [event.id, event]));

    const processed: Array<Record<string, unknown>> = [];

    for (const reminder of dueReminders) {
      const event = eventMap.get(reminder.eventId);
      if (!event) {
        await ReminderModel.findByIdAndUpdate(reminder.id, {
          status: 'failed',
          sentAt: new Date(),
          errorMessage: 'Event not found',
        });
        processed.push({ reminderId: reminder.id, status: 'failed', reason: 'Event not found' });
        continue;
      }

      const result = await processReminder(reminder, event, req);
      processed.push({
        reminderId: reminder.id,
        status: result.emailFailed > 0 || result.pushFailed > 0 ? 'failed' : 'sent',
        ...result,
      });
    }

    res.status(200).json({
      status: 'success',
      results: processed.length,
      data: {
        processed,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }

    next(error);
  }
};
