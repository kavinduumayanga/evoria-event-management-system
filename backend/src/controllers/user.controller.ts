import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { Role } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 6;

const signToken = (id: string, role: Role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
  });
};

const toSafeUser = (userDoc: any) => {
  const user = userDoc?.toJSON ? userDoc.toJSON() : { ...userDoc };
  delete user.password;
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

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userDocs = await UserModel.find();
    const safeUsers = userDocs.map((doc) => toSafeUser(doc));
    res.status(200).json({ status: 'success', results: safeUsers.length, data: { users: safeUsers } });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.id !== (req.params.id as string) && req.user!.role !== 'host_admin') {
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
    if (req.user!.id !== (req.params.id as string) && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to update this user', 403));
    }

    const updates = { ...req.body };
    delete updates.password;
    delete updates.role;
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
    if (req.user!.id !== (req.params.id as string) && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to delete this user', 403));
    }

    const deletedUserDoc = await UserModel.findByIdAndDelete(req.params.id as string);
    if (!deletedUserDoc) {
      return next(new AppError('User not found', 404));
    }

    res.status(204).json({ status: 'success', data: null });
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

export const deactivateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userDoc = await UserModel.findById(req.user!.id).select('+isActive +resetPasswordToken +resetPasswordExpires');
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    if (!userDoc.isActive) {
      return next(new AppError('Account is already deactivated', 400));
    }

    userDoc.isActive = false;
    userDoc.resetPasswordToken = undefined;
    userDoc.resetPasswordExpires = undefined;

    await userDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Account deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
