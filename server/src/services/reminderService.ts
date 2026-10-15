import { Loan, ILoan } from '../models/Loan.js';
import { Member, IMember } from '../models/Member.js';
import { Book, IBook } from '../models/Book.js';
import { Notification, INotification } from '../models/Notification.js';
import { emailService } from './emailService.js';
import {
  getDueSoonTemplate,
  getFirstOverdueTemplate,
  getRepeatOverdueTemplate,
  EmailContent,
} from './emailTemplates.js';
import { env } from '../config/env.js';

export interface ReminderJobStats {
  startedAt: Date;
  completedAt: Date;
  processedLoans: number;
  dueSoonSent: number;
  firstOverdueSent: number;
  repeatOverdueSent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

class ReminderService {
  private isProcessing = false;
  private lastRunStats: ReminderJobStats | null = null;

  public isBusy(): boolean {
    return this.isProcessing;
  }

  public getLastRunStats(): ReminderJobStats | null {
    return this.lastRunStats;
  }

  /**
   * Safe email format validation regex
   */
  private isValidEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /**
   * Atomically claims a notification event via unique idempotencyKey.
   * If a notification with this key already exists, returns null (skip).
   */
  private async claimNotification(params: {
    loanId: any;
    memberId: any;
    bookId: any;
    notificationType: 'DUE_SOON' | 'FIRST_OVERDUE' | 'REPEAT_OVERDUE';
    recipientEmail: string;
    idempotencyKey: string;
  }): Promise<INotification | null> {
    try {
      const notification = new Notification({
        loan: params.loanId,
        member: params.memberId,
        book: params.bookId,
        notificationType: params.notificationType,
        recipientEmail: params.recipientEmail.toLowerCase().trim(),
        scheduledAt: new Date(),
        status: 'PENDING',
        attemptCount: 0,
        idempotencyKey: params.idempotencyKey,
      });

      await notification.save();
      return notification;
    } catch (err: any) {
      // MongoDB duplicate key error code is 11000
      if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
        return null; // Already claimed by another run or prior cycle
      }
      throw err;
    }
  }

  /**
   * 1. Process Due-Soon Advance Reminders
   * Finds active, unreturned loans whose due date is within the configured window (e.g. 3 days).
   */
  public async processDueSoonReminders(referenceDate = new Date()): Promise<{
    sent: number;
    failed: number;
    skipped: number;
    errors: string[];
  }> {
    const leadDays = env.REMINDER_DAYS_BEFORE_DUE;
    const now = new Date(referenceDate);

    // Target cutoff: loans due between now and now + leadDays
    const maxDueDate = new Date(now.getTime() + leadDays * 24 * 60 * 60 * 1000);

    const activeLoans = await Loan.find({
      status: 'ACTIVE',
      returnDate: null,
      dueDate: {
        $gte: now,
        $lte: maxDueDate,
      },
    })
      .populate<{ member: IMember }>('member')
      .populate<{ book: IBook }>('book');

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const loan of activeLoans) {
      try {
        const member = loan.member;
        const book = loan.book;

        // Validation checks
        if (!member || member.isArchived || !this.isValidEmail(member.email)) {
          skipped++;
          continue;
        }

        if (!book || book.isArchived) {
          skipped++;
          continue;
        }

        // Calculate days remaining
        const diffMs = loan.dueDate.getTime() - now.getTime();
        const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        // Sensible rule: loan must be within lead days
        if (daysRemaining > leadDays) {
          skipped++;
          continue;
        }

        const idempotencyKey = `${loan._id}:DUE_SOON`;
        const notification = await this.claimNotification({
          loanId: loan._id,
          memberId: member._id,
          bookId: book._id,
          notificationType: 'DUE_SOON',
          recipientEmail: member.email,
          idempotencyKey,
        });

        if (!notification) {
          // Already sent previously
          skipped++;
          continue;
        }

        // Prepare email template
        const emailContent: EmailContent = getDueSoonTemplate({
          memberName: member.fullName,
          memberId: member.memberId,
          bookTitle: book.title,
          author: book.authors?.join(', ') || 'Unknown Author',
          shelfLocation: book.shelfLocation,
          dueDate: loan.dueDate,
          daysRemainingOrOverdue: daysRemaining,
          appBaseUrl: env.APP_BASE_URL,
        });

        // Send email
        const sendResult = await emailService.sendMail({
          to: member.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        notification.attemptCount += 1;

        if (sendResult.success) {
          notification.status = 'SENT';
          notification.sentAt = new Date();
          notification.deliveryMetadata = {
            messageId: sendResult.messageId,
            response: sendResult.response,
            provider: sendResult.isMock ? 'MOCK_TRANSPORT' : 'SMTP',
          };
          await notification.save();

          // Update loan metadata
          await Loan.findByIdAndUpdate(loan._id, {
            $inc: { 'reminderMetadata.reminderCount': 1 },
            $set: { 'reminderMetadata.lastReminderSentAt': new Date() },
          });

          sent++;
        } else {
          notification.status = 'FAILED';
          notification.errorSummary = sendResult.error || 'Failed to dispatch email';
          await notification.save();
          failed++;
          errors.push(`Failed sending due-soon to ${member.email}: ${notification.errorSummary}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`Error processing loan ${loan._id}: ${err?.message || err}`);
      }
    }

    return { sent, failed, skipped, errors };
  }

  /**
   * 2. Process Overdue Reminders (First & Repeat)
   * Finds unreturned loans past their due date and issues first or periodic notices.
   */
  public async processOverdueReminders(referenceDate = new Date()): Promise<{
    firstSent: number;
    repeatSent: number;
    failed: number;
    skipped: number;
    errors: string[];
  }> {
    const now = new Date(referenceDate);
    const repeatIntervalDays = env.OVERDUE_REPEAT_INTERVAL_DAYS;

    // Unreturned loans where dueDate is in the past
    const overdueLoans = await Loan.find({
      returnDate: null,
      status: { $in: ['ACTIVE', 'OVERDUE'] },
      dueDate: { $lt: now },
    })
      .populate<{ member: IMember }>('member')
      .populate<{ book: IBook }>('book');

    let firstSent = 0;
    let repeatSent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const loan of overdueLoans) {
      try {
        // Automatically sync loan status to OVERDUE if still ACTIVE
        if (loan.status === 'ACTIVE') {
          loan.status = 'OVERDUE';
          await loan.save();
        }

        const member = loan.member;
        const book = loan.book;

        if (!member || member.isArchived || !this.isValidEmail(member.email)) {
          skipped++;
          continue;
        }

        if (!book || book.isArchived) {
          skipped++;
          continue;
        }

        const diffMs = now.getTime() - loan.dueDate.getTime();
        const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        // --- Step A: Check / Send First Overdue Notice ---
        const firstKey = `${loan._id}:FIRST_OVERDUE`;
        const firstNotification = await this.claimNotification({
          loanId: loan._id,
          memberId: member._id,
          bookId: book._id,
          notificationType: 'FIRST_OVERDUE',
          recipientEmail: member.email,
          idempotencyKey: firstKey,
        });

        if (firstNotification) {
          // Send First Overdue Notice
          const emailContent = getFirstOverdueTemplate({
            memberName: member.fullName,
            memberId: member.memberId,
            bookTitle: book.title,
            author: book.authors?.join(', ') || 'Unknown Author',
            shelfLocation: book.shelfLocation,
            dueDate: loan.dueDate,
            daysRemainingOrOverdue: daysOverdue,
            appBaseUrl: env.APP_BASE_URL,
          });

          const sendResult = await emailService.sendMail({
            to: member.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          firstNotification.attemptCount += 1;

          if (sendResult.success) {
            firstNotification.status = 'SENT';
            firstNotification.sentAt = new Date();
            firstNotification.deliveryMetadata = {
              messageId: sendResult.messageId,
              response: sendResult.response,
              provider: sendResult.isMock ? 'MOCK_TRANSPORT' : 'SMTP',
            };
            await firstNotification.save();

            await Loan.findByIdAndUpdate(loan._id, {
              $inc: { 'reminderMetadata.reminderCount': 1 },
              $set: { 'reminderMetadata.lastReminderSentAt': new Date() },
            });

            firstSent++;
          } else {
            firstNotification.status = 'FAILED';
            firstNotification.errorSummary = sendResult.error || 'Failed delivery';
            await firstNotification.save();
            failed++;
            errors.push(`First overdue send failed for ${member.email}: ${firstNotification.errorSummary}`);
          }

          // Once first overdue is processed, proceed to next loan
          continue;
        }

        // --- Step B: Check / Send Repeat Overdue Notice (if first notice was already sent) ---
        const cycleNumber = Math.floor(daysOverdue / repeatIntervalDays);
        if (cycleNumber >= 1) {
          const repeatKey = `${loan._id}:REPEAT_OVERDUE:cycle_${cycleNumber}`;
          const repeatNotification = await this.claimNotification({
            loanId: loan._id,
            memberId: member._id,
            bookId: book._id,
            notificationType: 'REPEAT_OVERDUE',
            recipientEmail: member.email,
            idempotencyKey: repeatKey,
          });

          if (repeatNotification) {
            const emailContent = getRepeatOverdueTemplate({
              memberName: member.fullName,
              memberId: member.memberId,
              bookTitle: book.title,
              author: book.authors?.join(', ') || 'Unknown Author',
              shelfLocation: book.shelfLocation,
              dueDate: loan.dueDate,
              daysRemainingOrOverdue: daysOverdue,
              cycleNumber,
              appBaseUrl: env.APP_BASE_URL,
            });

            const sendResult = await emailService.sendMail({
              to: member.email,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            });

            repeatNotification.attemptCount += 1;

            if (sendResult.success) {
              repeatNotification.status = 'SENT';
              repeatNotification.sentAt = new Date();
              repeatNotification.deliveryMetadata = {
                messageId: sendResult.messageId,
                response: sendResult.response,
                provider: sendResult.isMock ? 'MOCK_TRANSPORT' : 'SMTP',
              };
              await repeatNotification.save();

              await Loan.findByIdAndUpdate(loan._id, {
                $inc: { 'reminderMetadata.reminderCount': 1 },
                $set: { 'reminderMetadata.lastReminderSentAt': new Date() },
              });

              repeatSent++;
            } else {
              repeatNotification.status = 'FAILED';
              repeatNotification.errorSummary = sendResult.error || 'Failed repeat delivery';
              await repeatNotification.save();
              failed++;
              errors.push(`Repeat overdue send failed for ${member.email}: ${repeatNotification.errorSummary}`);
            }
          } else {
            skipped++; // Already sent this cycle
          }
        } else {
          skipped++; // In between first notice and cycle 1
        }
      } catch (err: any) {
        failed++;
        errors.push(`Error processing overdue loan ${loan._id}: ${err?.message || err}`);
      }
    }

    return { firstSent, repeatSent, failed, skipped, errors };
  }

  /**
   * Main entrypoint: runs due-soon and overdue checks with concurrency lock
   */
  public async runAllReminderChecks(referenceDate = new Date()): Promise<ReminderJobStats> {
    if (this.isProcessing) {
      throw new Error('A reminder execution job is currently in progress. Please try again shortly.');
    }

    this.isProcessing = true;
    const startedAt = new Date();

    try {
      const dueSoonRes = await this.processDueSoonReminders(referenceDate);
      const overdueRes = await this.processOverdueReminders(referenceDate);

      const stats: ReminderJobStats = {
        startedAt,
        completedAt: new Date(),
        processedLoans: dueSoonRes.sent + dueSoonRes.skipped + overdueRes.firstSent + overdueRes.repeatSent + overdueRes.skipped,
        dueSoonSent: dueSoonRes.sent,
        firstOverdueSent: overdueRes.firstSent,
        repeatOverdueSent: overdueRes.repeatSent,
        failed: dueSoonRes.failed + overdueRes.failed,
        skipped: dueSoonRes.skipped + overdueRes.skipped,
        errors: [...dueSoonRes.errors, ...overdueRes.errors],
      };

      this.lastRunStats = stats;
      return stats;
    } finally {
      this.isProcessing = false;
    }
  }
}

export const reminderService = new ReminderService();
