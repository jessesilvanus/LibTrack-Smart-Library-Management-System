import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { Notification } from '../models/Notification.js';

async function seed(): Promise<void> {
  console.log('[Seed] Connecting to MongoDB at:', env.MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@'));

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[Seed] Connected successfully.');
  } catch (err: unknown) {
    console.error('[Seed Error] Could not connect to MongoDB.');
    console.error('[Seed Error] Detail:', err instanceof Error ? err.message : String(err));
    console.error('[Seed Error] Please ensure MongoDB is running or configure MONGODB_URI in .env with a valid MongoDB Atlas URI.');
    process.exit(1);
  }

  try {
    console.log('[Seed] Clearing existing demo records (idempotent reset)...');
    await Notification.deleteMany({});
    await Loan.deleteMany({});
    await Book.deleteMany({});
    await Member.deleteMany({});

    console.log('[Seed] Seeding sample academic books...');
    const booksData = [
      {
        title: 'Introduction to Algorithms (4th Edition)',
        isbn: '978-0262046305',
        authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
        category: 'Computer Science',
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
        category: 'Computer Science',
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
        category: 'Computer Science',
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
        category: 'Mathematics',
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
        category: 'Economics',
        publisher: 'Cengage Learning',
        publicationYear: 2016,
        shelfLocation: 'Stack ECON-05',
        totalCopies: 4,
        availableCopies: 4,
      },
    ];

    const insertedBooks = await Book.insertMany(booksData);
    console.log(`[Seed] Inserted ${insertedBooks.length} academic books.`);

    console.log('[Seed] Seeding fictional student and faculty members...');
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
    console.log(`[Seed] Inserted ${insertedMembers.length} library members.`);

    console.log('[Seed] Seeding sample loan records with varied dates and states...');
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const loansData = [
      {
        book: insertedBooks[0]._id, // Algorithms
        member: insertedMembers[0]._id, // Aarav
        copyIdentifier: 'Copy #2',
        issueDate: new Date(now.getTime() - 13 * dayMs),
        dueDate: new Date(now.getTime() + 18 * 60 * 60 * 1000), // Due in 18 hours
        status: 'ACTIVE' as const,
        reminderMetadata: { reminderCount: 1, lastReminderSentAt: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
        notes: 'Demo record: Due soon test case',
      },
      {
        book: insertedBooks[1]._id, // Database
        member: insertedMembers[2]._id, // Devansh
        copyIdentifier: 'Copy #1',
        issueDate: new Date(now.getTime() - 18 * dayMs),
        dueDate: new Date(now.getTime() - 4 * dayMs),
        status: 'OVERDUE' as const,
        reminderMetadata: { reminderCount: 2, lastReminderSentAt: new Date(now.getTime() - 1 * dayMs) },
        notes: 'Demo record: Overdue loan test case',
      },
      {
        book: insertedBooks[2]._id, // Operating Systems
        member: insertedMembers[1]._id, // Priya
        copyIdentifier: 'Copy #3',
        issueDate: new Date(now.getTime() - 16 * dayMs),
        dueDate: new Date(now.getTime() - 2 * dayMs),
        status: 'OVERDUE' as const,
        reminderMetadata: { reminderCount: 1, lastReminderSentAt: new Date(now.getTime() - 1 * dayMs) },
        notes: 'Demo record: Overdue loan test case',
      },
      {
        book: insertedBooks[3]._id, // Neuroscience
        member: insertedMembers[3]._id, // Dr. Ananya
        copyIdentifier: 'Copy #1',
        issueDate: new Date(now.getTime() - 5 * dayMs),
        dueDate: new Date(now.getTime() + 9 * dayMs),
        status: 'ACTIVE' as const,
        reminderMetadata: { reminderCount: 0, lastReminderSentAt: null },
        notes: 'Demo record: Faculty loan test case',
      },
      {
        book: insertedBooks[4]._id, // Biology
        member: insertedMembers[1]._id, // Priya
        copyIdentifier: 'Copy #4',
        issueDate: new Date(now.getTime() - 8 * dayMs),
        dueDate: new Date(now.getTime() + 6 * dayMs),
        status: 'ACTIVE' as const,
        reminderMetadata: { reminderCount: 0, lastReminderSentAt: null },
      },
      {
        book: insertedBooks[5]._id, // Calculus
        member: insertedMembers[2]._id, // Devansh
        copyIdentifier: 'Copy #2',
        issueDate: new Date(now.getTime() - 25 * dayMs),
        dueDate: new Date(now.getTime() - 11 * dayMs),
        returnDate: new Date(now.getTime() - 12 * dayMs),
        status: 'RETURNED' as const,
        reminderMetadata: { reminderCount: 0, lastReminderSentAt: null },
      },
      {
        book: insertedBooks[6]._id, // Clean Code
        member: insertedMembers[0]._id, // Aarav
        copyIdentifier: 'Copy #1',
        issueDate: new Date(now.getTime() - 35 * dayMs),
        dueDate: new Date(now.getTime() - 21 * dayMs),
        returnDate: new Date(now.getTime() - 20 * dayMs),
        status: 'RETURNED' as const,
        reminderMetadata: { reminderCount: 0, lastReminderSentAt: null },
      },
    ];

    const insertedLoans = await Loan.insertMany(loansData);
    console.log(`[Seed] Inserted ${insertedLoans.length} sample loan transactions.`);

    // Seed sample notifications
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
          messageId: 'seed-notif-001',
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
          messageId: 'seed-notif-002',
          response: '250 Mock email accepted',
          provider: 'MOCK_TRANSPORT',
        },
      },
      {
        notificationType: 'TEST' as const,
        recipientEmail: 'librarian@libtrack.edu',
        scheduledAt: new Date(now.getTime() - 1 * dayMs),
        sentAt: new Date(now.getTime() - 1 * dayMs),
        status: 'SENT' as const,
        attemptCount: 1,
        idempotencyKey: 'TEST:system-seed-check',
        deliveryMetadata: {
          messageId: 'seed-notif-test',
          response: '250 Mock email accepted',
          provider: 'MOCK_TRANSPORT',
        },
      },
    ];
    await Notification.insertMany(notificationsData);
    console.log(`[Seed] Inserted ${notificationsData.length} sample notification audit logs.`);

    console.log('\n=========================================');
    console.log('✅ LibTrack development seed completed!');
    console.log(`- Books seeded:         ${insertedBooks.length} titles`);
    console.log(`- Members seeded:       ${insertedMembers.length} users`);
    console.log(`- Loans seeded:         ${insertedLoans.length} records`);
    console.log(`- Notifications seeded: ${notificationsData.length} audit records`);
    console.log('=========================================\n');
  } catch (seedErr: unknown) {
    console.error('[Seed Error] Failed to populate database:', seedErr);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Database connection closed.');
  }
}

seed();
