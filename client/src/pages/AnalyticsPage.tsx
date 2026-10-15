import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  Search,
  BookOpen,
  Users,
  AlertTriangle,
  Mail,
  UploadCloud,
  Clock,
  Layers,
  ShieldAlert,
  ArrowUpDown,
  BookMarked,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  DateRangePreset,
  GroupingInterval,
  DashboardSummaryMetrics,
  CirculationTrendPoint,
  PopularBookStat,
  CategoryStat,
  LoanStatusBreakdown,
  MemberEngagementMetrics,
  OverdueAnalysisMetrics,
  InventoryInsightsMetrics,
  ReportType,
  ReportDataResponse,
  NavRoute,
} from '../types';
import {
  fetchAnalyticsSummary,
  fetchCirculationTrends,
  fetchPopularBooks,
  fetchCategoryDistribution,
  fetchLoanStatusOverview,
  fetchMemberEngagement,
  fetchOverdueAnalysis,
  fetchInventoryInsights,
  fetchReportData,
  getReportExportUrl,
} from '../services/api';
import { PaginationControls } from '../components/ui/PaginationControls';

interface AnalyticsPageProps {
  onNavigate?: (route: NavRoute) => void;
  initialTab?: 'analytics' | 'reports';
  initialReport?: ReportType;
}

const CATEGORY_COLORS = [
  '#0D9488', // Teal
  '#1B2A4A', // Navy
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#D97706', // Amber
  '#059669', // Emerald
  '#DC2626', // Red
  '#64748B', // Slate
];

const REPORT_TABS: Array<{ id: ReportType; label: string; icon: React.ElementType; description: string }> = [
  { id: 'inventory', label: 'Inventory Catalog', icon: BookOpen, description: 'Master catalog titles, accession quantities, shelf locations, and live availability status.' },
  { id: 'circulation', label: 'Circulation Audit', icon: TrendingUp, description: 'Detailed loan transactions, due dates, check-in timestamps, and patron references.' },
  { id: 'overdue', label: 'Overdue & Defaulters', icon: AlertTriangle, description: 'Unreturned loans exceeding deadline, overdue duration buckets, and reminder telemetry.' },
  { id: 'popular-books', label: 'Popular Books', icon: BookMarked, description: 'Academic ranking of titles by actual borrowing frequency and circulation velocity.' },
  { id: 'member-activity', label: 'Member Activity', icon: Users, description: 'Patron borrowing activity directory, department distribution, and loan allocations.' },
  { id: 'email-notifications', label: 'Notification Logs', icon: Mail, description: 'Audit trail of automated due-soon alerts, overdue notices, and SMTP delivery states.' },
  { id: 'bulk-imports', label: 'Bulk Import History', icon: UploadCloud, description: 'Historical record of CSV batch ingestion jobs, conflict resolutions, and row statistics.' },
];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  onNavigate,
  initialTab = 'analytics',
  initialReport = 'inventory',
}) => {
  // Top Level Navigation Tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>(initialTab);

  // Shared Date Filter State
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);

  // Interval for circulation trends
  const [trendInterval, setTrendInterval] = useState<GroupingInterval>('daily');

  // Loading States
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(true);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);

  // Analytics Data States
  const [summary, setSummary] = useState<DashboardSummaryMetrics | null>(null);
  const [trends, setTrends] = useState<CirculationTrendPoint[]>([]);
  const [popularBooks, setPopularBooks] = useState<PopularBookStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loanStatus, setLoanStatus] = useState<LoanStatusBreakdown | null>(null);
  const [engagement, setEngagement] = useState<MemberEngagementMetrics | null>(null);
  const [overdueAnalysis, setOverdueAnalysis] = useState<OverdueAnalysisMetrics | null>(null);
  const [inventoryInsights, setInventoryInsights] = useState<InventoryInsightsMetrics | null>(null);

  // Reports Submodule State
  const [selectedReport, setSelectedReport] = useState<ReportType>(initialReport);
  const [reportSearch, setReportSearch] = useState<string>('');
  const [reportPage, setReportPage] = useState<number>(1);
  const [reportData, setReportData] = useState<ReportDataResponse | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedReport(initialReport);
  }, [initialReport]);

  // Load All Visual Analytics
  const loadAnalytics = useCallback(async () => {
    setIsLoadingMetrics(true);
    setIsLoadingTrends(true);

    const filterParams = {
      preset,
      startDate: preset === 'custom' ? customStart : undefined,
      endDate: preset === 'custom' ? customEnd : undefined,
    };

    try {
      const [
        summaryRes,
        trendsRes,
        popularRes,
        catRes,
        statusRes,
        engRes,
        overdueRes,
        invRes,
      ] = await Promise.all([
        fetchAnalyticsSummary(filterParams),
        fetchCirculationTrends({ ...filterParams, interval: trendInterval }),
        fetchPopularBooks({ ...filterParams, limit: 6 }),
        fetchCategoryDistribution(filterParams),
        fetchLoanStatusOverview(filterParams),
        fetchMemberEngagement(filterParams),
        fetchOverdueAnalysis(),
        fetchInventoryInsights(2),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (trendsRes.success) setTrends(trendsRes.data.trends);
      if (popularRes.success) setPopularBooks(popularRes.data.books);
      if (catRes.success) setCategories(catRes.data.categories);
      if (statusRes.success) setLoanStatus(statusRes.data.statusBreakdown);
      if (engRes.success) setEngagement(engRes.data.engagement);
      if (overdueRes.success) setOverdueAnalysis(overdueRes.data);
      if (invRes.success) setInventoryInsights(invRes.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoadingMetrics(false);
      setIsLoadingTrends(false);
    }
  }, [preset, customStart, customEnd, trendInterval]);

  // Load Report Tabular Data
  const loadReport = useCallback(async () => {
    setIsLoadingReports(true);
    const filterParams = {
      preset,
      startDate: preset === 'custom' ? customStart : undefined,
      endDate: preset === 'custom' ? customEnd : undefined,
      page: reportPage,
      limit: 15,
      search: reportSearch.trim() || undefined,
    };

    const res = await fetchReportData(selectedReport, filterParams);
    if (res.success) {
      setReportData(res.data);
    }
    setIsLoadingReports(false);
  }, [selectedReport, reportPage, reportSearch, preset, customStart, customEnd]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReport();
    }
  }, [activeTab, loadReport]);

  const handlePresetSelect = (p: DateRangePreset) => {
    if (p === 'custom') {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
      setPreset(p);
      setReportPage(1);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStart || !customEnd) return;
    setPreset('custom');
    setIsCustomOpen(false);
    setReportPage(1);
  };

  const handleExportCsv = () => {
    const url = getReportExportUrl(selectedReport, {
      preset,
      startDate: preset === 'custom' ? customStart : undefined,
      endDate: preset === 'custom' ? customEnd : undefined,
      search: reportSearch.trim() || undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Global Date Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0D9488]" />
              Analytics &amp; Institutional Reports
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-[#0D9488] border border-teal-200">
              VTU 2022 Scheme
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time circulation trends, borrower activity metrics, overdue duration analysis, and auditable data exports.
          </p>
        </div>

        {/* Preset Range Selector & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'current_month', label: 'Month' },
                { id: 'custom', label: 'Custom' },
              ] as Array<{ id: DateRangePreset; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetSelect(item.id)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  preset === item.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              loadAnalytics();
              if (activeTab === 'reports') loadReport();
            }}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingMetrics || isLoadingReports ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Modal / Dropdown Bar if open */}
      {isCustomOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Specify Reporting Window:
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="custom-start-date" className="text-slate-500">From:</label>
            <input
              id="custom-start-date"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="custom-end-date" className="text-slate-500">To:</label>
            <input
              id="custom-end-date"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustomDates}
            disabled={!customStart || !customEnd}
            className="px-3 py-1 bg-[#1B2A4A] text-white rounded font-medium hover:bg-[#2A3F6C] disabled:opacity-50"
          >
            Apply Range
          </button>
          <button
            type="button"
            onClick={() => setIsCustomOpen(false)}
            className="px-2 py-1 text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Primary Module Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-[#0D9488] text-[#0D9488]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Visual Analytics &amp; Decision Support
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-[#0D9488] text-[#0D9488]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Audit Reports &amp; CSV Exports
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VISUAL ANALYTICS & INSIGHTS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Primary 6 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Catalog Titles</span>
              <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {isLoadingMetrics ? '...' : summary?.totalBookTitles ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Unique volumes</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Physical Copies</span>
              <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {isLoadingMetrics ? '...' : summary?.totalPhysicalCopies ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Accessioned copies</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Patrons</span>
              <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {isLoadingMetrics ? '...' : summary?.totalMembers ?? 0}
              </p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Enrolled members</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Active Loans</span>
              <p className="text-xl font-bold text-teal-800 mt-1 font-mono">
                {isLoadingMetrics ? '...' : summary?.activeLoans ?? 0}
              </p>
              <span className="text-[11px] text-teal-600 mt-0.5 block">Currently issued</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Overdue</span>
              <p className="text-xl font-bold text-rose-700 mt-1 font-mono">
                {isLoadingMetrics ? '...' : summary?.currentlyOverdueLoans ?? 0}
              </p>
              <span className="text-[11px] text-rose-500 mt-0.5 block">Deadline exceeded</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Available Shelf</span>
              <p className="text-xl font-bold text-emerald-800 mt-1 font-mono">
                {isLoadingMetrics ? '...' : summary?.availableCopies ?? 0}
              </p>
              <span className="text-[11px] text-emerald-600 mt-0.5 block">Ready for checkout</span>
            </div>
          </div>

          {/* Secondary Operational Flow Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Issued in Period</span>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">
                {isLoadingMetrics ? '...' : `${summary?.issuedDuringPeriod ?? 0} loans`}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Returned in Period</span>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">
                {isLoadingMetrics ? '...' : `${summary?.returnedDuringPeriod ?? 0} check-ins`}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Due-Soon Alerts</span>
              <p className="text-base font-bold text-amber-700 font-mono mt-0.5">
                {isLoadingMetrics ? '...' : `${summary?.dueSoonRemindersSent ?? 0} sent`}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Overdue Notices</span>
              <p className="text-base font-bold text-rose-700 font-mono mt-0.5">
                {isLoadingMetrics ? '...' : `${summary?.overdueRemindersSent ?? 0} sent`}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Failed Dispatches</span>
              <p className="text-base font-bold text-slate-700 font-mono mt-0.5">
                {isLoadingMetrics ? '...' : `${summary?.failedNotifications ?? 0} errors`}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 font-medium">Bulk Ingest Jobs</span>
              <p className="text-base font-bold text-slate-800 font-mono mt-0.5">
                {isLoadingMetrics ? '...' : `${summary?.recentImportsCount ?? 0} jobs`}
              </p>
            </div>
          </div>

          {/* Section: Circulation Trends Over Time */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0D9488]" />
                  Circulation Volume Trends (Issued vs. Returned)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparative velocity of book borrowing transactions against return desk check-ins.
                </p>
              </div>

              {/* Interval Switcher */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium">
                {(['daily', 'weekly', 'monthly'] as GroupingInterval[]).map((int) => (
                  <button
                    key={int}
                    type="button"
                    onClick={() => setTrendInterval(int)}
                    className={`px-2.5 py-1 rounded capitalize transition-all ${
                      trendInterval === int
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-72 w-full">
              {isLoadingTrends ? (
                <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
                  Calculating circulation metrics...
                </div>
              ) : trends.length === 0 ? (
                <div className="h-full w-full border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-xs text-slate-400 p-4 text-center">
                  <p className="font-medium text-slate-600 mb-1">No circulation activity in this date range</p>
                  <p>Try widening your reporting window (e.g. 90D or Month).</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorReturned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B2A4A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1B2A4A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="issued"
                      name="Issued Books"
                      stroke="#0D9488"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIssued)"
                    />
                    <Area
                      type="monotone"
                      dataKey="returned"
                      name="Returned Books"
                      stroke="#1B2A4A"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReturned)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Middle Row: Most Borrowed Books & Popular Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Borrowed Books */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-[#0D9488]" />
                    Most Borrowed Titles in Selected Period
                  </span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">Ranking</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by actual issue events rather than passive catalog size.
                </p>
              </div>

              <div className="mt-4 space-y-2.5">
                {popularBooks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No borrowing transactions recorded in this window.
                  </div>
                ) : (
                  popularBooks.map((book, idx) => (
                    <div
                      key={book._id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-[#1B2A4A] text-white flex items-center justify-center text-xs font-bold font-mono">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate" title={book.title}>
                            {book.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            ISBN: {book.isbn} • {book.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <span className="text-xs font-bold text-[#0D9488] font-mono block">
                          {book.borrowCount} {book.borrowCount === 1 ? 'loan' : 'loans'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {book.availableCopies} left of {book.totalCopies}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Popular Academic Categories */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0D9488]" />
                    Circulation by Departmental Category
                  </span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">Distribution</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of checked-out volumes mapped across academic disciplines.
                </p>
              </div>

              <div className="mt-4 h-64 w-full flex items-center justify-center">
                {categories.length === 0 ? (
                  <div className="text-xs text-slate-400">No category borrowing metrics found.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="borrowCount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {categories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: 3 Modular Deep Dives */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Col 1: Loan Status Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-600" />
                Circulation Status Snapshot
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Operational active versus delinquent volumes.</p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50/70 border border-teal-200">
                  <span className="text-xs font-medium text-teal-900">Active Borrowers (On Time)</span>
                  <span className="text-sm font-bold text-teal-800 font-mono">{loanStatus?.active ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
                  <span className="text-xs font-medium text-rose-900">Overdue Defaulters</span>
                  <span className="text-sm font-bold text-rose-800 font-mono">{loanStatus?.overdue ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs font-medium text-slate-700">Returned in This Period</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{loanStatus?.returnedInPeriod ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Col 2: Overdue Duration Analysis */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Overdue Duration Buckets
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Severity distribution of delinquent loans.</p>

              <div className="mt-4 space-y-2">
                {overdueAnalysis?.buckets.map((b) => (
                  <div key={b.range} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{b.range}:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{
                            width: `${
                              overdueAnalysis.totalOverdueLoans > 0
                                ? (b.count / overdueAnalysis.totalOverdueLoans) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-900 w-6 text-right">{b.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Col 3: Member Engagement */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Patron Engagement
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Campus borrowing participation rate.</p>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                  <span className="text-slate-600">Active Borrowers:</span>
                  <span className="font-bold text-slate-900 font-mono">{engagement?.activeBorrowersInPeriod ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                  <span className="text-slate-600">New Registrations:</span>
                  <span className="font-bold text-slate-900 font-mono">{engagement?.newRegistrationsInPeriod ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Borrower Participation:</span>
                  <span className="font-bold text-[#0D9488] font-mono">{engagement?.borrowerParticipationRate ?? 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts Banner */}
          {inventoryInsights && inventoryInsights.lowStockCount > 0 && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Catalog Stock Warning: {inventoryInsights.lowStockCount} Titles Critical (≤ {inventoryInsights.lowStockThreshold} copies)
                  </h4>
                  <p className="text-xs text-amber-900">
                    High demand titles are approaching zero shelf availability. Consider requisitioning additional physical copies.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('inventory')}
                    className="px-3 py-1.5 rounded-lg bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors"
                  >
                    Manage Inventory Catalog
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT REPORTS & CSV EXPORTS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Type Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {REPORT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedReport === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedReport(tab.id);
                    setReportPage(1);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#0D9488] bg-teal-50/60 shadow-xs ring-1 ring-[#0D9488]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0D9488]' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-teal-950' : 'text-slate-800'}`}>
                      {tab.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Report Action & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => {
                  setReportSearch(e.target.value);
                  setReportPage(1);
                }}
                placeholder="Search report records..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white"
              />
            </div>

            {/* Export and Metadata Controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right text-xs text-slate-500 hidden md:block">
                <span>Total Matching: </span>
                <span className="font-bold text-slate-800 font-mono">
                  {reportData?.pagination.total ?? 0} records
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] text-white rounded-lg text-xs font-semibold hover:bg-teal-700 shadow-xs transition-colors"
                title="Download standard RFC 4180 CSV export with formula injection protection"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV Report
              </button>
            </div>
          </div>

          {/* Report Metadata Banner */}
          {reportData && (
            <div className="px-4 py-2 bg-slate-100/70 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{reportData.reportMetadata.reportType}</span>
                <span>•</span>
                <span>{reportData.reportMetadata.filterSummary}</span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                Generated: {new Date(reportData.reportMetadata.generatedAt).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Report Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {isLoadingReports ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0D9488] mb-2" />
                Compiling database report records...
              </div>
            ) : !reportData || reportData.data.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No matching report records found for this query and date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      {Object.keys(reportData.data[0])
                        .filter((key) => key !== 'id')
                        .map((key) => (
                          <th key={key} className="px-4 py-3">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.data.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        {Object.entries(row)
                          .filter(([key]) => key !== 'id')
                          .map(([key, val]) => (
                            <td key={key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                              {key === 'status' || key === 'membershipStatus' ? (
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                    val === 'AVAILABLE' || val === 'COMPLETED' || val === 'SENT' || val === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : val === 'OVERDUE' || val === 'FAILED'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {String(val)}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-800">{String(val ?? '—')}</span>
                              )}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {reportData && (
              <PaginationControls
                pagination={reportData.pagination}
                onPageChange={setReportPage}
                isLoading={isLoadingReports}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
