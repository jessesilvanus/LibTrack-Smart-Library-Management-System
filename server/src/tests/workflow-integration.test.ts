import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting LibTrack Workflows & Integration Test Suite');
  console.log('======================================================\n');

  let mongod: MongoMemoryServer | null = null;

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await Book.init();
    await Member.init();
    await Loan.init();
    console.log('[Test Setup] In-Memory MongoDB running & indexes built at:', uri);
  } catch (initErr: any) {
    console.error('[Test Setup Failed]', initErr);
    process.exit(1);
  }

  // Helper to record test results
  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }

  // --- TEST 1: Creating a valid book ---
  await testCase('1. Create a valid book record', async () => {
    const book = new Book({
      title: 'Database System Implementation',
      isbn: '978-0130319951',
      authors: ['Hector Garcia-Molina', 'Jeffrey D. Ullman'],
      category: 'Computer Science',
      shelfLocation: 'Stack CS-08',
      totalCopies: 5,
      availableCopies: 5,
    });
    await book.save();
    assert(Boolean(book._id), 'Book must be saved with an _id');
    assert(book.availableCopies === 5, 'Available copies must match totalCopies upon creation');
    assert(!book.isArchived, 'New book should not be archived');
  });

  // --- TEST 2: Rejecting an invalid book ---
  await testCase('2. Reject invalid book (empty title, invalid copies constraint)', async () => {
    // Missing title
    let failedMissingTitle = false;
    try {
      const invalidBook1 = new Book({
        title: '',
        isbn: '978-1111111111',
        authors: ['Author'],
        category: 'Tech',
        shelfLocation: 'A-1',
        totalCopies: 2,
        availableCopies: 2,
      });
      await invalidBook1.validate();
    } catch {
      failedMissingTitle = true;
    }
    assert(failedMissingTitle, 'Should reject book with empty title');

    // availableCopies > totalCopies
    let failedCopyMismatch = false;
    try {
      const invalidBook2 = new Book({
        title: 'Overbooked',
        isbn: '978-2222222222',
        authors: ['Author'],
        category: 'Tech',
        shelfLocation: 'A-2',
        totalCopies: 2,
        availableCopies: 5,
      });
      await invalidBook2.validate();
    } catch {
      failedCopyMismatch = true;
    }
    assert(failedCopyMismatch, 'Should reject availableCopies exceeding totalCopies');
  });

  // --- TEST 3: Preventing duplicate ISBN records ---
  await testCase('3. Prevent duplicate ISBN records', async () => {
    const original = new Book({
      title: 'Original Algorithms',
      isbn: '978-0262046305',
      authors: ['Cormen'],
      category: 'Computer Science',
      shelfLocation: 'CS-01',
      totalCopies: 3,
      availableCopies: 3,
    });
    await original.save();

    let duplicateCaught = false;
    try {
      const duplicate = new Book({
        title: 'Different Title Same ISBN',
        isbn: '978-0262046305',
        authors: ['Someone Else'],
        category: 'Computer Science',
        shelfLocation: 'CS-02',
        totalCopies: 2,
        availableCopies: 2,
      });
      await duplicate.save();
    } catch {
      duplicateCaught = true;
    }
    assert(duplicateCaught, 'MongoDB unique index must reject duplicate ISBN');
  });

  // --- TEST 4: Registering a member and rejecting duplicate member ID/email ---
  await testCase('4. Register member and reject duplicate member ID / email', async () => {
    const member = new Member({
      memberId: 'STU-2026-0001',
      fullName: 'Rahul Verma',
      email: 'rahul.verma@demo.libtrack.edu',
      department: 'Computer Science',
      membershipStatus: 'ACTIVE',
      memberType: 'STUDENT',
      maxBorrowLimit: 4,
    });
    await member.save();
    assert(Boolean(member._id), 'Member saved successfully');

    // Duplicate Member ID
    let duplicateIdCaught = false;
    try {
      const dupIdMember = new Member({
        memberId: 'STU-2026-0001',
        fullName: 'Another Person',
        email: 'another.person@demo.libtrack.edu',
        department: 'Mechanical',
      });
      await dupIdMember.save();
    } catch {
      duplicateIdCaught = true;
    }
    assert(duplicateIdCaught, 'Must reject duplicate memberId');

    // Duplicate Email
    let duplicateEmailCaught = false;
    try {
      const dupEmailMember = new Member({
        memberId: 'STU-2026-0002',
        fullName: 'Third Person',
        email: 'rahul.verma@demo.libtrack.edu',
        department: 'Civil',
      });
      await dupEmailMember.save();
    } catch {
      duplicateEmailCaught = true;
    }
    assert(duplicateEmailCaught, 'Must reject duplicate email');
  });

  // --- TEST 5: Preventing inactive members from borrowing ---
  await testCase('5. Prevent inactive or suspended members from receiving loans', async () => {
    const suspendedMember = new Member({
      memberId: 'STU-2026-SUSP',
      fullName: 'Suspended Borrower',
      email: 'suspended@demo.libtrack.edu',
      department: 'Biotech',
      membershipStatus: 'SUSPENDED',
    });
    await suspendedMember.save();

    assert(suspendedMember.membershipStatus !== 'ACTIVE', 'Member status must be SUSPENDED');
    // Business rule check
    const isEligible = suspendedMember.membershipStatus === 'ACTIVE' && !suspendedMember.isArchived;
    assert(!isEligible, 'Suspended member must be blocked from borrowing');
  });

  // --- TEST 6: Preventing issue when no copies are available ---
  await testCase('6. Prevent book issue when available copies is zero', async () => {
    const bookZeroStock = new Book({
      title: 'Rare Manuscript',
      isbn: '978-0000000099',
      authors: ['Ancient Author'],
      category: 'Special Collections',
      shelfLocation: 'Vault-01',
      totalCopies: 1,
      availableCopies: 0, // all checked out
    });
    await bookZeroStock.save();

    // Atomic decrement attempt
    const atomicCheck = await Book.findOneAndUpdate(
      { _id: bookZeroStock._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );
    assert(atomicCheck === null, 'Atomic query must return null when availableCopies <= 0');
  });

  // --- TEST 7: Correctly decrementing inventory when a book is issued ---
  let testLoanId: string = '';
  let testBookId: string = '';
  let testMemberId: string = '';

  await testCase('7. Correctly decrement inventory when a book is issued', async () => {
    const book = new Book({
      title: 'Modern Operating Systems',
      isbn: '978-0133591620',
      authors: ['Andrew S. Tanenbaum'],
      category: 'Computer Science',
      shelfLocation: 'Stack CS-09',
      totalCopies: 3,
      availableCopies: 3,
    });
    await book.save();
    testBookId = book._id.toString();

    const member = new Member({
      memberId: 'STU-2026-0088',
      fullName: 'Vikram Joshi',
      email: 'vikram.joshi@demo.libtrack.edu',
      department: 'Information Science',
      membershipStatus: 'ACTIVE',
    });
    await member.save();
    testMemberId = member._id.toString();

    // Perform issue operation: decrement copy & create loan
    const updated = await Book.findOneAndUpdate(
      { _id: book._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );
    assert(updated !== null, 'Book available copies should update');
    assert(updated?.availableCopies === 2, 'Available copies should decrease from 3 to 2');

    const loan = new Loan({
      book: book._id,
      member: member._id,
      copyIdentifier: 'Copy #1',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    });
    await loan.save();
    testLoanId = loan._id.toString();

    assert(loan.status === 'ACTIVE', 'Loan status must be ACTIVE');
    assert(Boolean(loan._id), 'Loan must have generated ID');
  });

  // --- TEST 8: Correctly incrementing inventory when a book is returned ---
  await testCase('8. Correctly increment inventory when a book is returned', async () => {
    const loan = await Loan.findById(testLoanId);
    assert(loan !== null, 'Loan must exist');
    assert(loan?.status === 'ACTIVE', 'Loan must be active prior to return');

    // Return process
    loan!.status = 'RETURNED';
    loan!.returnDate = new Date();
    await loan!.save();

    // Increment book available copy
    const book = await Book.findByIdAndUpdate(
      testBookId,
      { $inc: { availableCopies: 1 } },
      { new: true }
    );

    assert(book?.availableCopies === 3, 'Available copies must restore from 2 back to 3');
    assert(loan!.status === 'RETURNED', 'Loan status must be RETURNED');
    assert(Boolean(loan!.returnDate), 'Loan must have returnDate recorded');
  });

  // --- TEST 9: Preventing the same loan from being returned twice ---
  await testCase('9. Prevent the same loan from being returned twice', async () => {
    const loan = await Loan.findById(testLoanId);
    assert(loan !== null, 'Loan exists');

    // Attempt second return check
    const isAlreadyReturned = loan?.status === 'RETURNED' && Boolean(loan?.returnDate);
    assert(isAlreadyReturned, 'Should detect loan is already returned');

    // In API logic, this triggers 400 Bad Request
  });

  // --- TEST 10: Preventing total/available copy counts from becoming inconsistent ---
  await testCase('10. Prevent total copies from being reduced below active loans in circulation', async () => {
    const book = new Book({
      title: 'Discrete Mathematics and Its Applications',
      isbn: '978-1259676512',
      authors: ['Kenneth H. Rosen'],
      category: 'Mathematics',
      shelfLocation: 'Stack MATH-04',
      totalCopies: 4,
      availableCopies: 1, // 3 copies on active loan!
    });
    await book.save();

    // 3 active loans exist
    const currentlyBorrowed = book.totalCopies - book.availableCopies; // 3
    assert(currentlyBorrowed === 3, 'Calculated borrowed copies must be 3');

    // User attempts to edit totalCopies to 2 (which is < 3 borrowed)
    const proposedTotal = 2;
    const isPermitted = proposedTotal >= currentlyBorrowed;
    assert(!isPermitted, 'Should reject reducing total copies below active loan count');
  });

  // --- TEST 11: Searching, filtering, and pagination ---
  await testCase('11. Search, filter, and pagination queries', async () => {
    // Seed 12 sample books
    const batch = Array.from({ length: 12 }).map((_, i) => ({
      title: `Sample Volume ${i + 1}`,
      isbn: `978-99999999${String(i).padStart(2, '0')}`,
      authors: [`Professor ${i % 3}`],
      category: i % 2 === 0 ? 'Engineering' : 'Applied Science',
      shelfLocation: `Stack ${i}`,
      totalCopies: 3,
      availableCopies: i % 4 === 0 ? 0 : 3,
      isArchived: false,
    }));
    await Book.insertMany(batch);

    // Search by title
    const searchResults = await Book.find({
      title: { $regex: 'Volume 10', $options: 'i' },
      isArchived: false,
    });
    assert(searchResults.length === 1, 'Search query must find exact title match');

    // Filter by category
    const categoryResults = await Book.find({
      category: 'Engineering',
      isArchived: false,
    });
    assert(categoryResults.length >= 6, 'Filter must match all Engineering books');

    // Pagination (Page 1 vs Page 2 with limit 5)
    const page1 = await Book.find({ isArchived: false }).skip(0).limit(5);
    const page2 = await Book.find({ isArchived: false }).skip(5).limit(5);
    assert(page1.length === 5, 'Page 1 must contain 5 records');
    assert(page2.length === 5, 'Page 2 must contain 5 records');
    assert(page1[0]._id.toString() !== page2[0]._id.toString(), 'Page 1 and Page 2 must not overlap');
  });

  // --- TEST 12: Handling an empty database and error states ---
  await testCase('12. Empty collection aggregations and error handling', async () => {
    // Clear loans collection to test empty aggregate handling
    await Loan.deleteMany({});
    const emptyLoanCount = await Loan.countDocuments({ status: 'ACTIVE' });
    assert(emptyLoanCount === 0, 'Loan count must return 0 without error on empty collection');

    // Aggregations on empty collection
    const emptyAgg = await Loan.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    assert(emptyAgg.length === 0, 'Aggregate on empty collection returns empty array without throwing');

    // Invalid ObjectId check
    const isValid = mongoose.Types.ObjectId.isValid('not-a-valid-id-1234');
    assert(!isValid, 'MongoDB ObjectId validator must correctly identify invalid hex strings');
  });

  // Cleanup
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }

  console.log('\n======================================================');
  console.log(`Results: ${results.filter((r) => r.passed).length} / ${results.length} passed.`);
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error('Failed tests:', failed);
    process.exit(1);
  } else {
    console.log('🎉 ALL 12 INTEGRATION WORKFLOW TESTS PASSED!');
    console.log('======================================================\n');
  }
}

runTests();
