import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { EventModel } from '../models/Event';
import { ReportModel } from '../models/Report';
import { AppError } from '../utils/appError';
import { manageableEventQuery } from '../utils/eventPermissions';

export const getPlatformAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managedEventCount = await EventModel.countDocuments(manageableEventQuery(req.user!.id));
    if (!managedEventCount) {
      return next(new AppError('You do not have permission to access platform analytics', 403));
    }

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
