import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email?: string } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
};

export type AttendeeTabParamList = {
  HomeStack: NavigatorScreenParams<AttendeeHomeStackParamList>;
  MyEvents: undefined;
  MyRegistrations: undefined;
  Profile: NavigatorScreenParams<AttendeeProfileStackParamList>;
};

export type AttendeeHomeStackParamList = {
  EventList: undefined;
  EventDetails: { eventId: string; publicSlug?: string };
  PublicEventDetails: { slug: string };
  EventForm: { eventId?: string };
  ManageRegistrations: { eventId: string };
  EventDashboard: { eventId: string };
  EventReminders: { eventId: string };
  CheckInHistory: { eventId: string };
  CheckInScanner: { eventId?: string } | undefined;
  ManageTickets: { eventId: string };
  TicketForm: { eventId: string; ticketId?: string };
  TicketSelection: { eventId: string };
  MyWaitlist: undefined;
  PaymentSummary: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    promoCode?: string;
    unlockCode?: string;
    ticketName: string;
    currency: string;
    unitPrice: number;
    customAnswers?: Array<{
      questionId: string;
      answer: string;
    }>;
  };
  BookingConfirmation: { bookingId: string };
  MyTicketQR: { bookingId: string };
};

export type HostAdminTabParamList = {
  Dashboard: undefined;
  EventsStack: NavigatorScreenParams<HostAdminEventStackParamList>;
  VenuesStack: NavigatorScreenParams<HostAdminVenueStackParamList>;
  ManageBookings: undefined;
  Moderation: undefined;
  CheckIns: undefined;
  Announcements: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<HostAdminProfileStackParamList>;
};

export type HostAdminEventStackParamList = {
  ManageEvents: undefined;
  EventForm: { eventId?: string };
  EventDashboard: { eventId: string };
  EventReminders: { eventId: string };
  CheckInHistory: { eventId: string };
  CheckInScanner: { eventId?: string } | undefined;
  ManageTickets: { eventId: string };
  TicketForm: { eventId: string; ticketId?: string };
  ManageRegistrations: { eventId: string };
  ManageWaitlist: { eventId: string };
  ManageSessions: { eventId: string };
  SessionForm: { eventId: string; sessionId?: string };
};

export type HostAdminVenueStackParamList = {
  ManageVenues: undefined;
  VenueForm: { venueId?: string };
};

export type AttendeeProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

export type HostAdminProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Attendee: NavigatorScreenParams<AttendeeTabParamList>;
  HostAdmin: NavigatorScreenParams<HostAdminTabParamList>;
};
