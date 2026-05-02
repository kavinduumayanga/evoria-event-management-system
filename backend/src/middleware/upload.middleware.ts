import multer from 'multer';
import { AppError } from '../utils/appError';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const multerFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mimeType = String(file.mimetype || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mimeType)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported image type. Allowed types: jpg, png, webp.', 400));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: multerFilter,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB limit
  },
});
