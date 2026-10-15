import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/libtrack'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Email Transport Configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z
    .string()
    .default('587')
    .transform((val) => parseInt(val, 10)),
  EMAIL_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true' || val === '1'),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('LibTrack Admin <jessetemp923@gmail.com>'),
  APP_BASE_URL: z.string().default('http://localhost:5173'),

  // Scheduler & Reminder Settings
  REMINDER_CRON_SCHEDULE: z.string().default('0 8 * * *'),
  REMINDER_DAYS_BEFORE_DUE: z
    .string()
    .default('3')
    .transform((val) => parseInt(val, 10)),
  OVERDUE_REPEAT_INTERVAL_DAYS: z
    .string()
    .default('7')
    .transform((val) => parseInt(val, 10)),
  ENABLE_EMAIL_CRON: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),

  // Security & Admin API Key
  ADMIN_API_KEY: z.string().default('libtrack-admin-secret-2024'),

  // Bulk CSV Import & Batch Configuration
  MAX_CSV_UPLOAD_BYTES: z
    .string()
    .default('10485760') // 10MB
    .transform((val) => parseInt(val, 10)),
  MAX_CSV_ROWS: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
  IMPORT_BATCH_SIZE: z
    .string()
    .default('50')
    .transform((val) => parseInt(val, 10)),
});

export const env = envSchema.parse(process.env);
