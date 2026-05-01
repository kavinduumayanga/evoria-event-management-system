export type Role = 'host_admin' | 'attendee';
export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventVisibility = 'public' | 'private' | 'unlisted';
export type EventType = 'online' | 'physical' | 'hybrid';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type RsvpStatus = 'going' | 'not_going';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CheckInStatus = 'not_checked_in' | 'checked_in';
export type RegistrationType = 'free' | 'paid';
export type PromoDiscountType = 'percentage' | 'fixed';
export type VenueType = 'physical' | 'online' | 'hybrid';
export type SessionStatus = 'scheduled' | 'cancelled' | 'completed';
export type CustomQuestionType = 'text' | 'number' | 'choice';

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

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  hostAdminId: string;
  venueId?: string | null;
  type: EventType;
  coverImage?: string;
  capacity: number;
  status: EventStatus;
  visibility: EventVisibility;
  requiresApproval?: boolean;
  customQuestions?: EventCustomQuestion[];
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
  rsvpStatus: RsvpStatus;
  approvalStatus: ApprovalStatus;
  checkInStatus: CheckInStatus;
  customAnswers: RegistrationAnswer[];
  registrationType: RegistrationType;
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
