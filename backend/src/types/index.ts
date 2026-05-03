export type Role = 'user' | 'host_admin' | 'attendee';
export type EventStatus = 'draft' | 'published' | 'cancelled';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type EventVisibility = 'public' | 'private' | 'unlisted';
export type EventType = 'online' | 'physical' | 'hybrid';
export type EventPricingMode = 'free' | 'ticketed';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type RsvpStatus = 'going' | 'not_going';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CheckInStatus = 'not_checked_in' | 'checked_in';
export type RegistrationType = 'free' | 'paid';
export type PromoDiscountType = 'percentage' | 'fixed';
export type VenueType = 'physical' | 'online' | 'hybrid';
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';
export type CustomQuestionType = 'text' | 'number' | 'choice';
export type NotificationType = 'booking' | 'reminder' | 'announcement' | 'checkin' | 'system';
export type NotificationChannel = 'in_app' | 'push' | 'email_mock' | 'sms_mock';
export type NotificationStatus = 'sent' | 'scheduled' | 'failed';
export type EventRegistrationStatus = 'pending' | 'going' | 'checked_in' | 'not_going' | 'declined';
export type EmailLogType = 'registration_pending' | 'registration_confirmed' | 'registration_declined' | 'invite' | 'blast' | 'reminder' | 'system';
export type EmailLogStatus = 'queued' | 'sent' | 'failed' | 'mock';

export interface EventCustomQuestion {
  id: string;
  question: string;
  type: CustomQuestionType;
  required?: boolean;
}

export interface RegistrationAnswer {
  questionId: string;
  answer: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  isSuspended: boolean;
  reportCount: number;
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
  ownerId: string;
  hostAdminId?: string;
  adminIds?: string[];
  publicSlug: string;
  venueId?: string | null;
  type: EventType;
  pricingMode: EventPricingMode;
  category: string;
  city: string;
  location?: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
  } | null;
  tags: string[];
  viewsCount: number;
  bookingCount: number;
  meetingLink?: string;
  coverImage?: string;
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
  };
  branding?: {
    primaryColor: string;
    accentColor: string;
  };
  capacity: number;
  isFlagged: boolean;
  isFeatured: boolean;
  moderationStatus: ModerationStatus;
  priorityAccessEnabled?: boolean;
  status: EventStatus;
  visibility: EventVisibility;
  requiresApproval?: boolean;
  customQuestions?: EventCustomQuestion[];
  registrationFields?: {
    customQuestions: EventCustomQuestion[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isFree: boolean;
  quantity: number;
  soldCount: number;
  maxPerUser: number;
  isActive: boolean;
  promoCodes: PromoCode[];
  unlockCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCode {
  code: string;
  discountType: PromoDiscountType;
  value: number;
  isActive: boolean;
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
  isWaitlisted: boolean;
  waitlistPosition: number | null;
  wasWaitlisted?: boolean;
  rsvpStatus: RsvpStatus;
  approvalStatus: ApprovalStatus;
  checkInStatus: CheckInStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkInMethod?: 'qr' | 'manual' | null;
  qrCodeValue?: string;
  attendanceNote?: string;
  customAnswers: RegistrationAnswer[];
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

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientUserId?: string | null;
  eventId?: string | null;
  registrationId?: string | null;
  subject: string;
  message: string;
  type: EmailLogType;
  status: EmailLogStatus;
  provider?: 'gmail' | 'mock';
  errorMessage?: string | null;
  sentAt?: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'event' | 'user';
  targetId: string;
  reason: string;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
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

export interface Registration {
  id: string;
  eventId: string;
  userId?: string | null;
  name: string;
  email: string;
  mobile: string;
  nic: string;
  customAnswers: RegistrationAnswer[];
  status: EventRegistrationStatus;
  qrCodeValue?: string | null;
  checkedInAt?: string | null;
  checkedInBy?: string | null;
  checkInMethod?: 'qr' | 'manual' | null;
  attendanceNote?: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}
