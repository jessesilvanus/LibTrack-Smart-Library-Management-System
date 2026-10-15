import React from 'react';
import { Loan } from '../../types';
import { Badge } from '../ui/Badge';
import { CalendarClock } from 'lucide-react';

interface UpcomingDueListProps {
  loans: Loan[];
  isLoading?: boolean;
}

export const UpcomingDueList: React.FC<UpcomingDueListProps> = ({
  loans,
  isLoading = false,
}) => {
  const getDueBadge = (dueDateStr: string) => {
    const now = Date.now();
    const dueTime = new Date(dueDateStr).getTime();
    const diffHours = Math.round((dueTime - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      return <Badge variant="danger">Overdue</Badge>;
    }
    if (diffHours <= 24) {
      return <Badge variant="warning">Due in {diffHours}h</Badge>;
    }
    const diffDays = Math.ceil(diffHours / 24);
    if (diffDays <= 2) {
      return <Badge variant="warning">Due in {diffDays} days</Badge>;
    }
    return <Badge variant="neutral">In {diffDays} days</Badge>;
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-white/[0.08]">
      <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" aria-hidden="true" />
            Upcoming Due Dates
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Active loans approaching circulation deadlines
          </p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] flex-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="py-3 animate-pulse flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 bg-white/10 rounded w-44" />
                <div className="h-3 bg-white/5 rounded w-28" />
              </div>
              <div className="h-5 bg-white/10 rounded-full w-20" />
            </div>
          ))
        ) : loans.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-sans">
            <p className="font-semibold text-slate-300 mb-1">No immediate upcoming due dates</p>
            <p>All active loans have comfortable due horizons.</p>
          </div>
        ) : (
          loans.map((loan) => {
            const dueDateFormatted = new Date(loan.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={loan._id}
                className="py-3 flex items-start justify-between gap-3 hover:bg-white/[0.04] rounded-xl px-2.5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate font-sans">
                    {loan.book?.title || 'Unknown Title'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-sans">
                    <span className="font-medium text-slate-300 truncate">
                      {loan.member?.fullName}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">•</span>
                    <span className="font-mono text-emerald-400">{dueDateFormatted}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 font-mono">{getDueBadge(loan.dueDate)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
