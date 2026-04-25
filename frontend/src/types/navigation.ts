import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type AttendeeTabParamList = {
  HomeStack: NavigatorScreenParams<AttendeeHomeStackParamList>;
  MyBookings: undefined;
  Profile: undefined;
};

export type AttendeeHomeStackParamList = {
  EventList: undefined;
  EventDetails: { eventId: string };
  TicketSelection: { eventId: string };
  BookingConfirmation: { bookingId: string };
};

export type HostAdminTabParamList = {
  Dashboard: undefined;
  EventsStack: NavigatorScreenParams<HostAdminEventStackParamList>;
  VenuesStack: NavigatorScreenParams<HostAdminVenueStackParamList>;
  ManageBookings: undefined;
  Profile: undefined;
};

export type HostAdminEventStackParamList = {
  ManageEvents: undefined;
  EventForm: { eventId?: string };
  ManageTickets: { eventId: string };
  TicketForm: { eventId: string; ticketId?: string };
  ManageSessions: { eventId: string };
  SessionForm: { eventId: string; sessionId?: string };
};

export type HostAdminVenueStackParamList = {
  ManageVenues: undefined;
  VenueForm: { venueId?: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Attendee: NavigatorScreenParams<AttendeeTabParamList>;
  HostAdmin: NavigatorScreenParams<HostAdminTabParamList>;
};
