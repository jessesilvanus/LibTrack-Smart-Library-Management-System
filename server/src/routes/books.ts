import { Router, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Loan } from '../models/Loan.js';
import { isDbConnected } from '../config/db.js';

export const booksRouter = Router();

// Zod Schema for Adding / Editing Books
const bookSchema = z.object({
  title: z.string().trim().min(1, 'Book title is required').max(300),
  isbn: z
    .string()
    .trim()
    .min(1, 'ISBN is required')
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  authors: z
    .array(z.string().trim().min(1, 'Author name cannot be empty'))
    .min(1, 'At least one author is required'),
  category: z.string().trim().min(1, 'Category is required'),
  publisher: z.string().trim().optional(),
  publicationYear: z
    .number()
    .int()
    .min(1400, 'Year must be after 1400')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future')
    .optional(),
  shelfLocation: z.string().trim().min(1, 'Shelf / location is required'),
  totalCopies: z.number().int().min(1, 'Total copies must be at least 1'),
});

// Middleware to guard routes when database is disconnected
function checkDb(req: Request, res: Response, next: () => void) {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is disconnected. Operation cannot be performed.',
      },
    });
    return;
  }
  next();
}

booksRouter.use(checkDb);

// GET /api/books — Search, Filter, Sort, Paginate & Summarize
booksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || '';
    const category = (req.query.category as string)?.trim() || '';
    const availability = (req.query.availability as string)?.trim() || 'all'; // 'all', 'available', 'unavailable', 'archived'
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter query
    const filter: Record<string, any> = {};

    if (availability === 'archived') {
      filter.isArchived = true;
    } else {
      filter.isArchived = false;
      if (availability === 'available') {
        filter.availableCopies = { $gt: 0 };
      } else if (availability === 'unavailable') {
        filter.availableCopies = 0;
      }
    }

    if (category && category !== 'All Categories') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } },
        { authors: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { shelfLocation: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort definition
    const sort: Record<string, 1 | -1> = {};
    if (['title', 'availableCopies', 'totalCopies', 'createdAt'].includes(sortBy)) {
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1;
    }

    // Parallel fetch: Paginated Books, Total Count, Global Inventory Summary
    const [books, total, summaryAgg, categories] = await Promise.all([
      Book.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Book.countDocuments(filter),
      Book.aggregate([
        { $match: { isArchived: false } },
        {
          $group: {
            _id: null,
            totalTitles: { $sum: 1 },
            totalPhysicalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' },
          },
        },
      ]),
      Book.distinct('category', { isArchived: false }),
    ]);

    const summary = summaryAgg.length > 0
      ? summaryAgg[0]
      : { totalTitles: 0, totalPhysicalCopies: 0, availableCopies: 0 };

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        summary: {
          totalTitles: summary.totalTitles,
          totalPhysicalCopies: summary.totalPhysicalCopies,
          availableCopies: summary.availableCopies,
          inCirculation: summary.totalPhysicalCopies - summary.availableCopies,
          categories: categories.sort(),
        },
      },
    });
  } catch (err: unknown) {
    console.error('[Books GET Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_BOOKS_FAILED', message: 'Failed to retrieve book inventory.' },
    });
  }
});

// GET /api/books/:id — Retrieve single book with active loans
booksRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid book ID.' } });
      return;
    }

    const [book, activeLoans, loanHistoryCount] = await Promise.all([
      Book.findById(req.params.id).lean(),
      Loan.find({ book: req.params.id, status: 'ACTIVE' })
        .populate('member', 'fullName memberId email department')
        .lean(),
      Loan.countDocuments({ book: req.params.id }),
    ]);

    if (!book) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Book not found.' } });
      return;
    }

    res.json({
      success: true,
      data: {
        book,
        activeLoans,
        totalHistoricalLoans: loanHistoryCount,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_BOOK_FAILED', message: 'Failed to retrieve book details.' },
    });
  }
});

// POST /api/books — Add new book with duplicate ISBN check
booksRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validated = bookSchema.parse(req.body);

    // Duplicate ISBN prevention (case-insensitive & trimmed)
    const existing = await Book.findOne({
      isbn: validated.isbn,
      isArchived: false,
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ISBN',
          message: `A book with ISBN "${validated.isbn}" already exists: "${existing.title}".`,
        },
      });
      return;
    }

    const newBook = new Book({
      ...validated,
      availableCopies: validated.totalCopies,
      isArchived: false,
    });

    await newBook.save();

    res.status(201).json({
      success: true,
      data: newBook,
      message: 'Book successfully added to catalog.',
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
    console.error('[Add Book Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_BOOK_FAILED', message: 'Failed to create book record.' },
    });
  }
});

// PUT /api/books/:id — Edit book with copy consistency check
booksRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid book ID.' } });
      return;
    }

    const validated = bookSchema.parse(req.body);

    const book = await Book.findById(req.params.id);
    if (!book) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Book not found.' } });
      return;
    }

    // Check ISBN uniqueness if changed
    if (validated.isbn !== book.isbn) {
      const duplicate = await Book.findOne({
        isbn: validated.isbn,
        _id: { $ne: book._id },
        isArchived: false,
      });
      if (duplicate) {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ISBN',
            message: `ISBN "${validated.isbn}" is already used by "${duplicate.title}".`,
          },
        });
        return;
      }
    }

    // Check active loans currently in circulation for this book
    const activeLoansCount = await Loan.countDocuments({
      book: book._id,
      status: 'ACTIVE',
    });

    // Rule: Do not allow total copies to be reduced below active loans
    if (validated.totalCopies < activeLoansCount) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOTAL_COPIES',
          message: `Cannot reduce total copies to ${validated.totalCopies}. There are currently ${activeLoansCount} copy(ies) on active loan.`,
        },
      });
      return;
    }

    // Recalculate available copies: newTotal - activeLoans
    const newAvailableCopies = validated.totalCopies - activeLoansCount;

    book.title = validated.title;
    book.isbn = validated.isbn;
    book.authors = validated.authors;
    book.category = validated.category;
    book.publisher = validated.publisher;
    book.publicationYear = validated.publicationYear;
    book.shelfLocation = validated.shelfLocation;
    book.totalCopies = validated.totalCopies;
    book.availableCopies = newAvailableCopies;

    await book.save();

    res.json({
      success: true,
      data: book,
      message: 'Book details updated successfully.',
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
    console.error('[Update Book Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_BOOK_FAILED', message: 'Failed to update book record.' },
    });
  }
});

// DELETE /api/books/:id — Delete or archive with active loan guard
booksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid book ID.' } });
      return;
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Book not found.' } });
      return;
    }

    // 1. Guard against active loans in circulation
    const activeLoansCount = await Loan.countDocuments({
      book: book._id,
      status: 'ACTIVE',
    });

    if (activeLoansCount > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ACTIVE_LOANS_EXIST',
          message: `Action blocked: Cannot delete or archive "${book.title}" because ${activeLoansCount} copy(ies) are currently checked out. Return all copies first.`,
        },
      });
      return;
    }

    // 2. Check if historical loan transactions exist
    const totalLoansCount = await Loan.countDocuments({ book: book._id });

    if (totalLoansCount > 0 || req.query.archive === 'true') {
      // Archive book to preserve historical audit trail
      book.isArchived = true;
      book.availableCopies = 0;
      await book.save();

      res.json({
        success: true,
        message: `Book "${book.title}" has been archived to preserve its ${totalLoansCount} historical borrowing record(s).`,
      });
      return;
    }

    // If zero loans ever existed, safe to delete completely
    await Book.findByIdAndDelete(book._id);
    res.json({
      success: true,
      message: `Book "${book.title}" permanently removed from catalog.`,
    });
  } catch (err: unknown) {
    console.error('[Delete Book Error]', err);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_BOOK_FAILED', message: 'Failed to process book removal.' },
    });
  }
});

// GET /api/books/:id/history — Borrowing history for a specific book
booksRouter.get('/:id/history', async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid book ID.' } });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find({ book: req.params.id })
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('member', 'fullName memberId email department')
        .lean(),
      Loan.countDocuments({ book: req.params.id }),
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
      error: { code: 'FETCH_HISTORY_FAILED', message: 'Failed to retrieve book borrowing history.' },
    });
  }
});
