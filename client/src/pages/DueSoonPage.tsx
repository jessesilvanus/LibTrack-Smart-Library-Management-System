import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  Mail,
  Send,
  RotateCcw,
  CheckCircle2,
  Search,
  RefreshCw,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import { Loan, NavRoute } from '../types';
import {
  fetchActiveLoans,
  triggerManualReminders,
  returnBook,
} from '../services/api';

interface DueSoonPageProps {
  onNavigate?: (route: NavRoute) => void;
}

export const DueSoonPage: React.FC<DueSoonPageProps> = ({ onNavigate: _onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'due-soon' | 'overdue'>('all');
  const [dueSoonLoans, setDueSoonLoans] = useState<Loan[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Action status state
  const [actionFeedback, setActionFeedback] = useState<{
    id?: string;
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);

  // Return modal state
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<Loan | null>(null);
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const overdueRes = await fetchActiveLoans({
        status: 'OVERDUE',
        limit: 50,
      });

      const dueSoonRes = await fetchActiveLoans({
        status: 'DUE_SOON',
        limit: 50,
      });

      if (overdueRes.success && overdueRes.data) {
        setOverdueLoans(overdueRes.data.loans);
      }
      if (dueSoonRes.success && dueSoonRes.data) {
        setDueSoonLoans(dueSoonRes.data.loans);
      }
    } catch (err) {
      console.error('[DueSoonPage] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = async (loan: Loan, _type: 'DUE_SOON' | 'OVERDUE') => {
    try {
      const res = await triggerManualReminders();
      if (res.success && res.data) {
        setActionFeedback({
          id: loan._id,
          type: 'success',
          message: `Notice cycle dispatched to ${loan.member?.fullName || 'borrower'}. Total sent: ${res.data.dueSoonSent + res.data.firstOverdueSent + res.data.repeatOverdueSent}`,
        });
        loadData();
      } else {
        const errMsg = !res.success ? res.error?.message : 'Reminder rate limit active. Please wait a moment.';
        setActionFeedback({
          id: loan._id,
          type: 'error',
          message: errMsg,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        id: loan._id,
        type: 'error',
        message: err.message || 'Error communicating with reminder server.',
      });
    }
  };

  const handleBatchTrigger = async () => {
    setIsProcessingBatch(true);
    setActionFeedback(null);
    try {
      const res = await triggerManualReminders();
      if (res.success && res.data) {
        const totalSent = res.data.dueSoonSent + res.data.firstOverdueSent + res.data.repeatOverdueSent;
        setActionFeedback({
          type: 'success',
          message: `Batch scan executed: ${totalSent} notices sent, ${res.data.failed} failed, ${res.data.skipped} skipped (24h cooldown).`,
        });
        loadData();
      } else {
        const errMsg = !res.success ? res.error?.message : 'Batch reminder evaluation in cooldown.';
        setActionFeedback({
          type: 'error',
          message: errMsg,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Server error during batch reminder run.',
      });
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleReturnConfirm = async () => {
    if (!selectedLoanForReturn) return;
    setIsSubmittingReturn(true);
    try {
      const res = await returnBook({
        loanId: selectedLoanForReturn._id,
        notes: returnNotes || undefined,
      });
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: `Book "${selectedLoanForReturn.book?.title}" checked in and returned to shelf.`,
        });
        setSelectedLoanForReturn(null);
        setReturnNotes('');
        loadData();
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error?.message || 'Failed to process return.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error processing return.',
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const filterList = (list: Loan[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (l) =>
        l.book?.title?.toLowerCase().includes(q) ||
        l.book?.isbn?.toLowerCase().includes(q) ||
        l.member?.fullName?.toLowerCase().includes(q) ||
        l.member?.memberId?.toLowerCase().includes(q) ||
        l.member?.department?.toLowerCase().includes(q)
    );
  };

  const filteredDueSoon = filterList(dueSoonLoans);
  const filteredOverdue = filterList(overdueLoans);

  const totalActionNeeded = dueSoonLoans.length + overdueLoans.length;
  const estimatedFineTotal = overdueLoans.reduce((sum, l) => sum + (l.overdueDays || 1) * 5, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-rose-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-glow-amber">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-white">
                  Due Soon & Overdue Action Tracker
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  REAL-TIME
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Operational control for loans approaching deadline, defaulter recovery, and automated notification triggers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleBatchTrigger()}
            disabled={isProcessingBatch || totalActionNeeded === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 text-white shadow-glow-rose hover:brightness-110 disabled:opacity-40 transition-all duration-200 active:scale-95"
          >
            {isProcessingBatch ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Queues...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Dispatch All Reminders</span>
              </>
            )}
          </button>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] shadow-sm transition-all"
            title="Refresh active lists"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-semibold backdrop-blur-md animate-in fade-in duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-glow-emerald'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-glow-rose'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* High-Impact Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Due Soon Meter */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-l-4 border-l-amber-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Expiring Within 72 Hours
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {dueSoonLoans.length}
          </div>
          <span className="text-xs text-amber-400/80 mt-1 block">Patrons scheduled for advance alert</span>
        </div>

        {/* Overdue Delinquents */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-l-4 border-l-rose-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Overdue Defaulters
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold text-white tracking-tight">
            {overdueLoans.length}
          </div>
          <span className="text-xs text-rose-400/80 mt-1 block">Exceeded permitted loan timeframe</span>
        </div>

        {/* Estimated Fine Accrual */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 border-l-4 border-l-cyan-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Estimated Accrued Fines
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold font-mono text-white tracking-tight">
            ₹{estimatedFineTotal.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Calculated at standard ₹5 / overdue day</span>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow-emerald'
                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white border border-white/5'
            }`}
          >
            All Critical ({totalActionNeeded})
          </button>
          <button
            onClick={() => setActiveTab('due-soon')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'due-soon'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-amber'
                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white border border-white/5'
            }`}
          >
            Due Soon ({dueSoonLoans.length})
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'overdue'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-glow-rose'
                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white border border-white/5'
            }`}
          >
            Overdue ({overdueLoans.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search borrower, USN, or book..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Section 1: Overdue Queue (High Priority) */}
      {(activeTab === 'all' || activeTab === 'overdue') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-glow-rose animate-pulse" />
              <h2 className="font-display text-base font-bold text-white">
                Overdue Defaulters Queue ({filteredOverdue.length})
              </h2>
            </div>
            {filteredOverdue.length > 0 && (
              <button
                onClick={() => handleBatchTrigger()}
                disabled={isProcessingBatch}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <span>Notify All Defaulters</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-rose-500/20">
            {filteredOverdue.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-slate-200 text-sm">No overdue loans detected</p>
                <p className="text-xs text-slate-500">All student loans are currently within safe limits.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-rose-500/10 border-b border-rose-500/20 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                      <th className="px-5 py-3">Borrower / USN</th>
                      <th className="px-5 py-3">Book Title & ISBN</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3">Days Overdue</th>
                      <th className="px-5 py-3">Estimated Fine</th>
                      <th className="px-5 py-3">Last Notified</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredOverdue.map((loan) => (
                      <tr key={loan._id} className="hover:bg-rose-500/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{loan.member?.fullName}</div>
                          <div className="font-mono text-[11px] text-slate-400">{loan.member?.memberId}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-white">{loan.book?.title}</div>
                          <div className="font-mono text-[11px] text-slate-400">{loan.book?.isbn}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-rose-300 whitespace-nowrap">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-glow-rose">
                            +{loan.overdueDays || 1} Days
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold font-mono text-amber-400 whitespace-nowrap">
                          ₹{((loan.overdueDays || 1) * 5).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap text-xs font-mono">
                          {loan.reminderMetadata?.lastReminderSentAt
                            ? new Date(loan.reminderMetadata.lastReminderSentAt).toLocaleDateString()
                            : 'Never'}
                          {loan.reminderMetadata && loan.reminderMetadata.reminderCount > 0 && (
                            <span className="ml-1 text-[10px] text-slate-500">
                              ({loan.reminderMetadata.reminderCount}x)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSendReminder(loan, 'OVERDUE')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white transition-all shadow-glow-rose"
                              title="Send overdue warning email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Alert</span>
                            </button>
                            <button
                              onClick={() => setSelectedLoanForReturn(loan)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                              title="Check-in and clear fine"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Due Soon Queue (Advance Notice) */}
      {(activeTab === 'all' || activeTab === 'due-soon') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-glow-amber" />
              <h2 className="font-display text-base font-bold text-white">
                Approaching Deadline Queue (Due in &lt; 72 Hours) ({filteredDueSoon.length})
              </h2>
            </div>
            {filteredDueSoon.length > 0 && (
              <button
                onClick={() => handleBatchTrigger()}
                disabled={isProcessingBatch}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <span>Notify All Due Soon</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-amber-500/20">
            {filteredDueSoon.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto text-slate-500 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-slate-200 text-sm">No loans expiring soon</p>
                <p className="text-xs text-slate-500">No active loans have due dates in the next 3 days.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-500/10 border-b border-amber-500/20 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      <th className="px-5 py-3">Borrower / USN</th>
                      <th className="px-5 py-3">Book Title & ISBN</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3">Time Remaining</th>
                      <th className="px-5 py-3">Patron Email</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredDueSoon.map((loan) => (
                      <tr key={loan._id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{loan.member?.fullName}</div>
                          <div className="font-mono text-[11px] text-slate-400">{loan.member?.memberId}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-white">{loan.book?.title}</div>
                          <div className="font-mono text-[11px] text-slate-400">{loan.book?.isbn}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-amber-300 whitespace-nowrap">
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {loan.daysRemaining && loan.daysRemaining > 0
                              ? `${loan.daysRemaining}d remaining`
                              : 'Due today'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap text-xs font-mono">
                          {loan.member?.email || 'No email on file'}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSendReminder(loan, 'DUE_SOON')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-white transition-all shadow-glow-amber"
                              title="Send advance due-soon reminder"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Notice</span>
                            </button>
                            <button
                              onClick={() => setSelectedLoanForReturn(loan)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Check-in</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Modal */}
      {selectedLoanForReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0E1528] rounded-2xl shadow-modal max-w-md w-full p-6 border border-white/15 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display text-base font-bold text-white">
                Process Book Return
              </h3>
              <button
                onClick={() => setSelectedLoanForReturn(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="bg-white/[0.04] p-3 rounded-xl border border-white/10 space-y-1">
                <div>
                  <span className="text-slate-400">Book: </span>
                  <span className="font-bold text-white">{selectedLoanForReturn.book?.title}</span>
                </div>
                <div>
                  <span className="text-slate-400">Borrower: </span>
                  <span className="font-semibold text-white">{selectedLoanForReturn.member?.fullName} ({selectedLoanForReturn.member?.memberId})</span>
                </div>
                {selectedLoanForReturn.isOverdue && (
                  <div className="text-rose-400 font-bold font-mono">
                    Accrued Overdue Fine: ₹{((selectedLoanForReturn.overdueDays || 1) * 5).toLocaleString()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Condition Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Returned in good condition, fine collected"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/15 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedLoanForReturn(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnConfirm}
                disabled={isSubmittingReturn}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 text-slate-950 font-display font-semibold hover:bg-emerald-400 shadow-glow-emerald"
              >
                {isSubmittingReturn ? 'Processing...' : 'Complete Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

