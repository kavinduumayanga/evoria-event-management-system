import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { EventModel } from '../models/Event';
import { ReportModel } from '../models/Report';

export const getPlatformAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalEvents, flaggedEvents, suspendedUsers, totalReports] = await Promise.all([
      UserModel.countDocuments(),
      EventModel.countDocuments(),
      EventModel.countDocuments({ isFlagged: true }),
      UserModel.countDocuments({ isSuspended: true }),
      ReportModel.countDocuments(),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        totalEvents,
        flaggedEvents,
        suspendedUsers,
        totalReports,
      },
    });
  } catch (error) {
    next(error);
  }
};
