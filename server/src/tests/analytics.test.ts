import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { Notification } from '../models/Notification.js';
import { ImportJob } from '../models/ImportJob.js';
import { analyticsService } from '../services/analyticsService.js';
import { reportExportService } from '../services/reportExportService.js';

let mongod: MongoMemoryServer;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function runAnalyticsTests() {
  console.log('\n===============================================================');
  console.log('🧪 Starting LibTrack Advanced Analytics & Reports Test Suite');
  console.log('===============================================================\n');

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  let passed = 0;

  try {
    // --------------------------------------------------------------------------
    // Test 1: Date Range Parsing & Validation
    // --------------------------------------------------------------------------
    console.log('--- Test 1: Date Range Parsing & Bounds Validation ---');
    const range30d = analyticsService.parseDateRange('30d');
    assert(range30d.preset === '30d', 'Preset 30d correctly parsed');
    assert(range30d.startDate < range30d.endDate, 'Start date is prior to end date');

    const rangeToday = analyticsService.parseDateRange('today');
    assert(rangeToday.startDate.getHours() === 0, 'Today starts at 00:00:00.000');
    assert(rangeToday.endDate.getHours() === 23, 'Today ends at 23:59:59.999');

    const rangeCustom = analyticsService.parseDateRange('custom', '2026-05-01', '2026-05-15');
    assert(rangeCustom.preset === 'custom', 'Custom date range parsed');
    assert(rangeCustom.startDate.getDate() === 1, 'Custom start day matches');

    let errorCaught = false;
    try {
      analyticsService.parseDateRange('custom', '2026-05-20', '2026-05-10');
    } catch {
      errorCaught = true;
    }
    assert(errorCaught, 'Rejects inverted date range (start > end)');

    let excessiveCaught = false;
    try {
      analyticsService.parseDateRange('custom', '2024-01-01', '2026-01-01');
    } catch {
      excessiveCaught = true;
    }
    assert(excessiveCaught, 'Rejects range exceeding 366 days window');
    passed += 5;

    // --------------------------------------------------------------------------
    // Test 2: Seed Test Data Fixture
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Seed Dataset & Multi-Collection Setup ---');
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 3600 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 3600 * 1000);
    const twoDaysFuture = new Date(now.getTime() + 2 * 24 * 3600 * 1000);

    // Books: 3 titles
    const book1 = await Book.create({
      title: 'Database System Concepts',
      isbn: '978-0078022159',
      authors: ['Silberschatz', 'Korth', 'Sudarshan'],
      category: 'Computer Science',
      shelfLocation: 'Stack CS-01',
      totalCopies: 6,
      availableCopies: 4,
    });

    const book2 = await Book.create({
      title: 'Operating System Concepts',
      isbn: '978-1119456339',
      authors: ['Silberschatz', 'Galvin'],
      category: 'Computer Science',
      shelfLocation: 'Stack CS-02',
      totalCopies: 4,
      availableCopies: 1, // Low stock (<= 2)
    });

    const book3 = await Book.create({
      title: 'Signals and Systems',
      isbn: '978-0138147570',
      authors: ['Alan V. Oppenheim'],
      category: 'Electronics',
      shelfLocation: 'Stack EC-01',
      totalCopies: 5,
      availableCopies: 5,
    });

    // Members: 3 members
    const member1 = await Member.create({
      memberId: 'STU-2026-101',
      fullName: 'Ananya Rao',
      email: 'ananya.rao@college.edu',
      department: 'Computer Science',
      memberType: 'STUDENT',
      maxBorrowLimit: 4,
    });

    const member2 = await Member.create({
      memberId: 'STU-2026-102',
      fullName: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@college.edu',
      department: 'Computer Science',
      memberType: 'STUDENT',
      maxBorrowLimit: 4,
    });

    const member3 = await Member.create({
      memberId: 'FAC-2026-201',
      fullName: 'Prof. K. Swaminathan',
      email: 'swaminathan@college.edu',
      department: 'Electronics',
      memberType: 'FACULTY',
      maxBorrowLimit: 10,
    });

    // Loans:
    // Loan 1: Active, due in 2 days
    const loan1 = await Loan.create({
      book: book1._id,
      member: member1._id,
      issueDate: fiveDaysAgo,
      dueDate: twoDaysFuture,
      status: 'ACTIVE',
    });

    // Loan 2: Overdue, due 2 days ago (unreturned)
    const loan2 = await Loan.create({
      book: book2._id,
      member: member2._id,
      issueDate: tenDaysAgo,
      dueDate: twoDaysAgo,
      status: 'OVERDUE',
      reminderMetadata: { reminderCount: 1, lastReminderSentAt: twoDaysAgo },
    });

    // Loan 3: Returned 5 days ago
    const loan3 = await Loan.create({
      book: book1._id,
      member: member1._id,
      issueDate: tenDaysAgo,
      dueDate: twoDaysAgo,
      returnDate: fiveDaysAgo,
      status: 'RETURNED',
    });

    // Loan 4: Another loan on book2 by member1 (making member1 top borrower with 2 loans)
    const loan4 = await Loan.create({
      book: book2._id,
      member: member1._id,
      issueDate: twoDaysAgo,
      dueDate: twoDaysFuture,
      status: 'ACTIVE',
    });

    // Notifications:
    await Notification.create({
      loan: loan1._id,
      member: member1._id,
      book: book1._id,
      notificationType: 'DUE_SOON',
      recipientEmail: member1.email,
      scheduledAt: now,
      sentAt: now,
      status: 'SENT',
      attemptCount: 1,
      idempotencyKey: 'test-due-soon-01',
    });

    await Notification.create({
      loan: loan2._id,
      member: member2._id,
      book: book2._id,
      notificationType: 'FIRST_OVERDUE',
      recipientEmail: member2.email,
      scheduledAt: now,
      sentAt: now,
      status: 'SENT',
      attemptCount: 1,
      idempotencyKey: 'test-first-overdue-01',
    });

    await Notification.create({
      loan: loan2._id,
      member: member2._id,
      book: book2._id,
      notificationType: 'REPEAT_OVERDUE',
      recipientEmail: 'invalid@badhost',
      scheduledAt: now,
      status: 'FAILED',
      errorSummary: 'SMTP host unreachable',
      attemptCount: 1,
      idempotencyKey: 'test-failed-01',
    });

    // Bulk Import Job:
    await ImportJob.create({
      jobId: 'IMP-TEST-20261015',
      importType: 'BOOKS',
      fileName: 'catalog_seed.csv',
      fileSize: 1024,
      submittedBy: 'Test Librarian',
      status: 'COMPLETED',
      conflictPolicy: 'SKIP_DUPLICATES',
      totalRows: 10,
      validRows: 10,
      invalidRows: 0,
      potentialDuplicates: 0,
      processedRows: 10,
      successfulRows: 10,
      skippedRows: 0,
      failedRows: 0,
      rowErrors: [],
      previewRows: [],
    });

    assert(true, 'Test database successfully populated with rich test data');
    passed += 1;

    // --------------------------------------------------------------------------
    // Test 3: Dashboard Summary 12-KPI Calculation
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: 12-KPI Summary Accuracy ---');
    const summaryRange = analyticsService.parseDateRange('30d');
    const summary = await analyticsService.getSummaryMetrics(summaryRange);

    assert(summary.totalBookTitles === 3, `Total titles: expected 3, got ${summary.totalBookTitles}`);
    assert(summary.totalPhysicalCopies === 15, `Total physical copies: expected 15 (6+4+5), got ${summary.totalPhysicalCopies}`);
    assert(summary.availableCopies === 10, `Available copies: expected 10 (4+1+5), got ${summary.availableCopies}`);
    assert(summary.totalMembers === 3, `Total members: expected 3, got ${summary.totalMembers}`);
    assert(summary.activeLoans === 2, `Active loans: expected 2 (loan1, loan4), got ${summary.activeLoans}`);
    assert(summary.currentlyOverdueLoans === 1, `Currently overdue: expected 1 (loan2), got ${summary.currentlyOverdueLoans}`);
    assert(summary.issuedDuringPeriod === 4, `Issued in period: expected 4, got ${summary.issuedDuringPeriod}`);
    assert(summary.returnedDuringPeriod === 1, `Returned in period: expected 1 (loan3), got ${summary.returnedDuringPeriod}`);
    assert(summary.dueSoonRemindersSent === 1, `Due-soon reminders sent: expected 1, got ${summary.dueSoonRemindersSent}`);
    assert(summary.overdueRemindersSent === 1, `Overdue reminders sent: expected 1, got ${summary.overdueRemindersSent}`);
    assert(summary.failedNotifications === 1, `Failed notifications: expected 1, got ${summary.failedNotifications}`);
    assert(summary.recentImportsCount === 1, `Recent imports: expected 1, got ${summary.recentImportsCount}`);
    passed += 12;

    // --------------------------------------------------------------------------
    // Test 4: Circulation Trends
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Circulation Trends Aggregation ---');
    const trendsDaily = await analyticsService.getCirculationTrends(summaryRange, 'daily');
    assert(Array.isArray(trendsDaily) && trendsDaily.length > 0, 'Daily circulation trends return non-empty array');
    const totalIssuedInTrend = trendsDaily.reduce((acc, curr) => acc + curr.issued, 0);
    const totalReturnedInTrend = trendsDaily.reduce((acc, curr) => acc + curr.returned, 0);
    assert(totalIssuedInTrend === 4, `Trend total issued: expected 4, got ${totalIssuedInTrend}`);
    assert(totalReturnedInTrend === 1, `Trend total returned: expected 1, got ${totalReturnedInTrend}`);
    passed += 3;

    // --------------------------------------------------------------------------
    // Test 5: Popular Books Ranking
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: Most Borrowed Books Ranking ---');
    const popular = await analyticsService.getPopularBooks(summaryRange, 5);
    assert(popular.length === 2, `Popular books found: expected 2 distinct borrowed books, got ${popular.length}`);
    assert(popular[0].borrowCount === 2, `Top borrowed book has 2 loans`);
    assert(Boolean(popular[0].title && popular[0].isbn), 'Book title and ISBN are populated in popular ranking');
    passed += 3;

    // --------------------------------------------------------------------------
    // Test 6: Popular Categories Distribution
    // --------------------------------------------------------------------------
    console.log('\n--- Test 6: Popular Categories Distribution ---');
    const categories = await analyticsService.getCategoryDistribution(summaryRange);
    assert(categories.length === 1, 'All 4 loans belong to Computer Science');
    assert(categories[0].category === 'Computer Science', 'Category name is Computer Science');
    assert(categories[0].borrowCount === 4, 'Category borrow count is 4');
    assert(categories[0].percentage === 100, 'Category percentage is 100%');
    passed += 4;

    // --------------------------------------------------------------------------
    // Test 7: Member Engagement & Privacy Preservation
    // --------------------------------------------------------------------------
    console.log('\n--- Test 7: Member Engagement & Privacy Rules ---');
    const engagement = await analyticsService.getMemberEngagement(summaryRange);
    assert(engagement.activeBorrowersInPeriod === 2, `Active borrowers: expected 2 (member1, member2), got ${engagement.activeBorrowersInPeriod}`);
    assert(engagement.topBorrowers.length === 2, 'Top borrowers list has 2 entries');
    assert(engagement.topBorrowers[0].memberId === 'STU-2026-101', 'Top borrower is STU-2026-101 (2 loans)');
    // Privacy check: member email/phone should NOT be exposed in aggregate
    const topBorrowerRecord = engagement.topBorrowers[0] as any;
    assert(topBorrowerRecord.email === undefined, 'Borrower private email is not exposed in aggregate');
    assert(topBorrowerRecord.contactNumber === undefined, 'Borrower contact number is not exposed in aggregate');
    passed += 5;

    // --------------------------------------------------------------------------
    // Test 8: Overdue Duration Analysis
    // --------------------------------------------------------------------------
    console.log('\n--- Test 8: Overdue Duration Bucketing ---');
    const overdueAnalysis = await analyticsService.getOverdueAnalysis();
    assert(overdueAnalysis.totalOverdueLoans === 1, `Total overdue loans: expected 1, got ${overdueAnalysis.totalOverdueLoans}`);
    // loan2 was due 2 days ago -> should fall into 1-7 Days bucket
    assert(overdueAnalysis.buckets[0].count === 1, 'Overdue loan falls into 1-7 Days bucket');
    assert(overdueAnalysis.buckets[1].count === 0, '8-14 Days bucket is 0');
    assert(overdueAnalysis.overdueByCategory[0].category === 'Computer Science', 'Overdue category identified');
    passed += 4;

    // --------------------------------------------------------------------------
    // Test 9: Inventory Insights & Low Stock Detection
    // --------------------------------------------------------------------------
    console.log('\n--- Test 9: Inventory Stock Utilization & Low Stock Alert ---');
    const inventory = await analyticsService.getInventoryInsights(2);
    assert(inventory.totalPhysicalCopies === 15, 'Total copies matches 15');
    assert(inventory.availableCopies === 10, 'Available copies matches 10');
    assert(inventory.issuedCopies === 5, `Issued copies in circulation: expected 5, got ${inventory.issuedCopies}`);
    assert(inventory.lowStockCount === 1, `Low stock books count (<= 2): expected 1 (book2 with 1 copy), got ${inventory.lowStockCount}`);
    assert(inventory.lowStockBooks[0].isbn === '978-1119456339', 'Operating System Concepts flagged as low stock');
    passed += 5;

    // --------------------------------------------------------------------------
    // Test 10: Tabular Reports Provider (All 7 Reports)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 10: Tabular Report Generation (7 Supported Reports) ---');
    const repInventory = await analyticsService.getReportData('inventory', { page: 1, limit: 10 });
    assert(repInventory.data.length === 3, 'Inventory report returns 3 book items');
    assert(repInventory.reportMetadata.reportType.includes('Inventory'), 'Metadata reflects Inventory report');

    const repCirculation = await analyticsService.getReportData('circulation', { page: 1, limit: 10 });
    assert(repCirculation.data.length === 4, 'Circulation report returns 4 loans');

    const repOverdue = await analyticsService.getReportData('overdue', { page: 1, limit: 10 });
    assert(repOverdue.data.length === 1, 'Overdue report returns 1 overdue loan');

    const repPopular = await analyticsService.getReportData('popular-books', { page: 1, limit: 10 });
    assert(repPopular.data.length === 2, 'Popular books report returns 2 ranked books');

    const repMembers = await analyticsService.getReportData('member-activity', { page: 1, limit: 10 });
    assert(repMembers.data.length === 3, 'Member activity report returns 3 registered members');

    const repNotifications = await analyticsService.getReportData('email-notifications', { page: 1, limit: 10 });
    assert(repNotifications.data.length === 3, 'Email notifications report returns 3 dispatch logs');

    const repImports = await analyticsService.getReportData('bulk-imports', { page: 1, limit: 10 });
    assert(repImports.data.length === 1, 'Bulk imports report returns 1 import job');
    passed += 8;

    // --------------------------------------------------------------------------
    // Test 11: CSV File Export & Formula Injection (CWE-1236)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 11: CSV File Export & Formula Injection Protection ---');
    const exportResult = await reportExportService.generateReportCsv('inventory', {});
    assert(exportResult.rowCount === 3, `Export row count matches data count: ${exportResult.rowCount}`);
    assert(exportResult.csvContent.includes('# LibTrack Library Management System'), 'CSV contains standard header comments');
    assert(exportResult.csvContent.includes('"Database System Concepts"'), 'CSV contains quoted book titles');

    // Test with malicious member full name starting with '='
    const badMember = await Member.create({
      memberId: 'STU-2026-999',
      fullName: '=CMD("calc.exe")',
      email: 'calc.exploit@college.edu',
      department: 'Hacking',
      memberType: 'STUDENT',
      maxBorrowLimit: 4,
    });

    const exportMembers = await reportExportService.generateReportCsv('member-activity', { search: 'STU-2026-999' });
    assert(exportMembers.csvContent.includes("'=CMD"), 'Formula injection trigger (=) is neutralized with leading single quote');
    await Member.deleteOne({ _id: badMember._id });
    passed += 4;

    // --------------------------------------------------------------------------
    // Test 12: Admin Security & Authorization Guard
    // --------------------------------------------------------------------------
    console.log('\n--- Test 12: Admin Authorization Guard ---');
    let rejected = false;
    const fakeReqUnauthorized: any = { headers: {} };
    const fakeRes: any = {
      status(code: number) {
        if (code === 403) rejected = true;
        return this;
      },
      json(payload: any) {
        return payload;
      },
    };
    let nextCalled = false;
    const fakeNext = () => {
      nextCalled = true;
    };

    const { adminAuthGuard } = await import('../routes/notifications.js');
    adminAuthGuard(fakeReqUnauthorized, fakeRes, fakeNext);
    assert(rejected && !nextCalled, 'Unauthorized request without x-admin-key is rejected with HTTP 403');

    const fakeReqAuthorized: any = { headers: { 'x-admin-key': 'libtrack-admin-secret-2024' } };
    let authorizedPassed = false;
    adminAuthGuard(fakeReqAuthorized, fakeRes, () => {
      authorizedPassed = true;
    });
    assert(authorizedPassed, 'Authorized request with valid x-admin-key passes guard');
    passed += 2;

    console.log('\n===============================================================');
    console.log(`Test Execution Summary: ${passed} passed, 0 failed.`);
    console.log('===============================================================\n');
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runAnalyticsTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
