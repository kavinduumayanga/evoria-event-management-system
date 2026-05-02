import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { uploadImageBuffer } from '../utils/azureBlobStorage';

interface UploadTargetConfig {
  envVarName: 'AZURE_STORAGE_CONTAINER_EVENTS' | 'AZURE_STORAGE_CONTAINER_PROFILES' | 'AZURE_STORAGE_CONTAINER_SESSIONS';
  fallbackContainer: string;
  fallbackFolder: string;
}

const resolveContainerName = (
  envVarName: UploadTargetConfig['envVarName'],
  fallbackContainer: string,
): string => {
  const configured = (process.env[envVarName] || '').trim();
  return configured || fallbackContainer;
};

const handleUpload = (target: UploadTargetConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }

      const containerName = resolveContainerName(target.envVarName, target.fallbackContainer);
      const uploadResult = await uploadImageBuffer({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        containerName,
        fallbackFolder: target.fallbackFolder,
      });

      res.status(200).json({
        status: 'success',
        data: {
          url: uploadResult.url,
        },
      });
    } catch (error) {
      next(error);
    }
  };
};

export const uploadEventImage = handleUpload({
  envVarName: 'AZURE_STORAGE_CONTAINER_EVENTS',
  fallbackContainer: 'evoria-events',
  fallbackFolder: 'events',
});

export const uploadProfileImage = handleUpload({
  envVarName: 'AZURE_STORAGE_CONTAINER_PROFILES',
  fallbackContainer: 'evoria-profiles',
  fallbackFolder: 'profiles',
});

export const uploadSessionImage = handleUpload({
  envVarName: 'AZURE_STORAGE_CONTAINER_SESSIONS',
  fallbackContainer: 'evoria-sessions',
  fallbackFolder: 'sessions',
});
