import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { User, Role } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const signToken = (id: string, role: Role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
  });
};

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['host_admin', 'attendee']),
  phone: z.string().optional(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
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

    const newUser = newUserDoc.toJSON() as any;
    const token = signToken(newUser.id, newUser.role);

    // Remove password from output
    delete newUser.password;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodErr = error as z.ZodError<any>;
      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400));
    }
    next(error);
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    console.log('[AUTH][LOGIN] Attempt:', { email: normalizedEmail });

    const userDoc = await UserModel.findOne({ email: normalizedEmail });
    console.log('[AUTH][LOGIN] User found:', Boolean(userDoc));

    if (!userDoc || !userDoc.password) {
      console.log('[AUTH][LOGIN] Rejected: missing user or password hash');
      return next(new AppError('Incorrect email or password', 401));
    }

    const user = userDoc.toJSON() as any;

    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(user.password);
    const isPasswordCorrect = isBcryptHash
      ? await bcrypt.compare(validatedData.password, user.password)
      : validatedData.password === user.password;

    console.log('[AUTH][LOGIN] Password match:', isPasswordCorrect, `(mode: ${isBcryptHash ? 'bcrypt' : 'plain'})`);

    if (!isPasswordCorrect) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(user.id, user.role);

    delete user.password;

    res.status(200).json({
      status: 'success',
      token,
      user: user,
      data: {
        user: user,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const zodErr = error as z.ZodError<any>;
      return next(new AppError(zodErr.issues.map((e: any) => e.message).join(', '), 400));
    }
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('User not found', 404));

    const userDoc = await UserModel.findById(userId);
    if (!userDoc) return next(new AppError('User not found', 404));

    const user = userDoc.toJSON() as any;
    delete user.password;

    res.status(200).json({
      status: 'success',
      data: {
        user: user,
      },
    });
  } catch (error) {
    next(error);
  }
};
