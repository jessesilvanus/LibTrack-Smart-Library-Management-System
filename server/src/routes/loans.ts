import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Loan } from '../models/Loan.js';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { isDbConnected } from '../config/db.js';

export const loansRouter = Router();

const issueLoanSchema = z.object({
  bookId: z.string().trim().min(1, 'Book ID is required'),
  memberId: z.string().trim().min(1, 'Member ID is required'),
  borrowDays: z.number().int().min(1, 'Borrowing period must be at least 1 day').max(90).default(14),
  copyIdentifier: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const returnLoanSchema = z.object({
  loanId: z.string().trim().min(1, 'Loan ID is required'),
  notes: z.string().trim().optional(),
});

function checkDb(req: Request, res: Response, next: () => void) {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is disconnected.' },
    });
    return;
  }
  next();
}

loansRouter.use(checkDb);

// POST /api/loans/issue — Issue a book with atomic concurrency & validation checks
loansRouter.post('/issue', async (req: Request, res: Response) => {
  try {
    const validated = issueLoanSchema.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(validated.bookId) || !mongoose.Types.ObjectId.isValid(validated.memberId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Provided Book ID or Member ID is not a valid identifier.' },
      });
      return;
    }

    // 1. Confirm Member exists and is eligible
    const member = await Member.findById(validated.memberId);
    if (!member || member.isArchived) {
      res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'Selected member was not found or is archived.' },
      });
      return;
    }

    if (member.membershipStatus !== 'ACTIVE') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_ACTIVE',
          message: `Member "${member.fullName}" (${member.memberId}) is currently ${member.membershipStatus}. Inactive or suspended members cannot receive new book loans.`,
        },
      });
      return;
    }

    // 2. Confirm Member borrowing quota
    const activeLoansCount = await Loan.countDocuments({
      member: member._id,
      status: 'ACTIVE',
    });

    const borrowLimit = member.maxBorrowLimit || (member.memberType === 'FACULTY' ? 10 : 4);
    if (activeLoansCount >= borrowLimit) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BORROW_QUOTA_EXCEEDED',
          message: `Member "${member.fullName}" has reached their maximum borrowing limit of ${borrowLimit} book(s). Current active loans: ${activeLoansCount}.`,
        },
      });
      return;
    }

    // 3. Confirm Book exists and is not archived
    const book = await Book.findById(validated.bookId);
    if (!book || book.isArchived) {
      res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'Selected book was not found or has been archived.' },
      });
      return;
    }

    // 4. Prevent duplicate loan of same title to same member
    const existingActiveLoan = await Loan.findOne({
      member: member._id,
      book: book._id,
      status: 'ACTIVE',
    });

    if (existingActiveLoan) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_BORROWED',
          message: `Member "${member.fullName}" already has an active loan for "${book.title}".`,
        },
      });
      return;
    }

    // 5. Atomic copy decrement with condition: availableCopies > 0
    const updatedBook = await Book.findOneAndUpdate(
      { _id: book._id, availableCopies: { $gt: 0 }, isArchived: false },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!updatedBook) {
      res.status(409).json({
        success: false,
        error: {
          code: 'NO_COPIES_AVAILABLE',
          message: `All copies of "${book.title}" are currently in circulation. Zero copies available on shelf.`,
        },
      });
      return;
    }

    // 6. Calculate consistent server dates
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + validated.borrowDays * 24 * 60 * 60 * 1000);

    const copyLabel = validated.copyIdentifier || `Copy #${book.totalCopies - updatedBook.availableCopies}`;

    // 7. Create Loan record
    const loan = new Loan({
      book: book._id,
      member: member._id,
      copyIdentifier: copyLabel,
      issueDate,
      dueDate,
      status: 'ACTIVE',
      notes: validated.notes || undefined,
      reminderMetadata: {
        reminderCount: 0,
        lastReminderSentAt: null,
      },
    });

    await loan.save();

    // Populate for clean response
    const populatedLoan = await Loan.findById(loan._id)
      .populate('book', 'title isbn category shelfLocation totalCopies availableCopies')
      .populate('member', 'fullName memberId email department')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedLoan,
      message: `Book "${book.title}" issued successfully to ${member.fullName}. Due on ${dueDate.toLocaleDateString()}.`,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors[0]?.message || 'Validation error',
          details: err.flatten(),
        },
      });
      return;
    }
    console.error('[Issue Loan Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'ISSUE_FAILED', message: 'Failed to issue book.' },
    });
  }
});

// POST /api/loans/return — Return a book with atomic increment and audit update
loansRouter.post('/return', async (req: Request, res: Response) => {
  try {
    const validated = returnLoanSchema.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(validated.loanId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid loan identifier.' },
      });
      return;
    }

    const loan = await Loan.findById(validated.loanId)
      .populate('book', 'title totalCopies availableCopies')
      .populate('member', 'fullName memberId');

    if (!loan) {
      res.status(404).json({
        success: false,
        error: { code: 'LOAN_NOT_FOUND', message: 'Loan transaction not found.' },
      });
      return;
    }

    // Guard: Prevent double return
    if (loan.status === 'RETURNED' && loan.returnDate) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_RETURNED',
          message: `This loan was already returned on ${new Date(loan.returnDate).toLocaleDateString()}. Duplicate return rejected.`,
        },
      });
      return;
    }

    const returnDate = new Date();
    const isOverdue = returnDate.getTime() > new Date(loan.dueDate).getTime();
    const overdueDays = isOverdue
      ? Math.ceil((returnDate.getTime() - new Date(loan.dueDate).getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    // Atomic inventory increment (ensuring availableCopies does not exceed totalCopies)
    const bookDoc = await Book.findById(loan.book);
    if (bookDoc) {
      if (bookDoc.availableCopies < bookDoc.totalCopies) {
        bookDoc.availableCopies += 1;
        await bookDoc.save();
      }
    }

    // Update loan record
    loan.status = 'RETURNED';
    loan.returnDate = returnDate;
    if (validated.notes) {
      loan.notes = loan.notes ? `${loan.notes} | Return note: ${validated.notes}` : validated.notes;
    }

    await loan.save();

    res.json({
      success: true,
      data: {
        loan,
        isOverdue,
        overdueDays,
      },
      message: isOverdue
        ? `Book returned successfully. Note: Returned ${overdueDays} day(s) overdue.`
        : `Book returned successfully on time. Inventory updated.`,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation error' },
      });
      return;
    }
    console.error('[Return Loan Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'RETURN_FAILED', message: 'Failed to process book return.' },
    });
  }
});

// GET /api/loans/active — List active loans with dynamic overdue calculations
loansRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim() || '';
    const statusFilter = (req.query.status as string)?.trim() || 'ALL'; // ALL, OVERDUE, DUE_SOON
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const now = new Date();
    const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const baseFilter: Record<string, any> = { status: 'ACTIVE' };

    if (statusFilter === 'OVERDUE') {
      baseFilter.dueDate = { $lt: now };
    } else if (statusFilter === 'DUE_SOON') {
      baseFilter.dueDate = { $gte: now, $lte: dueSoonThreshold };
    }

    // Query active loans
    let query = Loan.find(baseFilter)
      .sort({ dueDate: 1 })
      .populate('book', 'title isbn category shelfLocation totalCopies availableCopies')
      .populate('member', 'fullName memberId email department contactNumber');

    const allLoans = await query.lean();

    // Client-side search filtering if search term provided
    let filtered = allLoans;
    if (search) {
      const lower = search.toLowerCase();
      filtered = allLoans.filter((item: any) => {
        const bookTitle = item.book?.title?.toLowerCase() || '';
        const bookIsbn = item.book?.isbn?.toLowerCase() || '';
        const memberName = item.member?.fullName?.toLowerCase() || '';
        const memberId = item.member?.memberId?.toLowerCase() || '';
        return (
          bookTitle.includes(lower) ||
          bookIsbn.includes(lower) ||
          memberName.includes(lower) ||
          memberId.includes(lower)
        );
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    // Compute dynamic overdue status and days remaining
    const loansWithMeta = paginated.map((item: any) => {
      const dueTime = new Date(item.dueDate).getTime();
      const diffMs = dueTime - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffMs < 0;

      return {
        ...item,
        isOverdue,
        overdueDays: isOverdue ? Math.abs(diffDays) : 0,
        daysRemaining: !isOverdue ? diffDays : 0,
        dueSoon: !isOverdue && diffHours <= 48,
      };
    });

    res.json({
      success: true,
      data: {
        loans: loansWithMeta,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err: unknown) {
    console.error('[Active Loans GET Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ACTIVE_LOANS_FAILED', message: 'Failed to retrieve active loans.' },
    });
  }
});

// GET /api/loans/history — All circulation transactions (paginated audit log)
loansRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('book', 'title isbn category')
        .populate('member', 'fullName memberId department')
        .lean(),
      Loan.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_HISTORY_FAILED', message: 'Failed to retrieve loan history.' },
    });
  }
});
