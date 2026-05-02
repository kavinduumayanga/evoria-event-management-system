import { NotificationModel } from '../models/Notification';

type NotificationType = 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
type NotificationChannel = 'in_app' | 'push' | 'email_mock' | 'sms_mock';
type NotificationStatus = 'sent' | 'scheduled' | 'failed';

interface CreateNotificationInput {
  userId: string;
  eventId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  createdBy?: string;
}

export const createNotificationRecord = async (input: CreateNotificationInput) => {
  return NotificationModel.create({
    userId: input.userId,
    eventId: input.eventId || null,
    title: input.title,
    message: input.message,
    type: input.type || 'system',
    channel: input.channel || 'in_app',
    status: input.status || 'sent',
    scheduledAt: input.scheduledAt || null,
    sentAt: input.sentAt || null,
    createdBy: input.createdBy || null,
    isRead: false,
  });
};

export const createNotificationsForUsers = async (
  userIds: string[],
  baseInput: Omit<CreateNotificationInput, 'userId'>
) => {
  if (!userIds.length) return [];

  const uniqueUserIds = Array.from(new Set(userIds));
  const docs = uniqueUserIds.map((userId) => ({
    userId,
    eventId: baseInput.eventId || null,
    title: baseInput.title,
    message: baseInput.message,
    type: baseInput.type || 'system',
    channel: baseInput.channel || 'in_app',
    status: baseInput.status || 'sent',
    scheduledAt: baseInput.scheduledAt || null,
    sentAt: baseInput.sentAt || null,
    createdBy: baseInput.createdBy || null,
    isRead: false,
  }));

  return NotificationModel.insertMany(docs, { ordered: false });
};
