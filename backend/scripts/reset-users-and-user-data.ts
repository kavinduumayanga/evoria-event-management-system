import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose, { ClientSession, Model } from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/User';
import { EventModel } from '../src/models/Event';
import { VenueModel } from '../src/models/Venue';
import { TicketTypeModel } from '../src/models/TicketType';
import { SessionModel } from '../src/models/Session';
import { RegistrationModel } from '../src/models/Registration';
import { BookingModel } from '../src/models/Booking';
import { NotificationModel } from '../src/models/Notification';
import { ReminderModel } from '../src/models/Reminder';
import { ReviewModel } from '../src/models/Review';
import { ReportModel } from '../src/models/Report';
import { CheckInHistoryModel } from '../src/models/CheckInHistory';
import { PushTokenModel } from '../src/models/PushToken';
import { EmailLogModel } from '../src/models/EmailLog';
import {
  parseResetUsersScriptOptions,
  RESET_ALL_USERS_CONFIRMATION_FLAG,
  RESET_ALL_USERS_REQUIRED_PHRASE,
  validateResetUsersScriptOptions,
} from '../src/utils/resetUsersArgs';

dotenv.config();

type CleanupSummary = Record<string, number>;

type ModelEntry = {
  label: string;
  model: Model<any>;
};

const COLLECTION_MODELS: ModelEntry[] = [
  { label: 'email_logs', model: EmailLogModel },
  { label: 'checkin_history', model: CheckInHistoryModel },
  { label: 'notifications', model: NotificationModel },
  { label: 'reminders', model: ReminderModel },
  { label: 'reviews', model: ReviewModel },
  { label: 'reports', model: ReportModel },
  { label: 'bookings', model: BookingModel },
  { label: 'registrations', model: RegistrationModel },
  { label: 'sessions', model: SessionModel },
  { label: 'ticket_types', model: TicketTypeModel },
  { label: 'events', model: EventModel },
  { label: 'venues', model: VenueModel },
  { label: 'push_tokens', model: PushTokenModel },
  { label: 'users', model: UserModel },
];

const sessionOptions = (session?: ClientSession) => (session ? { session } : undefined);

const isTransactionUnsupportedError = (error: unknown): boolean => {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('transaction numbers are only allowed')
    || message.includes('replica set')
    || message.includes('transaction is not supported');
};

const toTimestampTag = (date: Date): string => {
  const iso = date.toISOString();
  return iso.replace(/[:.]/g, '-');
};

const exportCollectionsToJson = async (backupDir: string): Promise<Record<string, number>> => {
  await fs.mkdir(backupDir, { recursive: true });

  const exportCounts: Record<string, number> = {};

  for (const entry of COLLECTION_MODELS) {
    const documents = await entry.model.find({}).lean();
    const outPath = path.join(backupDir, `${entry.label}.json`);
    await fs.writeFile(outPath, JSON.stringify(documents, null, 2), 'utf8');
    exportCounts[entry.label] = documents.length;
  }

  const metadataPath = path.join(backupDir, 'metadata.json');
  await fs.writeFile(
    metadataPath,
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      databaseName: mongoose.connection.db?.databaseName || '',
      collections: exportCounts,
    }, null, 2),
    'utf8',
  );

  return exportCounts;
};

const runDeletion = async (session?: ClientSession): Promise<CleanupSummary> => {
  const summary: CleanupSummary = {};

  for (const entry of COLLECTION_MODELS) {
    const result = await entry.model.deleteMany({}, sessionOptions(session));
    summary[entry.label] = result.deletedCount || 0;
  }

  return summary;
};

const printUsage = () => {
  console.log('Usage:');
  console.log('  npx ts-node scripts/reset-users-and-user-data.ts \\');
  console.log(`    ${RESET_ALL_USERS_CONFIRMATION_FLAG} --type ${RESET_ALL_USERS_REQUIRED_PHRASE} [--backup-dir ./backups/custom] [--skip-backup-export]`);
};

const run = async () => {
  const options = parseResetUsersScriptOptions(process.argv);
  const validationError = validateResetUsersScriptOptions(options);

  if (validationError) {
    console.error(`[reset-users] ${validationError}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const mongoUri = String(process.env.MONGO_URI || '').trim();
  if (!mongoUri) {
    console.error('[reset-users] MONGO_URI is not configured. Aborting.');
    process.exitCode = 1;
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[reset-users] Refusing to run in NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(mongoUri);
  const dbName = mongoose.connection.db?.databaseName || 'unknown';

  console.log('================================================================');
  console.log('[reset-users] DANGER: This will delete ALL users and user-owned data');
  console.log(`[reset-users] Connected DB: ${dbName}`);
  console.log('[reset-users] Target collections:', COLLECTION_MODELS.map((entry) => entry.label).join(', '));
  console.log('================================================================');

  const mongodumpHint = `mongodump --uri="${mongoUri}" --archive="./backups/${dbName}-pre-user-reset.archive" --gzip`;
  console.log('[reset-users] Recommended full backup command:');
  console.log(`  ${mongodumpHint}`);

  if (!options.skipBackupExport) {
    const backupDir = options.backupDir
      ? path.resolve(process.cwd(), options.backupDir)
      : path.resolve(process.cwd(), 'backups', `user-reset-${toTimestampTag(new Date())}`);

    const exportCounts = await exportCollectionsToJson(backupDir);
    console.log(`[reset-users] JSON backup exported to: ${backupDir}`);
    console.log('[reset-users] Export counts:', exportCounts);
  } else {
    console.log('[reset-users] Backup export skipped by --skip-backup-export flag.');
  }

  let summary: CleanupSummary;
  const session = await mongoose.startSession();

  try {
    try {
      session.startTransaction();
      summary = await runDeletion(session);
      await session.commitTransaction();
      console.log('[reset-users] Deletion completed using a transaction.');
    } catch (transactionError) {
      await session.abortTransaction().catch(() => undefined);
      if (!isTransactionUnsupportedError(transactionError)) {
        throw transactionError;
      }

      console.warn('[reset-users] Transactions unavailable; continuing with non-transactional deletion.');
      summary = await runDeletion();
    }
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }

  console.log('[reset-users] Deletion summary:', summary);
  console.log('[reset-users] Completed successfully.');
};

run().catch(async (error) => {
  console.error('[reset-users] Failed:', error);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => undefined);
});
