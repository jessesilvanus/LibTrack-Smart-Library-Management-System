import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Member } from '../models/Member.js';
import { Loan } from '../models/Loan.js';
import { Notification } from '../models/Notification.js';
import { ImportJob } from '../models/ImportJob.js';

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'current_month' | 'custom';
export type GroupingInterval = 'daily' | 'weekly' | 'monthly';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

export interface DashboardSummaryMetrics {
  totalBookTitles: number;
  totalPhysicalCopies: number;
  totalMembers: number;
  activeLoans: number;
  currentlyOverdueLoans: number;
  issuedDuringPeriod: number;
  returnedDuringPeriod: number;
  availableCopies: number;
  dueSoonRemindersSent: number;
  overdueRemindersSent: number;
  failedNotifications: number;
  recentImportsCount: number;
  period: {
    preset: DateRangePreset;
    startDate: string;
    endDate: string;
  };
}

export interface CirculationTrendPoint {
  date: string; // e.g. "2026-10-15" or "Oct 2026"
  label: string;
  issued: number;
  returned: number;
}

export interface PopularBookStat {
  _id: string;
  title: string;
  isbn: string;
  authors: string[];
  category: string;
  totalCopies: number;
  availableCopies: number;
  borrowCount: number;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  percentage: number;
}

export interface LoanStatusBreakdown {
  active: number;
  overdue: number;
  returnedInPeriod: number;
  totalActiveAndOverdue: number;
}

export interface TopBorrowerStat {
  memberId: string;
  memberType: string;
  department: string;
  borrowCount: number;
}

export interface MemberEngagementMetrics {
  activeBorrowersInPeriod: number;
  newRegistrationsInPeriod: number;
  totalRegisteredMembers: number;
  borrowerParticipationRate: number; // percentage
  topBorrowers: TopBorrowerStat[];
}

export interface OverdueBucket {
  range: string;
  minDays: number;
  maxDays: number | null;
  count: number;
}

export interface OverdueAnalysisMetrics {
  totalOverdueLoans: number;
  buckets: OverdueBucket[];
  overdueByCategory: Array<{ category: string; count: number }>;
}

export interface InventoryInsightsMetrics {
  totalTitles: number;
  totalPhysicalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  utilizationRate: number; // percentage
  lowStockThreshold: number;
  lowStockCount: number;
  lowStockBooks: Array<{
    _id: string;
    title: string;
    isbn: string;
    category: string;
    shelfLocation: string;
    totalCopies: number;
    availableCopies: number;
  }>;
}

export class AnalyticsService {
  /**
   * Resolve and validate date range from preset or custom values.
   */
  public parseDateRange(
    presetInput?: string,
    startDateInput?: string,
    endDateInput?: string
  ): DateRange {
    const now = new Date();
    const preset = (presetInput || '30d') as DateRangePreset;

    let startDate: Date;
    let endDate: Date;

    if (preset === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'custom') {
      if (!startDateInput || !endDateInput) {
        throw new Error('Both startDate and endDate are required for custom date range.');
      }
      startDate = new Date(startDateInput);
      endDate = new Date(endDateInput);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format for custom range. Use YYYY-MM-DD.');
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (startDate.getTime() > endDate.getTime()) {
        throw new Error('startDate cannot be after endDate.');
      }

      // Max 366 days window protection
      const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 366) {
        throw new Error('Date range cannot exceed 366 days to protect query performance.');
      }
    } else {
      // Default fallback: 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate, preset };
  }

  /**
   * Consolidated 12-Metric Operational KPI Summary
   */
  public async getSummaryMetrics(range: DateRange): Promise<DashboardSummaryMetrics> {
    const { startDate, endDate, preset } = range;
    const now = new Date();

    const [
      totalBookTitles,
      copiesAgg,
      totalMembers,
      activeLoans,
      currentlyOverdueLoans,
      issuedDuringPeriod,
      returnedDuringPeriod,
      dueSoonRemindersSent,
      overdueRemindersSent,
      failedNotifications,
      recentImportsCount,
    ] = await Promise.all([
      // 1. Total unique titles
      Book.countDocuments(),
      // 2. Physical & available copies aggregation
      Book.aggregate([
        {
          $group: {
            _id: null,
            totalPhysicalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' },
          },
        },
      ]),
      // 3. Registered members
      Member.countDocuments(),
      // 4. Currently active loans
      Loan.countDocuments({ status: 'ACTIVE' }),
      // 5. Currently overdue loans
      Loan.countDocuments({
        $or: [{ status: 'OVERDUE' }, { status: 'ACTIVE', dueDate: { $lt: now } }],
      }),
      // 6. Issued within reporting period
      Loan.countDocuments({
        issueDate: { $gte: startDate, $lte: endDate },
      }),
      // 7. Returned within reporting period
      Loan.countDocuments({
        returnDate: { $gte: startDate, $lte: endDate },
      }),
      // 8. Due-soon reminders dispatched
      Notification.countDocuments({
        notificationType: 'DUE_SOON',
        status: 'SENT',
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // 9. Overdue reminders dispatched
      Notification.countDocuments({
        notificationType: { $in: ['FIRST_OVERDUE', 'REPEAT_OVERDUE'] },
        status: 'SENT',
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // 10. Failed notification attempts
      Notification.countDocuments({
        status: 'FAILED',
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      // 11. Bulk import jobs submitted
      ImportJob.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    const totalPhysicalCopies = copiesAgg.length > 0 ? copiesAgg[0].totalPhysicalCopies : 0;
    const availableCopies = copiesAgg.length > 0 ? copiesAgg[0].availableCopies : 0;

    return {
      totalBookTitles,
      totalPhysicalCopies,
      totalMembers,
      activeLoans,
      currentlyOverdueLoans,
      issuedDuringPeriod,
      returnedDuringPeriod,
      availableCopies,
      dueSoonRemindersSent,
      overdueRemindersSent,
      failedNotifications,
      recentImportsCount,
      period: {
        preset,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  /**
   * Circulation Trends: Books issued vs returned over time.
   */
  public async getCirculationTrends(
    range: DateRange,
    interval: GroupingInterval = 'daily'
  ): Promise<CirculationTrendPoint[]> {
    const { startDate, endDate } = range;

    let groupFormat: any;
    if (interval === 'monthly') {
      groupFormat = {
        year: { $year: '$dateField' },
        month: { $month: '$dateField' },
      };
    } else if (interval === 'weekly') {
      groupFormat = {
        year: { $isoWeekYear: '$dateField' },
        week: { $isoWeek: '$dateField' },
      };
    } else {
      // daily
      groupFormat = {
        year: { $year: '$dateField' },
        month: { $month: '$dateField' },
        day: { $dayOfMonth: '$dateField' },
      };
    }

    const [issuedAgg, returnedAgg] = await Promise.all([
      Loan.aggregate([
        { $match: { issueDate: { $gte: startDate, $lte: endDate } } },
        { $project: { dateField: '$issueDate' } },
        {
          $group: {
            _id: groupFormat,
            count: { $sum: 1 },
          },
        },
      ]),
      Loan.aggregate([
        { $match: { returnDate: { $gte: startDate, $lte: endDate } } },
        { $project: { dateField: '$returnDate' } },
        {
          $group: {
            _id: groupFormat,
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Construct unified map of date buckets
    const pointsMap = new Map<string, { issued: number; returned: number; sortKey: number }>();

    // Zero-fill daily points if daily and range <= 31 days
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (interval === 'daily' && diffDays <= 31) {
      const cur = new Date(startDate);
      while (cur <= endDate) {
        const y = cur.getFullYear();
        const m = cur.getMonth() + 1;
        const d = cur.getDate();
        const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        pointsMap.set(key, { issued: 0, returned: 0, sortKey: cur.getTime() });
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Populate issued
    for (const item of issuedAgg) {
      let key = '';
      let sortKey = 0;
      if (interval === 'monthly') {
        key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        sortKey = new Date(item._id.year, item._id.month - 1, 1).getTime();
      } else if (interval === 'weekly') {
        key = `W${item._id.week} ${item._id.year}`;
        sortKey = item._id.year * 100 + item._id.week;
      } else {
        key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
        sortKey = new Date(item._id.year, item._id.month - 1, item._id.day).getTime();
      }

      const existing = pointsMap.get(key) || { issued: 0, returned: 0, sortKey };
      existing.issued = item.count;
      pointsMap.set(key, existing);
    }

    // Populate returned
    for (const item of returnedAgg) {
      let key = '';
      let sortKey = 0;
      if (interval === 'monthly') {
        key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        sortKey = new Date(item._id.year, item._id.month - 1, 1).getTime();
      } else if (interval === 'weekly') {
        key = `W${item._id.week} ${item._id.year}`;
        sortKey = item._id.year * 100 + item._id.week;
      } else {
        key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
        sortKey = new Date(item._id.year, item._id.month - 1, item._id.day).getTime();
      }

      const existing = pointsMap.get(key) || { issued: 0, returned: 0, sortKey };
      existing.returned = item.count;
      pointsMap.set(key, existing);
    }

    const sortedList = Array.from(pointsMap.entries())
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([key, val]) => ({
        date: key,
        label: key,
        issued: val.issued,
        returned: val.returned,
      }));

    return sortedList;
  }

  /**
   * Most frequently borrowed books during period
   */
  public async getPopularBooks(range: DateRange, limit: number = 8): Promise<PopularBookStat[]> {
    const { startDate, endDate } = range;

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          issueDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$book',
          borrowCount: { $sum: 1 },
        },
      },
      { $sort: { borrowCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $project: {
          _id: { $toString: '$_id' },
          title: '$book.title',
          isbn: '$book.isbn',
          authors: '$book.authors',
          category: '$book.category',
          totalCopies: '$book.totalCopies',
          availableCopies: '$book.availableCopies',
          borrowCount: 1,
        },
      },
    ];

    const results = await Loan.aggregate(pipeline);
    return results;
  }

  /**
   * Distribution of borrowed books by academic category
   */
  public async getCategoryDistribution(range: DateRange): Promise<CategoryStat[]> {
    const { startDate, endDate } = range;

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          issueDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $lookup: {
          from: 'books',
          localField: 'book',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $group: {
          _id: { $ifNull: ['$book.category', 'Uncategorized'] },
          borrowCount: { $sum: 1 },
        },
      },
      { $sort: { borrowCount: -1 } },
    ];

    const rawStats = await Loan.aggregate(pipeline);
    const totalCirculation = rawStats.reduce((sum, item) => sum + item.borrowCount, 0);

    return rawStats.map((item) => ({
      category: item._id,
      borrowCount: item.borrowCount,
      percentage: totalCirculation > 0 ? Math.round((item.borrowCount / totalCirculation) * 100) : 0,
    }));
  }

  /**
   * Current operational loan status overview
   */
  public async getLoanStatusOverview(range: DateRange): Promise<LoanStatusBreakdown> {
    const now = new Date();
    const [active, overdue, returnedInPeriod] = await Promise.all([
      Loan.countDocuments({ status: 'ACTIVE', dueDate: { $gte: now } }),
      Loan.countDocuments({
        $or: [{ status: 'OVERDUE' }, { status: 'ACTIVE', dueDate: { $lt: now } }],
      }),
      Loan.countDocuments({
        returnDate: { $gte: range.startDate, $lte: range.endDate },
      }),
    ]);

    return {
      active,
      overdue,
      returnedInPeriod,
      totalActiveAndOverdue: active + overdue,
    };
  }

  /**
   * Member engagement & activity metrics
   */
  public async getMemberEngagement(range: DateRange): Promise<MemberEngagementMetrics> {
    const { startDate, endDate } = range;

    const [activeBorrowersAgg, newRegistrationsInPeriod, totalRegisteredMembers, topBorrowersAgg] =
      await Promise.all([
        Loan.aggregate([
          { $match: { issueDate: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: '$member' } },
          { $count: 'distinctMembers' },
        ]),
        Member.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        Member.countDocuments(),
        Loan.aggregate([
          { $match: { issueDate: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: '$member', borrowCount: { $sum: 1 } } },
          { $sort: { borrowCount: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'members',
              localField: '_id',
              foreignField: '_id',
              as: 'member',
            },
          },
          { $unwind: '$member' },
          {
            $project: {
              _id: 0,
              memberId: '$member.memberId',
              memberType: '$member.memberType',
              department: '$member.department',
              borrowCount: 1,
            },
          },
        ]),
      ]);

    const activeBorrowersInPeriod =
      activeBorrowersAgg.length > 0 ? activeBorrowersAgg[0].distinctMembers : 0;
    const borrowerParticipationRate =
      totalRegisteredMembers > 0
        ? Math.round((activeBorrowersInPeriod / totalRegisteredMembers) * 100)
        : 0;

    return {
      activeBorrowersInPeriod,
      newRegistrationsInPeriod,
      totalRegisteredMembers,
      borrowerParticipationRate,
      topBorrowers: topBorrowersAgg,
    };
  }

  /**
   * Granular Overdue Duration Breakdown (1-7d, 8-14d, 15-30d, 30+d)
   */
  public async getOverdueAnalysis(): Promise<OverdueAnalysisMetrics> {
    const now = new Date();

    const overdueLoans = await Loan.find({
      $or: [{ status: 'OVERDUE' }, { status: 'ACTIVE', dueDate: { $lt: now } }],
    })
      .populate('book', 'category')
      .lean();

    const buckets: OverdueBucket[] = [
      { range: '1–7 Days', minDays: 1, maxDays: 7, count: 0 },
      { range: '8–14 Days', minDays: 8, maxDays: 14, count: 0 },
      { range: '15–30 Days', minDays: 15, maxDays: 30, count: 0 },
      { range: '30+ Days', minDays: 31, maxDays: null, count: 0 },
    ];

    const categoryMap = new Map<string, number>();

    for (const loan of overdueLoans) {
      const due = new Date(loan.dueDate);
      const diffMs = now.getTime() - due.getTime();
      const overdueDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (overdueDays <= 7) {
        buckets[0].count++;
      } else if (overdueDays <= 14) {
        buckets[1].count++;
      } else if (overdueDays <= 30) {
        buckets[2].count++;
      } else {
        buckets[3].count++;
      }

      const cat = (loan.book as any)?.category || 'General';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }

    const overdueByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalOverdueLoans: overdueLoans.length,
      buckets,
      overdueByCategory,
    };
  }

  /**
   * Inventory stock insights and low-stock alerts
   */
  public async getInventoryInsights(lowStockThreshold: number = 2): Promise<InventoryInsightsMetrics> {
    const [totalTitles, copiesAgg, lowStockCount, lowStockBooks] = await Promise.all([
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
      Book.countDocuments({ availableCopies: { $lte: lowStockThreshold } }),
      Book.find({ availableCopies: { $lte: lowStockThreshold } })
        .sort({ availableCopies: 1, title: 1 })
        .limit(10)
        .select('title isbn category shelfLocation totalCopies availableCopies')
        .lean(),
    ]);

    const totalPhysicalCopies = copiesAgg.length > 0 ? copiesAgg[0].totalPhysicalCopies : 0;
    const availableCopies = copiesAgg.length > 0 ? copiesAgg[0].availableCopies : 0;
    const issuedCopies = Math.max(0, totalPhysicalCopies - availableCopies);
    const utilizationRate =
      totalPhysicalCopies > 0 ? Math.round((issuedCopies / totalPhysicalCopies) * 100) : 0;

    return {
      totalTitles,
      totalPhysicalCopies,
      availableCopies,
      issuedCopies,
      utilizationRate,
      lowStockThreshold,
      lowStockCount,
      lowStockBooks: lowStockBooks.map((b) => ({
        _id: String(b._id),
        title: b.title,
        isbn: b.isbn,
        category: b.category,
        shelfLocation: b.shelfLocation,
        totalCopies: b.totalCopies,
        availableCopies: b.availableCopies,
      })),
    };
  }

  /**
   * Unified Tabular Report Data Provider for 7 Supported Reports
   */
  public async getReportData(
    reportType: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    reportMetadata: {
      reportType: string;
      generatedAt: string;
      filterSummary: string;
    };
  }> {
    const { page = 1, limit = 20, search = '', startDate, endDate } = options;
    const skip = (page - 1) * limit;
    const now = new Date();

    switch (reportType) {
      case 'inventory': {
        const query: any = {};
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { isbn: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
          ];
        }
        const [total, books] = await Promise.all([
          Book.countDocuments(query),
          Book.find(query).sort({ title: 1 }).skip(skip).limit(limit).lean(),
        ]);

        const mapped = books.map((b) => ({
          id: String(b._id),
          title: b.title,
          isbn: b.isbn,
          authors: (b.authors || []).join(', '),
          category: b.category,
          shelfLocation: b.shelfLocation,
          totalCopies: b.totalCopies,
          availableCopies: b.availableCopies,
          inCirculation: Math.max(0, b.totalCopies - b.availableCopies),
          status: b.availableCopies > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
        }));

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Inventory Master Catalog',
            generatedAt: now.toISOString(),
            filterSummary: search ? `Filtered by search: "${search}"` : 'All inventory items',
          },
        };
      }

      case 'circulation': {
        const query: any = {};
        if (startDate && endDate) {
          query.issueDate = { $gte: startDate, $lte: endDate };
        }
        const [total, loans] = await Promise.all([
          Loan.countDocuments(query),
          Loan.find(query)
            .sort({ issueDate: -1 })
            .skip(skip)
            .limit(limit)
            .populate('book', 'title isbn category')
            .populate('member', 'memberId fullName department')
            .lean(),
        ]);

        const mapped = loans.map((l: any) => ({
          id: String(l._id),
          issueDate: l.issueDate?.toISOString().slice(0, 10),
          dueDate: l.dueDate?.toISOString().slice(0, 10),
          returnDate: l.returnDate ? l.returnDate.toISOString().slice(0, 10) : 'Not Returned',
          bookTitle: l.book?.title || 'Unknown Book',
          isbn: l.book?.isbn || 'N/A',
          memberId: l.member?.memberId || 'N/A',
          memberName: l.member?.fullName || 'N/A',
          department: l.member?.department || 'N/A',
          status: l.status,
        }));

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Circulation Activity Audit',
            generatedAt: now.toISOString(),
            filterSummary:
              startDate && endDate
                ? `Period: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`
                : 'All historical loans',
          },
        };
      }

      case 'overdue': {
        const query: any = {
          $or: [{ status: 'OVERDUE' }, { status: 'ACTIVE', dueDate: { $lt: now } }],
        };
        const [total, loans] = await Promise.all([
          Loan.countDocuments(query),
          Loan.find(query)
            .sort({ dueDate: 1 })
            .skip(skip)
            .limit(limit)
            .populate('book', 'title isbn shelfLocation')
            .populate('member', 'memberId fullName department')
            .lean(),
        ]);

        const mapped = loans.map((l: any) => {
          const due = new Date(l.dueDate);
          const overdueDays = Math.max(1, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            id: String(l._id),
            bookTitle: l.book?.title || 'Unknown Book',
            isbn: l.book?.isbn || 'N/A',
            memberId: l.member?.memberId || 'N/A',
            memberName: l.member?.fullName || 'N/A',
            department: l.member?.department || 'N/A',
            issueDate: l.issueDate?.toISOString().slice(0, 10),
            dueDate: l.dueDate?.toISOString().slice(0, 10),
            overdueDays,
            reminderCount: l.reminderMetadata?.reminderCount || 0,
            lastReminderSentAt: l.reminderMetadata?.lastReminderSentAt
              ? l.reminderMetadata.lastReminderSentAt.toISOString().slice(0, 10)
              : 'Never',
          };
        });

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Current Overdue & Defaulters List',
            generatedAt: now.toISOString(),
            filterSummary: 'Active and unreturned loans exceeding due date',
          },
        };
      }

      case 'popular-books': {
        const matchStage: any = {};
        if (startDate && endDate) {
          matchStage.issueDate = { $gte: startDate, $lte: endDate };
        }

        const countAgg = await Loan.aggregate([
          { $match: matchStage },
          { $group: { _id: '$book' } },
          { $count: 'total' },
        ]);
        const total = countAgg.length > 0 ? countAgg[0].total : 0;

        const results = await Loan.aggregate([
          { $match: matchStage },
          { $group: { _id: '$book', borrowCount: { $sum: 1 } } },
          { $sort: { borrowCount: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'books',
              localField: '_id',
              foreignField: '_id',
              as: 'book',
            },
          },
          { $unwind: '$book' },
          {
            $project: {
              _id: 1,
              title: '$book.title',
              isbn: '$book.isbn',
              authors: '$book.authors',
              category: '$book.category',
              totalCopies: '$book.totalCopies',
              availableCopies: '$book.availableCopies',
              borrowCount: 1,
            },
          },
        ]);

        const mapped = results.map((item, idx) => ({
          rank: skip + idx + 1,
          title: item.title,
          isbn: item.isbn,
          authors: (item.authors || []).join(', '),
          category: item.category,
          borrowCount: item.borrowCount,
          totalCopies: item.totalCopies,
          availableCopies: item.availableCopies,
        }));

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Most Borrowed Books Ranking',
            generatedAt: now.toISOString(),
            filterSummary:
              startDate && endDate
                ? `Period: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`
                : 'All-time borrowing frequency',
          },
        };
      }

      case 'member-activity': {
        const query: any = {};
        if (search) {
          query.$or = [
            { memberId: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } },
          ];
        }

        const [total, members] = await Promise.all([
          Member.countDocuments(query),
          Member.find(query).sort({ memberId: 1 }).skip(skip).limit(limit).lean(),
        ]);

        const memberIds = members.map((m) => m._id);

        // Fetch loan counts for these members in parallel
        const loanCountsAgg = await Loan.aggregate([
          { $match: { member: { $in: memberIds } } },
          {
            $group: {
              _id: '$member',
              totalLoans: { $sum: 1 },
              activeLoans: {
                $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] },
              },
            },
          },
        ]);

        const countsMap = new Map(loanCountsAgg.map((item) => [String(item._id), item]));

        const mapped = members.map((m) => {
          const stats = countsMap.get(String(m._id)) || { totalLoans: 0, activeLoans: 0 };
          return {
            memberId: m.memberId,
            fullName: m.fullName,
            department: m.department,
            memberType: m.memberType,
            membershipStatus: m.membershipStatus,
            totalLoans: stats.totalLoans,
            activeLoans: stats.activeLoans,
            maxBorrowLimit: m.maxBorrowLimit,
            registeredAt: m.createdAt?.toISOString().slice(0, 10),
          };
        });

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Patron Borrowing Activity Directory',
            generatedAt: now.toISOString(),
            filterSummary: search ? `Filtered by search: "${search}"` : 'All registered members',
          },
        };
      }

      case 'email-notifications': {
        const query: any = {};
        if (startDate && endDate) {
          query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const [total, notifications] = await Promise.all([
          Notification.countDocuments(query),
          Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('book', 'title')
            .populate('member', 'memberId fullName')
            .lean(),
        ]);

        const mapped = notifications.map((n: any) => ({
          id: String(n._id),
          timestamp: n.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
          notificationType: n.notificationType,
          recipientEmail: n.recipientEmail,
          memberId: n.member?.memberId || 'N/A',
          memberName: n.member?.fullName || 'N/A',
          bookTitle: n.book?.title || 'N/A',
          status: n.status,
          attemptCount: n.attemptCount,
          errorSummary: n.errorSummary || 'None',
        }));

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Automated Email Reminders Audit Log',
            generatedAt: now.toISOString(),
            filterSummary:
              startDate && endDate
                ? `Period: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`
                : 'All notification dispatch records',
          },
        };
      }

      case 'bulk-imports': {
        const query: any = {};
        if (startDate && endDate) {
          query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const [total, jobs] = await Promise.all([
          ImportJob.countDocuments(query),
          ImportJob.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ]);

        const mapped = jobs.map((j) => ({
          jobId: j.jobId,
          importType: j.importType,
          fileName: j.fileName,
          status: j.status,
          conflictPolicy: j.conflictPolicy,
          totalRows: j.totalRows,
          validRows: j.validRows,
          processedRows: j.processedRows,
          successfulRows: j.successfulRows,
          skippedRows: j.skippedRows,
          failedRows: j.failedRows,
          submittedBy: j.submittedBy,
          submittedAt: j.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
          completedAt: j.completedAt ? j.completedAt.toISOString().slice(0, 19).replace('T', ' ') : 'N/A',
        }));

        return {
          data: mapped,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
          reportMetadata: {
            reportType: 'Bulk Data Import Job History',
            generatedAt: now.toISOString(),
            filterSummary:
              startDate && endDate
                ? `Period: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`
                : 'All batch ingestion jobs',
          },
        };
      }

      default:
        throw new Error(`Unsupported report type: "${reportType}"`);
    }
  }
}

export const analyticsService = new AnalyticsService();
