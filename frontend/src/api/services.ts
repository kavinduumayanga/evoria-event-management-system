import apiClient from './client';
import {
  Event,
  Booking,
  Venue,
  Session,
  TicketType,
  RegistrationAnswer,
  RsvpStatus,
  EventRegistration,
  EventRegistrationStatus,
  EventCustomQuestion,
  EventReminder,
  CheckInHistoryRecord,
  EventReview,
} from '../types';
import { API_URL } from '../constants/api';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
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

export interface PublicEventRegistrationPayload {
  name: string;
  email: string;
  mobile: string;
  nic: string;
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
  ticketTypeId?: string;
  quantity: number;
  promoCode?: string;
  unlockCode?: string;
  customAnswers?: RegistrationAnswer[];
  allowWaitlist?: boolean;
}

export interface CreateReportPayload {
  targetType: 'event' | 'user';
  targetId: string;
  reason: string;
}

export interface GuestRecord {
  id: string;
  registrationId: string;
  eventId: string;
  userId: string | null;
  name: string;
  email: string;
  mobile: string;
  nic: string;
  status: EventRegistrationStatus;
  qrCodeValue: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkInMethod: 'qr' | 'manual' | null;
  attendanceNote: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationPayload {
  userIds?: string[];
  eventId?: string;
  title: string;
  message: string;
  type?: 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
  channel?: 'in_app' | 'push' | 'email_mock' | 'sms_mock';
  scheduledAt?: string;
}

export interface EventBlastPayload {
  title: string;
  message: string;
  type?: 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
  channel?: 'in_app' | 'push' | 'email_mock' | 'sms_mock';
  scheduledAt?: string;
}

export interface EventSearchParams {
  q?: string;
  category?: string;
  city?: string;
  tags?: string;
  date?: string;
}

export interface AddEventAdminPayload {
  email: string;
}

export interface EventInvitePayload {
  email: string;
  message?: string;
}

export interface EventBroadcastPayload {
  subject?: string;
  title?: string;
  message: string;
}

export interface EventCommunicationEntry {
  id: string;
  source: 'email_log' | 'in_app_notification';
  channel: 'in_app' | 'push' | 'email_mock' | 'sms_mock' | 'email';
  recipientUserId: string | null;
  recipientEmail: string | null;
  subject: string;
  message: string;
  type: string;
  status: string;
  createdBy: string | null;
  createdAt: string;
  sentAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface PushTokenPayload {
  expoPushToken: string;
  deviceInfo?: {
    platform?: string;
    deviceName?: string;
    appVersion?: string;
    osVersion?: string;
  };
}

export interface EventReminderPayload {
  title: string;
  message: string;
  scheduledAt: string;
  channels: Array<'email' | 'push'>;
}

export interface EventDashboardData {
  totalRegistrations: number;
  pendingCount: number;
  goingCount: number;
  declinedCount: number;
  checkedInCount: number;
  capacity: {
    used: number;
    total: number;
    percentage: number;
  };
  ticketsSold: number;
  revenue: number;
  remindersCount: number;
  feedback: {
    averageRating: number;
    totalReviews: number;
  };
  recentRegistrations: Array<{
    id: string;
    source: 'registration' | 'booking';
    name: string;
    email: string;
    status: string;
    registeredAt: string;
    checkedInAt: string | null;
  }>;
  recentCheckIns: Array<{
    id: string;
    qrCodeValue: string;
    result: 'success' | 'duplicate' | 'invalid' | 'rejected';
    reason: string;
    scannedAt: string;
    scannedBy: {
      id: string;
      name: string;
      email: string | null;
    };
    guest: {
      registrationId?: string;
      name: string;
      email: string;
    } | null;
  }>;
}

export interface EventReviewPayload {
  registrationId?: string;
  rating: number;
  comment?: string;
}

export interface PublicEventDetails {
  event: {
    id: string;
    publicSlug: string;
    publicUrl: string;
    title: string;
    topic: string;
    image: string | null;
    branding: {
      primaryColor: string;
      accentColor: string;
    };
    host: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      profileImage: string | null;
    } | null;
    contactDetails: {
      name: string;
      email: string;
      phone: string;
    };
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    bookingCount: number;
    type: 'online' | 'physical' | 'hybrid';
    pricingMode: 'free' | 'ticketed';
    visibility: 'public' | 'private' | 'unlisted';
    about: string;
    description: string;
    location: {
      label: string;
      name: string;
      address: string;
      lat: number | null;
      lng: number | null;
      city: string;
      venue: {
        id: string;
        name: string;
        address: string;
        city: string;
        type: 'physical' | 'online' | 'hybrid';
        contactInfo: string;
      } | null;
      meetingLink: string;
    };
    isManageableByCurrentUser: boolean;
  };
  agenda: {
    sessions: Array<{
      id: string;
      title: string;
      description: string;
      speakerName: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      hallOrRoom: string;
      bannerImage: string;
      status: 'scheduled' | 'cancelled' | 'completed';
    }>;
  };
  tickets: Array<{
    id: string;
    name: string;
    description: string;
    isFree: boolean;
    price: number;
    currency: string;
    remaining: number;
    quantity: number;
    soldCount: number;
    maxPerUser: number;
  }>;
  freeRegistrationOptions: Array<{
    id: string;
    name: string;
    description: string;
    isFree: boolean;
    price: number;
    currency: string;
    remaining: number;
    quantity: number;
    soldCount: number;
    maxPerUser: number;
  }>;
  registrationFields: {
    defaultFields: Array<{
      key: 'name' | 'email' | 'mobile' | 'nic';
      label: string;
      required: boolean;
    }>;
    customQuestions: EventCustomQuestion[];
  };
  visibilityInfo: {
    visibility: 'public' | 'private' | 'unlisted';
    discoveryVisible: boolean;
    accessibleByUrl: boolean;
    privateAccess: boolean;
  };
}

const inferImageMimeType = (uri: string): string => {
  const extension = (uri.split('.').pop() || '').toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
};

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

export const UploadService = {
  uploadEventImage: async (uri: string) => {
    const formData = new FormData();
    const extension = (uri.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = extension.replace(/[^a-z0-9]/g, '') || 'jpg';

    formData.append('image', {
      uri,
      name: `event-image-${Date.now()}.${safeExt}`,
      type: inferImageMimeType(uri),
    } as any);

    const response = await apiClient.post('/uploads/event-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as { status: string; data: { url: string } };
  },
  uploadProfileImage: async (uri: string) => {
    const formData = new FormData();
    const extension = (uri.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = extension.replace(/[^a-z0-9]/g, '') || 'jpg';

    formData.append('image', {
      uri,
      name: `profile-image-${Date.now()}.${safeExt}`,
      type: inferImageMimeType(uri),
    } as any);

    const response = await apiClient.post('/uploads/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as { status: string; data: { url: string } };
  },
  uploadSessionImage: async (uri: string) => {
    const formData = new FormData();
    const extension = (uri.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = extension.replace(/[^a-z0-9]/g, '') || 'jpg';

    formData.append('image', {
      uri,
      name: `session-image-${Date.now()}.${safeExt}`,
      type: inferImageMimeType(uri),
    } as any);

    const response = await apiClient.post('/uploads/session-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data as { status: string; data: { url: string } };
  },
};

export const EventService = {
  getEvents: async () => {
    const response = await apiClient.get('/events');
    return response.data;
  },
  searchEvents: async (params: EventSearchParams) => {
    const response = await apiClient.get('/events/search', { params });
    return response.data;
  },
  getDiscoverEvents: async (params: EventSearchParams = {}) => {
    try {
      const response = await apiClient.get('/events/discover', { params });
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMessage = String(error?.response?.data?.message || '').toLowerCase();
      const isMissingDiscoverRoute = status === 404 || serverMessage.includes('event not found');

      // Backward compatibility for environments where /events/discover is not deployed yet.
      if (isMissingDiscoverRoute) {
        const fallbackResponse = await apiClient.get('/events/search', { params });
        return fallbackResponse.data;
      }

      throw error;
    }
  },
  getTrendingEvents: async (limit = 10) => {
    const response = await apiClient.get('/events/trending', { params: { limit } });
    return response.data;
  },
  getRecommendedEvents: async (params: { eventId?: string; category?: string; city?: string; tags?: string; limit?: number }) => {
    const response = await apiClient.get('/events/recommended', { params });
    return response.data;
  },
  incrementView: async (id: string) => {
    const response = await apiClient.patch(`/events/${id}/view`);
    return response.data;
  },
  getEventCalendar: async (id: string, download = false) => {
    const endpoint = download ? `/events/${id}/calendar.ics` : `/events/${id}/calendar`;
    const response = await apiClient.get(endpoint, {
      responseType: download ? 'text' : 'json',
    });
    return response.data;
  },
  getCalendarIcsUrl: (id: string) => {
    const trimmedBase = API_URL.replace(/\/+$/, '');
    return `${trimmedBase}/events/${id}/calendar.ics`;
  },
  getEvent: async (id: string) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },
  getPublicEventBySlug: async (slug: string) => {
    const response = await apiClient.get(`/public/events/${slug}`);
    return response.data as { status: string; data: PublicEventDetails };
  },
  buildPublicEventUrl: (slug: string) => {
    const trimmedBase = API_URL.replace(/\/+$/, '');
    return `${trimmedBase}/public/events/${slug}`;
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
  },
  updateEventVisibility: async (id: string, visibility: 'public' | 'private' | 'unlisted') => {
    const response = await apiClient.patch(`/events/${id}/visibility`, { visibility });
    return response.data;
  },
  updateRegistrationFields: async (eventId: string, customQuestions: EventCustomQuestion[]) => {
    const response = await apiClient.patch(`/events/${eventId}/registration-fields`, { customQuestions });
    return response.data;
  },
  addEventAdmin: async (id: string, payload: AddEventAdminPayload) => {
    const response = await apiClient.post(`/events/${id}/admins`, payload);
    return response.data;
  },
  removeEventAdmin: async (id: string, userId: string) => {
    const response = await apiClient.delete(`/events/${id}/admins/${userId}`);
    return response.data;
  },
  inviteGuest: async (eventId: string, payload: EventInvitePayload) => {
    const response = await apiClient.post(`/events/${eventId}/invite`, payload);
    return response.data as {
      status: string;
      message: string;
      data: {
        invite: Record<string, unknown>;
        publicUrl: string;
      };
    };
  },
  blastMessage: async (eventId: string, payload: EventBroadcastPayload) => {
    const response = await apiClient.post(`/events/${eventId}/blast`, payload);
    return response.data as {
      status: string;
      message: string;
      results: number;
      data: {
        publicUrl: string;
        recipients: number;
        inAppRecipients: number;
        emailLogs: Array<Record<string, unknown>>;
      };
    };
  },
  getEventCommunications: async (eventId: string, limit = 100) => {
    const response = await apiClient.get(`/events/${eventId}/communications`, {
      params: { limit },
    });
    return response.data as {
      status: string;
      results: number;
      data: {
        communications: EventCommunicationEntry[];
      };
    };
  },
  getEventDashboard: async (eventId: string) => {
    const response = await apiClient.get(`/events/${eventId}/dashboard`);
    return response.data as { status: string; data: EventDashboardData };
  },
  createReminder: async (eventId: string, payload: EventReminderPayload) => {
    const response = await apiClient.post(`/events/${eventId}/reminders`, payload);
    return response.data as { status: string; data: { reminder: EventReminder } };
  },
  getReminders: async (eventId: string, params?: { status?: 'scheduled' | 'sent' | 'failed'; limit?: number }) => {
    const response = await apiClient.get(`/events/${eventId}/reminders`, { params });
    return response.data as { status: string; results: number; data: { reminders: EventReminder[] } };
  },
  deleteReminder: async (id: string) => {
    const response = await apiClient.delete(`/reminders/${id}`);
    return response.data;
  },
  processDueReminders: async (payload?: { eventId?: string; limit?: number }) => {
    const response = await apiClient.post('/reminders/process-due', payload || {});
    return response.data;
  },
  getEventReviews: async (eventId: string, limit = 20) => {
    const response = await apiClient.get(`/events/${eventId}/reviews`, { params: { limit } });
    return response.data as { status: string; results: number; data: { reviews: EventReview[] } };
  },
  getEventReviewSummary: async (eventId: string) => {
    const response = await apiClient.get(`/events/${eventId}/reviews/summary`);
    return response.data as { status: string; data: { averageRating: number; totalReviews: number } };
  },
  createEventReview: async (eventId: string, payload: EventReviewPayload) => {
    const response = await apiClient.post(`/events/${eventId}/reviews`, payload);
    return response.data as { status: string; data: { review: EventReview } };
  },
  toggleFeature: async (id: string) => {
    const response = await apiClient.patch(`/events/${id}/feature`);
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
  submitPublicRegistration: async (slug: string, payload: PublicEventRegistrationPayload) => {
    const response = await apiClient.post(`/public/events/${slug}/register`, payload);
    return response.data as { status: string; data: { registration: EventRegistration } };
  },
  createRegistration: async (payload: CreateRegistrationPayload) => {
    const response = await apiClient.post('/registrations', payload);
    return response.data;
  },
  getMyRegistrations: async () => {
    const response = await apiClient.get('/registrations/my');
    return response.data;
  },
  getEventRegistrationsV2: async (eventId: string) => {
    const response = await apiClient.get(`/events/${eventId}/registrations`);
    return response.data as { status: string; results: number; data: { registrations: EventRegistration[] } };
  },
  getEventRegistrations: async (eventId: string) => {
    const response = await apiClient.get(`/registrations/event/${eventId}`);
    return response.data;
  },
  updateRegistrationStatus: async (registrationId: string, status: EventRegistrationStatus) => {
    const response = await apiClient.patch(`/registrations/${registrationId}/status`, { status });
    return response.data as { status: string; data: { registration: EventRegistration } };
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
    const response = await apiClient.get(`/events/${eventId}/guests`, { params });
    return response.data;
  },
  updateGuestStatus: async (registrationId: string, status: EventRegistrationStatus) => {
    const response = await apiClient.patch(`/guests/${registrationId}/status`, { status });
    return response.data;
  },
  getGuestQr: async (registrationId: string) => {
    const response = await apiClient.get(`/guests/${registrationId}/qr`);
    return response.data;
  },
  checkInGuest: async (id: string) => {
    const response = await apiClient.patch(`/guests/${id}/checkin`);
    return response.data;
  },
  bulkAction: async (payload: { action: 'going' | 'not_going' | 'declined' | 'checkin'; ids: string[] }) => {
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
  getRegistrationQr: async (registrationId: string) => {
    const response = await apiClient.get(`/checkins/qr/${registrationId}`);
    return response.data;
  },
  getBookingQr: async (bookingId: string) => {
    const response = await apiClient.get(`/checkins/qr/${bookingId}`);
    return response.data;
  },
  scanQr: async (qrCodeValue: string, eventId?: string) => {
    const response = await apiClient.post('/checkins/scan', { qrCodeValue, eventId });
    return response.data;
  },
  manualCheckIn: async (registrationId: string, attendanceNote?: string) => {
    const response = await apiClient.patch(`/checkins/${registrationId}/manual`, {
      attendanceNote,
    });
    return response.data;
  },
  getEventAttendance: async (eventId: string) => {
    const response = await apiClient.get(`/checkins/event/${eventId}`);
    return response.data;
  },
  getCheckInHistory: async (
    eventId: string,
    params?: { result?: 'success' | 'duplicate' | 'invalid' | 'rejected'; limit?: number },
  ) => {
    const response = await apiClient.get(`/checkins/history/${eventId}`, { params });
    return response.data as { status: string; results: number; data: { history: CheckInHistoryRecord[] } };
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

export const PushService = {
  registerToken: async (payload: PushTokenPayload) => {
    const response = await apiClient.post('/push/register-token', payload);
    return response.data;
  },
  deleteToken: async (expoPushToken?: string) => {
    const response = await apiClient.delete('/push/token', {
      data: expoPushToken ? { expoPushToken } : {},
    });
    return response.data;
  },
};

export const ReportService = {
  createReport: async (payload: CreateReportPayload) => {
    const response = await apiClient.post('/reports', payload);
    return response.data;
  },
  getReports: async () => {
    const response = await apiClient.get('/reports');
    return response.data;
  },
  resolveReport: async (reportId: string) => {
    const response = await apiClient.patch(`/reports/${reportId}/resolve`);
    return response.data;
  },
};

export const ModerationService = {
  approveEvent: async (eventId: string) => {
    const response = await apiClient.patch(`/moderation/event/${eventId}/approve`);
    return response.data;
  },
  rejectEvent: async (eventId: string) => {
    const response = await apiClient.patch(`/moderation/event/${eventId}/reject`);
    return response.data;
  },
  suspendUser: async (userId: string) => {
    const response = await apiClient.patch(`/moderation/user/${userId}/suspend`);
    return response.data;
  },
  activateUser: async (userId: string) => {
    const response = await apiClient.patch(`/moderation/user/${userId}/activate`);
    return response.data;
  },
};

export const WaitlistService = {
  getEventWaitlist: async (eventId: string) => {
    const response = await apiClient.get(`/waitlist/event/${eventId}`);
    return response.data;
  },
  getMyWaitlist: async () => {
    const response = await apiClient.get('/waitlist/my');
    return response.data;
  },
  promoteBooking: async (bookingId: string) => {
    const response = await apiClient.patch(`/waitlist/${bookingId}/promote`);
    return response.data;
  },
};

export const AdminService = {
  getPlatformAnalytics: async () => {
    const response = await apiClient.get('/admin/analytics');
    return response.data;
  },
};

export const AnalyticsService = {
  getEventAnalytics: async (eventId: string) => {
    const response = await apiClient.get(`/analytics/event/${eventId}`);
    return response.data;
  },
  getDashboardAnalytics: async () => {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  },
};
