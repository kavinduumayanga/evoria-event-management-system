import apiClient from './client';
import { Event, Booking, Venue, Session, TicketType, RegistrationAnswer, RsvpStatus } from '../types';
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

export interface CreateRegistrationPayload {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  rsvpStatus?: RsvpStatus;
  customAnswers?: RegistrationAnswer[];
}

export interface ApplyPromoPayload {
  ticketTypeId: string;
  quantity: number;
  promoCode: string;
  unlockCode?: string;
}

export interface MockCheckoutPayload {
  ticketTypeId: string;
  quantity: number;
  promoCode?: string;
  unlockCode?: string;
}

export interface CreateBookingPayload {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  promoCode?: string;
  unlockCode?: string;
}

export interface GuestRecord {
  id: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  totalAmount: number;
  bookingStatus: 'pending' | 'confirmed' | 'cancelled';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rsvpStatus: 'going' | 'not_going';
  checkInStatus: 'not_checked_in' | 'checked_in';
  createdAt: string;
  updatedAt: string;
  guestName: string;
  guestEmail: string;
  ticketName: string;
}

export interface CreateNotificationPayload {
  userIds?: string[];
  eventId?: string;
  title: string;
  message: string;
  type?: 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
  channel?: 'in_app' | 'email_mock' | 'sms_mock';
  scheduledAt?: string;
}

export interface EventBlastPayload {
  title: string;
  message: string;
  type?: 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
  channel?: 'in_app' | 'email_mock' | 'sms_mock';
  scheduledAt?: string;
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
  getTicket: async (id: string) => {
    const response = await apiClient.get(`/tickets/${id}`);
    return response.data;
  },
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
  },
  applyPromo: async (payload: ApplyPromoPayload) => {
    const response = await apiClient.post('/tickets/apply-promo', payload);
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
  createBooking: async (data: CreateBookingPayload) => {
    const response = await apiClient.post('/bookings', data);
    return response.data;
  },
  getBooking: async (id: string) => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  },
  cancelBooking: async (id: string) => {
    const response = await apiClient.patch(`/bookings/${id}/cancel`);
    return response.data;
  },
  refundBooking: async (id: string) => {
    const response = await apiClient.patch(`/bookings/${id}/refund`);
    return response.data;
  },
};

export const PaymentService = {
  mockCheckout: async (payload: MockCheckoutPayload) => {
    const response = await apiClient.post('/payments/mock-checkout', payload);
    return response.data;
  },
};

export const RegistrationService = {
  createRegistration: async (payload: CreateRegistrationPayload) => {
    const response = await apiClient.post('/registrations', payload);
    return response.data;
  },
  getMyRegistrations: async () => {
    const response = await apiClient.get('/registrations/my');
    return response.data;
  },
  getEventRegistrations: async (eventId: string) => {
    const response = await apiClient.get(`/registrations/event/${eventId}`);
    return response.data;
  },
  updateRsvp: async (registrationId: string, rsvpStatus: RsvpStatus) => {
    const response = await apiClient.patch(`/registrations/${registrationId}/rsvp`, { rsvpStatus });
    return response.data;
  },
  approveRegistration: async (registrationId: string) => {
    const response = await apiClient.patch(`/registrations/${registrationId}/approve`);
    return response.data;
  },
  rejectRegistration: async (registrationId: string) => {
    const response = await apiClient.patch(`/registrations/${registrationId}/reject`);
    return response.data;
  },
};

export const GuestService = {
  getEventGuests: async (eventId: string, params?: { status?: string; search?: string; date?: string }) => {
    const response = await apiClient.get(`/guests/event/${eventId}`, { params });
    return response.data;
  },
  updateGuestStatus: async (id: string, approvalStatus: 'pending' | 'approved' | 'rejected') => {
    const response = await apiClient.patch(`/guests/${id}/status`, { approvalStatus });
    return response.data;
  },
  checkInGuest: async (id: string) => {
    const response = await apiClient.patch(`/guests/${id}/checkin`);
    return response.data;
  },
  bulkAction: async (payload: { action: 'approve' | 'reject' | 'checkin'; ids: string[] }) => {
    const response = await apiClient.post('/guests/bulk-action', payload);
    return response.data;
  },
  exportEventGuests: async (eventId: string, params?: { status?: string; search?: string; date?: string }) => {
    const response = await apiClient.get(`/guests/export/${eventId}`, {
      params,
      responseType: 'text',
    });
    return response.data as string;
  },
};

export const CheckInService = {
  getBookingQr: async (bookingId: string) => {
    const response = await apiClient.get(`/checkins/qr/${bookingId}`);
    return response.data;
  },
  scanQr: async (qrCodeValue: string) => {
    const response = await apiClient.post('/checkins/scan', { qrCodeValue });
    return response.data;
  },
  manualCheckIn: async (bookingId: string, attendanceNote?: string) => {
    const response = await apiClient.patch(`/checkins/${bookingId}/manual`, {
      attendanceNote,
    });
    return response.data;
  },
  getEventAttendance: async (eventId: string) => {
    const response = await apiClient.get(`/checkins/event/${eventId}`);
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

export const NotificationService = {
  createNotification: async (payload: CreateNotificationPayload) => {
    const response = await apiClient.post('/notifications', payload);
    return response.data;
  },
  eventBlast: async (eventId: string, payload: EventBlastPayload) => {
    const response = await apiClient.post(`/notifications/event-blast/${eventId}`, payload);
    return response.data;
  },
  getMyNotifications: async () => {
    const response = await apiClient.get('/notifications/my');
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },
  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },
  getEventNotifications: async (eventId: string) => {
    const response = await apiClient.get(`/notifications/event/${eventId}`);
    return response.data;
  },
  processScheduled: async () => {
    const response = await apiClient.post('/notifications/process-scheduled');
    return response.data;
  },
};
