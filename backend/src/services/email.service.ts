import nodemailer, { Transporter } from 'nodemailer';
import { EmailLogModel } from '../models/EmailLog';

export type EmailProvider = 'mock' | 'gmail';
export type EmailLogType =
  | 'registration_pending'
  | 'registration_confirmed'
  | 'registration_declined'
  | 'invite'
  | 'blast'
  | 'reminder'
  | 'system';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: EmailLogType;
  eventId?: string | null;
  registrationId?: string | null;
  recipientUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

interface SendEmailResult {
  status: 'sent' | 'failed' | 'mock';
  provider: EmailProvider;
  errorMessage: string | null;
}

let cachedTransporter: Transporter | null = null;
let cachedGmailUser = '';
let cachedGmailPassword = '';

const normalizeProvider = (): EmailProvider => {
  const raw = String(process.env.EMAIL_PROVIDER || 'gmail').trim().toLowerCase();
  if (raw === 'gmail' || raw === 'mock') return raw;
  return 'gmail';
};

const normalizeEmailFrom = (): string => {
  const value = String(process.env.EMAIL_FROM || '').trim();
  return value || 'no-reply@evoria.local';
};

const sanitizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const htmlToText = (html: string): string => {
  return sanitizeText(
    html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'"),
  );
};

const getGmailCredentials = () => {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').trim();
  return { user, pass };
};

const getGmailTransporter = () => {
  const { user, pass } = getGmailCredentials();
  if (!user || !pass) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not configured');
  }

  if (!cachedTransporter || cachedGmailUser !== user || cachedGmailPassword !== pass) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });

    cachedGmailUser = user;
    cachedGmailPassword = pass;
  }

  return cachedTransporter;
};

const sendWithGmail = async (input: SendEmailInput): Promise<void> => {
  const transporter = getGmailTransporter();

  await transporter.sendMail({
    from: normalizeEmailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text || htmlToText(input.html),
  });
};

const persistEmailLog = async (
  input: SendEmailInput,
  outcome: SendEmailResult,
) => {
  return EmailLogModel.create({
    recipientEmail: input.to.trim().toLowerCase(),
    recipientUserId: input.recipientUserId || null,
    eventId: input.eventId || null,
    registrationId: input.registrationId || null,
    subject: input.subject.trim(),
    message: (input.text || htmlToText(input.html) || input.subject).slice(0, 5000),
    type: input.type || 'system',
    status: outcome.status,
    errorMessage: outcome.errorMessage,
    provider: outcome.provider,
    metadata: input.metadata || null,
    createdBy: input.createdBy || null,
    sentAt: new Date(),
  });
};

const shouldFallbackToMock = (provider: EmailProvider) => {
  if (provider === 'mock') return true;

  const { user, pass } = getGmailCredentials();
  return !user || !pass;
};

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const normalizedTo = String(input.to || '').trim().toLowerCase();
  if (!normalizedTo) {
    throw new Error('Recipient email is required');
  }

  const emailInput: SendEmailInput = {
    ...input,
    to: normalizedTo,
    subject: String(input.subject || '').trim() || 'Evoria Notification',
    html: String(input.html || '').trim() || `<p>${String(input.text || '').trim()}</p>`,
    text: input.text ? String(input.text).trim() : undefined,
  };

  const provider = normalizeProvider();

  if (shouldFallbackToMock(provider)) {
    const result: SendEmailResult = {
      status: 'mock',
      provider: 'mock',
      errorMessage: null,
    };
    await persistEmailLog(emailInput, result);
    return result;
  }

  try {
    await sendWithGmail(emailInput);

    const result: SendEmailResult = {
      status: 'sent',
      provider: 'gmail',
      errorMessage: null,
    };
    await persistEmailLog(emailInput, result);
    return result;
  } catch (error: any) {
    const errorMessage = String(error?.message || 'Email send failed');

    const result: SendEmailResult = {
      status: 'failed',
      provider: 'gmail',
      errorMessage,
    };

    await persistEmailLog(emailInput, result);

    return result;
  }
};

export const sendBulkEmails = async (inputs: SendEmailInput[]) => {
  if (!inputs.length) return [];
  const results = await Promise.all(inputs.map((input) => sendEmail(input)));
  return results;
};
