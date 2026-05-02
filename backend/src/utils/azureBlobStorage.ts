import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import { AppError } from './appError';

interface UploadImageBufferInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  containerName: string;
  fallbackFolder: string;
}

interface UploadImageBufferResult {
  url: string;
  provider: 'azure' | 'local';
}

let cachedBlobServiceClient: BlobServiceClient | null | undefined;

const getBlobServiceClient = (): BlobServiceClient | null => {
  if (cachedBlobServiceClient !== undefined) {
    return cachedBlobServiceClient;
  }

  const connectionString = (process.env.AZURE_STORAGE_CONNECTION_STRING || '').trim();
  if (!connectionString) {
    cachedBlobServiceClient = null;
    return cachedBlobServiceClient;
  }

  cachedBlobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return cachedBlobServiceClient;
};

const sanitizeExtension = (originalName: string, mimeType: string): string => {
  const fromName = path.extname(originalName || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (fromName.length > 1 && fromName.length <= 10) return fromName;

  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'image/heic') return '.heic';
  return '.jpg';
};

const buildBlobName = (originalName: string, mimeType: string) => {
  const extension = sanitizeExtension(originalName, mimeType);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `${Date.now()}-${randomPart}${extension}`;
};

const uploadToLocalFallback = async (
  buffer: Buffer,
  fallbackFolder: string,
  fileName: string,
): Promise<UploadImageBufferResult> => {
  const uploadDir = path.join(__dirname, '../../uploads', fallbackFolder);
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return {
    provider: 'local',
    url: `/uploads/${fallbackFolder}/${fileName}`,
  };
};

export const uploadImageBuffer = async (
  input: UploadImageBufferInput,
): Promise<UploadImageBufferResult> => {
  const {
    buffer,
    originalName,
    mimeType,
    containerName,
    fallbackFolder,
  } = input;

  const fileName = buildBlobName(originalName, mimeType);
  const blobServiceClient = getBlobServiceClient();

  if (!blobServiceClient) {
    return uploadToLocalFallback(buffer, fallbackFolder, fileName);
  }

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType || 'application/octet-stream',
      },
    });

    return {
      provider: 'azure',
      url: blockBlobClient.url,
    };
  } catch (error) {
    const isDevelopment = (process.env.NODE_ENV || '').trim() !== 'production';
    if (isDevelopment) {
      return uploadToLocalFallback(buffer, fallbackFolder, fileName);
    }

    throw new AppError('Failed to upload image to Azure Blob Storage', 500);
  }
};

// Test-only utility to make environment-based upload behavior deterministic.
export const __resetAzureBlobClientCacheForTests = () => {
  cachedBlobServiceClient = undefined;
};
