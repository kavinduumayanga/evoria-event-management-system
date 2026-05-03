import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_CONFIRM_FLAG = '--confirm-clear-db';

const parseArgs = (argv: string[]) => {
  const args = argv.slice(2);
  return {
    hasConfirmFlag: args.includes(REQUIRED_CONFIRM_FLAG),
    skipBackup: args.includes('--skip-backup'),
  };
};

const maskMongoUri = (rawUri: string): string => {
  try {
    const parsed = new URL(rawUri);
    const protocol = parsed.protocol || 'mongodb:';
    const username = parsed.username ? decodeURIComponent(parsed.username) : '';
    const host = parsed.host || '<unknown-host>';
    const dbPath = parsed.pathname.replace(/^\//, '') || '<default-db>';
    const authSegment = username ? `${username}:****@` : '';
    return `${protocol}//${authSegment}${host}/${dbPath}`;
  } catch {
    return 'mongodb://<masked-uri>';
  }
};

const getMongoHostProvider = (rawUri: string): string => {
  try {
    const parsed = new URL(rawUri);
    return parsed.host || '<unknown-host>';
  } catch {
    return '<unknown-host>';
  }
};

const createBackup = async (backupRootDir: string) => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB database handle is unavailable');
  }

  await fs.mkdir(backupRootDir, { recursive: true });

  const collections = await db.collections();
  if (!collections.length) {
    await fs.writeFile(
      path.join(backupRootDir, 'metadata.json'),
      JSON.stringify({ createdAt: new Date().toISOString(), collections: [] }, null, 2),
      'utf8',
    );
    return { backupRootDir, collectionCount: 0 };
  }

  for (const collection of collections) {
    const docs = await collection.find({}).toArray();
    const outPath = path.join(backupRootDir, `${collection.collectionName}.json`);
    await fs.writeFile(outPath, JSON.stringify(docs, null, 2), 'utf8');
  }

  await fs.writeFile(
    path.join(backupRootDir, 'metadata.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        collections: collections.map((collection) => collection.collectionName),
      },
      null,
      2,
    ),
    'utf8',
  );

  return { backupRootDir, collectionCount: collections.length };
};

const run = async () => {
  const { hasConfirmFlag, skipBackup } = parseArgs(process.argv);

  if (!hasConfirmFlag) {
    console.error(`[db:clear] Missing required confirmation flag: ${REQUIRED_CONFIRM_FLAG}`);
    console.error('Usage: npm run db:clear -- --confirm-clear-db [--skip-backup]');
    process.exitCode = 1;
    return;
  }

  const mongoUri = String(process.env.MONGO_URI || '').trim();
  if (!mongoUri) {
    console.error('[db:clear] MONGO_URI is not configured. Aborting.');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB database handle is unavailable after connect');
  }

  const dbName = db.databaseName || '<unknown-db>';
  const hostProvider = getMongoHostProvider(mongoUri);
  const maskedUri = maskMongoUri(mongoUri);

  console.log(`Connected MongoDB database: ${dbName}`);
  console.log(`MongoDB host/provider: ${hostProvider}`);
  console.log(`MongoDB URI (masked): ${maskedUri}`);
  console.log('Cleanup target: Evoria test app database');

  if (!skipBackup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupRootDir = path.resolve(process.cwd(), 'backups', `db-backup-${timestamp}`);

    try {
      const backupResult = await createBackup(backupRootDir);
      console.log(`Backup created at: ${backupResult.backupRootDir}`);
      console.log(`Backup collections exported: ${backupResult.collectionCount}`);
    } catch (backupError: any) {
      console.warn(`[db:clear] Backup failed (continuing): ${String(backupError?.message || backupError)}`);
    }
  } else {
    console.log('Backup skipped due to --skip-backup flag.');
  }

  console.log('Clearing database...');
  await db.dropDatabase();

  console.log(`Dropped database: ${dbName}`);
  console.log('✅ Database cleared successfully.');

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('[db:clear] Failed to clear database:', error);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => undefined);
});
