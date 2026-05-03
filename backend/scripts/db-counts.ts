import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const getMongoHostProvider = (rawUri: string): string => {
  try {
    const parsed = new URL(rawUri);
    return parsed.host || '<unknown-host>';
  } catch {
    return '<unknown-host>';
  }
};

const run = async () => {
  const mongoUri = String(process.env.MONGO_URI || '').trim();
  if (!mongoUri) {
    console.error('[db:counts] MONGO_URI is not configured. Aborting.');
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
  console.log(`Connected DB: ${dbName}`);
  console.log(`MongoDB host/provider: ${hostProvider}`);

  const collections = await db.collections();

  if (!collections.length) {
    console.log('No collections found.');
    console.log('✅ Database is clean and ready for fresh use.');
    await mongoose.disconnect();
    return;
  }

  let totalDocuments = 0;

  for (const collection of collections.sort((a, b) => a.collectionName.localeCompare(b.collectionName))) {
    const count = await collection.countDocuments({});
    totalDocuments += count;
    console.log(`${collection.collectionName}: ${count}`);
  }

  if (totalDocuments === 0) {
    console.log('✅ Database is clean and ready for fresh use.');
  } else {
    console.log(`❌ Remaining records found: ${totalDocuments}`);
    process.exitCode = 2;
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('[db:counts] Failed:', error);
  process.exitCode = 1;
  await mongoose.disconnect().catch(() => undefined);
});
