import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { BlobServiceClient } from '@azure/storage-blob';
import { upload } from '../src/middleware/upload.middleware';
import { uploadEventImage } from '../src/controllers/upload.controller';
import { errorHandler } from '../src/middleware/error.middleware';
import { __resetAzureBlobClientCacheForTests } from '../src/utils/azureBlobStorage';

const ORIGINAL_ENV = { ...process.env };
const TEST_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=fake;AccountKey=fake;EndpointSuffix=core.windows.net';

const createUploadTestApp = () => {
  const app = express();
  app.post('/api/uploads/event-image', upload.single('image'), uploadEventImage);
  app.use(errorHandler);
  return app;
};

const cleanupLocalUploadFromUrl = async (url?: string) => {
  if (!url || !url.startsWith('/uploads/')) return;
  const relativeFilePath = url.replace('/uploads/', '');
  const absoluteFilePath = path.join(process.cwd(), 'uploads', relativeFilePath);
  await fs.rm(absoluteFilePath, { force: true });
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  __resetAzureBlobClientCacheForTests();
});

test('falls back to local upload in development when Azure upload fails', async (t) => {
  process.env.AZURE_STORAGE_CONNECTION_STRING = TEST_CONNECTION_STRING;
  process.env.NODE_ENV = 'development';

  const azureMock = t.mock.method(BlobServiceClient, 'fromConnectionString', () => {
    return {
      getContainerClient: () => ({
        createIfNotExists: async () => undefined,
        getBlockBlobClient: () => ({
          url: 'https://fake.blob.core.windows.net/evoria-events/test.png',
          uploadData: async () => {
            throw new Error('simulated Azure upload failure');
          },
        }),
      }),
    } as unknown as BlobServiceClient;
  });

  const app = createUploadTestApp();
  const response = await request(app)
    .post('/api/uploads/event-image')
    .attach('image', Buffer.from('fake-image-content'), {
      filename: 'test.png',
      contentType: 'image/png',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'success');
  assert.match(response.body.data.url, /^\/uploads\/events\/.+\.png$/);
  assert.equal(azureMock.mock.callCount(), 1);

  await cleanupLocalUploadFromUrl(response.body.data.url);
});

test('returns 500 in production when Azure upload fails (no local fallback)', async (t) => {
  process.env.AZURE_STORAGE_CONNECTION_STRING = TEST_CONNECTION_STRING;
  process.env.NODE_ENV = 'production';

  t.mock.method(BlobServiceClient, 'fromConnectionString', () => {
    return {
      getContainerClient: () => ({
        createIfNotExists: async () => undefined,
        getBlockBlobClient: () => ({
          url: 'https://fake.blob.core.windows.net/evoria-events/test.png',
          uploadData: async () => {
            throw new Error('simulated Azure upload failure');
          },
        }),
      }),
    } as unknown as BlobServiceClient;
  });

  const app = createUploadTestApp();
  const response = await request(app)
    .post('/api/uploads/event-image')
    .attach('image', Buffer.from('fake-image-content'), {
      filename: 'test.png',
      contentType: 'image/png',
    });

  assert.equal(response.status, 500);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.message, 'Failed to upload image to Azure Blob Storage');
});

test('falls back to local upload when Azure connection string is not configured', async () => {
  delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  process.env.NODE_ENV = 'production';

  const app = createUploadTestApp();
  const response = await request(app)
    .post('/api/uploads/event-image')
    .attach('image', Buffer.from('fake-image-content'), {
      filename: 'test.jpg',
      contentType: 'image/jpeg',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'success');
  assert.match(response.body.data.url, /^\/uploads\/events\/.+\.jpg$/);

  await cleanupLocalUploadFromUrl(response.body.data.url);
});
