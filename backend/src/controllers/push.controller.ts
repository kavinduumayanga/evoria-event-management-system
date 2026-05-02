import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PushTokenModel } from '../models/PushToken';
import { AppError } from '../utils/appError';
import { isExpoPushToken } from '../services/pushNotification.service';

const registerPushTokenSchema = z.object({
  expoPushToken: z.string().trim().min(1, 'expoPushToken is required'),
  deviceInfo: z.object({
    platform: z.string().trim().optional(),
    deviceName: z.string().trim().optional(),
    appVersion: z.string().trim().optional(),
    osVersion: z.string().trim().optional(),
  }).optional().default({}),
}).strict();

const deletePushTokenSchema = z.object({
  expoPushToken: z.string().trim().optional(),
}).strict();

export const registerPushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerPushTokenSchema.parse(req.body);

    if (!isExpoPushToken(validated.expoPushToken)) {
      return next(new AppError('Invalid Expo push token', 400));
    }

    const tokenRecord = await PushTokenModel.findOneAndUpdate(
      {
        userId: req.user!.id,
        expoPushToken: validated.expoPushToken,
      },
      {
        $set: {
          deviceInfo: {
            platform: String(validated.deviceInfo.platform || '').trim(),
            deviceName: String(validated.deviceInfo.deviceName || '').trim(),
            appVersion: String(validated.deviceInfo.appVersion || '').trim(),
            osVersion: String(validated.deviceInfo.osVersion || '').trim(),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        pushToken: tokenRecord?.toJSON(),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }

    if (error?.code === 11000) {
      return next(new AppError('Push token already registered', 409));
    }

    next(error);
  }
};

export const deletePushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = deletePushTokenSchema.parse(req.body || {});
    const token = String(validated.expoPushToken || '').trim();

    const query = token
      ? { userId: req.user!.id, expoPushToken: token }
      : { userId: req.user!.id };

    const result = await PushTokenModel.deleteMany(query);

    res.status(200).json({
      status: 'success',
      message: 'Push token removed',
      data: {
        deleted: result.deletedCount || 0,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};
