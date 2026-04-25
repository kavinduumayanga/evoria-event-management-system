export type Role = 'host_admin' | 'attendee';
export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventVisibility = 'public' | 'private';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type VenueType = 'physical' | 'online' | 'hybrid';
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  hostAdminId: string;
  venueId: string;
  coverImage?: string;
  capacity: number;
  status: EventStatus;
  visibility: EventVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  soldCount: number;
  maxPerUser: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  totalAmount: number;
  bookingStatus: BookingStatus;
  bookingDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  type: VenueType;
  contactInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  speakerName?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  hallOrRoom?: string;
  bannerImage?: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}
