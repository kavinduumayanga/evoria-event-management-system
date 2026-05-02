import { NotificationModel } from '../models/Notification';
import { PushTokenModel } from '../models/PushToken';

interface PushMessagePayload {
  title: string;
  message: string;
  data?: Record<string, unknown>;
  eventId?: string | null;
  type?: 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
  createdBy?: string | null;
}

interface PushSendSummary {
  attemptedUsers: number;
  targetedDevices: number;
  sent: number;
  failed: number;
}

interface ExpoPushTicket {
  status?: 'ok' | 'error';
  details?: Record<string, unknown>;
  message?: string;
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const VALID_TOKEN_REGEX = /^(ExponentPushToken\[[^\]]+\]|ExpoPushToken\[[^\]]+\])$/;

const isValidExpoPushToken = (value: string): boolean => VALID_TOKEN_REGEX.test(value.trim());

const chunkArray = <T,>(values: T[], size: number): T[][] => {
  if (size <= 0) return [values];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const sendExpoPushBatch = async (messages: Array<Record<string, unknown>>) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };

  const accessToken = String(process.env.EXPO_ACCESS_TOKEN || '').trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  const payload = await response.json() as {
    data?: ExpoPushTicket[];
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok) {
    const firstError = payload.errors?.[0]?.message || `Expo push API failed (${response.status})`;
    throw new Error(firstError);
  }

  return Array.isArray(payload.data) ? payload.data : [];
};

const buildPushNotificationDocs = (
  userIds: string[],
  payload: PushMessagePayload,
  status: 'sent' | 'failed',
  sentAt: Date,
) => {
  return userIds.map((userId) => ({
    userId,
    eventId: payload.eventId || null,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    channel: 'push',
    status,
    sentAt,
    scheduledAt: null,
    createdBy: payload.createdBy || null,
    isRead: false,
  }));
};

export const sendPushToUsers = async (
  userIds: string[],
  payload: PushMessagePayload,
): Promise<PushSendSummary> => {
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));
  if (!uniqueUserIds.length) {
    return { attemptedUsers: 0, targetedDevices: 0, sent: 0, failed: 0 };
  }

  const pushTokenRecords = await PushTokenModel.find({ userId: { $in: uniqueUserIds } })
    .select('userId expoPushToken');

  const validDeviceTokens = pushTokenRecords
    .map((tokenDoc) => ({
      userId: tokenDoc.userId,
      token: String(tokenDoc.expoPushToken || '').trim(),
    }))
    .filter((tokenDoc) => isValidExpoPushToken(tokenDoc.token));

  if (!validDeviceTokens.length) {
    const failedDocs = buildPushNotificationDocs(uniqueUserIds, payload, 'failed', new Date());
    if (failedDocs.length) {
      await NotificationModel.insertMany(failedDocs, { ordered: false }).catch(() => undefined);
    }

    return {
      attemptedUsers: uniqueUserIds.length,
      targetedDevices: 0,
      sent: 0,
      failed: uniqueUserIds.length,
    };
  }

  const ticketStatusesByUserId = new Map<string, Array<'sent' | 'failed'>>();

  const messages = validDeviceTokens.map((device) => ({
    to: device.token,
    sound: 'default',
    title: payload.title,
    body: payload.message,
    data: payload.data || {},
  }));

  let deliveryError: string | null = null;

  try {
    const chunks = chunkArray(messages, 100);
    const tokenChunks = chunkArray(validDeviceTokens, 100);

    for (let index = 0; index < chunks.length; index += 1) {
      const messageChunk = chunks[index];
      const tokenChunk = tokenChunks[index];
      const tickets = await sendExpoPushBatch(messageChunk);

      for (let ticketIndex = 0; ticketIndex < tokenChunk.length; ticketIndex += 1) {
        const tokenInfo = tokenChunk[ticketIndex];
        const ticket = tickets[ticketIndex] || {};
        const status: 'sent' | 'failed' = ticket.status === 'ok' ? 'sent' : 'failed';

        const previous = ticketStatusesByUserId.get(tokenInfo.userId) || [];
        previous.push(status);
        ticketStatusesByUserId.set(tokenInfo.userId, previous);
      }
    }
  } catch (error: any) {
    deliveryError = String(error?.message || 'Push send failed');
  }

  const userSendStatus = new Map<string, 'sent' | 'failed'>();

  for (const userId of uniqueUserIds) {
    const statuses = ticketStatusesByUserId.get(userId) || [];

    if (!statuses.length) {
      userSendStatus.set(userId, 'failed');
      continue;
    }

    userSendStatus.set(
      userId,
      statuses.includes('sent') ? 'sent' : 'failed',
    );
  }

  const sentUserIds: string[] = [];
  const failedUserIds: string[] = [];

  userSendStatus.forEach((status, userId) => {
    if (status === 'sent') sentUserIds.push(userId);
    else failedUserIds.push(userId);
  });

  const now = new Date();
  const sentDocs = buildPushNotificationDocs(sentUserIds, payload, 'sent', now);
  const failedDocs = buildPushNotificationDocs(failedUserIds, {
    ...payload,
    message: deliveryError ? `${payload.message} (push error: ${deliveryError})` : payload.message,
  }, 'failed', now);

  if (sentDocs.length > 0) {
    await NotificationModel.insertMany(sentDocs, { ordered: false }).catch(() => undefined);
  }

  if (failedDocs.length > 0) {
    await NotificationModel.insertMany(failedDocs, { ordered: false }).catch(() => undefined);
  }

  return {
    attemptedUsers: uniqueUserIds.length,
    targetedDevices: validDeviceTokens.length,
    sent: sentUserIds.length,
    failed: failedUserIds.length,
  };
};

export const isExpoPushToken = isValidExpoPushToken;
