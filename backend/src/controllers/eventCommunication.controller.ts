import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EventModel } from '../models/Event';
import { RegistrationModel } from '../models/Registration';
import { NotificationModel } from '../models/Notification';
import { UserModel } from '../models/User';
import { EmailLogModel } from '../models/EmailLog';
import { AppError } from '../utils/appError';
import { canManageEvent } from '../utils/eventPermissions';
import { createNotificationRecord, createNotificationsForUsers } from '../utils/notification.helper';
import { buildEventPublicUrl, recordMockEmail, recordMockEmails } from '../utils/mockEmail.helper';

const inviteGuestSchema = z.object({
  email: z.string().trim().email('Please provide a valid guest email'),
  message: z.string().trim().max(2000, 'Message is too long').optional().default(''),
}).strict();

const blastSchema = z.object({
  subject: z.string().trim().min(2).max(160).optional(),
  title: z.string().trim().min(2).max(160).optional(),
  message: z.string().trim().min(2, 'Message is required').max(4000, 'Message is too long'),
}).strict();

const communicationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
}).strict();

const slugify = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || 'event';
};

const ensureCanManageEvent = async (eventId: string, userId: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  if (!canManageEvent(userId, event)) throw new AppError('Not authorized for this event', 403);
  return event;
};

const ensureEventPublicSlug = async (event: any): Promise<string> => {
  const existing = String(event.publicSlug || '').trim().toLowerCase();
  if (existing) return existing;

  const baseSlug = slugify(event.title || 'event');
  let slug = `${baseSlug}-${event.id.slice(0, 8)}`;
  let attempt = 0;

  while (attempt < 10) {
    const duplicate = await EventModel.exists({ _id: { $ne: event.id }, publicSlug: slug });
    if (!duplicate) break;
    attempt += 1;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
  }

  event.publicSlug = slug;
  await event.save();
  return slug;
};

const buildEventSummary = (event: any): string => {
  const location = event.type === 'online'
    ? (event.meetingLink || 'Online')
    : (event.city || 'Venue');

  return [
    `Event: ${event.title}`,
    `Date: ${event.date}`,
    `Time: ${event.startTime} - ${event.endTime}`,
    `Location: ${location}`,
  ].join('\n');
};

export const inviteGuestToEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const event = await ensureCanManageEvent(eventId, req.user!.id);
    const { email, message } = inviteGuestSchema.parse(req.body);

    const publicSlug = await ensureEventPublicSlug(event);
    const publicUrl = buildEventPublicUrl(publicSlug, req) || '';
    const normalizedEmail = email.trim().toLowerCase();

    const subject = `Invitation: ${event.title}`;
    const finalMessage = [
      message || `You are invited to ${event.title}.`,
      '',
      buildEventSummary(event),
      '',
      `Register here: ${publicUrl}`,
    ].filter(Boolean).join('\n');

    const invitedUser = await UserModel.findOne({ email: normalizedEmail }).select('_id');

    const emailLog = await recordMockEmail({
      recipientEmail: normalizedEmail,
      recipientUserId: invitedUser?.id || null,
      eventId: event.id,
      subject,
      message: finalMessage,
      type: 'invite',
      status: 'sent',
      metadata: {
        publicUrl,
        invitedBy: req.user!.id,
      },
      createdBy: req.user!.id,
    });

    if (invitedUser) {
      await createNotificationRecord({
        userId: invitedUser.id,
        eventId: event.id,
        title: 'Event Invitation',
        message: `You were invited to ${event.title}. Register here: ${publicUrl}`,
        type: 'announcement',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
        createdBy: req.user!.id,
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Mock invitation recorded successfully',
      data: {
        invite: emailLog.toJSON(),
        publicUrl,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const blastEventMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const event = await ensureCanManageEvent(eventId, req.user!.id);
    const payload = blastSchema.parse(req.body);
    const subject = (payload.subject || payload.title || '').trim() || `Update: ${event.title}`;

    const registrations = await RegistrationModel.find({ eventId }).select(
      'email emailLower userId name status',
    );

    if (!registrations.length) {
      return next(new AppError('No registered guests found for this event', 404));
    }

    const recipientsByEmail = new Map<string, {
      email: string;
      userId: string | null;
      name: string;
      status: string;
    }>();

    for (const registration of registrations) {
      const emailLower = String(registration.emailLower || '').trim().toLowerCase();
      if (!emailLower || recipientsByEmail.has(emailLower)) continue;
      recipientsByEmail.set(emailLower, {
        email: registration.email,
        userId: registration.userId || null,
        name: registration.name,
        status: registration.status,
      });
    }

    const recipients = Array.from(recipientsByEmail.values());
    if (!recipients.length) {
      return next(new AppError('No valid recipient emails found for this event', 404));
    }

    const publicSlug = await ensureEventPublicSlug(event);
    const publicUrl = buildEventPublicUrl(publicSlug, req) || '';
    const eventSummary = buildEventSummary(event);

    const mockEmailLogs = await recordMockEmails(
      recipients.map((recipient) => ({
        recipientEmail: recipient.email,
        recipientUserId: recipient.userId,
        eventId: event.id,
        subject,
        message: [
          payload.message.trim(),
          '',
          eventSummary,
          '',
          `Event URL: ${publicUrl}`,
        ].join('\n'),
        type: 'blast',
        status: 'sent',
        metadata: {
          publicUrl,
          recipientName: recipient.name,
          recipientStatus: recipient.status,
        },
        createdBy: req.user!.id,
      })),
    );

    const inAppRecipientIds = Array.from(new Set(
      recipients
        .map((recipient) => String(recipient.userId || '').trim())
        .filter((id) => id.length > 0),
    ));

    let inAppNotificationsCount = 0;
    if (inAppRecipientIds.length > 0) {
      const createdNotifications = await createNotificationsForUsers(inAppRecipientIds, {
        eventId: event.id,
        title: subject,
        message: `${payload.message.trim()}\n\nEvent URL: ${publicUrl}`,
        type: 'announcement',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
        createdBy: req.user!.id,
      });
      inAppNotificationsCount = createdNotifications.length;
    }

    res.status(201).json({
      status: 'success',
      message: 'Mock blast recorded successfully',
      results: mockEmailLogs.length,
      data: {
        publicUrl,
        recipients: mockEmailLogs.length,
        inAppRecipients: inAppNotificationsCount,
        emailLogs: mockEmailLogs.map((log) => log.toJSON()),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const getEventCommunications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    await ensureCanManageEvent(eventId, req.user!.id);
    const { limit } = communicationsQuerySchema.parse(req.query || {});

    const [emailLogs, notifications] = await Promise.all([
      EmailLogModel.find({ eventId }).sort({ createdAt: -1 }).limit(limit),
      NotificationModel.find({ eventId }).sort({ createdAt: -1 }).limit(limit),
    ]);

    const userIds = Array.from(new Set([
      ...emailLogs.map((log) => String(log.recipientUserId || '').trim()).filter(Boolean),
      ...notifications.map((notification) => String(notification.userId || '').trim()).filter(Boolean),
    ]));

    const users = userIds.length
      ? await UserModel.find({ _id: { $in: userIds } }).select('_id email')
      : [];
    const userEmailMap = new Map(users.map((user) => [user.id, user.email]));

    const combined = [
      ...emailLogs.map((log) => ({
        id: log.id,
        source: 'email_log',
        channel: 'email_mock',
        recipientUserId: log.recipientUserId || null,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        message: log.message,
        type: log.type,
        status: log.status,
        createdBy: log.createdBy || null,
        createdAt: log.createdAt,
        sentAt: log.createdAt,
        metadata: log.metadata || null,
      })),
      ...notifications.map((notification) => ({
        id: notification.id,
        source: 'in_app_notification',
        channel: notification.channel,
        recipientUserId: notification.userId,
        recipientEmail: userEmailMap.get(notification.userId) || null,
        subject: notification.title,
        message: notification.message,
        type: notification.type,
        status: notification.status,
        createdBy: notification.createdBy || null,
        createdAt: notification.createdAt,
        sentAt: notification.sentAt || null,
        metadata: null,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

    res.status(200).json({
      status: 'success',
      results: combined.length,
      data: {
        communications: combined,
        emailLogs: emailLogs.map((log) => log.toJSON()),
        notifications: notifications.map((notification) => notification.toJSON()),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};
