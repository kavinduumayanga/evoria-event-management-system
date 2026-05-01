export type Role = 'host_admin' | 'attendee';
export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventVisibility = 'public' | 'private';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CheckInStatus = 'not_checked_in' | 'checked_in';
export type RsvpStatus = 'going' | 'not_going';
export type RegistrationType = 'free' | 'paid';
export type VenueType = 'physical' | 'online' | 'hybrid';
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';
export type NotificationType = 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
export type NotificationChannel = 'in_app' | 'email_mock' | 'sms_mock';
export type NotificationStatus = 'sent' | 'scheduled' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: string;
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
  rsvpStatus: RsvpStatus;
  approvalStatus: ApprovalStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkInMethod?: 'qr' | 'manual' | null;
  qrCodeValue?: string;
  attendanceNote?: string;
  customAnswers: Array<{ questionId: string; answer: string }>;
  registrationType: RegistrationType;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  isRead: boolean;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdBy?: string | null;
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
