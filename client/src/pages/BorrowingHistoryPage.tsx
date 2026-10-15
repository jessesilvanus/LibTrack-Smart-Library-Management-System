import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  RefreshCw,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  X,
} from 'lucide-react';
import { Loan, Pagination, NavRoute } from '../types';
import { fetchActiveLoans, fetchLoanHistory, returnBook, getReportExportUrl } from '../services/api';
import { PaginationControls } from '../components/ui/PaginationControls';

interface BorrowingHistoryPageProps {
  onNavigate?: (route: NavRoute) => void;
}

export const BorrowingHistoryPage: React.FC<BorrowingHistoryPageProps> = ({ onNavigate: _onNavigate }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RETURNED' | 'OVERDUE'>('ALL');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    returned: 0,
    overdue: 0,
  });

  // Return Modal State
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false);
  const [returnFeedback, setReturnFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = useCallback(async (pageToLoad = 1) => {
    setIsLoading(true);
    try {
      // Use /loans/active or /loans/history depending on filter, or unified fetch
      if (statusFilter === 'ACTIVE' || statusFilter === 'OVERDUE') {
        const res = await fetchActiveLoans({
          page: pageToLoad,
          limit: pagination.limit,
          search: search || undefined,
          status: statusFilter === 'OVERDUE' ? 'OVERDUE' : 'ALL',
        });
        if (res.success && res.data) {
          setLoans(res.data.loans);
          setPagination(res.data.pagination);
        }
      } else {
        const res = await fetchLoanHistory(pageToLoad, pagination.limit);
        if (res.success && res.data) {
          let filtered = res.data.loans;
          if (statusFilter === 'RETURNED') {
            filtered = filtered.filter((l) => l.status === 'RETURNED');
          }
          if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(
              (l) =>
                l.book?.title?.toLowerCase().includes(q) ||
                l.book?.isbn?.toLowerCase().includes(q) ||
                l.member?.fullName?.toLowerCase().includes(q) ||
                l.member?.memberId?.toLowerCase().includes(q)
            );
          }
          setLoans(filtered);
          setPagination({
            ...res.data.pagination,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / pagination.limit) || 1,
          });
        }
      }

      // Compute general summary stats
      const [histRes, activeRes] = await Promise.all([
        fetchLoanHistory(1, 100),
        fetchActiveLoans({ limit: 100 }),
      ]);

      if (histRes.success && activeRes.success) {
        const allHist = histRes.data?.loans || [];
        const allActive = activeRes.data?.loans || [];
        const overdueCount = allActive.filter((l) => l.isOverdue || l.status === 'OVERDUE').length;
        const returnedCount = allHist.filter((l) => l.status === 'RETURNED').length;

        setStats({
          total: (histRes.data?.pagination.total || 0),
          active: (activeRes.data?.pagination.total || 0),
          returned: returnedCount,
          overdue: overdueCount,
        });
      }
    } catch (err) {
      console.error('[BorrowingHistoryPage] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, search, statusFilter]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleReturnConfirm = async () => {
    if (!selectedLoanForReturn) return;
    setIsSubmittingReturn(true);
    setReturnFeedback(null);
    try {
      const res = await returnBook({
        loanId: selectedLoanForReturn._id,
        notes: returnNotes || undefined,
      });
      if (res.success) {
        setReturnFeedback({
          success: true,
          message: `Book "${selectedLoanForReturn.book?.title}" returned successfully!`,
        });
        setTimeout(() => {
          setSelectedLoanForReturn(null);
          setReturnNotes('');
          setReturnFeedback(null);
          loadData(pagination.page);
        }, 1200);
      } else {
        setReturnFeedback({
          success: false,
          message: res.error?.message || 'Failed to process return.',
        });
      }
    } catch (err: any) {
      setReturnFeedback({
        success: false,
        message: err.message || 'Error executing return.',
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-glow-teal ring-2 ring-white/60">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Borrowing History & Circulation Ledger
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Complete audit trail of all physical checkouts, active borrowings, and returned copies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open(getReportExportUrl('circulation'), '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white/[0.05] border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-95 shadow-sm"
            title="Download CSV audit log"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => loadData(pagination.page)}
            className="btn-luminous inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 active:scale-95"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards with Obsidian Depth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Circulations */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group border border-white/[0.08]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Total Circulations
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-200 shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-white relative z-10">
            {stats.total.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-sans relative z-10">Lifetime checkouts processed</span>
        </div>

        {/* Active In Circulation */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group border border-white/[0.08]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              In Circulation
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-cyan-400 relative z-10">
            {stats.active.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-sans relative z-10">Currently borrowed titles</span>
        </div>

        {/* Returned on Record */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group border border-white/[0.08]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Returned &amp; Checked In
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-emerald-400 relative z-10">
            {stats.returned.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-sans relative z-10">Restored to campus shelf</span>
        </div>

        {/* Overdue Items */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group border border-white/[0.08]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Overdue Flagged
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-rose-400 relative z-10">
            {stats.overdue.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-sans relative z-10">Requiring immediate return notice</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-white/[0.08]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by student USN, name, book title, or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all shadow-inner font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ACTIVE', 'RETURNED', 'OVERDUE'] as const).map((chip) => {
            const isActive = statusFilter === chip;
            return (
              <button
                key={chip}
                onClick={() => setStatusFilter(chip)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-glow-emerald border border-emerald-400'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
                }`}
              >
                {chip === 'ALL'
                  ? 'All Transactions'
                  : chip === 'ACTIVE'
                  ? 'In Circulation'
                  : chip === 'RETURNED'
                  ? 'Returned'
                  : 'Overdue'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-card border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Book Title &amp; ISBN</th>
                <th className="px-5 py-3.5">Borrower / USN</th>
                <th className="px-5 py-3.5">Checkout Date</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5">Return Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs sm:text-sm text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="font-mono text-xs text-slate-400">Loading circulation ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                      <span className="font-bold text-sm text-slate-300 font-sans">No circulation logs found</span>
                      <span className="text-xs text-slate-500 font-sans">
                        Try adjusting your search criteria or status filter.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const isOverdue =
                    loan.isOverdue ||
                    loan.status === 'OVERDUE' ||
                    (loan.status === 'ACTIVE' && new Date(loan.dueDate) < new Date());
                  const isReturned = loan.status === 'RETURNED';

                  return (
                    <tr
                      key={loan._id}
                      className="hover:bg-white/[0.04] transition-colors duration-150 group"
                    >
                      {/* Book Title & ISBN */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-emerald-300 transition-colors font-sans">
                            {loan.book?.title || 'Unknown Title'}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-slate-300 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
                              {loan.book?.isbn || 'N/A'}
                            </span>
                            {loan.book?.category && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {loan.book.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Borrower / USN */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200 font-sans">
                            {loan.member?.fullName || 'Anonymous Patron'}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-emerald-400">
                              {loan.member?.memberId || 'N/A'}
                            </span>
                            {loan.member?.department && (
                              <span className="text-[11px] text-slate-500 font-sans">
                                • {loan.member.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(loan.issueDate).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`} />
                          <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Return Status */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono">
                        {isReturned ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Returned {loan.returnDate ? `(${new Date(loan.returnDate).toLocaleDateString()})` : ''}</span>
                          </div>
                        ) : isOverdue ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Overdue {loan.overdueDays ? `(${loan.overdueDays}d)` : ''}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span>Active Checkout</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {!isReturned ? (
                          <button
                            onClick={() => setSelectedLoanForReturn(loan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition-all duration-150 active:scale-95 shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return Copy</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono italic">ARCHIVED</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.08] bg-white/[0.02]">
            <PaginationControls
              pagination={pagination}
              onPageChange={(p) => loadData(p)}
            />
          </div>
        )}
      </div>

      {/* Return Confirmation Modal */}
      {selectedLoanForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Confirm Book Check-in
                </h3>
              </div>
              <button
                onClick={() => setSelectedLoanForReturn(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-1">
                <div>
                  <span className="text-slate-400 text-xs">Title: </span>
                  <span className="font-bold text-slate-900">{selectedLoanForReturn.book?.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Patron: </span>
                  <span className="font-semibold">{selectedLoanForReturn.member?.fullName} ({selectedLoanForReturn.member?.memberId})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Due Date: </span>
                  <span className="font-mono">{new Date(selectedLoanForReturn.dueDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Condition & Return Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Good condition, returned to shelf A3"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {returnFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    returnFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {returnFeedback.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLoanForReturn(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
                disabled={isSubmittingReturn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnConfirm}
                disabled={isSubmittingReturn}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
              >
                {isSubmittingReturn ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Check-in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
