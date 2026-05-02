const warnedKeys = new Set<string>();

type DevWarnOptions = {
  key: string;
  message: string;
};

const warnOnce = ({ key, message }: DevWarnOptions) => {
  if (!__DEV__) return;
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
};

const normalizeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const safeString = (value: unknown, fallback = ''): string => {
  const normalized = normalizeString(value);
  return normalized.length ? normalized : fallback;
};

export const safeUpper = (value: unknown, fallback = ''): string => {
  const normalized = safeString(value, fallback);
  return normalized.toUpperCase();
};

export const safeLower = (value: unknown, fallback = ''): string => {
  const normalized = safeString(value, fallback);
  return normalized.toLowerCase();
};

export const safeTitle = (value: unknown, fallback = 'Untitled'): string => {
  const normalized = normalizeString(value).trim();
  if (!normalized) {
    warnOnce({
      key: 'missing-title',
      message: 'Missing title value while rendering. Using fallback label.',
    });
    return fallback;
  }
  return normalized;
};

export const safeInitials = (value: unknown, fallback = 'U'): string => {
  const normalized = normalizeString(value).trim();
  if (!normalized) return fallback;
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const safeStatus = (value: unknown, fallback = 'unknown'): string => {
  const normalized = normalizeString(value).trim();
  if (!normalized) {
    warnOnce({
      key: 'missing-status',
      message: 'Missing status value while rendering. Using fallback label.',
    });
    return fallback;
  }
  return normalized;
};

type DateFormatOptions = Intl.DateTimeFormatOptions;

type SafeDateOptions = {
  fallback?: string;
  options?: DateFormatOptions;
};

export const formatSafeDate = (value: unknown, fallback = 'Date unavailable', options?: DateFormatOptions): string => {
  const raw = normalizeString(value).trim();
  if (!raw) {
    warnOnce({
      key: 'missing-date',
      message: 'Missing date value while rendering. Using fallback label.',
    });
    return fallback;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  const hasTime = Boolean(options?.hour || options?.minute || options?.second || options?.hour12 !== undefined);
  return hasTime
    ? parsed.toLocaleString('en-US', options)
    : parsed.toLocaleDateString('en-US', options);
};

export const formatSafeTime = (value: unknown, fallback = 'Time unavailable', options?: DateFormatOptions): string => {
  const raw = normalizeString(value).trim();
  if (!raw) {
    warnOnce({
      key: 'missing-time',
      message: 'Missing time value while rendering. Using fallback label.',
    });
    return fallback;
  }

  if (/^\d{1,2}:\d{2}/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toLocaleTimeString('en-US', options ?? { hour: '2-digit', minute: '2-digit' });
};

export const logDevMissing = (key: string, message: string) => {
  warnOnce({ key, message });
};
