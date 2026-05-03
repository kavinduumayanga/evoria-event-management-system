import axios from 'axios';
import { Alert } from 'react-native';
import { API_URL } from '../constants/api';
import {
  getPersistedAuthToken,
  useAuthStore,
  waitForAuthInitialization,
} from '../store/auth.store';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_OPTIONAL_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
  '/public/',
];

const isAuthOptionalRequest = (url: string | undefined) => {
  const normalized = String(url || '').toLowerCase();
  return AUTH_OPTIONAL_PATHS.some((path) => normalized.includes(path));
};

const resolveAuthToken = async () => {
  const inMemoryToken = useAuthStore.getState().token;
  if (inMemoryToken) {
    return inMemoryToken;
  }

  return getPersistedAuthToken();
};

let unauthorizedHandlerPromise: Promise<void> | null = null;
let hasShownSessionExpiredAlert = false;

const handleUnauthorizedSession = async () => {
  if (unauthorizedHandlerPromise) {
    return unauthorizedHandlerPromise;
  }

  unauthorizedHandlerPromise = (async () => {
    await useAuthStore.getState().logout();

    if (!hasShownSessionExpiredAlert) {
      hasShownSessionExpiredAlert = true;
      Alert.alert('Session Expired', 'Your session expired. Please sign in again.');
    }
  })().finally(() => {
    unauthorizedHandlerPromise = null;
  });

  return unauthorizedHandlerPromise;
};

const shouldHandleUnauthorizedError = async (error: any) => {
  if (error?.response?.status !== 401) {
    return false;
  }

  const requestUrl = String(error?.config?.url || '');
  if (isAuthOptionalRequest(requestUrl)) {
    const hasInMemorySession = Boolean(useAuthStore.getState().token);
    const hasPersistedSession = Boolean(await getPersistedAuthToken());
    return hasInMemorySession || hasPersistedSession;
  }

  return true;
};

apiClient.interceptors.request.use(
  async (config) => {
    if (!isAuthOptionalRequest(config.url)) {
      await waitForAuthInitialization();
    }

    const token = await resolveAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    const requestUrl = String(response?.config?.url || '').toLowerCase();
    if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
      hasShownSessionExpiredAlert = false;
    }

    return response;
  },
  async (error) => {
    if (await shouldHandleUnauthorizedError(error)) {
      await handleUnauthorizedSession();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
