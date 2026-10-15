import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import { env } from '../config/env.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { healthRouter } from '../routes/health.js';
import { dashboardRouter } from '../routes/dashboard.js';
import { booksRouter } from '../routes/books.js';
import { membersRouter } from '../routes/members.js';
import { loansRouter } from '../routes/loans.js';
import { notificationsRouter } from '../routes/notifications.js';
import { importsRouter } from '../routes/imports.js';
import { analyticsRouter } from '../routes/analytics.js';
import { authRouter } from '../routes/auth.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { Notification } from '../models/Notification.js';
import { ImportJob } from '../models/ImportJob.js';
import { dbState } from '../config/db.js';
import { startReminderScheduler } from '../scheduler/reminderScheduler.js';

async function startDevMemoryServer() {
  console.log('\n======================================================');
  console.log('🚀 Launching LibTrack with In-Memory MongoDB Engine');
  console.log('======================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  dbState.isConnected = true;
  dbState.isMemoryDb = true;
  dbState.uri = uri;
  dbState.error = null;

  console.log('[MemoryDB] In-Memory MongoDB running at:', uri);

  // Pre-seed academic catalog
  console.log('[MemoryDB] Pre-populating sample books, members, loans, and notification audit logs...');
  const booksData = [
    {
      title: 'Introduction to Algorithms (4th Edition)',
      isbn: '978-0262046305',
      authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
      category: 'Computer Science & Engineering',
      publisher: 'MIT Press',
      publicationYear: 2022,
      shelfLocation: 'Stack CS-04',
      totalCopies: 8,
      availableCopies: 5,
    },
    {
      title: 'Database System Concepts (7th Edition)',
      isbn: '978-0078022159',
      authors: ['Abraham Silberschatz', 'Henry F. Korth', 'S. Sudarshan'],
      category: 'Computer Science & Engineering',
      publisher: 'McGraw-Hill Education',
      publicationYear: 2019,
      shelfLocation: 'Stack CS-07',
      totalCopies: 6,
      availableCopies: 3,
    },
    {
      title: 'Operating System Concepts (10th Edition)',
      isbn: '978-1119456339',
      authors: ['Abraham Silberschatz', 'Peter B. Galvin', 'Greg Gagne'],
      category: 'Computer Science & Engineering',
      publisher: 'Wiley',
      publicationYear: 2018,
      shelfLocation: 'Stack CS-02',
      totalCopies: 5,
      availableCopies: 2,
    },
    {
      title: 'Principles of Neural Science (6th Edition)',
      isbn: '978-1259642234',
      authors: ['Eric R. Kandel', 'John D. Koester', 'Sarah H. Mack'],
      category: 'Neuroscience & Medicine',
      publisher: 'McGraw-Hill',
      publicationYear: 2021,
      shelfLocation: 'Stack MED-12',
      totalCopies: 4,
      availableCopies: 2,
    },
    {
      title: 'Campbell Biology (12th Edition)',
      isbn: '978-0135188743',
      authors: ['Lisa A. Urry', 'Michael L. Cain', 'Steven A. Wasserman'],
      category: 'Biological Sciences',
      publisher: 'Pearson',
      publicationYear: 2020,
      shelfLocation: 'Stack BIO-03',
      totalCopies: 10,
      availableCopies: 8,
    },
    {
      title: 'Calculus: Early Transcendentals (9th Edition)',
      isbn: '978-1337613927',
      authors: ['James Stewart', 'Daniel K. Clegg', 'Saleem Watson'],
      category: 'Mathematics & Computing',
      publisher: 'Cengage Learning',
      publicationYear: 2020,
      shelfLocation: 'Stack MATH-01',
      totalCopies: 12,
      availableCopies: 9,
    },
    {
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      isbn: '978-0132350884',
      authors: ['Robert C. Martin'],
      category: 'Software Engineering',
      publisher: 'Prentice Hall',
      publicationYear: 2008,
      shelfLocation: 'Stack SE-09',
      totalCopies: 5,
      availableCopies: 4,
    },
    {
      title: 'Microeconomic Theory: Basic Principles and Extensions',
      isbn: '978-1305505797',
      authors: ['Walter Nicholson', 'Christopher M. Snyder'],
      category: 'Economics & Public Policy',
      publisher: 'Cengage Learning',
      publicationYear: 2016,
      shelfLocation: 'Stack ECON-05',
      totalCopies: 4,
      availableCopies: 4,
    },
  ];
  const insertedBooks = await Book.insertMany(booksData);

  const membersData = [
    {
      memberId: 'STU-2026-1001',
      fullName: 'Aarav Sharma',
      email: 'aarav.sharma@demo.libtrack.edu',
      department: 'Computer Science & Engineering',
      contactNumber: '+91-98765-01001',
      membershipStatus: 'ACTIVE' as const,
      memberType: 'STUDENT' as const,
      maxBorrowLimit: 4,
      isArchived: false,
    },
    {
      memberId: 'STU-2026-1002',
      fullName: 'Priya Iyer',
      email: 'priya.iyer@demo.libtrack.edu',
      department: 'Biotechnology & Bioengineering',
      contactNumber: '+91-98765-01002',
      membershipStatus: 'ACTIVE' as const,
      memberType: 'STUDENT' as const,
      maxBorrowLimit: 4,
      isArchived: false,
    },
    {
      memberId: 'STU-2026-1003',
      fullName: 'Devansh Patel',
      email: 'devansh.patel@demo.libtrack.edu',
      department: 'Mathematics & Computing',
      contactNumber: '+91-98765-01003',
      membershipStatus: 'ACTIVE' as const,
      memberType: 'STUDENT' as const,
      maxBorrowLimit: 4,
      isArchived: false,
    },
    {
      memberId: 'FAC-2026-2001',
      fullName: 'Dr. Ananya Mukhopadhyay',
      email: 'a.mukhopadhyay@demo.libtrack.edu',
      department: 'School of Medical Sciences',
      contactNumber: '+91-98765-02001',
      membershipStatus: 'ACTIVE' as const,
      memberType: 'FACULTY' as const,
      maxBorrowLimit: 10,
      isArchived: false,
    },
    {
      memberId: 'STU-2026-1004',
      fullName: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@demo.libtrack.edu',
      department: 'Economics & Public Policy',
      contactNumber: '+91-98765-01004',
      membershipStatus: 'ACTIVE' as const,
      memberType: 'STUDENT' as const,
      maxBorrowLimit: 4,
      isArchived: false,
    },
  ];
  const insertedMembers = await Member.insertMany(membersData);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const loansData = [
    {
      book: insertedBooks[0]._id,
      member: insertedMembers[0]._id,
      copyIdentifier: 'Copy #2',
      issueDate: new Date(now.getTime() - 13 * dayMs),
      dueDate: new Date(now.getTime() + 18 * 60 * 60 * 1000), // Due in 18 hours
      status: 'ACTIVE' as const,
      notes: 'Due soon demo case',
    },
    {
      book: insertedBooks[1]._id,
      member: insertedMembers[2]._id,
      copyIdentifier: 'Copy #1',
      issueDate: new Date(now.getTime() - 18 * dayMs),
      dueDate: new Date(now.getTime() - 4 * dayMs),
      status: 'OVERDUE' as const,
      notes: 'Overdue loan demo case',
    },
    {
      book: insertedBooks[2]._id,
      member: insertedMembers[1]._id,
      copyIdentifier: 'Copy #3',
      issueDate: new Date(now.getTime() - 16 * dayMs),
      dueDate: new Date(now.getTime() - 2 * dayMs),
      status: 'OVERDUE' as const,
      notes: 'Overdue loan demo case',
    },
    {
      book: insertedBooks[3]._id,
      member: insertedMembers[3]._id,
      copyIdentifier: 'Copy #1',
      issueDate: new Date(now.getTime() - 5 * dayMs),
      dueDate: new Date(now.getTime() + 9 * dayMs),
      status: 'ACTIVE' as const,
      notes: 'Faculty research loan',
    },
    {
      book: insertedBooks[4]._id,
      member: insertedMembers[1]._id,
      copyIdentifier: 'Copy #4',
      issueDate: new Date(now.getTime() - 8 * dayMs),
      dueDate: new Date(now.getTime() + 6 * dayMs),
      status: 'ACTIVE' as const,
    },
    {
      book: insertedBooks[5]._id,
      member: insertedMembers[2]._id,
      copyIdentifier: 'Copy #2',
      issueDate: new Date(now.getTime() - 25 * dayMs),
      dueDate: new Date(now.getTime() - 11 * dayMs),
      returnDate: new Date(now.getTime() - 12 * dayMs),
      status: 'RETURNED' as const,
    },
    {
      book: insertedBooks[6]._id,
      member: insertedMembers[0]._id,
      copyIdentifier: 'Copy #1',
      issueDate: new Date(now.getTime() - 35 * dayMs),
      dueDate: new Date(now.getTime() - 21 * dayMs),
      returnDate: new Date(now.getTime() - 20 * dayMs),
      status: 'RETURNED' as const,
    },
  ];
  const insertedLoans = await Loan.insertMany(loansData);

  // Seed sample initial notification logs
  const notificationsData = [
    {
      loan: insertedLoans[1]._id,
      member: insertedMembers[2]._id,
      book: insertedBooks[1]._id,
      notificationType: 'FIRST_OVERDUE' as const,
      recipientEmail: insertedMembers[2].email,
      scheduledAt: new Date(now.getTime() - 3 * dayMs),
      sentAt: new Date(now.getTime() - 3 * dayMs),
      status: 'SENT' as const,
      attemptCount: 1,
      idempotencyKey: `${insertedLoans[1]._id}:FIRST_OVERDUE`,
      deliveryMetadata: {
        messageId: 'mock-initial-001',
        response: '250 Mock email accepted',
        provider: 'MOCK_TRANSPORT',
      },
    },
    {
      loan: insertedLoans[0]._id,
      member: insertedMembers[0]._id,
      book: insertedBooks[0]._id,
      notificationType: 'DUE_SOON' as const,
      recipientEmail: insertedMembers[0].email,
      scheduledAt: new Date(now.getTime() - 2 * dayMs),
      sentAt: new Date(now.getTime() - 2 * dayMs),
      status: 'SENT' as const,
      attemptCount: 1,
      idempotencyKey: `${insertedLoans[0]._id}:DUE_SOON`,
      deliveryMetadata: {
        messageId: 'mock-initial-002',
        response: '250 Mock email accepted',
        provider: 'MOCK_TRANSPORT',
      },
    },
    {
      notificationType: 'TEST' as const,
      recipientEmail: 'jessetemp923@gmail.com',
      scheduledAt: new Date(now.getTime() - 1 * dayMs),
      sentAt: new Date(now.getTime() - 1 * dayMs),
      status: 'SENT' as const,
      attemptCount: 1,
      idempotencyKey: 'TEST:system-init-check',
      deliveryMetadata: {
        messageId: 'mock-initial-test',
        response: '250 Mock email accepted from LibTrack Admin <jessetemp923@gmail.com>',
        provider: 'MOCK_TRANSPORT',
      },
    },
  ];
  await Notification.insertMany(notificationsData);

  // Seed initial sample import jobs
  const sampleImportJobs = [
    {
      jobId: 'IMP-20261015-INITBOOKS',
      importType: 'BOOKS' as const,
      fileName: 'engineering_catalog_batch_01.csv',
      fileSize: 42150,
      submittedBy: 'Chief Librarian',
      status: 'COMPLETED' as const,
      conflictPolicy: 'SKIP_DUPLICATES' as const,
      totalRows: 8,
      validRows: 8,
      invalidRows: 0,
      potentialDuplicates: 0,
      processedRows: 8,
      successfulRows: 8,
      skippedRows: 0,
      failedRows: 0,
      rowErrors: [],
      previewRows: booksData.slice(0, 3),
      startedAt: new Date(now.getTime() - 48 * 3600 * 1000),
      completedAt: new Date(now.getTime() - 48 * 3600 * 1000 + 4200),
    },
    {
      jobId: 'IMP-20261015-INITMEMBERS',
      importType: 'MEMBERS' as const,
      fileName: 'vtu_enrolled_students_2026.csv',
      fileSize: 28400,
      submittedBy: 'Assistant Registrar',
      status: 'COMPLETED_WITH_ERRORS' as const,
      conflictPolicy: 'SKIP_DUPLICATES' as const,
      totalRows: 6,
      validRows: 5,
      invalidRows: 1,
      potentialDuplicates: 1,
      processedRows: 6,
      successfulRows: 5,
      skippedRows: 0,
      failedRows: 1,
      rowErrors: [
        {
          rowNumber: 7,
          field: 'email',
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Please provide a valid email format (e.g. name@college.edu).',
          rawValue: 'invalid.student.record',
        },
      ],
      previewRows: membersData.slice(0, 3),
      startedAt: new Date(now.getTime() - 24 * 3600 * 1000),
      completedAt: new Date(now.getTime() - 24 * 3600 * 1000 + 2800),
    },
  ];
  await ImportJob.insertMany(sampleImportJobs);

  console.log(`[MemoryDB] Seeded ${insertedBooks.length} books, ${insertedMembers.length} members, ${loansData.length} loans, ${notificationsData.length} notifications, ${sampleImportJobs.length} import jobs.`);

  // Setup express server
  const app = express();
  app.use(
    cors({
      origin: [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '15mb' }));
  app.use(requestLogger);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/books', booksRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/imports', importsRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 LibTrack API ready on port ${env.PORT} (In-Memory MongoDB)`);
    console.log(`📖 Books API: http://localhost:${env.PORT}/api/books`);
    console.log(`👥 Members API: http://localhost:${env.PORT}/api/members`);
    console.log(`🔄 Loans API: http://localhost:${env.PORT}/api/loans/active`);
    console.log(`📧 Notifications API: http://localhost:${env.PORT}/api/notifications`);
    console.log(`📊 Dashboard API: http://localhost:${env.PORT}/api/dashboard/summary`);
    console.log(`======================================================\n`);

    startReminderScheduler();
  });
}

startDevMemoryServer().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
