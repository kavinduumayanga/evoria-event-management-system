import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { TicketTypeModel } from '../models/TicketType';
import { AppError } from './appError';
import { createNotificationRecord } from './notification.helper';

const WAITLIST_NOTIFICATION_TITLE = 'Waitlist Promotion';

export const getConfirmedSeatCount = async (eventId: string): Promise<number> => {
  const result = await BookingModel.aggregate([
    {
      $match: {
        eventId,
        bookingStatus: 'confirmed',
        isWaitlisted: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$quantity' },
      },
    },
  ]);

  return result[0]?.total || 0;
};

export const isEventAtCapacityForQuantity = async (eventId: string, quantity: number): Promise<boolean> => {
  const event = await EventModel.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const confirmedSeats = await getConfirmedSeatCount(eventId);
  return confirmedSeats + quantity > event.capacity;
};

export const ensureNoActiveWaitlistEntry = async (userId: string, eventId: string) => {
  const existingEntry = await BookingModel.findOne({
    userId,
    eventId,
    isWaitlisted: true,
    bookingStatus: { $ne: 'cancelled' },
  });

  if (existingEntry) {
    throw new AppError('You are already on this event waitlist', 409);
  }
};

export const getNextWaitlistPosition = async (eventId: string): Promise<number> => {
  const latestEntry = await BookingModel.findOne({
    eventId,
    isWaitlisted: true,
    bookingStatus: { $ne: 'cancelled' },
  })
    .sort({ waitlistPosition: -1, createdAt: -1 })
    .select('waitlistPosition');

  const latestPosition = latestEntry?.waitlistPosition || 0;
  return latestPosition + 1;
};

export const normalizeWaitlistPositions = async (eventId: string) => {
  const waitlistedBookings = await BookingModel.find({
    eventId,
    isWaitlisted: true,
    bookingStatus: { $ne: 'cancelled' },
  })
    .sort({ waitlistPosition: 1, createdAt: 1 })
    .select('_id');

  await Promise.all(waitlistedBookings.map((booking, index) => (
    BookingModel.findByIdAndUpdate(booking.id, { waitlistPosition: index + 1 })
  )));
};

const promoteWaitlistedBookingInternal = async (bookingId: string, promotedBy?: string) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) {
    throw new AppError('Waitlist booking not found', 404);
  }

  if (!booking.isWaitlisted || booking.bookingStatus === 'cancelled') {
    throw new AppError('Booking is not on the active waitlist', 400);
  }

  const event = await EventModel.findById(booking.eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const ticket = await TicketTypeModel.findById(booking.ticketTypeId);
  if (!ticket || !ticket.isActive) {
    throw new AppError('Ticket is no longer available for waitlist promotion', 400);
  }

  if (ticket.quantity < ticket.soldCount + booking.quantity) {
    throw new AppError('No ticket inventory available for this waitlist booking', 409);
  }

  const confirmedSeats = await getConfirmedSeatCount(booking.eventId);
  if (confirmedSeats + booking.quantity > event.capacity) {
    throw new AppError('No remaining seats to promote from waitlist', 409);
  }

  const updatedBooking = await BookingModel.findByIdAndUpdate(
    booking.id,
    {
      isWaitlisted: false,
      waitlistPosition: null,
      bookingStatus: 'confirmed',
      approvalStatus: event.requiresApproval ? 'pending' : 'approved',
      wasWaitlisted: true,
    },
    { new: true },
  );

  await TicketTypeModel.findByIdAndUpdate(ticket.id, {
    soldCount: ticket.soldCount + booking.quantity,
  });

  await EventModel.findByIdAndUpdate(booking.eventId, {
    $inc: { bookingCount: booking.quantity },
  });

  await createNotificationRecord({
    userId: booking.userId,
    eventId: booking.eventId,
    title: WAITLIST_NOTIFICATION_TITLE,
    message: `A spot opened up. Your waitlist booking ${booking.id} is now confirmed.`,
    type: 'booking',
    channel: 'in_app',
    status: 'sent',
    sentAt: new Date(),
    createdBy: promotedBy || undefined,
  });

  await normalizeWaitlistPositions(booking.eventId);

  return updatedBooking;
};

export const promoteSpecificWaitlistBooking = async (bookingId: string, promotedBy?: string) => {
  return promoteWaitlistedBookingInternal(bookingId, promotedBy);
};

export const promoteNextWaitlistedBooking = async (eventId: string, promotedBy?: string) => {
  const event = await EventModel.findById(eventId);
  if (!event) return null;

  const confirmedSeats = await getConfirmedSeatCount(eventId);
  if (confirmedSeats >= event.capacity) {
    return null;
  }

  const queue = await BookingModel.find({
    eventId,
    isWaitlisted: true,
    bookingStatus: { $ne: 'cancelled' },
  })
    .sort({ waitlistPosition: 1, createdAt: 1 })
    .select('_id');

  for (const waitlistedBooking of queue) {
    try {
      const promoted = await promoteWaitlistedBookingInternal(waitlistedBooking.id, promotedBy);
      if (promoted) {
        return promoted;
      }
    } catch (error) {
      // Skip entries that cannot currently be promoted and try the next FIFO candidate.
      if (error instanceof AppError && (error.statusCode === 400 || error.statusCode === 409)) {
        continue;
      }
      throw error;
    }
  }

  return null;
};
