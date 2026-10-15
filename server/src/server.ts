import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { dashboardRouter } from './routes/dashboard.js';
import { booksRouter } from './routes/books.js';
import { membersRouter } from './routes/members.js';
import { loansRouter } from './routes/loans.js';
import { notificationsRouter } from './routes/notifications.js';
import { importsRouter } from './routes/imports.js';
import { analyticsRouter } from './routes/analytics.js';
import { authRouter } from './routes/auth.js';
import { startReminderScheduler } from './scheduler/reminderScheduler.js';
import { ensureSeedData } from './scripts/autoSeed.js';

const app = express();

// Permissive CORS configuration supporting Vercel, localhost, Render, and custom domains
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-user-role', 'x-admin-email'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '15mb' }));
app.use(requestLogger);

// Root route for Render and browser health check
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'LibTrack Backend API',
    status: 'ONLINE',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/me',
      dashboard: '/api/dashboard/summary',
    },
  });
});

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/books', booksRouter);
app.use('/api/members', membersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/imports', importsRouter);

// Catch-all 404 for unknown endpoints
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API route does not exist.',
    },
  });
});

// Centralized error handling
app.use(errorHandler);

// Attempt database connection asynchronously, start server
export const server = app.listen(env.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LibTrack Backend API listening on port ${env.PORT}`);
  console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
  console.log(`📊 Dashboard API: http://localhost:${env.PORT}/api/dashboard/summary`);
  console.log(`📧 Notifications API: http://localhost:${env.PORT}/api/notifications`);
  console.log(`📥 Bulk Import API: http://localhost:${env.PORT}/api/imports`);
  console.log(`======================================================\n`);

  // Non-blocking connection attempt
  connectDB()
    .then(async (connected) => {
      if (connected) {
        await ensureSeedData();
        startReminderScheduler();
      }
    })
    .catch((err) => {
      console.warn(`[Server] Initial DB connection attempt completed with notice:`, err);
    });
});

export default app;
