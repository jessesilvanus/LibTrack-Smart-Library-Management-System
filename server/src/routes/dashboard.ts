import { Router, Request, Response } from 'express';
import { isDbConnected, dbState } from '../config/db.js';
import { Book } from '../models/Book.js';
import { Loan } from '../models/Loan.js';

export const dashboardRouter = Router();

// Dashboard summary endpoint
dashboardRouter.get('/summary', async (_req: Request, res: Response) => {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB is currently disconnected. Please ensure MongoDB is running or configure MONGODB_URI in server/.env.',
        details: {
          uri: dbState.uri,
          lastError: dbState.error,
          instructions: 'Set MONGODB_URI in server/.env to a running local MongoDB instance or a free MongoDB Atlas connection URI.',
        },
      },
    });
    return;
  }

  try {
    const now = new Date();
    // Due soon defined strictly as active loans due within the next 48 hours
    const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Parallel aggregate queries for high performance
    const [
      totalTitles,
      copiesAgg,
      activeLoans,
      dueSoonLoans,
      overdueLoans,
      recentLoansRaw,
      upcomingDueRaw,
      monthlyLoansAgg,
      popularBooksAgg,
    ] = await Promise.all([
      Book.countDocuments(),
      Book.aggregate([
        {
          $group: {
            _id: null,
            totalPhysicalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' },
          },
        },
      ]),
      Loan.countDocuments({ status: 'ACTIVE' }),
      Loan.countDocuments({
        status: 'ACTIVE',
        dueDate: { $gte: now, $lte: dueSoonThreshold },
      }),
      Loan.countDocuments({
        $or: [{ status: 'OVERDUE' }, { status: 'ACTIVE', dueDate: { $lt: now } }],
      }),
      Loan.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('book', 'title isbn category')
        .populate('member', 'fullName memberId department')
        .lean(),
      Loan.find({
        status: 'ACTIVE',
        dueDate: { $gte: now },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('book', 'title isbn shelfLocation')
        .populate('member', 'fullName memberId department')
        .lean(),
      // Monthly trend for previous 6 months
      Loan.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      // Most borrowed books
      Loan.aggregate([
        {
          $group: {
            _id: '$book',
            borrowCount: { $sum: 1 },
          },
        },
        { $sort: { borrowCount: -1 } },
        { $limit: 4 },
        {
          $lookup: {
            from: 'books',
            localField: '_id',
            foreignField: '_id',
            as: 'bookDetails',
          },
        },
        { $unwind: '$bookDetails' },
        {
          $project: {
            _id: 1,
            borrowCount: 1,
            title: '$bookDetails.title',
            isbn: '$bookDetails.isbn',
            category: '$bookDetails.category',
            availableCopies: '$bookDetails.availableCopies',
          },
        },
      ]),
    ]);

    const totalPhysicalCopies = copiesAgg.length > 0 ? copiesAgg[0].totalPhysicalCopies : 0;
    const availableCopies = copiesAgg.length > 0 ? copiesAgg[0].availableCopies : 0;

    // Format monthly trends for Recharts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = monthlyLoansAgg.find((item) => item._id.year === year && item._id.month === month);
      monthlyTrends.push({
        month: `${monthNames[month - 1]} ${String(year).slice(2)}`,
        loans: found ? found.count : 0,
      });
    }

    const isEmptyDatabase = totalTitles === 0 && activeLoans === 0;

    res.json({
      success: true,
      data: {
        metrics: {
          totalBookTitles: totalTitles,
          totalPhysicalCopies,
          availableCopies,
          activeLoans,
          dueSoonLoans,
          overdueLoans,
        },
        recentActivity: recentLoansRaw,
        upcomingDue: upcomingDueRaw,
        monthlyTrends,
        popularBooks: popularBooksAgg,
        isEmptyDatabase,
        definitions: {
          dueSoonHours: 48,
          timestamp: now.toISOString(),
        },
      },
    });
  } catch (err: unknown) {
    console.error('[Dashboard Summary Error]', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_QUERY_FAILED',
        message: 'Failed to aggregate dashboard metrics from database.',
        details: err instanceof Error ? err.message : String(err),
      },
    });
  }
});
