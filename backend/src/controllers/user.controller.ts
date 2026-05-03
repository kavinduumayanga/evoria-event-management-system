import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose, { ClientSession } from 'mongoose';
import { UserModel } from '../models/User';
import { EventModel } from '../models/Event';
import { VenueModel } from '../models/Venue';
import { TicketTypeModel } from '../models/TicketType';
import { SessionModel } from '../models/Session';
import { RegistrationModel } from '../models/Registration';
import { BookingModel } from '../models/Booking';
import { NotificationModel } from '../models/Notification';
import { ReminderModel } from '../models/Reminder';
import { ReviewModel } from '../models/Review';
import { ReportModel } from '../models/Report';
import { CheckInHistoryModel } from '../models/CheckInHistory';
import { PushTokenModel } from '../models/PushToken';
import { EmailLogModel } from '../models/EmailLog';
import { Role } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { manageableEventQuery } from '../utils/eventPermissions';

const MIN_PASSWORD_LENGTH = 6;

const signToken = (id: string, role?: Role) => {
  return jwt.sign({ id, role, tokenVersion: 2 }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
  });
};

const toSafeUser = (userDoc: any) => {
  const user = userDoc?.toJSON ? userDoc.toJSON() : { ...userDoc };
  delete user.password;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').optional(),
    phone: z.union([z.string().trim().max(30, 'Phone number is too long'), z.literal('')]).optional(),
    profileImage: z.union([z.string().trim().max(500, 'Profile image path is too long'), z.literal('')]).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`),
});

const handleValidationError = (error: unknown, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
  }

  if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
    return next(new AppError('Email already in use', 409));
  }

  return next(error);
};

type DeleteSummary = {
  deletedUser: number;
  deletedOwnedEvents: number;
  deletedOwnedVenues: number;
  deletedOwnedTickets: number;
  deletedOwnedSessions: number;
  deletedOwnedRegistrations: number;
  deletedOwnedBookings: number;
  deletedUserRegistrations: number;
  deletedUserBookings: number;
  deletedUserReviews: number;
  deletedUserReports: number;
  deletedUserNotifications: number;
  deletedUserReminders: number;
  deletedUserCheckins: number;
  deletedUserPushTokens: number;
  deletedUserEmailLogs: number;
  deletedEventReviews: number;
  deletedEventReports: number;
  deletedEventReminders: number;
  deletedEventNotifications: number;
  deletedEventCheckins: number;
  deletedEventEmailLogs: number;
  adminAccessRemovedFromEvents: number;
};

const createDeleteSummary = (): DeleteSummary => ({
  deletedUser: 0,
  deletedOwnedEvents: 0,
  deletedOwnedVenues: 0,
  deletedOwnedTickets: 0,
  deletedOwnedSessions: 0,
  deletedOwnedRegistrations: 0,
  deletedOwnedBookings: 0,
  deletedUserRegistrations: 0,
  deletedUserBookings: 0,
  deletedUserReviews: 0,
  deletedUserReports: 0,
  deletedUserNotifications: 0,
  deletedUserReminders: 0,
  deletedUserCheckins: 0,
  deletedUserPushTokens: 0,
  deletedUserEmailLogs: 0,
  deletedEventReviews: 0,
  deletedEventReports: 0,
  deletedEventReminders: 0,
  deletedEventNotifications: 0,
  deletedEventCheckins: 0,
  deletedEventEmailLogs: 0,
  adminAccessRemovedFromEvents: 0,
});

const sessionOptions = (session?: ClientSession) => (session ? { session } : undefined);

const isTransactionUnsupportedError = (error: unknown): boolean => {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('transaction numbers are only allowed')
    || message.includes('replica set')
    || message.includes('transaction is not supported');
};

const purgeUserAccountData = async (userId: string, session?: ClientSession): Promise<DeleteSummary> => {
  const summary = createDeleteSummary();

  const ownedEvents = session
    ? await EventModel.find({ $or: [{ ownerId: userId }, { hostAdminId: userId }] }).session(session)
    : await EventModel.find({ $or: [{ ownerId: userId }, { hostAdminId: userId }] });
  const ownedEventIds = ownedEvents.map((event) => event.id);

  if (ownedEventIds.length > 0) {
    const eventCheckins = await CheckInHistoryModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedEventCheckins += eventCheckins.deletedCount || 0;

    const eventEmailLogs = await EmailLogModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedEventEmailLogs += eventEmailLogs.deletedCount || 0;

    const eventNotifications = await NotificationModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedEventNotifications += eventNotifications.deletedCount || 0;

    const eventReminders = await ReminderModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedEventReminders += eventReminders.deletedCount || 0;

    const eventReviews = await ReviewModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedEventReviews += eventReviews.deletedCount || 0;

    const eventReports = await ReportModel.deleteMany({ targetType: 'event', targetId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedEventReports += eventReports.deletedCount || 0;

    const eventBookings = await BookingModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedOwnedBookings += eventBookings.deletedCount || 0;

    const eventRegistrations = await RegistrationModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedOwnedRegistrations += eventRegistrations.deletedCount || 0;

    const eventSessions = await SessionModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedOwnedSessions += eventSessions.deletedCount || 0;

    const eventTickets = await TicketTypeModel.deleteMany({ eventId: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedOwnedTickets += eventTickets.deletedCount || 0;

    const deletedEvents = await EventModel.deleteMany({ _id: { $in: ownedEventIds } }, sessionOptions(session));
    summary.deletedOwnedEvents += deletedEvents.deletedCount || 0;
  }

  const deletedVenues = await VenueModel.deleteMany({ ownerId: userId }, sessionOptions(session));
  summary.deletedOwnedVenues += deletedVenues.deletedCount || 0;

  const deletedUserBookings = await BookingModel.deleteMany({ userId }, sessionOptions(session));
  summary.deletedUserBookings += deletedUserBookings.deletedCount || 0;

  const deletedUserRegistrations = await RegistrationModel.deleteMany({ userId }, sessionOptions(session));
  summary.deletedUserRegistrations += deletedUserRegistrations.deletedCount || 0;

  const deletedUserReviews = await ReviewModel.deleteMany({ userId }, sessionOptions(session));
  summary.deletedUserReviews += deletedUserReviews.deletedCount || 0;

  const deletedUserReports = await ReportModel.deleteMany({
    $or: [
      { reporterId: userId },
      { targetType: 'user', targetId: userId },
    ],
  }, sessionOptions(session));
  summary.deletedUserReports += deletedUserReports.deletedCount || 0;

  const deletedUserNotifications = await NotificationModel.deleteMany({
    $or: [{ userId }, { createdBy: userId }],
  }, sessionOptions(session));
  summary.deletedUserNotifications += deletedUserNotifications.deletedCount || 0;

  const deletedUserReminders = await ReminderModel.deleteMany({ createdBy: userId }, sessionOptions(session));
  summary.deletedUserReminders += deletedUserReminders.deletedCount || 0;

  const deletedUserCheckins = await CheckInHistoryModel.deleteMany({ scannedBy: userId }, sessionOptions(session));
  summary.deletedUserCheckins += deletedUserCheckins.deletedCount || 0;

  const deletedUserPushTokens = await PushTokenModel.deleteMany({ userId }, sessionOptions(session));
  summary.deletedUserPushTokens += deletedUserPushTokens.deletedCount || 0;

  const deletedUserEmailLogs = await EmailLogModel.deleteMany({
    $or: [{ recipientUserId: userId }, { createdBy: userId }],
  }, sessionOptions(session));
  summary.deletedUserEmailLogs += deletedUserEmailLogs.deletedCount || 0;

  const adminAccessUpdate = await EventModel.updateMany(
    { adminIds: userId },
    { $pull: { adminIds: userId } },
    sessionOptions(session),
  );
  summary.adminAccessRemovedFromEvents += adminAccessUpdate.modifiedCount || 0;

  const deletedUser = await UserModel.deleteOne({ _id: userId }, sessionOptions(session));
  summary.deletedUser += deletedUser.deletedCount || 0;

  if (summary.deletedUser !== 1) {
    throw new AppError('Account delete failed. User record was not removed.', 500);
  }

  return summary;
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managedEventCount = await EventModel.countDocuments(manageableEventQuery(req.user!.id));
    if (!managedEventCount) {
      return next(new AppError('You do not have permission to view all users', 403));
    }

    const userDocs = await UserModel.find();
    const safeUsers = userDocs.map((doc) => toSafeUser(doc));
    res.status(200).json({ status: 'success', results: safeUsers.length, data: { users: safeUsers } });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.id !== (req.params.id as string)) {
      return next(new AppError('You do not have permission to view this user.', 403));
    }

    const userDoc = await UserModel.findById(req.params.id as string);
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', data: { user: toSafeUser(userDoc) } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.id !== (req.params.id as string)) {
      return next(new AppError('Not authorized to update this user', 403));
    }

    const updates = { ...req.body };
    delete updates.email;
    delete updates.password;
    delete updates.role;
    delete updates.emailVerified;
    delete updates.emailVerificationToken;
    delete updates.emailVerificationExpires;
    delete updates.resetPasswordToken;
    delete updates.resetPasswordExpires;

    const updatedUserDoc = await UserModel.findByIdAndUpdate(req.params.id as string, updates, { new: true });
    if (!updatedUserDoc) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', data: { user: toSafeUser(updatedUserDoc) } });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedUserId = req.params.id as string;
    if (req.user!.id !== requestedUserId) {
      return next(new AppError('Not authorized to delete this user', 403));
    }

    const userDoc = await UserModel.findById(requestedUserId).select('_id');
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    let summary: DeleteSummary;
    const session = await mongoose.startSession();

    try {
      try {
        session.startTransaction();
        summary = await purgeUserAccountData(requestedUserId, session);
        await session.commitTransaction();
      } catch (transactionError) {
        await session.abortTransaction().catch(() => undefined);
        if (!isTransactionUnsupportedError(transactionError)) {
          throw transactionError;
        }

        summary = await purgeUserAccountData(requestedUserId);
      }
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      status: 'success',
      message: 'Account and related data deleted permanently.',
      data: { summary },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = profileUpdateSchema.parse(req.body);

    const userDoc = await UserModel.findById(req.user!.id).select('+isActive');
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 400));
    }

    if (validatedData.name !== undefined) {
      userDoc.name = validatedData.name;
    }

    if (validatedData.phone !== undefined) {
      userDoc.phone = validatedData.phone || undefined;
    }

    if (validatedData.profileImage !== undefined) {
      userDoc.profileImage = validatedData.profileImage || undefined;
    }

    await userDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully.',
      data: { user: toSafeUser(userDoc) },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = passwordUpdateSchema.parse(req.body);

    const userDoc = await UserModel.findById(req.user!.id).select('+password +isActive');
    if (!userDoc || !userDoc.password) {
      return next(new AppError('User not found', 404));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 400));
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(validatedData.currentPassword, userDoc.password);
    if (!isCurrentPasswordCorrect) {
      return next(new AppError('Current password is incorrect', 401));
    }

    const isSamePassword = await bcrypt.compare(validatedData.newPassword, userDoc.password);
    if (isSamePassword) {
      return next(new AppError('New password must be different from current password', 400));
    }

    userDoc.password = await bcrypt.hash(validatedData.newPassword, 12);
    userDoc.resetPasswordToken = undefined;
    userDoc.resetPasswordExpires = undefined;

    await userDoc.save();

    const safeUser = toSafeUser(userDoc);
    const token = signToken(safeUser.id, safeUser.role);

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully.',
      token,
      data: { user: safeUser },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userDoc = await UserModel.findById(userId).select('_id');
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    let summary: DeleteSummary;
    const session = await mongoose.startSession();

    try {
      try {
        session.startTransaction();
        summary = await purgeUserAccountData(userId, session);
        await session.commitTransaction();
      } catch (transactionError) {
        await session.abortTransaction().catch(() => undefined);
        if (!isTransactionUnsupportedError(transactionError)) {
          throw transactionError;
        }

        // Fallback for non-replica-set local environments where transactions are unavailable.
        summary = await purgeUserAccountData(userId);
      }
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      status: 'success',
      message: 'Account and related data deleted permanently.',
      data: { summary },
    });
  } catch (error) {
    console.error('[user.deleteAccount] Failed to delete account', error);
    next(error);
  }
};
