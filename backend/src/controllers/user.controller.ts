import { Request, Response, NextFunction } from 'express';
import { JsonRepository } from '../repositories/JsonRepository';
import { User } from '../types';
import { AppError } from '../utils/appError';

const userRepo = new JsonRepository<User>('users.json');

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userRepo.findAll();
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    res.status(200).json({ status: 'success', results: safeUsers.length, data: { users: safeUsers } });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.findById(req.params.id as string);
    if (!user) return next(new AppError('User not found', 404));

    const safeUser = { ...user };
    delete safeUser.password;

    res.status(200).json({ status: 'success', data: { user: safeUser } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.id !== (req.params.id as string) && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to update this user', 403));
    }

    // Don't allow password updates through this route
    const updates = { ...req.body };
    delete updates.password;

    const updatedUser = await userRepo.update((req.params.id as string), updates);
    if (!updatedUser) return next(new AppError('User not found', 404));

    const safeUser = { ...updatedUser };
    delete safeUser.password;

    res.status(200).json({ status: 'success', data: { user: safeUser } });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.id !== (req.params.id as string) && req.user!.role !== 'host_admin') {
      return next(new AppError('Not authorized to delete this user', 403));
    }

    const success = await userRepo.delete(req.params.id as string);
    if (!success) return next(new AppError('User not found', 404));

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
