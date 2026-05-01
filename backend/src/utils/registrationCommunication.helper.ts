import { Request } from 'express';
import { UserModel } from '../models/User';
import { createNotificationRecord, createNotificationsForUsers } from './notification.helper';
import { buildEventPublicUrl, recordMockEmail, recordMockEmails } from './mockEmail.helper';

const resolveEventManagerIds = (event: any): string[] => {
  const ownerId = typeof event?.ownerId === 'string' && event.ownerId.trim().length > 0
    ? event.ownerId.trim()
    : (typeof event?.hostAdminId === 'string' ? event.hostAdminId.trim() : '');
  const adminIds = Array.isArray(event?.adminIds)
    ? event.adminIds.map((id: string) => String(id || '').trim()).filter(Boolean)
    : [];

  return Array.from(new Set([ownerId, ...adminIds].filter(Boolean)));
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

export const sendPendingRegistrationCommunications = async (
  req: Request,
  event: any,
  registration: any,
) => {
  const publicUrl = buildEventPublicUrl(event.publicSlug, req) || '';
  const eventSummary = buildEventSummary(event);

  await recordMockEmail({
    recipientEmail: registration.email,
    recipientUserId: registration.userId || null,
    eventId: event.id,
    subject: `Registration Pending: ${event.title}`,
    message: [
      `Hi ${registration.name},`,
      '',
      'Your registration was received and is currently pending review.',
      '',
      eventSummary,
      '',
      publicUrl ? `Public Event URL: ${publicUrl}` : '',
    ].filter(Boolean).join('\n'),
    type: 'registration_pending',
    status: 'sent',
    metadata: {
      registrationId: registration.id,
      registrationStatus: registration.status,
      publicUrl: publicUrl || null,
    },
    createdBy: null,
  });

  if (registration.userId) {
    await createNotificationRecord({
      userId: registration.userId,
      eventId: event.id,
      title: 'Registration Submitted',
      message: `Your registration for ${event.title} is pending review.`,
      type: 'booking',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
    });
  }

  const managerIds = resolveEventManagerIds(event);
  if (!managerIds.length) return;

  await createNotificationsForUsers(managerIds, {
    eventId: event.id,
    title: 'New Registration',
    message: `${registration.name} (${registration.email}) submitted a registration for ${event.title}.`,
    type: 'booking',
    channel: 'in_app',
    status: 'sent',
    sentAt: new Date(),
  });

  const managerUsers = await UserModel.find({ _id: { $in: managerIds } }).select('_id email');
  const managerEmailLogs = managerUsers
    .map((user) => String(user.email || '').trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({
      recipientEmail: email,
      eventId: event.id,
      subject: `New Registration Pending: ${event.title}`,
      message: [
        `${registration.name} (${registration.email}) submitted a new registration.`,
        '',
        eventSummary,
        '',
        publicUrl ? `Public Event URL: ${publicUrl}` : '',
      ].filter(Boolean).join('\n'),
      type: 'registration_pending' as const,
      status: 'sent' as const,
      metadata: {
        registrationId: registration.id,
        registrantEmail: registration.email,
      },
      createdBy: null,
    }));

  if (managerEmailLogs.length > 0) {
    await recordMockEmails(managerEmailLogs);
  }
};

export const sendRegistrationStatusCommunications = async (
  req: Request,
  event: any,
  registration: any,
  nextStatus: string,
  actorUserId: string,
) => {
  const normalizedStatus = String(nextStatus || '').trim();
  if (normalizedStatus !== 'going' && normalizedStatus !== 'declined') return;

  const publicUrl = buildEventPublicUrl(event.publicSlug, req) || '';
  const eventSummary = buildEventSummary(event);

  if (normalizedStatus === 'going') {
    const qrCodeValue = registration.qrCodeValue || null;
    const qrInfoLines = qrCodeValue
      ? [`QR Token: ${qrCodeValue}`, 'Use this QR token for check-in at the event.']
      : ['QR token is not available yet. It will appear in your registration details.'];

    await recordMockEmail({
      recipientEmail: registration.email,
      recipientUserId: registration.userId || null,
      eventId: event.id,
      subject: `Registration Confirmed: ${event.title}`,
      message: [
        `Hi ${registration.name},`,
        '',
        'Your registration has been confirmed as GOING.',
        '',
        eventSummary,
        '',
        ...qrInfoLines,
        '',
        publicUrl ? `Public Event URL: ${publicUrl}` : '',
      ].filter(Boolean).join('\n'),
      type: 'registration_confirmed',
      status: 'sent',
      metadata: {
        registrationId: registration.id,
        qrCodeValue,
        publicUrl: publicUrl || null,
      },
      createdBy: actorUserId,
    });

    if (registration.userId) {
      await createNotificationRecord({
        userId: registration.userId,
        eventId: event.id,
        title: 'Registration Confirmed',
        message: `You are marked as going for ${event.title}.${qrCodeValue ? ` QR: ${qrCodeValue}` : ''}`,
        type: 'booking',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
        createdBy: actorUserId,
      });
    }

    return;
  }

  await recordMockEmail({
    recipientEmail: registration.email,
    recipientUserId: registration.userId || null,
    eventId: event.id,
    subject: `Registration Declined: ${event.title}`,
    message: [
      `Hi ${registration.name},`,
      '',
      'Your registration has been declined by the event organizer.',
      '',
      eventSummary,
      '',
      publicUrl ? `Public Event URL: ${publicUrl}` : '',
    ].filter(Boolean).join('\n'),
    type: 'registration_declined',
    status: 'sent',
    metadata: {
      registrationId: registration.id,
      publicUrl: publicUrl || null,
    },
    createdBy: actorUserId,
  });

  if (registration.userId) {
    await createNotificationRecord({
      userId: registration.userId,
      eventId: event.id,
      title: 'Registration Declined',
      message: `Your registration for ${event.title} was declined.`,
      type: 'booking',
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
      createdBy: actorUserId,
    });
  }
};
