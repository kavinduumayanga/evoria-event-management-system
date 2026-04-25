import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { User } from '../types';
import { AppError } from '../utils/appError';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userDocs = await UserModel.find();
    const safeUsers = userDocs.map(doc => {
      const user = doc.toJSON() as any;
      delete user.password;
      return user;
    });
    res.status(200).json({ status: 'success', results: safeUsers.length, data: { users: safeUsers } });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userDoc = await UserModel.findById(req.params.id as string);
    if (!userDoc) return next(new AppError('User not found', 404));

    const safeUser = userDoc.toJSON() as any;
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

    const updatedUserDoc = await UserModel.findByIdAndUpdate(req.params.id as string, updates, { new: true });
    if (!updatedUserDoc) return next(new AppError('User not found', 404));

    const safeUser = updatedUserDoc.toJSON() as any;
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

    const deletedUserDoc = await UserModel.findByIdAndDelete(req.params.id as string);
    if (!deletedUserDoc) return next(new AppError('User not found', 404));

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
