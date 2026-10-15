import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Notification, NotificationType, DeliveryStatus } from '../models/Notification.js';
import { emailService } from '../services/emailService.js';
import { reminderService } from '../services/reminderService.js';
import { getTestEmailTemplate } from '../services/emailTemplates.js';
import { env } from '../config/env.js';

export const notificationsRouter = Router();

/**
 * Admin authorization guard
 * Requires either matching 'x-admin-key' header or 'x-user-role: ADMIN'
 */
export function adminAuthGuard(req: Request, res: Response, next: NextFunction): void {
  const adminKey = req.headers['x-admin-key'];
  const userRole = req.headers['x-user-role'];
  const adminEmail = req.headers['x-admin-email'];

  const isAuthorized =
    (typeof adminKey === 'string' && adminKey === env.ADMIN_API_KEY) ||
    (typeof userRole === 'string' && userRole.toUpperCase() === 'ADMIN');

  if (!isAuthorized) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Administrative privileges required. Provide a valid x-admin-key or administrator role header.',
      },
    });
    return;
  }

  if (typeof adminEmail === 'string' && adminEmail.includes('@')) {
    emailService.setActiveAdminEmail(adminEmail);
  }

  next();
}

/**
 * Simple rate limiter for manual triggers
 */
let lastManualRunTimestamp = 0;
const MANUAL_RUN_COOLDOWN_MS = 5000; // 5-second cooldown

// ==============================================================================
// 1. GET /api/notifications — Paginated, searchable notification history
// ==============================================================================
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const search = ((req.query.search as string) || '').trim();
    const typeFilter = req.query.type as NotificationType | undefined;
    const statusFilter = req.query.status as DeliveryStatus | undefined;

    const filter: Record<string, any> = {};

    if (typeFilter && ['DUE_SOON', 'FIRST_OVERDUE', 'REPEAT_OVERDUE', 'TEST'].includes(typeFilter)) {
      filter.notificationType = typeFilter;
    }

    if (statusFilter && ['PENDING', 'SENT', 'FAILED', 'SKIPPED'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    if (search) {
      filter.$or = [
        { recipientEmail: { $regex: search, $options: 'i' } },
        { idempotencyKey: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('loan')
      .populate('member', 'memberId fullName email department memberType')
      .populate('book', 'title author isbn shelfLocation');

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 2. GET /api/notifications/summary — Aggregate metric statistics
// ==============================================================================
notificationsRouter.get('/summary', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [total, sent, failed, pendingOrSkipped, dueSoon, overdue, test] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ status: 'SENT' }),
      Notification.countDocuments({ status: 'FAILED' }),
      Notification.countDocuments({ status: { $in: ['PENDING', 'SKIPPED'] } }),
      Notification.countDocuments({ notificationType: 'DUE_SOON' }),
      Notification.countDocuments({ notificationType: { $in: ['FIRST_OVERDUE', 'REPEAT_OVERDUE'] } }),
      Notification.countDocuments({ notificationType: 'TEST' }),
    ]);

    const lastRunStats = reminderService.getLastRunStats();
    const configStatus = emailService.getConfigStatus();

    res.status(200).json({
      success: true,
      data: {
        total,
        sent,
        failed,
        pendingOrSkipped,
        dueSoon,
        overdue,
        test,
        lastRunStats,
        isSchedulerBusy: reminderService.isBusy(),
        configStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 3. GET /api/notifications/config-status — Safe provider status
// ==============================================================================
notificationsRouter.get('/config-status', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = emailService.getConfigStatus();
    const verification = await emailService.verifyConnection();

    res.status(200).json({
      success: true,
      data: {
        ...status,
        verification,
        schedulerSchedule: env.REMINDER_CRON_SCHEDULE,
        leadDaysBeforeDue: env.REMINDER_DAYS_BEFORE_DUE,
        overdueRepeatIntervalDays: env.OVERDUE_REPEAT_INTERVAL_DAYS,
        cronEnabled: env.ENABLE_EMAIL_CRON,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 4. GET /api/notifications/:id — Single notification detail
// ==============================================================================
notificationsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('loan')
      .populate('member')
      .populate('book');

    if (!notification) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification event record was not found.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

// ==============================================================================
// 5. POST /api/notifications/trigger-reminders — Admin-only manual trigger
// ==============================================================================
notificationsRouter.post('/trigger-reminders', adminAuthGuard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = Date.now();
    if (now - lastManualRunTimestamp < MANUAL_RUN_COOLDOWN_MS) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_COOLDOWN',
          message: 'A reminder check was executed very recently. Please wait a few seconds before triggering again.',
        },
      });
      return;
    }

    if (reminderService.isBusy()) {
      res.status(409).json({
        success: false,
        error: {
          code: 'JOB_IN_PROGRESS',
          message: 'A reminder check job is currently in progress. Please check back in a moment.',
        },
      });
      return;
    }

    lastManualRunTimestamp = now;
    const stats = await reminderService.runAllReminderChecks();

    res.status(200).json({
      success: true,
      message: 'Reminder evaluation cycle completed successfully.',
      data: stats,
    });
  } catch (error: any) {
    next(error);
  }
});

// ==============================================================================
// 6. POST /api/notifications/test-email — Admin-only test email
// ==============================================================================
const testEmailSchema = z.object({
  recipientEmail: z
    .string()
    .trim()
    .email('Please provide a valid recipient email address.')
    .max(100, 'Email address must not exceed 100 characters'),
});

notificationsRouter.post('/test-email', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = testEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid recipient email payload.',
        },
      });
      return;
    }

    const { recipientEmail } = parseResult.data;
    const sentAt = new Date();
    const idempotencyKey = `TEST:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;

    // Prepare test template
    const template = getTestEmailTemplate({
      recipientEmail,
      appBaseUrl: env.APP_BASE_URL,
      sentAt,
    });

    // Create notification log entry
    const notification = new Notification({
      notificationType: 'TEST',
      recipientEmail: recipientEmail.toLowerCase(),
      scheduledAt: sentAt,
      status: 'PENDING',
      attemptCount: 1,
      idempotencyKey,
    });
    await notification.save();

    // Send email
    const sendResult = await emailService.sendMail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (sendResult.success) {
      notification.status = 'SENT';
      notification.sentAt = new Date();
      notification.deliveryMetadata = {
        messageId: sendResult.messageId,
        response: sendResult.response,
        provider: sendResult.isMock ? 'MOCK_TRANSPORT' : 'SMTP',
      };
      await notification.save();

      res.status(200).json({
        success: true,
        message: sendResult.isMock
          ? `Test email recorded in Mock Transport for ${recipientEmail}. Real SMTP is not configured.`
          : `Test email successfully dispatched to ${recipientEmail}.`,
        data: {
          notificationId: notification._id,
          recipientEmail,
          status: 'SENT',
          isMock: sendResult.isMock,
          messageId: sendResult.messageId,
        },
      });
    } else {
      notification.status = 'FAILED';
      notification.errorSummary = sendResult.error || 'Failed to dispatch test email';
      await notification.save();

      res.status(502).json({
        success: false,
        error: {
          code: 'EMAIL_DISPATCH_FAILED',
          message: sendResult.error || 'Failed to dispatch test email via configured transport.',
        },
      });
    }
  } catch (error) {
    next(error);
  }
});
