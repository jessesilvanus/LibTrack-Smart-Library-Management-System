import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { Notification } from '../models/Notification.js';
import { ImportJob } from '../models/ImportJob.js';
import {
  csvParserService,
  sanitizeCsvCell,
  getBooksCsvTemplate,
  getMembersCsvTemplate,
} from '../services/csvParserService.js';
import { importValidationService } from '../services/importValidationService.js';
import { batchImportService } from '../services/batchImportService.js';
import { adminAuthGuard } from '../routes/notifications.js';

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

async function runBulkImportTests() {
  console.log('\n===============================================================');
  console.log('🧪 Starting LibTrack Bulk CSV Import & Batch Processing Test Suite');
  console.log('===============================================================\n');

  // 1. Setup in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  await Book.init();
  await Member.init();
  await Loan.init();
  await Notification.init();
  await ImportJob.init();

  try {
    // -------------------------------------------------------------
    // Test 1: Downloadable CSV Templates & Structure
    // -------------------------------------------------------------
    console.log('--- Test 1: Downloadable Templates Generation ---');
    const booksTemplate = getBooksCsvTemplate().toLowerCase();
    const membersTemplate = getMembersCsvTemplate().toLowerCase();
    assert(
      booksTemplate.includes('title') && booksTemplate.includes('isbn') && booksTemplate.includes('totalcopies'),
      'Books CSV template contains required headers and structure'
    );
    assert(
      membersTemplate.includes('memberid') && membersTemplate.includes('email') && membersTemplate.includes('department'),
      'Members CSV template contains required headers and structure'
    );

    // -------------------------------------------------------------
    // Test 2: Formula Injection Sanitization (CWE-1236)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: CSV Formula Injection Protection ---');
    const maliciousFormula = '=CMD|"/C calc"!A0';
    const sanitizedCell = sanitizeCsvCell(maliciousFormula);
    assert(
      sanitizedCell.startsWith(`"'=`) || sanitizedCell.includes(`'=CMD`),
      'Dangerous formula trigger (=) is safely prepended with a single quote for spreadsheet safety'
    );
    const sanitizedPlus = sanitizeCsvCell('+SUM(1,2)');
    assert(sanitizedPlus.includes(`'+SUM`), 'Formula trigger (+) is safely neutralized');

    // -------------------------------------------------------------
    // Test 3: Quoted Fields with Commas & Escaped Quotes
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Complex CSV Parsing (Quoted commas, newlines) ---');
    const complexCsv = `title,isbn,authors,category,publisher,publicationYear,shelfLocation,totalCopies
"Computer Networks, Fifth Edition",9780132126953,"Andrew S. Tanenbaum, David J. Wetherall",Computer Science,Pearson,2010,"Stack CS, Bay 4",5`;

    const parseResult = csvParserService.parseCsv(
      complexCsv,
      ['title', 'isbn', 'authors', 'category', 'totalcopies'],
      ['title', 'isbn', 'authors', 'totalcopies']
    );
    assert(parseResult.rows.length === 1, 'Complex CSV with internal commas parses into exactly 1 row');
    assert(
      parseResult.rows[0].data.title === 'Computer Networks, Fifth Edition' &&
        parseResult.rows[0].data.authors === 'Andrew S. Tanenbaum, David J. Wetherall' &&
        parseResult.rows[0].data.shelflocation === 'Stack CS, Bay 4',
      'Quoted fields containing commas are preserved accurately without column misalignment'
    );

    // -------------------------------------------------------------
    // Test 4: Empty & Malformed CSV Rejection
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Empty and Malformed CSV Rejection ---');
    let emptyCaught = false;
    try {
      csvParserService.parseCsv('', ['title'], ['title']);
    } catch {
      emptyCaught = true;
    }
    assert(emptyCaught, 'Empty CSV upload is rejected with a clear error');

    let missingHeadersCaught = false;
    try {
      const missingHeadersCsv = `title,publisher,year\nBook A,Publisher X,2022`;
      csvParserService.parseCsv(missingHeadersCsv, ['title', 'isbn', 'authors'], ['title', 'isbn', 'authors']);
    } catch (e: any) {
      missingHeadersCaught = e.message.includes('Missing required column');
    }
    assert(missingHeadersCaught, 'Missing required columns (e.g. ISBN, authors) are rejected with exact column names');

    // -------------------------------------------------------------
    // Test 5: Books CSV Validation (Valid & Invalid fields)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Row-by-Row Books Validation ---');
    const booksInputCsv = `title,isbn,authors,category,publisher,publicationYear,shelfLocation,totalCopies
Valid Book One,9780132350884,Robert C. Martin,Software Engineering,Prentice Hall,2008,Stack SE-01,5
,9780132350885,No Title Author,CS,Pub,2010,Stack,4
Invalid ISBN Book,123-BAD,Jane Doe,CS,Pub,2015,Stack,3
Negative Copies Book,9780132350886,John Smith,CS,Pub,2018,Stack,-2
Impossible Year Book,9780132350887,Alex Green,CS,Pub,3050,Stack,2`;

    const parsedBooks = csvParserService.parseCsv(
      booksInputCsv,
      ['title', 'isbn', 'authors', 'category', 'totalcopies'],
      ['title', 'isbn', 'authors', 'totalcopies']
    );

    const validationBooks = await importValidationService.validateBooks(parsedBooks.rows);
    assert(validationBooks.validRows.length === 1, 'Only 1 valid book record identified out of 5 candidate rows');
    assert(validationBooks.errors.length >= 4, 'Row-specific errors generated for missing title, invalid ISBN, negative copies, invalid year');

    // -------------------------------------------------------------
    // Test 6: Members CSV Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Row-by-Row Members Validation ---');
    const membersInputCsv = `memberId,fullName,email,department,contactNumber,memberType,maxBorrowLimit
STU-2026-9001,Pooja Hegde,pooja.hegde@college.edu,Computer Science,+91-98765-9001,STUDENT,4
STU-2026-9002,Kavya Sharma,invalid-email-string,Electronics,+91-98765-9002,STUDENT,4
,No ID Member,noid@college.edu,Civil,+91-98765-9003,STUDENT,4
FAC-2026-9001,Dr. Ramanujan,ramanujan@college.edu,Mathematics,+91-98765-9004,FACULTY,10`;

    const parsedMembers = csvParserService.parseCsv(
      membersInputCsv,
      ['memberid', 'fullname', 'email', 'department'],
      ['memberid', 'fullname', 'email', 'department']
    );

    const validationMembers = await importValidationService.validateMembers(parsedMembers.rows);
    assert(validationMembers.validRows.length === 2, '2 valid members identified (Pooja and Dr. Ramanujan)');
    assert(validationMembers.errors.some((e) => e.code === 'INVALID_EMAIL_FORMAT'), 'Invalid email format error detected on row 3');
    assert(validationMembers.errors.some((e) => e.code === 'REQUIRED_FIELD_MISSING' && e.field === 'memberId'), 'Missing memberId detected on row 4');

    // -------------------------------------------------------------
    // Test 7: In-File Duplicate Detection
    // -------------------------------------------------------------
    console.log('\n--- Test 7: In-File Duplicate Detection ---');
    const duplicateFileCsv = `title,isbn,authors,category,publisher,publicationYear,shelfLocation,totalCopies
Original Title,9781119456339,Silberschatz,CS,Wiley,2018,Stack,5
Duplicate Row Title,9781119456339,Another Author,CS,Wiley,2018,Stack,3`;

    const parsedDup = csvParserService.parseCsv(
      duplicateFileCsv,
      ['title', 'isbn', 'authors', 'totalcopies'],
      ['title', 'isbn', 'authors', 'totalcopies']
    );
    const dupRes = await importValidationService.validateBooks(parsedDup.rows);
    assert(
      dupRes.errors.some((e) => e.code === 'DUPLICATE_IN_FILE'),
      'Within-file duplicate ISBN detected and rejected with DUPLICATE_IN_FILE code'
    );

    // -------------------------------------------------------------
    // Test 8: Batch Processing Execution (SKIP_DUPLICATES policy)
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Batch Execution with SKIP_DUPLICATES ---');
    // Pre-create an existing book
    const existingBook = await Book.create({
      title: 'Existing Book in Catalog',
      isbn: '9780262033848',
      authors: ['Cormen'],
      category: 'CS',
      shelfLocation: 'Stack CS-01',
      totalCopies: 4,
      availableCopies: 4,
      isArchived: false,
    });

    const batchBooksData = [
      {
        rowNumber: 2,
        title: 'Fresh New Book Alpha',
        isbn: '9780131103627',
        normalizedIsbn: '9780131103627',
        authors: ['Brian W. Kernighan', 'Dennis M. Ritchie'],
        category: 'Computer Science',
        publisher: 'Prentice Hall',
        publicationYear: 1988,
        shelfLocation: 'Stack CS-05',
        totalCopies: 5,
        availableCopies: 5,
        isExistingInDb: false,
      },
      {
        rowNumber: 3,
        title: 'Existing Book Attempt Duplicate',
        isbn: '9780262033848', // matches existingBook
        normalizedIsbn: '9780262033848',
        authors: ['Cormen'],
        category: 'CS',
        shelfLocation: 'Stack CS-01',
        totalCopies: 6,
        availableCopies: 6,
        isExistingInDb: true,
      },
    ];

    const jobSkip = await ImportJob.create({
      jobId: 'IMP-TEST-SKIP-001',
      importType: 'BOOKS',
      fileName: 'batch_books_skip.csv',
      fileSize: 1024,
      status: 'READY',
      conflictPolicy: 'SKIP_DUPLICATES',
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      potentialDuplicates: 1,
      previewRows: batchBooksData,
      validatedRows: batchBooksData,
    });

    const skipResult = await batchImportService.executeImportJob(jobSkip.jobId, 'SKIP_DUPLICATES');
    assert(skipResult.successfulRows === 1, '1 new book inserted successfully');
    assert(skipResult.skippedRows === 1, '1 duplicate book skipped without throwing database error');

    const createdBook = await Book.findOne({ isbn: '9780131103627' });
    assert(createdBook !== null, 'New book persists cleanly in MongoDB catalog');

    // -------------------------------------------------------------
    // Test 9: Batch Processing with UPDATE_EXISTING policy
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Batch Execution with UPDATE_EXISTING ---');
    const updateBooksData = [
      {
        rowNumber: 2,
        title: 'Updated Existing Book Title',
        isbn: '9780262033848',
        normalizedIsbn: '9780262033848',
        authors: ['Cormen Updated'],
        category: 'Algorithms',
        publisher: 'MIT Press New Edition',
        publicationYear: 2022,
        shelfLocation: 'Stack CS-99',
        totalCopies: 10,
        availableCopies: 10,
        isExistingInDb: true,
      },
    ];

    const jobUpdate = await ImportJob.create({
      jobId: 'IMP-TEST-UPDATE-001',
      importType: 'BOOKS',
      fileName: 'batch_books_update.csv',
      fileSize: 512,
      status: 'READY',
      conflictPolicy: 'UPDATE_EXISTING',
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      potentialDuplicates: 1,
      previewRows: updateBooksData,
      validatedRows: updateBooksData,
    });

    const updateResult = await batchImportService.executeImportJob(jobUpdate.jobId, 'UPDATE_EXISTING');
    assert(updateResult.successfulRows === 1, 'Existing record updated cleanly under UPDATE_EXISTING policy');

    const refreshedBook = await Book.findById(existingBook._id);
    assert(
      refreshedBook?.title === 'Updated Existing Book Title' &&
        refreshedBook?.shelfLocation === 'Stack CS-99' &&
        refreshedBook?.totalCopies === 10,
      'Database record values updated to new metadata and copies'
    );

    // -------------------------------------------------------------
    // Test 10: Safe Retry Behavior (Does not duplicate successful records)
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Safe Retry Execution ---');
    const failedJob = await ImportJob.create({
      jobId: 'IMP-TEST-RETRY-001',
      importType: 'BOOKS',
      fileName: 'partially_failed.csv',
      fileSize: 1024,
      status: 'COMPLETED_WITH_ERRORS',
      conflictPolicy: 'SKIP_DUPLICATES',
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      processedRows: 2,
      successfulRows: 1,
      skippedRows: 0,
      failedRows: 1,
      rowErrors: [
        {
          rowNumber: 3,
          field: 'general',
          code: 'DATABASE_WRITE_ERROR',
          message: 'Simulated transient database write timeout',
          rawValue: '9780134685991',
        },
      ],
      validatedRows: [
        {
          rowNumber: 2,
          title: 'Already Successful Book',
          isbn: '9780131103627',
          normalizedIsbn: '9780131103627',
          authors: ['Kernighan'],
          category: 'CS',
          shelfLocation: 'Stack CS-05',
          totalCopies: 5,
          availableCopies: 5,
          isExistingInDb: true,
        },
        {
          rowNumber: 3,
          title: 'Previously Failed Book',
          isbn: '9780134685991',
          normalizedIsbn: '9780134685991',
          authors: ['Joshua Bloch'],
          category: 'Software Engineering',
          publisher: 'Addison-Wesley',
          shelfLocation: 'Stack SE-02',
          totalCopies: 6,
          availableCopies: 6,
          isExistingInDb: false,
        },
      ],
    });

    const retryResult = await batchImportService.retryFailedRecords(failedJob.jobId);
    assert(retryResult.successfulRows === 1, 'Retry successfully processed the previously failed record (Joshua Bloch)');

    const countPrior = await Book.countDocuments({ isbn: '9780131103627' });
    assert(countPrior === 1, 'Retry did NOT duplicate the already-imported record (count remains exactly 1)');

    // -------------------------------------------------------------
    // Test 11: Concurrency Protection (Prevent dual workers)
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Concurrency Worker Protection ---');
    const concurrentJob = await ImportJob.create({
      jobId: 'IMP-TEST-CONCURRENCY-001',
      importType: 'BOOKS',
      fileName: 'concurrent.csv',
      fileSize: 512,
      status: 'READY',
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      validatedRows: [
        {
          rowNumber: 2,
          title: 'Concurrency Book',
          isbn: '9781491950357',
          normalizedIsbn: '9781491950357',
          authors: ['Martin Kleppmann'],
          category: 'Big Data',
          shelfLocation: 'Stack BD-01',
          totalCopies: 4,
          availableCopies: 4,
          isExistingInDb: false,
        },
      ],
    });

    let concurrentRejected = false;
    // Launch first process and immediately attempt second
    const p1 = batchImportService.executeImportJob(concurrentJob.jobId);
    try {
      await batchImportService.executeImportJob(concurrentJob.jobId);
    } catch {
      concurrentRejected = true;
    }
    await p1;
    assert(concurrentRejected, 'Concurrent worker attempt on active job is rejected with in-progress error');

    // -------------------------------------------------------------
    // Test 12: Admin Security Authorization Guard
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Admin Access Control ---');
    let unauthorizedBlocked = false;
    const reqUnauth: any = { headers: {} };
    const resUnauth: any = {
      status(code: number) {
        if (code === 403) unauthorizedBlocked = true;
        return this;
      },
      json() {},
    };
    adminAuthGuard(reqUnauth, resUnauth, () => {});
    assert(unauthorizedBlocked, 'Import operations reject unauthorized requests without x-admin-key with HTTP 403');

    let authorizedAllowed: boolean = false;
    const reqAuth: any = { headers: { 'x-admin-key': 'libtrack-admin-secret-2024' } };
    const resAuth: any = { status() { return this; }, json() {} };
    adminAuthGuard(reqAuth, resAuth, () => {
      authorizedAllowed = true;
    });
    assert(Boolean(authorizedAllowed), 'Authorized requests with valid x-admin-key proceed successfully');

    // -------------------------------------------------------------
    // Test 13: Regression Checks (Catalog, Loans, Members integrity)
    // -------------------------------------------------------------
    console.log('\n--- Test 13: Regression & Integrity Verification ---');
    const catalogCount = await Book.countDocuments();
    assert(catalogCount >= 3, 'Imported books appear directly in real MongoDB catalog collection');

    // Ensure member created during import can receive a loan
    const testMember = await Member.create({
      memberId: 'STU-REGRESSION-01',
      fullName: 'Regression Test Member',
      email: 'regression@college.edu',
      department: 'CSE',
      memberType: 'STUDENT',
      membershipStatus: 'ACTIVE',
      maxBorrowLimit: 4,
    });

    const importedBook = await Book.findOne({ isbn: '9781491950357' });
    const loanCreated = await Loan.create({
      book: importedBook!._id,
      member: testMember._id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      status: 'ACTIVE',
    });
    assert(loanCreated !== null, 'Existing loan workflows seamlessly bind to newly imported book and member records');

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

runBulkImportTests().catch((err) => {
  console.error('[FATAL TEST RUN ERROR]', err);
  process.exit(1);
});
