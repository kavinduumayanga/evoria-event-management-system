const STRICT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

const BLOCKED_EXACT_EMAILS = new Set([
  'test@test.com',
  'fake@fake.com',
  'mock@mock.com',
  'abc@abc.com',
  'user@example.com',
]);

const BLOCKED_EXACT_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'fake.com',
  'mock.com',
  'abc.com',
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'yopmail.com',
  'throwawaymail.com',
  'getnada.com',
  'sharklasers.com',
]);

const BLOCKED_DOMAIN_PARTIALS = [
  'mailinator',
  'tempmail',
  '10minutemail',
  'guerrillamail',
  'yopmail',
  'throwawaymail',
  'getnada',
  'sharklasers',
] as const;

export type EmailValidationReason =
  | 'empty'
  | 'invalid_format'
  | 'blocked_exact_email'
  | 'blocked_domain'
  | 'blocked_example_domain'
  | 'blocked_disposable_domain';

export interface EmailValidationResult {
  normalizedEmail: string;
  isValid: boolean;
  reason?: EmailValidationReason;
  message?: string;
}

export const normalizeEmail = (value: string): string => String(value || '').trim().toLowerCase();

const splitEmail = (normalizedEmail: string) => {
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex < 0) return { localPart: '', domain: '' };

  return {
    localPart: normalizedEmail.slice(0, atIndex),
    domain: normalizedEmail.slice(atIndex + 1),
  };
};

const isExampleDomain = (domain: string) => domain === 'example' || domain.startsWith('example.');

const isDisposableDomain = (domain: string) => {
  if (BLOCKED_EXACT_DOMAINS.has(domain)) return true;
  return BLOCKED_DOMAIN_PARTIALS.some((keyword) => domain.includes(keyword));
};

export const validateAccountEmail = (email: string): EmailValidationResult => {
  const normalizedEmail = normalizeEmail(email);
  const { domain } = splitEmail(normalizedEmail);

  if (!normalizedEmail) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'empty',
      message: 'Email is required',
    };
  }

  if (!STRICT_EMAIL_REGEX.test(normalizedEmail)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'invalid_format',
      message: 'Please enter a valid email address.',
    };
  }

  if (BLOCKED_EXACT_EMAILS.has(normalizedEmail)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_exact_email',
      message: 'Please use a real email address that you can access.',
    };
  }

  if (isExampleDomain(domain)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_example_domain',
      message: 'Example domains are not allowed. Please use a real email address.',
    };
  }

  if (BLOCKED_EXACT_DOMAINS.has(domain)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_domain',
      message: 'This email domain is not allowed.',
    };
  }

  if (isDisposableDomain(domain)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_disposable_domain',
      message: 'Disposable or temporary email addresses are not allowed.',
    };
  }

  return {
    normalizedEmail,
    isValid: true,
  };
};
