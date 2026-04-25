import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/JsonRepository';
import { User, Role } from '../types';
import { AppError } from '../utils/appError';
import { z } from 'zod';

const userRepo = new JsonRepository<User>('users.json');

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

    const existingUser = await userRepo.findOne((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const newUser: User = {
      id: uuidv4(),
      name: validatedData.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: validatedData.role as Role,
      phone: validatedData.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRepo.create(newUser);

    const token = signToken(newUser.id, newUser.role);

    // Remove password from output
    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: userWithoutPassword,
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

    const user = await userRepo.findOne((u) => u.email.toLowerCase() === normalizedEmail);
    console.log('[AUTH][LOGIN] User found:', Boolean(user));

    if (!user || !user.password) {
      console.log('[AUTH][LOGIN] Rejected: missing user or password hash');
      return next(new AppError('Incorrect email or password', 401));
    }

    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(user.password);
    const isPasswordCorrect = isBcryptHash
      ? await bcrypt.compare(validatedData.password, user.password)
      : validatedData.password === user.password;

    console.log('[AUTH][LOGIN] Password match:', isPasswordCorrect, `(mode: ${isBcryptHash ? 'bcrypt' : 'plain'})`);

    if (!isPasswordCorrect) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(user.id, user.role);

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    res.status(200).json({
      status: 'success',
      token,
      user: userWithoutPassword,
      data: {
        user: userWithoutPassword,
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

    const user = await userRepo.findById(userId);
    if (!user) return next(new AppError('User not found', 404));

    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};
