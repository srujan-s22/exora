import mongoose from 'mongoose';
import { logger } from '@/lib/utils/logger';

/**
 * MongoDB connection singleton.
 * Reuses the connection across serverless invocations via module-level caching.
 */

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend NodeJS global to cache the connection
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

import { validateEnv } from '@/lib/config/env';


/**
 * Connect to MongoDB. Returns a cached connection if available.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  validateEnv();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(getMongoUri(), opts).then((m) => {
      logger.info('Connected to MongoDB');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Check if the database connection is healthy.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
