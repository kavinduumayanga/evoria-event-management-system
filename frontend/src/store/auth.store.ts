import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'host_admin' | 'attendee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  profileImage?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  login: async (user, token) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isLoading: false });
  },
  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    set({ user: null, token: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
  updateUser: (updatedUser) => set((state) => ({ 
    user: state.user ? { ...state.user, ...updatedUser } : null 
  })),
}));

// Initialize auth state
export const initAuth = async () => {
  const store = useAuthStore.getState();
  try {
    store.setLoading(true);
    const token = await AsyncStorage.getItem('auth_token');
    const userStr = await AsyncStorage.getItem('user');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      // Validate token structure if needed, or rely on API interceptors
      useAuthStore.setState({ user, token, isLoading: false });
    } else {
      store.setLoading(false);
    }
  } catch (error) {
    console.error('Failed to initialize auth state', error);
    store.setLoading(false);
  }
};
