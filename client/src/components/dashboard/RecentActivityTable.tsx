import React from 'react';
import { Loan } from '../../types';
import { Badge, BadgeVariant } from '../ui/Badge';
import { History, BookOpen } from 'lucide-react';

interface RecentActivityTableProps {
  loans: Loan[];
  isLoading?: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
  loans,
  isLoading = false,
}) => {
  const getStatusBadge = (status: Loan['status'], dueDateStr: string): { label: string; variant: BadgeVariant } => {
    if (status === 'RETURNED') {
      return { label: 'Returned', variant: 'success' };
    }
    const isOverdue = new Date(dueDateStr).getTime() < Date.now();
    if (status === 'OVERDUE' || isOverdue) {
      return { label: 'Overdue', variant: 'danger' };
    }
    return { label: 'Active Loan', variant: 'info' };
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/[0.08]">
      {/* Table Section Header */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <div>
          <h2 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" aria-hidden="true" />
            Recent Circulation Transactions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Latest checked out or returned books across all departments
          </p>
        </div>
      </div>

      {/* Responsive Table Scroll Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <th scope="col" className="px-5 py-3.5">Book Title & ISBN</th>
              <th scope="col" className="px-5 py-3.5">Borrower / Member</th>
              <th scope="col" className="px-5 py-3.5">Department</th>
              <th scope="col" className="px-5 py-3.5">Issue Date</th>
              <th scope="col" className="px-5 py-3.5">Due Date</th>
              <th scope="col" className="px-5 py-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-xs">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-5 py-3.5"><div className="h-4 bg-white/10 rounded w-48 mb-1" /><div className="h-3 bg-white/5 rounded w-24" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 bg-white/10 rounded w-32 mb-1" /><div className="h-3 bg-white/5 rounded w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-3.5 bg-white/5 rounded w-28" /></td>
                  <td className="px-5 py-3.5"><div className="h-3.5 bg-white/5 rounded w-20" /></td>
                  <td className="px-5 py-3.5"><div className="h-3.5 bg-white/5 rounded w-20" /></td>
                  <td className="px-5 py-3.5 text-right"><div className="h-5 bg-white/10 rounded-full w-16 ml-auto" /></td>
                </tr>
              ))
            ) : loans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BookOpen className="w-7 h-7 text-slate-600 stroke-[1.5]" aria-hidden="true" />
                    <p className="font-semibold text-slate-300 font-sans">No circulation activity recorded</p>
                    <p className="text-xs text-slate-500 font-sans">Newly issued and returned books will appear here in real time.</p>
                  </div>
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const statusMeta = getStatusBadge(loan.status, loan.dueDate);
                const issueFormatted = new Date(loan.issueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const dueFormatted = new Date(loan.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <tr
                    key={loan._id}
                    className="hover:bg-white/[0.04] transition-colors duration-150 group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight font-sans">
                        {loan.book?.title || 'Unknown Title'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
                          {loan.book?.isbn || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-200 font-sans">
                        {loan.member?.fullName || 'Unknown Member'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {loan.member?.memberId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-sans">
                      {loan.member?.department || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {issueFormatted}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {dueFormatted}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      <Badge variant={statusMeta.variant} dot>
                        {statusMeta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
