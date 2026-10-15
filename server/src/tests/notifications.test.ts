import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { Notification } from '../models/Notification.js';
import { emailService } from '../services/emailService.js';
import { reminderService } from '../services/reminderService.js';
import {
  escapeHtml,
  getDueSoonTemplate,
  getFirstOverdueTemplate,
  getRepeatOverdueTemplate,
} from '../services/emailTemplates.js';
import express from 'express';
import { notificationsRouter } from '../routes/notifications.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) {
      console.error(`    ↳ Details: ${detail}`);
    }
  }
}

async function runNotificationTests() {
  console.log('\n===============================================================');
  console.log('🧪 Starting LibTrack Automated Email Reminders & Notifications Test Suite');
  console.log('===============================================================\n');

  // 1. Setup in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  await Book.init();
  await Member.init();
  await Loan.init();
  await Notification.init();

  // Enforce mock transport for tests
  emailService.setForceMock(true);
  emailService.clearMockMails();

  try {
    // -------------------------------------------------------------
    // Test 1: HTML Escaping & XSS Sanitization in Templates
    // -------------------------------------------------------------
    console.log('--- Test 1: HTML Escaping & XSS Protection ---');
    const maliciousPayload = '<script>alert("xss")</script> & "quotes"';
    const escaped = escapeHtml(maliciousPayload);
    assert(
      !escaped.includes('<script>') && escaped.includes('&lt;script&gt;') && escaped.includes('&quot;quotes&quot;'),
      'Email templates correctly escape user-supplied HTML entities to prevent XSS'
    );

    // -------------------------------------------------------------
    // Setup Shared Fixtures
    // -------------------------------------------------------------
    const testBook = await Book.create({
      title: 'Database Security & Privacy',
      isbn: '978-0123456789',
      authors: ['Alice Researcher', 'Bob Scholar'],
      category: 'Computer Science',
      shelfLocation: 'Stack SEC-01',
      totalCopies: 5,
      availableCopies: 5,
    });

    const activeMember = await Member.create({
      memberId: 'STU-TEST-001',
      fullName: 'Vikram Seth',
      email: 'vikram.seth@college.edu',
      department: 'Computer Science',
      memberType: 'STUDENT',
      membershipStatus: 'ACTIVE',
    });

    const invalidRaw = await Member.collection.insertOne({
      memberId: 'STU-TEST-002',
      fullName: 'Kiran Rao',
      email: 'kiran.rao.invalid-email',
      department: 'Mechanical',
      memberType: 'STUDENT',
      membershipStatus: 'ACTIVE',
      maxBorrowLimit: 4,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const invalidEmailMember = { _id: invalidRaw.insertedId };


    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    // -------------------------------------------------------------
    // Test 2: Loan due in 3 days is eligible for due-soon reminder
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Advance Due-Soon Reminder Eligibility ---');
    const loanDueSoon = await Loan.create({
      book: testBook._id,
      member: activeMember._id,
      issueDate: new Date(now.getTime() - 11 * dayMs),
      dueDate: new Date(now.getTime() + 2.5 * dayMs), // Due in 2.5 days (<= 3 days window)
      status: 'ACTIVE',
    });

    emailService.clearMockMails();
    const dueSoonResult = await reminderService.processDueSoonReminders(now);
    assert(dueSoonResult.sent === 1, 'Loan due in <= 3 days successfully dispatched due-soon reminder');

    const notifRecord = await Notification.findOne({
      loan: loanDueSoon._id,
      notificationType: 'DUE_SOON',
    });
    assert(
      notifRecord !== null && notifRecord.status === 'SENT' && notifRecord.recipientEmail === 'vikram.seth@college.edu',
      'Notification history record created with SENT status and correct recipient'
    );

    // -------------------------------------------------------------
    // Test 3: Loan due outside reminder window is NOT sent prematurely
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Loans Outside Reminder Window ---');
    const loanDueFar = await Loan.create({
      book: testBook._id,
      member: activeMember._id,
      issueDate: new Date(now.getTime() - 2 * dayMs),
      dueDate: new Date(now.getTime() + 10 * dayMs), // Due in 10 days (> 3 days)
      status: 'ACTIVE',
    });

    emailService.clearMockMails();
    const farResult = await reminderService.processDueSoonReminders(now);
    assert(farResult.sent === 0, 'Loan due in 10 days is NOT sent prematurely (0 dispatched)');

    const farNotif = await Notification.findOne({
      loan: loanDueFar._id,
      notificationType: 'DUE_SOON',
    });
    assert(farNotif === null, 'No notification record generated for loan outside reminder window');

    // -------------------------------------------------------------
    // Test 4: Returned loans receive NO reminders
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Returned Loans Exclusion ---');
    const returnedLoan = await Loan.create({
      book: testBook._id,
      member: activeMember._id,
      issueDate: new Date(now.getTime() - 14 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      returnDate: new Date(now.getTime() - 1 * dayMs), // Returned yesterday
      status: 'RETURNED',
    });

    emailService.clearMockMails();
    await reminderService.processDueSoonReminders(now);
    const returnedNotif = await Notification.findOne({ loan: returnedLoan._id });
    assert(returnedNotif === null, 'Returned loan did NOT receive any reminder');

    // -------------------------------------------------------------
    // Test 5: First-overdue notification generated once
    // -------------------------------------------------------------
    console.log('\n--- Test 5: First Overdue Notification ---');
    const overdueLoan = await Loan.create({
      book: testBook._id,
      member: activeMember._id,
      issueDate: new Date(now.getTime() - 16 * dayMs),
      dueDate: new Date(now.getTime() - 2 * dayMs), // Overdue by 2 days
      status: 'ACTIVE',
    });

    emailService.clearMockMails();
    const overdueRes1 = await reminderService.processOverdueReminders(now);
    assert(overdueRes1.firstSent === 1, 'First overdue notification sent on initial overdue detection');

    const updatedLoan = await Loan.findById(overdueLoan._id);
    assert(updatedLoan?.status === 'OVERDUE', 'Loan status automatically transitioned from ACTIVE to OVERDUE');

    const firstOverdueNotif = await Notification.findOne({
      loan: overdueLoan._id,
      notificationType: 'FIRST_OVERDUE',
    });
    assert(
      firstOverdueNotif !== null && firstOverdueNotif.status === 'SENT',
      'FIRST_OVERDUE notification recorded in database with status SENT'
    );

    // -------------------------------------------------------------
    // Test 6: Duplicate scheduler runs do NOT send duplicate reminders
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Idempotency & Duplicate Run Protection ---');
    emailService.clearMockMails();
    // Run second time on same date
    const overdueRes2 = await reminderService.processOverdueReminders(now);
    assert(overdueRes2.firstSent === 0, 'Second run does NOT re-send first overdue reminder (0 sent)');
    assert(emailService.getMockMails().length === 0, 'Mock mail transport received 0 duplicate emails');

    // -------------------------------------------------------------
    // Test 7: Repeat overdue notifications obey configured interval
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Repeat Overdue Notification Interval (7 days) ---');
    // Day 4 overdue (under 7 days cycle): should not send repeat yet
    const day4 = new Date(now.getTime() + 2 * dayMs);
    const day4Res = await reminderService.processOverdueReminders(day4);
    assert(day4Res.repeatSent === 0, 'Day 4 overdue did not trigger repeat notice prematurely (cycle 1 requires 7 days)');

    // Day 9 overdue (>= 7 days cycle 1): should trigger repeat notice #1
    const day9 = new Date(now.getTime() + 7 * dayMs);
    const day9Res = await reminderService.processOverdueReminders(day9);
    assert(day9Res.repeatSent === 1, 'Day 9 overdue (past 7-day threshold) triggered Repeat Overdue notice #1');

    const repeatNotif = await Notification.findOne({
      loan: overdueLoan._id,
      notificationType: 'REPEAT_OVERDUE',
    });
    assert(
      repeatNotif !== null && repeatNotif.idempotencyKey.includes('cycle_1'),
      'REPEAT_OVERDUE notification recorded with cycle_1 idempotency key'
    );

    // -------------------------------------------------------------
    // Test 8: Concurrent scheduler runs cannot send duplicate event
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Concurrency Protection ---');
    const loanConcurrent = await Loan.create({
      book: testBook._id,
      member: activeMember._id,
      issueDate: new Date(now.getTime() - 12 * dayMs),
      dueDate: new Date(now.getTime() + 1.5 * dayMs),
      status: 'ACTIVE',
    });

    emailService.clearMockMails();
    // Simulate concurrent runs attempting to process due soon simultaneously
    const [runA, runB] = await Promise.all([
      reminderService.processDueSoonReminders(now),
      reminderService.processDueSoonReminders(now),
    ]);

    const totalSentConcurrent = runA.sent + runB.sent;
    assert(totalSentConcurrent === 1, `Concurrent execution sent exactly 1 email (runA: ${runA.sent}, runB: ${runB.sent})`);

    const concurrentNotifs = await Notification.find({ loan: loanConcurrent._id });
    assert(concurrentNotifs.length === 1, 'Only exactly 1 Notification record created in MongoDB under concurrent race');

    // -------------------------------------------------------------
    // Test 9: Members with missing or invalid email are handled safely
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Safe Handling of Members with Invalid Email ---');
    const loanInvalidMember = await Loan.create({
      book: testBook._id,
      member: invalidEmailMember._id,
      issueDate: new Date(now.getTime() - 10 * dayMs),
      dueDate: new Date(now.getTime() + 1 * dayMs),
      status: 'ACTIVE',
    });

    const invalidResult = await reminderService.processDueSoonReminders(now);
    assert(invalidResult.skipped >= 1, 'Loans with invalid member emails are skipped gracefully without server error');

    // -------------------------------------------------------------
    // Test 10: Failed email attempts are logged accurately with error summary
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Error Logging on Dispatch Failure ---');
    // Temporarily mock sendMail failure
    const originalSendMail = emailService.sendMail.bind(emailService);
    emailService.sendMail = async () => ({
      success: false,
      error: 'SMTP Relay connection timed out [ETIMEDOUT]',
      isMock: false,
    });

    const loanFailedDispatch = await Loan.create({
      book: testBook._id,
      member: activeMember._id,
      issueDate: new Date(now.getTime() - 13 * dayMs),
      dueDate: new Date(now.getTime() + 2 * dayMs),
      status: 'ACTIVE',
    });

    const failRunRes = await reminderService.processDueSoonReminders(now);
    assert(failRunRes.failed >= 1, 'Failed dispatch recorded in failure counter');

    const failedNotif = await Notification.findOne({
      loan: loanFailedDispatch._id,
      status: 'FAILED',
    });
    assert(
      failedNotif !== null && Boolean(failedNotif.errorSummary?.includes('ETIMEDOUT')),
      'Failed notification record saved in MongoDB with explicit errorSummary'
    );

    // Restore sendMail
    emailService.sendMail = originalSendMail;

    // -------------------------------------------------------------
    // Test 11: Application remains usable when email config is missing/mock
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Usability in Mock / Unconfigured Transport Mode ---');
    const configStatus = emailService.getConfigStatus();
    assert(
      configStatus.mode === 'MOCK_TRANSPORT' || configStatus.configured === false,
      'Email service accurately reports MOCK_TRANSPORT when external credentials are not set'
    );
    const connCheck = await emailService.verifyConnection();
    assert(connCheck.success === true, 'verifyConnection() returns operational status in mock mode');

    // -------------------------------------------------------------
    // Test 12: Manual reminder runs use the exact same safe service
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Manual Reminder Evaluation ---');
    const manualStats = await reminderService.runAllReminderChecks(now);
    assert(
      typeof manualStats.processedLoans === 'number' && typeof manualStats.dueSoonSent === 'number',
      'runAllReminderChecks() returns complete audit statistics'
    );

    // -------------------------------------------------------------
    // Test 13: Unauthorized users cannot invoke admin actions
    // -------------------------------------------------------------
    console.log('\n--- Test 13: Admin Security & Authorization Guard ---');
    const app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationsRouter);

    // Test with mock request helper
    let unauthorizedStatusCode = 0;
    const reqMockUnauthorized: any = { headers: {} };
    const resMockUnauthorized: any = {
      status(code: number) {
        unauthorizedStatusCode = code;
        return this;
      },
      json() {},
    };
    const { adminAuthGuard } = await import('../routes/notifications.js');
    adminAuthGuard(reqMockUnauthorized, resMockUnauthorized, () => {});
    assert(unauthorizedStatusCode === 403, 'Unauthorized request without x-admin-key is rejected with HTTP 403 Forbidden');

    let authorizedPassed: boolean = false;
    const reqMockAuthorized: any = { headers: { 'x-admin-key': 'libtrack-admin-secret-2024' } };
    const resMockAuthorized: any = { status() { return this; }, json() {} };
    adminAuthGuard(reqMockAuthorized, resMockAuthorized, () => {
      authorizedPassed = true;
    });
    assert(Boolean(authorizedPassed), 'Request with valid x-admin-key passes authorization guard');

    // -------------------------------------------------------------
    // Test 14: Test email action uses ONLY explicitly selected recipient
    // -------------------------------------------------------------
    console.log('\n--- Test 14: Administrative Test Email Explicit Recipient ---');
    emailService.clearMockMails();
    const explicitRecipient = 'librarian.head@university.edu';
    const testMail = await emailService.sendMail({
      to: explicitRecipient,
      subject: 'Test Verification',
      html: '<p>Test</p>',
      text: 'Test',
    });

    const mockMails = emailService.getMockMails();
    assert(
      testMail.success && mockMails.length === 1 && mockMails[0].to === explicitRecipient,
      'Test email was sent strictly to the explicitly provided recipient address'
    );

    // -------------------------------------------------------------
    // Test 15: Stop overdue reminders once loan is returned
    // -------------------------------------------------------------
    console.log('\n--- Test 15: Immediate Cessation of Overdue Reminders Upon Return ---');
    await Loan.findByIdAndUpdate(overdueLoan._id, {
      returnDate: new Date(),
      status: 'RETURNED',
    });

    emailService.clearMockMails();
    // Record timestamp before checking
    const beforeCheck = new Date();
    // Simulate day 20 overdue
    const day20 = new Date(now.getTime() + 18 * dayMs);
    const day20Res = await reminderService.processOverdueReminders(day20);
    const overdueAfterReturn = await Notification.find({
      loan: overdueLoan._id,
      createdAt: { $gte: beforeCheck },
    });
    assert(
      overdueAfterReturn.length === 0,
      'Zero new overdue reminders generated for the returned loan after check-in (immediate cessation verified)'
    );





  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }

  console.log('\n===============================================================');
  console.log(`Test Execution Summary: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runNotificationTests().catch((err) => {
  console.error('[FATAL TEST RUN ERROR]', err);
  process.exit(1);
});
