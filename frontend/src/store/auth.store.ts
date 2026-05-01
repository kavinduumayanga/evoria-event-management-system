import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';

export type Role = 'user' | 'host_admin' | 'attendee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  profileImage?: string;
  isActive?: boolean;
  isSuspended?: boolean;
  reportCount?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setAuthLoading: (isAuthLoading: boolean) => void;
  updateUser: (user: Partial<User>) => Promise<void>;
}

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'user';

const setAuthState = (partial: Pick<AuthState, 'user' | 'token' | 'isLoading' | 'isAuthLoading'>) => {
  const current = useAuthStore.getState();
  const hasChanges =
    current.user !== partial.user ||
    current.token !== partial.token ||
    current.isLoading !== partial.isLoading ||
    current.isAuthLoading !== partial.isAuthLoading;

  if (!hasChanges) {
    return;
  }

  useAuthStore.setState(partial);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthLoading: true,
  login: async (user, token) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    set({ user, token, isLoading: false, isAuthLoading: false });
  },
  logout: async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    set({ user: null, token: null, isLoading: false, isAuthLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  updateUser: async (updatedUser) => {
    const currentUser = get().user;
    if (!currentUser) {
      return;
    }

    const nextUser = { ...currentUser, ...updatedUser };
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    set({ user: nextUser });
  },
}));

let initAuthPromise: Promise<void> | null = null;
let hasInitializedAuth = false;

export const getPersistedAuthToken = async () => AsyncStorage.getItem(AUTH_TOKEN_KEY);

// Initialize auth state
export const initAuth = async () => {
  if (hasInitializedAuth) {
    return;
  }

  if (initAuthPromise) {
    return initAuthPromise;
  }

  initAuthPromise = (async () => {
    try {
      const current = useAuthStore.getState();
      if (!current.isAuthLoading || !current.isLoading) {
        useAuthStore.setState({ isAuthLoading: true, isLoading: true });
      }

      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUserStr = await AsyncStorage.getItem(AUTH_USER_KEY);
      const storedUser = storedUserStr ? (JSON.parse(storedUserStr) as User) : null;

      if (!token) {
        setAuthState({ user: null, token: null, isLoading: false, isAuthLoading: false });
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const apiUser = response.data?.data?.user as User | undefined;
        if (!apiUser) {
          throw new Error('Invalid user response from /auth/me');
        }

        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(apiUser));
        setAuthState({ user: apiUser, token, isLoading: false, isAuthLoading: false });
      } catch (error: any) {
        const isUnauthorized = error?.response?.status === 401;

        if (isUnauthorized || !storedUser) {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          await AsyncStorage.removeItem(AUTH_USER_KEY);
          setAuthState({ user: null, token: null, isLoading: false, isAuthLoading: false });
          return;
        }

        // Fallback to cached user if server validation fails due transient issues.
        setAuthState({ user: storedUser, token, isLoading: false, isAuthLoading: false });
      }
    } catch (error: any) {
      console.error('Failed to initialize auth state', error);
      setAuthState({ user: null, token: null, isLoading: false, isAuthLoading: false });
    } finally {
      hasInitializedAuth = true;
      initAuthPromise = null;
    }
  })();

  return initAuthPromise;
};

export const waitForAuthInitialization = async () => {
  if (hasInitializedAuth) return;
  await initAuth();
};
