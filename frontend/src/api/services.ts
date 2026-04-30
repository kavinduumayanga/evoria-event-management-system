import apiClient from './client';
import { Event, Booking, Venue, Session, TicketType } from '../types';
import { Role } from '../store/auth.store';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  profileImage?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const AuthService = {
  register: async (payload: RegisterPayload) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },
  login: async (payload: LoginPayload) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },
  forgotPassword: async (payload: ForgotPasswordPayload) => {
    const response = await apiClient.post('/auth/forgot-password', payload);
    return response.data;
  },
  resetPassword: async (payload: ResetPasswordPayload) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },
  googleLogin: async () => {
    const response = await apiClient.post('/auth/google');
    return response.data;
  },
};

export const EventService = {
  getEvents: async () => {
    const response = await apiClient.get('/events');
    return response.data;
  },
  getEvent: async (id: string) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },
  getHostEvents: async (hostId: string) => {
    const response = await apiClient.get(`/events/host/${hostId}`);
    return response.data;
  },
  createEvent: async (data: Partial<Event>) => {
    const response = await apiClient.post('/events', data);
    return response.data;
  },
  updateEvent: async (id: string, data: Partial<Event>) => {
    const response = await apiClient.put(`/events/${id}`, data);
    return response.data;
  },
  deleteEvent: async (id: string) => {
    const response = await apiClient.delete(`/events/${id}`);
    return response.data;
  },
  updateEventStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/events/${id}/status`, { status });
    return response.data;
  }
};

export const TicketService = {
  getEventTickets: async (eventId: string) => {
    const response = await apiClient.get(`/tickets/event/${eventId}`);
    return response.data;
  },
  createTicket: async (data: Partial<TicketType>) => {
    const response = await apiClient.post('/tickets', data);
    return response.data;
  },
  updateTicket: async (id: string, data: Partial<TicketType>) => {
    const response = await apiClient.put(`/tickets/${id}`, data);
    return response.data;
  },
  deleteTicket: async (id: string) => {
    const response = await apiClient.delete(`/tickets/${id}`);
    return response.data;
  }
};

export const BookingService = {
  getMyBookings: async () => {
    const response = await apiClient.get('/bookings/my');
    return response.data;
  },
  getBookings: async () => {
    const response = await apiClient.get('/bookings');
    return response.data;
  },
  getEventBookings: async (eventId: string) => {
    const response = await apiClient.get(`/bookings/event/${eventId}`);
    return response.data;
  },
  createBooking: async (data: Partial<Booking>) => {
    const response = await apiClient.post('/bookings', data);
    return response.data;
  },
  cancelBooking: async (id: string) => {
    const response = await apiClient.patch(`/bookings/${id}/cancel`);
    return response.data;
  },
};

export const VenueService = {
  getVenues: async () => {
    const response = await apiClient.get('/venues');
    return response.data;
  },
  getVenue: async (id: string) => {
    const response = await apiClient.get(`/venues/${id}`);
    return response.data;
  },
  createVenue: async (data: Partial<Venue>) => {
    const response = await apiClient.post('/venues', data);
    return response.data;
  },
  updateVenue: async (id: string, data: Partial<Venue>) => {
    const response = await apiClient.put(`/venues/${id}`, data);
    return response.data;
  },
  deleteVenue: async (id: string) => {
    const response = await apiClient.delete(`/venues/${id}`);
    return response.data;
  }
};

export const SessionService = {
  getSessions: async () => {
    const response = await apiClient.get('/sessions');
    return response.data;
  },
  getEventSessions: async (eventId: string) => {
    const response = await apiClient.get(`/sessions/event/${eventId}`);
    return response.data;
  },
  createSession: async (data: Partial<Session>) => {
    const response = await apiClient.post('/sessions', data);
    return response.data;
  },
  updateSession: async (id: string, data: Partial<Session>) => {
    const response = await apiClient.put(`/sessions/${id}`, data);
    return response.data;
  },
  deleteSession: async (id: string) => {
    const response = await apiClient.delete(`/sessions/${id}`);
    return response.data;
  }
};

export const UserService = {
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  updateProfile: async (payload: UpdateProfilePayload) => {
    const response = await apiClient.put('/users/profile', payload);
    return response.data;
  },
  changePassword: async (payload: ChangePasswordPayload) => {
    const response = await apiClient.put('/users/password', payload);
    return response.data;
  },
  deactivateAccount: async () => {
    const response = await apiClient.patch('/users/deactivate');
    return response.data;
  },
};
