import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination } from '../../types';

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pagination,
  onPageChange,
  isLoading = false,
}) => {
  const { page, limit, total, totalPages } = pagination;

  if (total === 0) return null;

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/[0.02] border-t border-white/10 text-xs text-slate-400">
      <div>
        Showing <span className="font-semibold font-mono text-white">{startRecord}</span> to{' '}
        <span className="font-semibold font-mono text-white">{endRecord}</span> of{' '}
        <span className="font-semibold font-mono text-emerald-400">{total}</span> records
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:border-emerald-500/50"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="px-3 py-1 text-xs font-medium text-slate-300 font-mono">
          Page <span className="text-emerald-400 font-bold">{page}</span> of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:border-emerald-500/50"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
