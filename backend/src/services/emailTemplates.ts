interface BaseTemplateInput {
  recipientName?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  locationOrLink: string;
  hostName: string;
  publicEventUrl: string;
}

interface ApprovedTemplateInput extends BaseTemplateInput {
  qrCodeValue?: string | null;
  qrCodeUrl?: string | null;
}

interface InviteTemplateInput extends BaseTemplateInput {
  inviteMessage?: string;
}

interface BlastTemplateInput extends BaseTemplateInput {
  blastSubject: string;
  blastMessage: string;
}

interface ReminderTemplateInput extends BaseTemplateInput {
  reminderTitle: string;
  reminderMessage: string;
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const baseLayout = (title: string, subtitle: string, bodyHtml: string) => {
  return `
  <div style="margin:0;padding:0;background:#0b0812;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5f3ff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0812;padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#151124;border:1px solid #352a52;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(120deg,#6d28d9,#9333ea);padding:24px;">
                <h1 style="margin:0;font-size:24px;color:#ffffff;">${escapeHtml(title)}</h1>
                <p style="margin:8px 0 0 0;font-size:14px;color:#efe7ff;">${escapeHtml(subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;line-height:1.6;color:#ddd6fe;font-size:14px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#100c1d;border-top:1px solid #2b2046;color:#9ca3af;font-size:12px;">
                Sent by Evoria Event Management Platform
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
};

const eventMetaBlock = (input: BaseTemplateInput) => {
  const publicUrlHtml = input.publicEventUrl
    ? `<p style="margin:0;"><strong>Event URL:</strong> <a href="${escapeHtml(input.publicEventUrl)}" style="color:#c4b5fd;">${escapeHtml(input.publicEventUrl)}</a></p>`
    : '';

  return `
    <div style="margin:16px 0;padding:16px;border:1px solid #3a2b5d;border-radius:12px;background:#110d1f;">
      <p style="margin:0 0 8px 0;"><strong>Event:</strong> ${escapeHtml(input.eventName)}</p>
      <p style="margin:0 0 8px 0;"><strong>Date:</strong> ${escapeHtml(input.eventDate)}</p>
      <p style="margin:0 0 8px 0;"><strong>Time:</strong> ${escapeHtml(input.eventTime)}</p>
      <p style="margin:0 0 8px 0;"><strong>Location:</strong> ${escapeHtml(input.locationOrLink)}</p>
      <p style="margin:0 0 8px 0;"><strong>Host:</strong> ${escapeHtml(input.hostName)}</p>
      ${publicUrlHtml}
    </div>
  `;
};

export const pendingRegistrationTemplate = (input: BaseTemplateInput) => {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const html = baseLayout(
    'Registration Received',
    'Your event registration is pending review',
    `
      <p>${greeting}</p>
      <p>Thanks for registering. Your registration is currently pending organizer approval.</p>
      ${eventMetaBlock(input)}
      <p>We will notify you once your registration status changes.</p>
    `,
  );

  const text = [
    `${input.recipientName ? `Hi ${input.recipientName}` : 'Hello'},`,
    'Your registration is pending review.',
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Time: ${input.eventTime}`,
    `Location: ${input.locationOrLink}`,
    `Host: ${input.hostName}`,
    `Event URL: ${input.publicEventUrl}`,
  ].join('\n');

  return { html, text };
};

export const approvedRegistrationTemplate = (input: ApprovedTemplateInput) => {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const qrHtml = input.qrCodeUrl
    ? `<p><strong>QR Check-in:</strong> <a href="${escapeHtml(input.qrCodeUrl)}" style="color:#c4b5fd;">Open QR Code</a></p>`
    : input.qrCodeValue
      ? `<p><strong>QR Check-in Token:</strong> <code style="background:#1b1430;padding:2px 6px;border-radius:6px;">${escapeHtml(input.qrCodeValue)}</code></p>`
      : '<p><strong>QR Check-in:</strong> Available in your registration details.</p>';

  const html = baseLayout(
    'Registration Approved',
    'You are confirmed for the event',
    `
      <p>${greeting}</p>
      <p>Your registration has been approved. We are excited to host you.</p>
      ${eventMetaBlock(input)}
      ${qrHtml}
      <p>Please keep your QR details ready for check-in.</p>
    `,
  );

  const text = [
    `${input.recipientName ? `Hi ${input.recipientName}` : 'Hello'},`,
    'Your registration has been approved.',
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Time: ${input.eventTime}`,
    `Location: ${input.locationOrLink}`,
    `Host: ${input.hostName}`,
    `QR Code: ${input.qrCodeUrl || input.qrCodeValue || 'Available in app'}`,
    `Event URL: ${input.publicEventUrl}`,
  ].join('\n');

  return { html, text };
};

export const declinedRegistrationTemplate = (input: BaseTemplateInput) => {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const html = baseLayout(
    'Registration Update',
    'Your registration was not approved',
    `
      <p>${greeting}</p>
      <p>Your registration has been declined by the event organizer.</p>
      ${eventMetaBlock(input)}
      <p>If you need clarification, please contact the host.</p>
    `,
  );

  const text = [
    `${input.recipientName ? `Hi ${input.recipientName}` : 'Hello'},`,
    'Your registration was declined by the host.',
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Time: ${input.eventTime}`,
    `Location: ${input.locationOrLink}`,
    `Host: ${input.hostName}`,
    `Event URL: ${input.publicEventUrl}`,
  ].join('\n');

  return { html, text };
};

export const inviteGuestTemplate = (input: InviteTemplateInput) => {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const inviteMessage = input.inviteMessage ? `<p>${escapeHtml(input.inviteMessage)}</p>` : '';

  const html = baseLayout(
    'You Are Invited',
    'An event host invited you to join an event',
    `
      <p>${greeting}</p>
      ${inviteMessage}
      <p>You are invited to this event:</p>
      ${eventMetaBlock(input)}
      <p><a href="${escapeHtml(input.publicEventUrl)}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#7c3aed;color:#fff;text-decoration:none;">View Event</a></p>
    `,
  );

  const text = [
    `${input.recipientName ? `Hi ${input.recipientName}` : 'Hello'},`,
    input.inviteMessage || 'You are invited to an event.',
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Time: ${input.eventTime}`,
    `Location: ${input.locationOrLink}`,
    `Host: ${input.hostName}`,
    `Register here: ${input.publicEventUrl}`,
  ].join('\n');

  return { html, text };
};

export const eventBlastTemplate = (input: BlastTemplateInput) => {
  const html = baseLayout(
    input.blastSubject,
    'Event announcement',
    `
      <p>${escapeHtml(input.blastMessage)}</p>
      ${eventMetaBlock(input)}
      <p>Stay tuned for more updates.</p>
    `,
  );

  const text = [
    input.blastSubject,
    input.blastMessage,
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Time: ${input.eventTime}`,
    `Location: ${input.locationOrLink}`,
    `Host: ${input.hostName}`,
    `Event URL: ${input.publicEventUrl}`,
  ].join('\n');

  return { html, text };
};

export const reminderTemplate = (input: ReminderTemplateInput) => {
  const html = baseLayout(
    input.reminderTitle,
    'Event reminder',
    `
      <p>${escapeHtml(input.reminderMessage)}</p>
      ${eventMetaBlock(input)}
      <p>See you soon.</p>
    `,
  );

  const text = [
    input.reminderTitle,
    input.reminderMessage,
    `Event: ${input.eventName}`,
    `Date: ${input.eventDate}`,
    `Time: ${input.eventTime}`,
    `Location: ${input.locationOrLink}`,
    `Host: ${input.hostName}`,
    `Event URL: ${input.publicEventUrl}`,
  ].join('\n');

  return { html, text };
};
