import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export const uploadImage = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  
  res.status(200).json({
    status: 'success',
    data: {
      url: fileUrl,
    },
  });
};
