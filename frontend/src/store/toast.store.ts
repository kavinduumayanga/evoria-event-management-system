import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto dismiss
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 3000);
    }
  },
  hideToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// Helper functions for easier usage
export const Toast = {
  show: (params: Omit<ToastMessage, 'id'>) => useToastStore.getState().showToast(params),
  success: (title: string, message?: string, duration?: number) => useToastStore.getState().showToast({ type: 'success', title, message, duration }),
  error: (title: string, message?: string, duration?: number) => useToastStore.getState().showToast({ type: 'error', title, message, duration }),
  info: (title: string, message?: string, duration?: number) => useToastStore.getState().showToast({ type: 'info', title, message, duration }),
  warning: (title: string, message?: string, duration?: number) => useToastStore.getState().showToast({ type: 'warning', title, message, duration }),
};
