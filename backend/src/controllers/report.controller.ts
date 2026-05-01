import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReportModel } from '../models/Report';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { AppError } from '../utils/appError';

const createReportSchema = z.object({
  targetType: z.enum(['event', 'user']),
  targetId: z.string().trim().min(1, 'targetId is required'),
  reason: z.string().trim().min(3, 'reason must be at least 3 characters').max(500, 'reason is too long'),
}).strict();

const formatZodError = (error: z.ZodError) => error.issues.map((issue) => issue.message).join(', ');

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createReportSchema.parse(req.body);

    if (validatedData.targetType === 'event') {
      const event = await EventModel.findById(validatedData.targetId);
      if (!event) {
        return next(new AppError('Event not found', 404));
      }

      await EventModel.findByIdAndUpdate(event.id, { isFlagged: true });
    } else {
      if (validatedData.targetId === req.user!.id) {
        return next(new AppError('You cannot report your own user account', 400));
      }

      const user = await UserModel.findById(validatedData.targetId);
      if (!user) {
        return next(new AppError('User not found', 404));
      }

      await UserModel.findByIdAndUpdate(user.id, { $inc: { reportCount: 1 } });
    }

    const report = await ReportModel.create({
      reporterId: req.user!.id,
      targetType: validatedData.targetType,
      targetId: validatedData.targetId,
      reason: validatedData.reason,
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
    });

    res.status(201).json({
      status: 'success',
      data: {
        report: report.toJSON(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(formatZodError(error), 400));
    }
    next(error);
  }
};

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await ReportModel.find().sort({ isResolved: 1, createdAt: -1 });

    const reporterIds = Array.from(new Set(reports.map((report) => report.reporterId)));
    const userTargetIds = Array.from(new Set(reports
      .filter((report) => report.targetType === 'user')
      .map((report) => report.targetId)));
    const eventTargetIds = Array.from(new Set(reports
      .filter((report) => report.targetType === 'event')
      .map((report) => report.targetId)));

    const [reporters, reportedUsers, reportedEvents] = await Promise.all([
      UserModel.find({ _id: { $in: reporterIds } }).select('_id name email'),
      UserModel.find({ _id: { $in: userTargetIds } }).select('_id name email isSuspended reportCount'),
      EventModel.find({ _id: { $in: eventTargetIds } }).select('_id title moderationStatus isFlagged'),
    ]);

    const reporterMap = new Map(reporters.map((user) => [user.id, user]));
    const userTargetMap = new Map(reportedUsers.map((user) => [user.id, user]));
    const eventTargetMap = new Map(reportedEvents.map((event) => [event.id, event]));

    const enrichedReports = reports.map((report) => {
      const base = report.toJSON() as Record<string, unknown>;
      const reporter = reporterMap.get(report.reporterId);

      const target = report.targetType === 'user'
        ? userTargetMap.get(report.targetId)
        : eventTargetMap.get(report.targetId);

      return {
        ...base,
        reporter: reporter
          ? { id: reporter.id, name: reporter.name, email: reporter.email }
          : null,
        target: target
          ? (report.targetType === 'user'
            ? {
                id: target.id,
                type: 'user',
                name: (target as any).name,
                email: (target as any).email,
                isSuspended: Boolean((target as any).isSuspended),
                reportCount: Number((target as any).reportCount || 0),
              }
            : {
                id: target.id,
                type: 'event',
                title: (target as any).title,
                moderationStatus: (target as any).moderationStatus || 'pending',
                isFlagged: Boolean((target as any).isFlagged),
              })
          : null,
      };
    });

    res.status(200).json({
      status: 'success',
      results: enrichedReports.length,
      data: {
        reports: enrichedReports,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resolveReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await ReportModel.findById(req.params.id as string);
    if (!report) {
      return next(new AppError('Report not found', 404));
    }

    if (report.isResolved) {
      return next(new AppError('Report is already resolved', 400));
    }

    const resolvedReport = await ReportModel.findByIdAndUpdate(
      report.id,
      {
        isResolved: true,
        resolvedBy: req.user!.id,
        resolvedAt: new Date(),
      },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      data: {
        report: resolvedReport!.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
