import { Request } from 'express';
import { EmailLogModel } from '../models/EmailLog';

type EmailLogType = 'registration_pending' | 'registration_confirmed' | 'registration_declined' | 'invite' | 'blast' | 'system';
type EmailLogStatus = 'queued' | 'sent' | 'failed';

interface MockEmailInput {
  recipientEmail: string;
  recipientUserId?: string | null;
  eventId?: string | null;
  subject: string;
  message: string;
  type?: EmailLogType;
  status?: EmailLogStatus;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const resolvePublicApiBaseUrl = (req?: Request): string => {
  const envBase = (process.env.PUBLIC_API_BASE_URL || '').trim();
  if (envBase.length > 0) {
    return envBase.replace(/\/+$/, '');
  }

  if (!req) return '/api';

  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');

  if (!host) return '/api';
  return `${protocol}://${host}/api`;
};

export const buildEventPublicUrl = (publicSlug: string | undefined, req?: Request): string | null => {
  const slug = String(publicSlug || '').trim();
  if (!slug) return null;
  return `${resolvePublicApiBaseUrl(req)}/public/events/${slug}`;
};

export const recordMockEmail = async (input: MockEmailInput) => {
  return EmailLogModel.create({
    recipientEmail: normalizeEmail(input.recipientEmail),
    recipientUserId: input.recipientUserId || null,
    eventId: input.eventId || null,
    subject: input.subject.trim(),
    message: input.message.trim(),
    type: input.type || 'system',
    status: input.status || 'sent',
    metadata: input.metadata || null,
    createdBy: input.createdBy || null,
  });
};

export const recordMockEmails = async (inputs: MockEmailInput[]) => {
  if (!inputs.length) return [];

  const docs = inputs.map((input) => ({
    recipientEmail: normalizeEmail(input.recipientEmail),
    recipientUserId: input.recipientUserId || null,
    eventId: input.eventId || null,
    subject: input.subject.trim(),
    message: input.message.trim(),
    type: input.type || 'system',
    status: input.status || 'sent',
    metadata: input.metadata || null,
    createdBy: input.createdBy || null,
  }));

  return EmailLogModel.insertMany(docs, { ordered: false });
};
