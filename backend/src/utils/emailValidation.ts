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

export type UserAccountEmailValidationReason =
  | 'empty'
  | 'invalid_format'
  | 'blocked_exact_email'
  | 'blocked_domain'
  | 'blocked_example_domain'
  | 'blocked_disposable_domain';

export interface UserAccountEmailValidationResult {
  normalizedEmail: string;
  isValid: boolean;
  reason?: UserAccountEmailValidationReason;
  message?: string;
  domain: string;
  localPart: string;
}

export const normalizeEmail = (value: string): string => String(value || '').trim().toLowerCase();

const splitEmail = (normalizedEmail: string) => {
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex < 0) {
    return { localPart: '', domain: '' };
  }

  return {
    localPart: normalizedEmail.slice(0, atIndex),
    domain: normalizedEmail.slice(atIndex + 1),
  };
};

const isExampleDomain = (domain: string) => domain === 'example' || domain.startsWith('example.');

const isBlockedDisposableDomain = (domain: string) => {
  if (BLOCKED_EXACT_DOMAINS.has(domain)) return true;
  return BLOCKED_DOMAIN_PARTIALS.some((keyword) => domain.includes(keyword));
};

export const validateUserAccountEmail = (rawEmail: string): UserAccountEmailValidationResult => {
  const normalizedEmail = normalizeEmail(rawEmail);
  const { localPart, domain } = splitEmail(normalizedEmail);

  if (!normalizedEmail) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'empty',
      message: 'Email is required',
      localPart,
      domain,
    };
  }

  if (!STRICT_EMAIL_REGEX.test(normalizedEmail)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'invalid_format',
      message: 'Please provide a valid email address',
      localPart,
      domain,
    };
  }

  if (BLOCKED_EXACT_EMAILS.has(normalizedEmail)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_exact_email',
      message: 'Please use a real email address that you can access',
      localPart,
      domain,
    };
  }

  if (isExampleDomain(domain)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_example_domain',
      message: 'Example domains are not allowed. Please use a real email address',
      localPart,
      domain,
    };
  }

  if (BLOCKED_EXACT_DOMAINS.has(domain)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_domain',
      message: 'This email domain is not allowed. Please use a real email provider',
      localPart,
      domain,
    };
  }

  if (isBlockedDisposableDomain(domain)) {
    return {
      normalizedEmail,
      isValid: false,
      reason: 'blocked_disposable_domain',
      message: 'Disposable or temporary email addresses are not allowed',
      localPart,
      domain,
    };
  }

  return {
    normalizedEmail,
    isValid: true,
    localPart,
    domain,
  };
};

export const isLikelyBlockedEmailForUi = (rawEmail: string): { blocked: boolean; message?: string } => {
  const result = validateUserAccountEmail(rawEmail);
  if (result.isValid) {
    return { blocked: false };
  }

  if (result.reason === 'invalid_format' || result.reason === 'empty') {
    return { blocked: false };
  }

  return {
    blocked: true,
    message: result.message || 'Please use a real email address',
  };
};
