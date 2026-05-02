import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReviewModel } from '../models/Review';
import { EventModel } from '../models/Event';
import { RegistrationModel } from '../models/Registration';
import { BookingModel } from '../models/Booking';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';

const reviewCreateSchema = z.object({
  registrationId: z.string().trim().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(''),
}).strict();

const reviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
}).strict();

const parseTimeToMinutes = (value: string): number | null => {
  const cleaned = String(value || '').trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return (hours * 60) + minutes;
};

const resolveEventEndDate = (event: any): Date => {
  const base = String(event.date || '').slice(0, 10);
  const minutes = parseTimeToMinutes(event.endTime || '23:59') ?? ((23 * 60) + 59);
  const endDate = new Date(`${base}T00:00:00.000Z`);
  if (Number.isNaN(endDate.getTime())) {
    return new Date();
  }

  endDate.setUTCMinutes(minutes);
  return endDate;
};

const ensureEventIsCompleted = (event: any) => {
  const eventEnd = resolveEventEndDate(event);
  if (eventEnd.getTime() > Date.now()) {
    throw new AppError('Reviews are available after the event is completed', 403);
  }
};

const resolveEligibleRegistrationId = async (
  eventId: string,
  userId: string,
  requestedRegistrationId?: string,
): Promise<string> => {
  const requestedId = String(requestedRegistrationId || '').trim();

  const isEligibleRegistrationRecord = (registration: any) => {
    return registration
      && registration.eventId === eventId
      && registration.userId === userId
      && ['going', 'checked_in'].includes(registration.status);
  };

  const isEligibleBookingRecord = (booking: any) => {
    return booking
      && booking.eventId === eventId
      && booking.userId === userId
      && booking.bookingStatus !== 'cancelled'
      && booking.isWaitlisted !== true
      && booking.approvalStatus === 'approved'
      && (booking.rsvpStatus === 'going' || booking.checkInStatus === 'checked_in');
  };

  if (requestedId) {
    const [registration, booking] = await Promise.all([
      RegistrationModel.findById(requestedId),
      BookingModel.findById(requestedId),
    ]);

    if (isEligibleRegistrationRecord(registration) || isEligibleBookingRecord(booking)) {
      return requestedId;
    }

    throw new AppError('You are not eligible to review this registration', 403);
  }

  const [latestRegistration, latestBooking] = await Promise.all([
    RegistrationModel.findOne({
      eventId,
      userId,
      status: { $in: ['going', 'checked_in'] },
    }).sort({ createdAt: -1 }),
    BookingModel.findOne({
      eventId,
      userId,
      bookingStatus: { $ne: 'cancelled' },
      isWaitlisted: { $ne: true },
      approvalStatus: 'approved',
      $or: [
        { rsvpStatus: 'going' },
        { checkInStatus: 'checked_in' },
      ],
    }).sort({ createdAt: -1 }),
  ]);

  if (latestRegistration) return latestRegistration.id;
  if (latestBooking) return latestBooking.id;

  throw new AppError('Only eligible attendees can submit reviews', 403);
};

export const createEventReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const event = await EventModel.findById(eventId);
    if (!event) return next(new AppError('Event not found', 404));

    ensureEventIsCompleted(event);

    const payload = reviewCreateSchema.parse(req.body);
    const registrationId = await resolveEligibleRegistrationId(
      eventId,
      req.user!.id,
      payload.registrationId,
    );

    const review = await ReviewModel.create({
      eventId,
      userId: req.user!.id,
      registrationId,
      rating: payload.rating,
      comment: payload.comment,
    });

    res.status(201).json({
      status: 'success',
      data: {
        review: review.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }

    if (error?.code === 11000) {
      return next(new AppError('A review already exists for this registration', 409));
    }

    next(error);
  }
};

export const getEventReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const { limit } = reviewQuerySchema.parse(req.query || {});

    const reviews = await ReviewModel.find({ eventId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const userIds = Array.from(new Set(
      reviews
        .map((review) => String(review.userId || '').trim())
        .filter(Boolean),
    ));

    const users = userIds.length
      ? await UserModel.find({ _id: { $in: userIds } }).select('id name profileImage')
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));

    const mappedReviews = reviews.map((review) => {
      const user = review.userId ? userMap.get(review.userId) : null;
      return {
        ...review.toJSON(),
        user: user
          ? {
              id: user.id,
              name: user.name,
              profileImage: user.profileImage || null,
            }
          : null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: mappedReviews.length,
      data: {
        reviews: mappedReviews,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};

export const getEventReviewSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = String(req.params.eventId || '').trim();
    if (!eventId) return next(new AppError('eventId is required', 400));

    const [summary] = await ReviewModel.aggregate([
      { $match: { eventId } },
      {
        $group: {
          _id: '$eventId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const averageRating = summary?.averageRating
      ? Math.round(Number(summary.averageRating) * 100) / 100
      : 0;
    const totalReviews = Number(summary?.totalReviews || 0);

    res.status(200).json({
      status: 'success',
      data: {
        averageRating,
        totalReviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
