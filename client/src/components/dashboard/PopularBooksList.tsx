import React from 'react';
import { PopularBook } from '../../types';
import { Award, BookMarked } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PopularBooksListProps {
  books: PopularBook[];
  isLoading?: boolean;
}

export const PopularBooksList: React.FC<PopularBooksListProps> = ({
  books,
  isLoading = false,
}) => {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-white/[0.08]">
      <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2.5">
            <Award className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" aria-hidden="true" />
            Most Borrowed Academic Titles
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Highest circulation frequency across all courses
          </p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04] flex-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="py-3 animate-pulse flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 bg-white/10 rounded w-48" />
                <div className="h-3 bg-white/5 rounded w-24" />
              </div>
              <div className="h-4 bg-white/10 rounded w-16" />
            </div>
          ))
        ) : books.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-sans">
            <BookMarked className="w-7 h-7 text-slate-600 mx-auto mb-2" aria-hidden="true" />
            <p className="font-semibold text-slate-300 mb-1">No borrow data available</p>
            <p>Popular rankings will compute dynamically with circulation.</p>
          </div>
        ) : (
          books.map((book, index) => (
            <div
              key={book._id}
              className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.04] rounded-xl px-2.5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/10 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate font-sans">
                    {book.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
                    <span className="truncate">{book.category}</span>
                    <span aria-hidden="true" className="text-slate-600">•</span>
                    <span className="font-mono text-emerald-400">{book.availableCopies} available</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 font-mono">
                <Badge variant="info">
                  {book.borrowCount} {book.borrowCount === 1 ? 'loan' : 'loans'}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
