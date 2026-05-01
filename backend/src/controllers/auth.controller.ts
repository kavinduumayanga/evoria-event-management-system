import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { Role } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 6;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

const signToken = (id: string, role: Role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
  });
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toSafeUser = (userDoc: any) => {
  const user = userDoc?.toJSON ? userDoc.toJSON() : { ...userDoc };
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`),
  role: z.enum(['host_admin', 'attendee']).default('attendee'),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
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

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(validatedData.email);

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError('Email already in use', 409));
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const newUserDoc = await UserModel.create({
      name: validatedData.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: validatedData.role,
      phone: validatedData.phone,
      isActive: true,
    });

    const safeUser = toSafeUser(newUserDoc);
    const token = signToken(safeUser.id, safeUser.role);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(validatedData.email);

    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select('+password +isActive +isSuspended');

    if (!userDoc || !userDoc.password) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 401));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    const isPasswordCorrect = await bcrypt.compare(validatedData.password, userDoc.password);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password', 401));
    }

    const safeUser = toSafeUser(userDoc);
    const token = signToken(safeUser.id, safeUser.role);

    res.status(200).json({
      status: 'success',
      token,
      user: safeUser,
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized access. Please log in.', 401));
    }

    const userDoc = await UserModel.findById(userId).select('+isActive +isSuspended');
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 401));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    const safeUser = toSafeUser(userDoc);

    res.status(200).json({
      status: 'success',
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(validatedData.email);

    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select('+resetPasswordToken +resetPasswordExpires +isActive +isSuspended');

    let resetToken: string | undefined;

    if (userDoc && userDoc.isActive && !userDoc.isSuspended) {
      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      userDoc.resetPasswordToken = hashedToken;
      userDoc.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
      await userDoc.save();
    }

    const responsePayload: Record<string, unknown> = {
      status: 'success',
      message: 'If an account with that email exists, a password reset token was generated.',
    };

    if (process.env.NODE_ENV !== 'production' && resetToken) {
      responsePayload.data = { resetToken };
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);

    const hashedToken = crypto.createHash('sha256').update(validatedData.token).digest('hex');

    const userDoc = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires +isActive +isSuspended');

    if (!userDoc) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 400));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    userDoc.password = await bcrypt.hash(validatedData.newPassword, 12);
    userDoc.resetPasswordToken = undefined;
    userDoc.resetPasswordExpires = undefined;

    await userDoc.save();

    const safeUser = toSafeUser(userDoc);
    const token = signToken(safeUser.id, safeUser.role);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful.',
      token,
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const googleAuthPlaceholder = async (req: Request, res: Response) => {
  res.status(501).json({
    status: 'fail',
    message: 'Google authentication is planned for a future version.',
  });
};
