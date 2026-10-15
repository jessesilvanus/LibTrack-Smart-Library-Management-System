import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';

async function verifySchemas() {
  console.log('[Verification] Validating Mongoose Schemas & Model Definitions...');

  // 1. Verify Book Schema Validation
  const validBook = new Book({
    title: 'Test Algorithms Book',
    isbn: '978-0262033848',
    authors: ['Test Author'],
    category: 'Computer Science',
    shelfLocation: 'Stack CS-01',
    totalCopies: 5,
    availableCopies: 5,
  });
  const bookValErr = validBook.validateSync();
  if (bookValErr) {
    throw new Error(`Book validation failed: ${bookValErr.message}`);
  }
  console.log('✓ Book schema valid & passes validation rules.');

  // Verify Book constraint: availableCopies cannot exceed totalCopies
  const invalidBook = new Book({
    title: 'Invalid Book',
    isbn: '978-0000000000',
    authors: ['Test Author'],
    category: 'General',
    shelfLocation: 'Stack A-01',
    totalCopies: 2,
    availableCopies: 5, // invalid
  });
  const invalidBookErr = invalidBook.validateSync();
  if (!invalidBookErr) {
    throw new Error('Book validation failed to catch availableCopies > totalCopies');
  }
  console.log('✓ Book constraint caught invalid availableCopies > totalCopies.');

  // 2. Verify Member Schema Validation
  const validMember = new Member({
    memberId: 'STU-2026-9999',
    fullName: 'Test Student',
    email: 'test.student@demo.libtrack.edu',
    department: 'Computer Science',
    membershipStatus: 'ACTIVE',
  });
  const memberValErr = validMember.validateSync();
  if (memberValErr) {
    throw new Error(`Member validation failed: ${memberValErr.message}`);
  }
  console.log('✓ Member schema valid & passes validation rules.');

  // 3. Verify Loan Schema Validation
  const validLoan = new Loan({
    book: validBook._id,
    member: validMember._id,
    copyIdentifier: 'Copy #1',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
    reminderMetadata: { reminderCount: 0, lastReminderSentAt: null },
  });
  const loanValErr = validLoan.validateSync();
  if (loanValErr) {
    throw new Error(`Loan validation failed: ${loanValErr.message}`);
  }
  console.log('✓ Loan schema valid & passes validation rules.');

  console.log('\n=============================================');
  console.log('🎉 All LibTrack Mongoose Schemas Verified!');
  console.log('=============================================\n');
}

verifySchemas().catch((err) => {
  console.error('[Verification Error]', err);
  process.exit(1);
});
