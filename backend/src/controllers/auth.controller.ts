import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { Role } from '../types';
import { AppError } from '../utils/appError';
import { sendEmail } from '../services/email.service';
import { normalizeEmail, validateUserAccountEmail } from '../utils/emailValidation';

const MIN_PASSWORD_LENGTH = 6;
const OTP_DIGITS = 6;

const resolveOtpExpiryMinutes = () => {
  const value = Number.parseInt(String(process.env.OTP_EXPIRY_MINUTES || '10').trim(), 10);
  if (!Number.isFinite(value) || value < 1) return 10;
  return value;
};

const OTP_EXPIRY_MINUTES = resolveOtpExpiryMinutes();
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const signToken = (id: string, role?: Role) => {
  return jwt.sign({ id, role, tokenVersion: 2 }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
  });
};

const generateOtpCode = () => {
  const min = 10 ** (OTP_DIGITS - 1);
  const max = (10 ** OTP_DIGITS) - 1;
  return String(Math.floor(Math.random() * ((max - min) + 1)) + min);
};

const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const toSafeUser = (userDoc: any) => {
  const user = userDoc?.toJSON ? userDoc.toJSON() : { ...userDoc };
  delete user.password;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().min(1, 'Email is required'),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
});

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`),
});

const verifyResetOtpSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  token: z.string().trim().min(1, 'Reset token is required'),
});

const verifyEmailSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  otp: z.string().trim().min(1, 'Verification OTP is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
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

const assertAllowedUserEmail = (rawEmail: string) => {
  const validation = validateUserAccountEmail(rawEmail);
  if (!validation.isValid) {
    throw new AppError(validation.message || 'Please provide a valid email address', 400);
  }
  return validation.normalizedEmail;
};

const buildEmailVerificationMessage = (otpCode: string) => {
  const html = [
    '<div style="font-family:Arial,sans-serif;color:#111;">',
    '<h2>Verify Your Evoria Email</h2>',
    '<p>Use this OTP code to verify your email address:</p>',
    `<p style="font-size:28px;font-weight:700;letter-spacing:2px;">${otpCode}</p>`,
    `<p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    '<p>If you did not create this account, you can ignore this email.</p>',
    '</div>',
  ].join('');

  const text = `Your Evoria email verification OTP is ${otpCode}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`;

  return { html, text };
};

const clearEmailVerificationOtp = async (userDoc: any) => {
  userDoc.emailVerificationToken = undefined;
  userDoc.emailVerificationExpires = undefined;
  await userDoc.save();
};

const issueEmailVerificationOtp = async (userDoc: any) => {
  const otpCode = generateOtpCode();
  userDoc.emailVerificationToken = hashToken(otpCode);
  userDoc.emailVerificationExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  await userDoc.save();

  const message = buildEmailVerificationMessage(otpCode);
  const emailResult = await sendEmail({
    to: userDoc.email,
    subject: 'Evoria Email Verification OTP',
    html: message.html,
    text: message.text,
    type: 'system',
    recipientUserId: userDoc.id,
    metadata: {
      purpose: 'email_verification_otp',
      expiryMinutes: OTP_EXPIRY_MINUTES,
    },
  });

  // Real email verification requires an actually delivered message.
  if (emailResult.status !== 'sent') {
    await clearEmailVerificationOtp(userDoc);
    return {
      delivered: false,
      providerStatus: emailResult.status,
    };
  }

  return {
    delivered: true,
    providerStatus: emailResult.status,
  };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);

    let userDoc = await UserModel.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpires +isActive +isSuspended +emailVerified',
    );

    if (userDoc?.emailVerified) {
      return next(new AppError('Email already in use', 409));
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    if (!userDoc) {
      userDoc = await UserModel.create({
        name: validatedData.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user',
        phone: validatedData.phone,
        isActive: true,
        isSuspended: false,
        emailVerified: false,
      });

      userDoc = await UserModel.findById(userDoc.id).select(
        '+emailVerificationToken +emailVerificationExpires +isActive +isSuspended +emailVerified',
      );
    } else {
      userDoc.name = validatedData.name;
      userDoc.password = hashedPassword;
      userDoc.phone = validatedData.phone;
      userDoc.isActive = true;
      userDoc.isSuspended = false;
      userDoc.emailVerified = false;
      await userDoc.save();
    }

    if (!userDoc) {
      return next(new AppError('Failed to create user account', 500));
    }

    const otpResult = await issueEmailVerificationOtp(userDoc);
    if (!otpResult.delivered) {
      return next(new AppError('Unable to send verification email right now. Please try again.', 503));
    }

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Please verify your email before logging in.',
      data: {
        requiresEmailVerification: true,
        email: normalizedEmail,
      },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = verifyEmailSchema.parse(req.body);
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);

    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpires +emailVerified +isActive +isSuspended',
    );

    if (!userDoc) {
      return next(new AppError('Invalid or expired verification OTP', 400));
    }

    if (userDoc.emailVerified) {
      return res.status(200).json({
        status: 'success',
        message: 'Email is already verified.',
      });
    }

    const isOtpValid =
      Boolean(userDoc.emailVerificationToken)
      && Boolean(userDoc.emailVerificationExpires)
      && (userDoc.emailVerificationExpires as Date) > new Date()
      && userDoc.emailVerificationToken === hashToken(validatedData.otp);

    if (!isOtpValid) {
      return next(new AppError('Invalid or expired verification OTP', 400));
    }

    userDoc.emailVerified = true;
    userDoc.emailVerificationToken = undefined;
    userDoc.emailVerificationExpires = undefined;
    userDoc.isActive = true;
    await userDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now log in.',
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = resendVerificationSchema.parse(req.body);
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);

    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select(
      '+emailVerificationToken +emailVerificationExpires +emailVerified +isActive +isSuspended',
    );

    if (!userDoc || userDoc.emailVerified || !userDoc.isActive || userDoc.isSuspended) {
      return res.status(200).json({
        status: 'success',
        message: 'If your account needs verification, a new OTP has been sent.',
      });
    }

    const otpResult = await issueEmailVerificationOtp(userDoc);
    if (!otpResult.delivered) {
      return next(new AppError('Unable to send verification email right now. Please try again.', 503));
    }

    res.status(200).json({
      status: 'success',
      message: 'If your account needs verification, a new OTP has been sent.',
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);

    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select('+password +isActive +isSuspended +emailVerified');

    if (!userDoc || !userDoc.password) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 401));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    if (!userDoc.emailVerified) {
      return next(new AppError('Please verify your email before logging in.', 403));
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

    const userDoc = await UserModel.findById(userId).select('+isActive +isSuspended +emailVerified');
    if (!userDoc) {
      return next(new AppError('User not found', 404));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 401));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    if (!userDoc.emailVerified) {
      return next(new AppError('Please verify your email before using your account.', 403));
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
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);

    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select(
      '+resetPasswordToken +resetPasswordExpires +isActive +isSuspended +emailVerified',
    );

    if (!userDoc) {
      return next(new AppError('No account found for this email address.', 404));
    }

    if (!userDoc.emailVerified) {
      return next(new AppError('Please verify your email before resetting your password.', 403));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 401));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    const otpCode = generateOtpCode();
    const hashedToken = hashToken(otpCode);

    userDoc.resetPasswordToken = hashedToken;
    userDoc.resetPasswordExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    await userDoc.save();

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Evoria Password Reset OTP',
      html: [
        '<div style="font-family:Arial,sans-serif;color:#111;">',
        '<h2>Reset Your Evoria Password</h2>',
        '<p>Use this OTP code to reset your password:</p>',
        `<p style="font-size:28px;font-weight:700;letter-spacing:2px;">${otpCode}</p>`,
        `<p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
        '<p>If you did not request this, you can ignore this email.</p>',
        '</div>',
      ].join(''),
      text: `Your Evoria password reset OTP is ${otpCode}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      type: 'system',
      recipientUserId: userDoc.id,
      metadata: {
        purpose: 'password_reset_otp',
        expiryMinutes: OTP_EXPIRY_MINUTES,
      },
    });

    if (emailResult.status !== 'sent') {
      userDoc.resetPasswordToken = undefined;
      userDoc.resetPasswordExpires = undefined;
      await userDoc.save();
      return next(new AppError('Unable to send password reset OTP email right now.', 500));
    }

    res.status(200).json({
      status: 'success',
      message: 'A password reset OTP was sent to your email.',
    });
  } catch (error) {
    handleValidationError(error, next);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);

    const hashedToken = hashToken(validatedData.token);

    const userDoc = await UserModel.findOne({
      email: normalizedEmail,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires +isActive +isSuspended +emailVerified');

    if (!userDoc) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    if (!userDoc.emailVerified) {
      return next(new AppError('Please verify your email before resetting your password.', 403));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 400));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    const isSamePassword = await bcrypt.compare(validatedData.newPassword, userDoc.password);
    if (isSamePassword) {
      return next(new AppError('New password must be different from current password', 400));
    }

    const previousHash = userDoc.password;
    userDoc.password = await bcrypt.hash(validatedData.newPassword, 12);
    userDoc.resetPasswordToken = undefined;
    userDoc.resetPasswordExpires = undefined;

    await userDoc.save();

    const persistedUser = await UserModel.findById(userDoc.id).select('+password');
    if (!persistedUser?.password || persistedUser.password === previousHash) {
      console.error('[auth.resetPassword] Password hash did not change for user', userDoc.id);
      return next(new AppError('Password reset failed. Please try again.', 500));
    }

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

export const verifyResetOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = verifyResetOtpSchema.parse(req.body);
    const normalizedEmail = assertAllowedUserEmail(validatedData.email);
    const hashedToken = hashToken(validatedData.token);

    const userDoc = await UserModel.findOne({
      email: normalizedEmail,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+isActive +isSuspended +emailVerified');

    if (!userDoc) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    if (!userDoc.emailVerified) {
      return next(new AppError('Please verify your email before resetting your password.', 403));
    }

    if (!userDoc.isActive) {
      return next(new AppError('This account is deactivated.', 400));
    }

    if (userDoc.isSuspended) {
      return next(new AppError('This account is suspended.', 403));
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully.',
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
