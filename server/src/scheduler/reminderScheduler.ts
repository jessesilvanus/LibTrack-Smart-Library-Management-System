import cron, { ScheduledTask } from 'node-cron';
import { reminderService } from '../services/reminderService.js';
import { env } from '../config/env.js';

let task: ScheduledTask | null = null;

export function startReminderScheduler(): void {
  if (!env.ENABLE_EMAIL_CRON || env.NODE_ENV === 'test') {
    console.log('[Scheduler] Background reminder cron is disabled by configuration or environment.');
    return;
  }

  const scheduleExpression = env.REMINDER_CRON_SCHEDULE;

  if (!cron.validate(scheduleExpression)) {
    console.error(`[Scheduler] Invalid cron schedule expression: "${scheduleExpression}". Defaulting to "0 8 * * *".`);
  }

  const validSchedule = cron.validate(scheduleExpression) ? scheduleExpression : '0 8 * * *';

  task = cron.schedule(validSchedule, async () => {
    console.log(`\n[Scheduler] ⏰ Running automated daily reminder check (${new Date().toISOString()})...`);
    try {
      const stats = await reminderService.runAllReminderChecks();
      console.log(
        `[Scheduler] ✅ Completed: Due-Soon: ${stats.dueSoonSent}, First-Overdue: ${stats.firstOverdueSent}, Repeat-Overdue: ${stats.repeatOverdueSent}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`
      );
      if (stats.errors.length > 0) {
        console.warn(`[Scheduler] Notices/Errors encountered:`, stats.errors);
      }
    } catch (err: any) {
      console.error(`[Scheduler] ❌ Error executing automated reminder job:`, err?.message || err);
    }
  });

  console.log(`[Scheduler] ⏰ Automated email reminder cron job scheduled with pattern: "${validSchedule}"`);
}

export function stopReminderScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[Scheduler] Background reminder cron stopped.');
  }
}
