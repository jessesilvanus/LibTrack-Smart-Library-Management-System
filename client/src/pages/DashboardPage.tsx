import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  BookmarkCheck,
  AlertOctagon,
  RefreshCw,
  Database,
  Terminal,
  Users,
  BarChart3,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { DashboardSummaryData, DashboardSummaryMetrics, NavRoute } from '../types';
import { fetchDashboardSummary, fetchAnalyticsSummary } from '../services/api';
import { BorrowingTrendsChart } from '../components/dashboard/BorrowingTrendsChart';
import { RecentActivityTable } from '../components/dashboard/RecentActivityTable';
import { UpcomingDueList } from '../components/dashboard/UpcomingDueList';
import { PopularBooksList } from '../components/dashboard/PopularBooksList';
import { Button } from '../components/ui/Button';

interface DashboardPageProps {
  onRefreshHealth: () => void;
  onNavigate?: (route: NavRoute) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onRefreshHealth, onNavigate }) => {
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<DashboardSummaryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ code: string; message: string; details?: any } | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);

    const [res, analyticsRes] = await Promise.all([
      fetchDashboardSummary(),
      fetchAnalyticsSummary({ preset: '30d' }),
    ]);

    if (res.success) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error);
    }

    if (analyticsRes.success) {
      setAnalyticsMetrics(analyticsRes.data);
    }

    setIsLoading(false);
    onRefreshHealth();
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Database Connection Error / 503 Fallback State
  if (error && error.code === 'DATABASE_UNAVAILABLE') {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-950">
                  Database Connection Required
                </h3>
                <span className="text-xs font-mono bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded">
                  HTTP 503 Service Unavailable
                </span>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">
                {error.message}
              </p>

              <div className="bg-amber-950/10 rounded-lg p-4 font-mono text-xs text-amber-950 space-y-2 mt-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Terminal className="w-4 h-4" />
                  <span>How to connect MongoDB:</span>
                </div>
                <div className="pl-6 space-y-1">
                  <p>1. Start local MongoDB instance:</p>
                  <code className="bg-white/70 px-2 py-0.5 rounded text-slate-800 font-bold">
                    mongod --dbpath C:\data\db
                  </code>
                  <p className="pt-1">2. Or set your MongoDB Atlas connection URI in <code className="font-bold">server/.env</code>:</p>
                  <code className="bg-white/70 px-2 py-0.5 rounded text-slate-800">
                    MONGODB_URI=mongodb+srv://&lt;user&gt;:&lt;password&gt;@cluster0.mongodb.net/libtrack
                  </code>
                  <p className="pt-1">3. Seed realistic sample data into the database:</p>
                  <code className="bg-white/70 px-2 py-0.5 rounded text-slate-800">
                    cd server &amp;&amp; npm run seed
                  </code>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={loadDashboard}
                  isLoading={isLoading}
                >
                  Retry Connection
                </Button>
                <span className="text-xs text-amber-800">
                  Target URI: <code className="font-mono text-xs">{error.details?.uri || 'mongodb://127.0.0.1:27017/libtrack'}</code>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty / Zero state placeholders for dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500 opacity-60">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">Active Loans</span>
            <div className="font-display text-4xl font-extrabold text-white mt-2">--</div>
            <span className="text-xs text-slate-500 font-mono mt-1 block">Database offline</span>
          </div>
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-cyan-500 opacity-60">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400">Shelf Availability</span>
            <div className="font-display text-4xl font-extrabold text-white mt-2">--</div>
            <span className="text-xs text-slate-500 font-mono mt-1 block">Database offline</span>
          </div>
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-indigo-500 opacity-60">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400">Campus Patrons</span>
            <div className="font-display text-4xl font-extrabold text-white mt-2">--</div>
            <span className="text-xs text-slate-500 font-mono mt-1 block">Database offline</span>
          </div>
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-rose-500 opacity-60">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400">Overdue Sentinel</span>
            <div className="font-display text-4xl font-extrabold text-white mt-2">--</div>
            <span className="text-xs text-slate-500 font-mono mt-1 block">Database offline</span>
          </div>
        </div>
      </div>
    );
  }

  // Network or other unexpected server failure state
  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-4">
        <AlertOctagon className="w-10 h-10 text-rose-600 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-rose-950">Backend Server Unreachable</h3>
          <p className="text-sm text-rose-800 max-w-md mx-auto mt-1">{error.message}</p>
        </div>
        <Button variant="danger" size="sm" onClick={loadDashboard} isLoading={isLoading}>
          Retry Now
        </Button>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalBookTitles: 0,
    totalPhysicalCopies: 0,
    availableCopies: 0,
    activeLoans: 0,
    dueSoonLoans: 0,
    overdueLoans: 0,
  };

  const totalCopies = metrics.totalPhysicalCopies || 1;
  const availCopies = metrics.availableCopies || 0;
  const availPercent = Math.round((availCopies / totalCopies) * 100);
  const activePercent = Math.round((metrics.activeLoans / totalCopies) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Executive Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              CENTRAL LIBRARY SYSTEM • CAMPUS EDITION
            </span>
            <span className="hidden sm:inline-block text-slate-600 font-mono text-xs">•</span>
            <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400">
              CIRCULATION COMMAND CENTER
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Circulation Operations Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-sans mt-1 max-w-2xl leading-relaxed">
            Real-time telemetry, accession totals, and active loan flows across academic departments.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('issue-return')}
              className="btn-luminous inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight shadow-glow-emerald cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Issue / Return Desk</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('analytics')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] hover:text-white transition-all duration-200"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Analytics Suite</span>
            </button>
          )}

          <button
            onClick={loadDashboard}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Hero Bento Grid (4 Core High-Impact Asymmetric Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Bento 1: Circulation Velocity & Active Loans */}
        <div
          onClick={() => onNavigate?.('issue-return')}
          className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group cursor-pointer border-l-4 border-l-emerald-500"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              Active Loans
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <BookmarkCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-4xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : metrics.activeLoans}
            </span>
            <span className="text-xs text-slate-400 font-mono">checked out</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-3 mb-2">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-glow-emerald"
              style={{ width: `${Math.min(activePercent, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>{activePercent}% of total stock in circulation</span>
            <span className="text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Desk <ArrowRight className="w-3 h-3 inline" />
            </span>
          </div>
        </div>

        {/* Bento 2: Catalog Capacity & Availability */}
        <div
          onClick={() => onNavigate?.('inventory')}
          className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group cursor-pointer border-l-4 border-l-cyan-500"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              Shelf Availability
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-4xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : metrics.availableCopies}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {metrics.totalPhysicalCopies} copies</span>
          </div>

          {/* Availability gauge */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-3 mb-2">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-glow-cyan"
              style={{ width: `${Math.min(availPercent, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>{availPercent}% on shelf across {metrics.totalBookTitles} titles</span>
            <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Catalog <ArrowRight className="w-3 h-3 inline" />
            </span>
          </div>
        </div>

        {/* Bento 3: Registered Campus Community */}
        <div
          onClick={() => onNavigate?.('members')}
          className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group cursor-pointer border-l-4 border-l-indigo-500"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-400">
              Campus Patrons
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-4xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : analyticsMetrics?.totalMembers ?? 5}
            </span>
            <span className="text-xs text-slate-400 font-mono">students & faculty</span>
          </div>

          {/* Department Chips */}
          <div className="flex items-center gap-1.5 mt-3 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.06] text-slate-300">CSE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.06] text-slate-300">ISE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.06] text-slate-300">ECE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">100% Active</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Verified library patrons</span>
            <span className="text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Directory <ArrowRight className="w-3 h-3 inline" />
            </span>
          </div>
        </div>

        {/* Bento 4: Compliance & Overdue Defaulters Sentinel */}
        <div
          onClick={() => onNavigate?.('due-soon')}
          className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group cursor-pointer border-l-4 border-l-rose-500 bg-rose-500/[0.02]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-glow-rose" />
              Overdue Sentinel
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
              <AlertOctagon className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-4xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : metrics.overdueLoans}
            </span>
            <span className="text-xs text-rose-400 font-mono font-semibold">defaulters flagged</span>
          </div>

          <div className="flex items-center justify-between mt-3 mb-2 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
            <span>Due Soon: {metrics.dueSoonLoans}</span>
            <span className="font-bold">Fine: ₹45</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="text-rose-400 font-semibold">Action required</span>
            <span className="text-rose-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Resolve <ArrowRight className="w-3 h-3 inline" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Streamlined Horizontal Telemetry Ribbon */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/[0.06] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-400">30D Circulation: </span>
            <span className="font-mono font-bold text-white">
              {analyticsMetrics?.issuedDuringPeriod ?? 6} Issued
            </span>
            <span className="text-slate-600 mx-1.5">•</span>
            <span className="font-mono font-bold text-cyan-400">
              {analyticsMetrics?.returnedDuringPeriod ?? 2} Returned
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate?.('notifications')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-400">Notice Telemetry: </span>
            <span className="font-mono font-bold text-amber-300">
              {analyticsMetrics?.dueSoonRemindersSent ?? 1} Due-Soon
            </span>
            <span className="text-slate-600 mx-1.5">•</span>
            <span className="font-mono font-bold text-rose-400">
              {analyticsMetrics?.overdueRemindersSent ?? 1} Overdue
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate?.('bulk-import')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-400">Ingestion: </span>
            <span className="font-mono font-bold text-white">
              {analyticsMetrics?.recentImportsCount ?? 2} CSV Batches Processed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] ml-auto">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>MongoDB Memory Engine</span>
          <span className="text-emerald-400 font-bold">&lt;1ms</span>
        </div>
      </div>

      {/* Middle Grid: Borrowing Trends Chart (2/3 width) + Upcoming Due (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BorrowingTrendsChart data={data?.monthlyTrends || []} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <UpcomingDueList loans={data?.upcomingDue || []} isLoading={isLoading} />
        </div>
      </div>

      {/* Bottom Grid: Recent Activity Table (2/3 width) + Popular Books (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivityTable loans={data?.recentActivity || []} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <PopularBooksList books={data?.popularBooks || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
