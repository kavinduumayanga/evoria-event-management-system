import { Request } from 'express';
import { UserModel } from '../models/User';
import { buildEventPublicUrl } from './mockEmail.helper';

export const resolveEventManagerIds = (event: any): string[] => {
  const ownerId = typeof event?.ownerId === 'string' && event.ownerId.trim().length > 0
    ? event.ownerId.trim()
    : (typeof event?.hostAdminId === 'string' ? event.hostAdminId.trim() : '');
  const adminIds = Array.isArray(event?.adminIds)
    ? event.adminIds.map((id: string) => String(id || '').trim()).filter(Boolean)
    : [];

  return Array.from(new Set([ownerId, ...adminIds].filter(Boolean)));
};

export const resolveEventLocation = (event: any): string => {
  if (event.type === 'online') return event.meetingLink || 'Online';
  return event.city || 'Venue';
};

export const buildEventSummaryText = (event: any): string => {
  const location = resolveEventLocation(event);
  return [
    `Event: ${event.title}`,
    `Date: ${event.date}`,
    `Time: ${event.startTime} - ${event.endTime}`,
    `Location: ${location}`,
  ].join('\n');
};

export const resolveHostName = async (event: any): Promise<string> => {
  const ownerId = typeof event.ownerId === 'string' && event.ownerId.trim().length > 0
    ? event.ownerId
    : event.hostAdminId;

  if (!ownerId) return 'Event Host';

  const user = await UserModel.findById(ownerId).select('name');
  return String(user?.name || event?.contactDetails?.name || 'Event Host').trim();
};

export const buildEventEmailContext = async (event: any, req: Request) => {
  const publicUrl = buildEventPublicUrl(event.publicSlug, req) || '';
  const hostName = await resolveHostName(event);

  return {
    eventName: String(event.title || '').trim() || 'Event',
    eventDate: String(event.date || '').trim(),
    eventTime: `${String(event.startTime || '').trim()} - ${String(event.endTime || '').trim()}`,
    locationOrLink: resolveEventLocation(event),
    hostName,
    publicEventUrl: publicUrl,
  };
};

export const buildRegistrationQrUrl = (event: any, req: Request, registrationId: string) => {
  if (!registrationId) return null;
  const publicBase = buildEventPublicUrl(event.publicSlug, req);
  if (!publicBase) return null;

  const apiBase = publicBase.replace(/\/public\/events\/.+$/, '');
  return `${apiBase}/checkins/qr/${registrationId}`;
};
