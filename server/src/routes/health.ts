import { Router, Request, Response } from 'express';
import { dbState, isDbConnected } from '../config/db.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const dbConnected = isDbConnected();

  res.status(dbConnected ? 200 : 503).json({
    success: true,
    data: {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: {
        connected: dbConnected,
        targetUri: dbState.uri,
        error: dbState.error,
        actionRequired: dbConnected
          ? null
          : 'Please start MongoDB locally (mongod) or update MONGODB_URI in server/.env with your MongoDB Atlas connection string.',
      },
    },
  });
});
