import { Request } from 'express';
import { UserModel } from '../models/User';
import { createNotificationRecord, createNotificationsForUsers } from './notification.helper';
import { buildEventEmailContext, buildRegistrationQrUrl, resolveEventManagerIds } from './eventCommunication.helper';
import { sendEmail } from '../services/email.service';
import {
  approvedRegistrationTemplate,
  declinedRegistrationTemplate,
  pendingRegistrationTemplate,
} from '../services/emailTemplates';
import { sendPushToUsers } from '../services/pushNotification.service';

const buildManagerPendingEmailBody = (registration: any, eventName: string) => {
  return {
    html: `
      <p>A new registration was submitted for <strong>${eventName}</strong>.</p>
      <p>Name: ${registration.name}</p>
      <p>Email: ${registration.email}</p>
      <p>Status: ${registration.status}</p>
    `,
    text: [
      `New registration for ${eventName}`,
      `Name: ${registration.name}`,
      `Email: ${registration.email}`,
      `Status: ${registration.status}`,
    ].join('\n'),
  };
};

export const sendPendingRegistrationCommunications = async (
  req: Request,
  event: any,
  registration: any,
) => {
  const eventContext = await buildEventEmailContext(event, req);

  const pendingTemplate = pendingRegistrationTemplate({
    ...eventContext,
    recipientName: registration.name,
  });

  await sendEmail({
    to: registration.email,
    subject: `Registration Pending: ${eventContext.eventName}`,
    html: pendingTemplate.html,
    text: pendingTemplate.text,
    type: 'registration_pending',
    eventId: event.id,
    registrationId: registration.id,
    recipientUserId: registration.userId || null,
    createdBy: null,
    metadata: {
      registrationStatus: registration.status,
      publicEventUrl: eventContext.publicEventUrl,
    },
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

    await sendPushToUsers([registration.userId], {
      eventId: event.id,
      title: 'Registration Submitted',
      message: `Your registration for ${event.title} is pending review.`,
      type: 'booking',
      data: {
        eventId: event.id,
        registrationId: registration.id,
        type: 'registration_submitted',
      },
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

  await sendPushToUsers(managerIds, {
    eventId: event.id,
    title: 'New Registration Submitted',
    message: `${registration.name} submitted registration for ${event.title}.`,
    type: 'booking',
    data: {
      eventId: event.id,
      registrationId: registration.id,
      type: 'registration_submitted',
    },
  });

  const managerUsers = await UserModel.find({ _id: { $in: managerIds } }).select('_id email');

  for (const manager of managerUsers) {
    const recipientEmail = String(manager.email || '').trim().toLowerCase();
    if (!recipientEmail) continue;

    const managerBody = buildManagerPendingEmailBody(registration, eventContext.eventName);
    await sendEmail({
      to: recipientEmail,
      subject: `New Registration Pending: ${eventContext.eventName}`,
      html: managerBody.html,
      text: managerBody.text,
      type: 'registration_pending',
      eventId: event.id,
      registrationId: registration.id,
      recipientUserId: manager.id,
      createdBy: null,
      metadata: {
        registrantEmail: registration.email,
      },
    });
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

  const eventContext = await buildEventEmailContext(event, req);

  if (normalizedStatus === 'going') {
    const qrCodeUrl = buildRegistrationQrUrl(event, req, registration.id);
    const template = approvedRegistrationTemplate({
      ...eventContext,
      recipientName: registration.name,
      qrCodeValue: registration.qrCodeValue || null,
      qrCodeUrl,
    });

    await sendEmail({
      to: registration.email,
      subject: `Registration Confirmed: ${eventContext.eventName}`,
      html: template.html,
      text: template.text,
      type: 'registration_confirmed',
      eventId: event.id,
      registrationId: registration.id,
      recipientUserId: registration.userId || null,
      createdBy: actorUserId,
      metadata: {
        qrCodeValue: registration.qrCodeValue || null,
        qrCodeUrl,
      },
    });

    if (registration.userId) {
      await createNotificationRecord({
        userId: registration.userId,
        eventId: event.id,
        title: 'Registration Confirmed',
        message: `You are marked as going for ${event.title}.`,
        type: 'booking',
        channel: 'in_app',
        status: 'sent',
        sentAt: new Date(),
        createdBy: actorUserId,
      });

      await sendPushToUsers([registration.userId], {
        eventId: event.id,
        title: 'Registration Confirmed',
        message: `You are confirmed for ${event.title}.`,
        type: 'booking',
        createdBy: actorUserId,
        data: {
          eventId: event.id,
          registrationId: registration.id,
          type: 'registration_status_updated',
          status: 'going',
        },
      });
    }

    return;
  }

  const template = declinedRegistrationTemplate({
    ...eventContext,
    recipientName: registration.name,
  });

  await sendEmail({
    to: registration.email,
    subject: `Registration Declined: ${eventContext.eventName}`,
    html: template.html,
    text: template.text,
    type: 'registration_declined',
    eventId: event.id,
    registrationId: registration.id,
    recipientUserId: registration.userId || null,
    createdBy: actorUserId,
    metadata: {
      status: 'declined',
    },
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

    await sendPushToUsers([registration.userId], {
      eventId: event.id,
      title: 'Registration Declined',
      message: `Your registration for ${event.title} was declined.`,
      type: 'booking',
      createdBy: actorUserId,
      data: {
        eventId: event.id,
        registrationId: registration.id,
        type: 'registration_status_updated',
        status: 'declined',
      },
    });
  }
};
