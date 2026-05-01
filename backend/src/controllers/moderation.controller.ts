import { Request, Response, NextFunction } from 'express';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';

const findEventOrThrow = async (id: string) => {
  const event = await EventModel.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  return event;
};

const findUserOrThrow = async (id: string) => {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

export const approveEventModeration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findEventOrThrow(req.params.id as string);

    const event = await EventModel.findByIdAndUpdate(
      req.params.id as string,
      {
        moderationStatus: 'approved',
        isFlagged: false,
      },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: event!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectEventModeration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findEventOrThrow(req.params.id as string);

    const event = await EventModel.findByIdAndUpdate(
      req.params.id as string,
      {
        moderationStatus: 'rejected',
        isFlagged: true,
      },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        event: event!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const suspendUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id as string;

    if (userId === req.user!.id) {
      return next(new AppError('You cannot suspend your own account', 400));
    }

    await findUserOrThrow(userId);

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { isSuspended: true },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: user!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await findUserOrThrow(req.params.id as string);

    const user = await UserModel.findByIdAndUpdate(
      req.params.id as string,
      { isSuspended: false },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: user!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
