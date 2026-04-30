import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';

export type Role = 'host_admin' | 'attendee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  profileImage?: string;
  isActive?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  updateUser: (user: Partial<User>) => Promise<void>;
}

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  login: async (user, token) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    set({ user, token, isLoading: false });
  },
  logout: async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    set({ user: null, token: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
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

// Initialize auth state
export const initAuth = async () => {
  const store = useAuthStore.getState();

  try {
    store.setLoading(true);

    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    const storedUserStr = await AsyncStorage.getItem(AUTH_USER_KEY);
    const storedUser = storedUserStr ? (JSON.parse(storedUserStr) as User) : null;

    if (!token) {
      useAuthStore.setState({ user: null, token: null, isLoading: false });
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
      useAuthStore.setState({ user: apiUser, token, isLoading: false });
    } catch (error: any) {
      const isUnauthorized = error?.response?.status === 401;

      if (isUnauthorized || !storedUser) {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(AUTH_USER_KEY);
        useAuthStore.setState({ user: null, token: null, isLoading: false });
        return;
      }

      // Fallback to cached user if server validation fails due transient issues.
      useAuthStore.setState({ user: storedUser, token, isLoading: false });
    }
  } catch (error) {
    console.error('Failed to initialize auth state', error);
    useAuthStore.setState({ user: null, token: null, isLoading: false });
  }
};
