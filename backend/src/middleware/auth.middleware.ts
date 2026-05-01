import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { Role } from '../types';
import { UserModel } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: Role;
      };
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Unauthorized access. Please log in.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role?: Role; tokenVersion?: number };

    const currentUser = await UserModel.findById(decoded.id).select('+isActive +isSuspended');
    if (!currentUser) {
      return next(new AppError('Unauthorized access. User no longer exists.', 401));
    }

    if (!currentUser.isActive) {
      return next(new AppError('This account is deactivated. Please contact support.', 401));
    }

    if (currentUser.isSuspended) {
      return next(new AppError('This account is suspended. Please contact support.', 401));
    }

    req.user = {
      id: currentUser.id,
      role: currentUser.role as Role | undefined,
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token.', 401));
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
