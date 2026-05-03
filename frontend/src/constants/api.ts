const DEFAULT_API_URL = 'https://evoria-api-dsdbg4eadfa0a5dy.southeastasia-01.azurewebsites.net/api';

const normalizeApiBaseUrl = (rawUrl: string) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return DEFAULT_API_URL;

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  const withoutDuplicateApi = withoutTrailingSlash.replace(/\/api(?:\/api)+$/i, '/api');

  if (/\/api$/i.test(withoutDuplicateApi)) {
    return withoutDuplicateApi;
  }

  return `${withoutDuplicateApi}/api`;
};

export const API_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_URL);
