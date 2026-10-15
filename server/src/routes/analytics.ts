import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService, GroupingInterval } from '../services/analyticsService.js';
import { reportExportService } from '../services/reportExportService.js';
import { adminAuthGuard } from './notifications.js';

export const analyticsRouter = Router();

// ==============================================================================
// 1. GET /api/analytics/summary — Consolidated 12-KPI Operational Metrics
// ==============================================================================
analyticsRouter.get('/summary', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = analyticsService.parseDateRange(
      req.query.preset as string,
      req.query.startDate as string,
      req.query.endDate as string
    );

    const metrics = await analyticsService.getSummaryMetrics(range);
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('custom date range')) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE_RANGE', message: err.message },
      });
      return;
    }
    next(err);
  }
});

// ==============================================================================
// 2. GET /api/analytics/circulation-trends — Issued vs Returned Time Series
// ==============================================================================
analyticsRouter.get('/circulation-trends', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = analyticsService.parseDateRange(
      req.query.preset as string,
      req.query.startDate as string,
      req.query.endDate as string
    );
    const interval = (req.query.interval || 'daily') as GroupingInterval;

    if (!['daily', 'weekly', 'monthly'].includes(interval)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INTERVAL', message: 'Interval must be one of: daily, weekly, monthly' },
      });
      return;
    }

    const trends = await analyticsService.getCirculationTrends(range, interval);
    res.json({
      success: true,
      data: {
        interval,
        period: range,
        trends,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 3. GET /api/analytics/popular-books — Most Borrowed Books Ranking
// ==============================================================================
analyticsRouter.get('/popular-books', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = analyticsService.parseDateRange(
      req.query.preset as string,
      req.query.startDate as string,
      req.query.endDate as string
    );
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const books = await analyticsService.getPopularBooks(range, limit);
    res.json({
      success: true,
      data: {
        period: range,
        books,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 4. GET /api/analytics/categories — Borrowing Distribution by Category
// ==============================================================================
analyticsRouter.get('/categories', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = analyticsService.parseDateRange(
      req.query.preset as string,
      req.query.startDate as string,
      req.query.endDate as string
    );

    const categories = await analyticsService.getCategoryDistribution(range);
    res.json({
      success: true,
      data: {
        period: range,
        categories,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 5. GET /api/analytics/loan-status — Operational Loan Status Breakdown
// ==============================================================================
analyticsRouter.get('/loan-status', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = analyticsService.parseDateRange(
      req.query.preset as string,
      req.query.startDate as string,
      req.query.endDate as string
    );

    const breakdown = await analyticsService.getLoanStatusOverview(range);
    res.json({
      success: true,
      data: {
        period: range,
        statusBreakdown: breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 6. GET /api/analytics/member-engagement — Borrower Participation Metrics
// ==============================================================================
analyticsRouter.get('/member-engagement', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = analyticsService.parseDateRange(
      req.query.preset as string,
      req.query.startDate as string,
      req.query.endDate as string
    );

    const engagement = await analyticsService.getMemberEngagement(range);
    res.json({
      success: true,
      data: {
        period: range,
        engagement,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 7. GET /api/analytics/overdue-analysis — Overdue Buckets & Risk Analysis
// ==============================================================================
analyticsRouter.get('/overdue-analysis', adminAuthGuard, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const overdueAnalysis = await analyticsService.getOverdueAnalysis();
    res.json({
      success: true,
      data: overdueAnalysis,
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 8. GET /api/analytics/inventory — Stock Insights & Low-Stock Alerts
// ==============================================================================
analyticsRouter.get('/inventory', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const threshold = Math.max(0, parseInt(req.query.lowStockThreshold as string, 10) || 2);
    const inventory = await analyticsService.getInventoryInsights(threshold);
    res.json({
      success: true,
      data: inventory,
    });
  } catch (err) {
    next(err);
  }
});

// ==============================================================================
// 9. GET /api/analytics/reports/:reportType — Paginated Tabular Reports Data
// ==============================================================================
analyticsRouter.get('/reports/:reportType', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reportType } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = req.query.search as string;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.preset || req.query.startDate) {
      const range = analyticsService.parseDateRange(
        req.query.preset as string,
        req.query.startDate as string,
        req.query.endDate as string
      );
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const reportData = await analyticsService.getReportData(reportType, {
      page,
      limit,
      search,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: reportData.data,
      pagination: reportData.pagination,
      reportMetadata: reportData.reportMetadata,
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Unsupported report type')) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REPORT_TYPE', message: err.message },
      });
      return;
    }
    next(err);
  }
});

// ==============================================================================
// 10. GET /api/analytics/reports/:reportType/export — Protected CSV File Export
// ==============================================================================
analyticsRouter.get('/reports/:reportType/export', adminAuthGuard, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reportType } = req.params;
    const search = req.query.search as string;

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.preset || req.query.startDate) {
      const range = analyticsService.parseDateRange(
        req.query.preset as string,
        req.query.startDate as string,
        req.query.endDate as string
      );
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const { csvContent, fileName, rowCount } = await reportExportService.generateReportCsv(
      reportType,
      {
        search,
        startDate,
        endDate,
      }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Export-Row-Count', String(rowCount));
    res.status(200).send(csvContent);
  } catch (err: any) {
    if (err.message && err.message.includes('Unsupported report type')) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REPORT_TYPE', message: err.message },
      });
      return;
    }
    next(err);
  }
});
