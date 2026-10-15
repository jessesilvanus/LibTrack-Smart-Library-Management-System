import mongoose from 'mongoose';
import { env } from './env.js';

interface DbState {
  isConnected: boolean;
  isMemoryDb: boolean;
  uri: string;
  error: string | null;
  lastAttemptAt: Date | null;
}

export const dbState: DbState = {
  isConnected: false,
  isMemoryDb: false,
  uri: env.MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@'),
  error: null,
  lastAttemptAt: null,
};

let memoryServerInstance: any = null;

export async function connectDB(): Promise<boolean> {
  dbState.lastAttemptAt = new Date();

  // 1. Check if In-Memory DB explicitly requested
  if (process.env.USE_MEMORY_DB === 'true') {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memUri = memoryServerInstance.getUri();
      await mongoose.connect(memUri);
      dbState.isConnected = true;
      dbState.isMemoryDb = true;
      dbState.uri = 'mongodb://[in-memory-isolated]:27017/libtrack';
      dbState.error = null;
      console.log(`[Database] In-Memory MongoDB active for isolated test/dev session.`);
      return true;
    } catch (memErr) {
      console.warn('[Database] In-memory DB setup failed:', memErr);
    }
  }

  // 2. Connect to configured MONGODB_URI (Local or Atlas)
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });

    dbState.isConnected = true;
    dbState.isMemoryDb = false;
    dbState.error = null;
    console.log(`[Database] MongoDB successfully connected to: ${dbState.uri}`);
    return true;
  } catch (err: unknown) {
    dbState.isConnected = false;
    dbState.error = err instanceof Error ? err.message : String(err);
    console.warn(`[Database] MongoDB connection notice: Unable to connect to ${dbState.uri}`);
    console.warn(`[Database] Error detail: ${dbState.error}`);
    console.log(`[Database] Attempting safe fallback to In-Memory MongoDB engine...`);

    // Automatic fallback to In-Memory MongoDB so the server is ALWAYS operational
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memUri = memoryServerInstance.getUri();
      await mongoose.connect(memUri);
      dbState.isConnected = true;
      dbState.isMemoryDb = true;
      dbState.uri = 'mongodb://[in-memory-isolated]:27017/libtrack';
      dbState.error = null;
      console.log(`[Database] In-Memory MongoDB fallback active! Server is fully operational.`);
      return true;
    } catch (memFallbackErr) {
      console.warn('[Database] In-memory fallback setup failed:', memFallbackErr);
      return false;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
  dbState.isConnected = false;
}

mongoose.connection.on('disconnected', () => {
  dbState.isConnected = false;
  console.warn('[Database] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  dbState.isConnected = true;
  dbState.error = null;
  console.log('[Database] MongoDB reconnected.');
});

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1 && dbState.isConnected;
}
