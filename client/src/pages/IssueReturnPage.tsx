import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Clock,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  AlertOctagon,
} from 'lucide-react';
import { Book, Member, Loan, Pagination } from '../types';
import {
  fetchBooks,
  fetchMembers,
  issueBook,
  returnBook,
  fetchActiveLoans,
} from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PaginationControls } from '../components/ui/PaginationControls';

interface IssueReturnPageProps {
  initialTab?: 'issue' | 'return';
}

export const IssueReturnPage: React.FC<IssueReturnPageProps> = ({ initialTab = 'issue' }) => {
  const [activeTab, setActiveTab] = useState<'issue' | 'return'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // --- ISSUE WORKFLOW STATE ---
  const [memberSearch, setMemberSearch] = useState('');
  const [candidateMembers, setCandidateMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  const [bookSearch, setBookSearch] = useState('');
  const [candidateBooks, setCandidateBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  const [borrowDays, setBorrowDays] = useState<number>(14);
  const [issueNotes, setIssueNotes] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueSuccessMessage, setIssueSuccessMessage] = useState<string | null>(null);
  const [issueErrorMessage, setIssueErrorMessage] = useState<string | null>(null);

  // --- RETURN WORKFLOW STATE ---
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [loansPagination, setLoansPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [activeLoanSearch, setActiveLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('ALL'); // ALL, OVERDUE, DUE_SOON
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);

  // Return Confirmation Modal
  const [selectedLoanToReturn, setSelectedLoanToReturn] = useState<Loan | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState<{ message: string; isOverdue: boolean } | null>(null);

  // 1. Search members for issue
  useEffect(() => {
    if (!memberSearch.trim()) {
      setCandidateMembers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingMembers(true);
      const res = await fetchMembers({ search: memberSearch, limit: 5 });
      if (res.success) {
        setCandidateMembers(res.data.members);
      }
      setIsSearchingMembers(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // 2. Search books for issue
  useEffect(() => {
    if (!bookSearch.trim()) {
      setCandidateBooks([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBooks(true);
      const res = await fetchBooks({ search: bookSearch, limit: 5 });
      if (res.success) {
        setCandidateBooks(res.data.books);
      }
      setIsSearchingBooks(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  // 3. Load active loans for returns tab
  const loadActiveLoans = useCallback(async (page = loansPagination.page) => {
    setIsLoadingLoans(true);
    const res = await fetchActiveLoans({
      search: activeLoanSearch,
      status: loanStatusFilter,
      page,
      limit: loansPagination.limit,
    });
    if (res.success) {
      setActiveLoans(res.data.loans);
      setLoansPagination(res.data.pagination);
    }
    setIsLoadingLoans(false);
  }, [activeLoanSearch, loanStatusFilter, loansPagination.limit, loansPagination.page]);

  useEffect(() => {
    if (activeTab === 'return') {
      loadActiveLoans(1);
    }
  }, [activeTab, activeLoanSearch, loanStatusFilter]);

  // 4. Calculate projected due date
  const calculatedDueDate = new Date(Date.now() + borrowDays * 24 * 60 * 60 * 1000);

  // 5. Handle Issue submission
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !selectedBook) return;

    setIsIssuing(true);
    setIssueErrorMessage(null);
    setIssueSuccessMessage(null);

    const res = await issueBook({
      memberId: selectedMember._id,
      bookId: selectedBook._id,
      borrowDays,
      notes: issueNotes.trim() || undefined,
    });

    if (res.success) {
      setIssueSuccessMessage(res.message || 'Book issued successfully!');
      // Reset form
      setSelectedBook(null);
      setSelectedMember(null);
      setMemberSearch('');
      setBookSearch('');
      setIssueNotes('');
    } else {
      setIssueErrorMessage(res.error.message || 'Failed to issue book.');
    }
    setIsIssuing(false);
  };

  // 6. Handle Return action
  const handleProcessReturn = async () => {
    if (!selectedLoanToReturn) return;
    setIsReturning(true);

    const res = await returnBook({
      loanId: selectedLoanToReturn._id,
      notes: returnNotes.trim() || undefined,
    });

    if (res.success) {
      setReturnFeedback({
        message: res.message || 'Book checked in successfully.',
        isOverdue: res.data.isOverdue,
      });
      setIsReturnModalOpen(false);
      setSelectedLoanToReturn(null);
      setReturnNotes('');
      loadActiveLoans();
    }
    setIsReturning(false);
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('issue')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-colors ${
            activeTab === 'issue'
              ? 'border-[#0D9488] text-[#0D9488]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Issue Book (Check-out)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('return')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-colors ${
            activeTab === 'return'
              ? 'border-[#0D9488] text-[#0D9488]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Active Loans &amp; Check-in
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ISSUE BOOK */}
      {/* ============================================================ */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Search & Select Member + Book */}
          <div className="lg:col-span-2 space-y-5">
            {/* Feedback Alerts */}
            {issueSuccessMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="font-medium">{issueSuccessMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIssueSuccessMessage(null)}
                  className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {issueErrorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
                <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Circulation Rule Violation</p>
                  <p className="mt-0.5">{issueErrorMessage}</p>
                </div>
              </div>
            )}

            {/* Step 1: Member Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  Select Borrower / Member
                </h3>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setMemberSearch('');
                    }}
                    className="text-xs text-[#0D9488] hover:underline"
                  >
                    Change Member
                  </button>
                )}
              </div>

              {!selectedMember ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type student name, member ID (e.g. STU-2026-1001), or email..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                    />
                  </div>

                  {/* Candidate List */}
                  {isSearchingMembers && (
                    <p className="text-xs text-slate-400 animate-pulse">Searching members...</p>
                  )}

                  {candidateMembers.length > 0 && (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {candidateMembers.map((m) => {
                        const isSuspended = m.membershipStatus !== 'ACTIVE';
                        const isQuotaFull = (m.currentBorrowedCount || 0) >= (m.maxBorrowLimit || 4);
                        return (
                          <div
                            key={m._id}
                            onClick={() => {
                              setSelectedMember(m);
                              setCandidateMembers([]);
                            }}
                            className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                              isSuspended || isQuotaFull
                                ? 'bg-amber-50/50 hover:bg-amber-50'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-slate-900">{m.fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {m.memberId} • {m.department}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={m.membershipStatus === 'ACTIVE' ? 'success' : 'danger'}
                              >
                                {m.membershipStatus}
                              </Badge>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Active: {m.currentBorrowedCount || 0} / {m.maxBorrowLimit || 4}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Member Card */
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{selectedMember.fullName}</p>
                    <p className="text-slate-500 font-mono text-[11px]">
                      {selectedMember.memberId} • {selectedMember.department} • {selectedMember.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={selectedMember.membershipStatus === 'ACTIVE' ? 'success' : 'danger'}>
                      {selectedMember.membershipStatus}
                    </Badge>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                      Holding {selectedMember.currentBorrowedCount || 0} of {selectedMember.maxBorrowLimit || 4} books
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Book Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  Select Book from Inventory
                </h3>
                {selectedBook && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(null);
                      setBookSearch('');
                    }}
                    className="text-xs text-[#0D9488] hover:underline"
                  >
                    Change Book
                  </button>
                )}
              </div>

              {!selectedBook ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type book title, author, or ISBN (e.g. Algorithms)..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
                    />
                  </div>

                  {isSearchingBooks && (
                    <p className="text-xs text-slate-400 animate-pulse">Searching inventory...</p>
                  )}

                  {candidateBooks.length > 0 && (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {candidateBooks.map((b) => {
                        const isOutOfStock = b.availableCopies === 0;
                        return (
                          <div
                            key={b._id}
                            onClick={() => {
                              if (!isOutOfStock) {
                                setSelectedBook(b);
                                setCandidateBooks([]);
                              }
                            }}
                            className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                              isOutOfStock
                                ? 'bg-slate-50/70 opacity-60 cursor-not-allowed'
                                : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">{b.title}</p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                ISBN: {b.isbn} • Shelf: {b.shelfLocation}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge variant={isOutOfStock ? 'danger' : 'success'}>
                                {isOutOfStock ? '0 Available' : `${b.availableCopies} on Shelf`}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Book Card */
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{selectedBook.title}</p>
                    <p className="text-slate-500 font-mono text-[11px]">
                      ISBN: {selectedBook.isbn} • Location: {selectedBook.shelfLocation}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">
                      {selectedBook.availableCopies} Copies Available
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Loan Parameters */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                Loan Duration &amp; Notes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Borrowing Period
                  </label>
                  <select
                    value={borrowDays}
                    onChange={(e) => setBorrowDays(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
                  >
                    <option value={7}>7 Days (Short Loan / Course Reserve)</option>
                    <option value={14}>14 Days (Standard Student Loan)</option>
                    <option value={21}>21 Days (Extended Study Loan)</option>
                    <option value={28}>28 Days (Faculty / Research Loan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Desk Notes <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified library card stamp"
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Summary & Action */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 sticky top-24">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0D9488]" />
                  Checkout Transaction Preview
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Review before confirming issue</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Selected Member</span>
                  <p className="font-semibold text-slate-900">
                    {selectedMember ? selectedMember.fullName : '— None selected'}
                  </p>
                  {selectedMember && (
                    <span className="font-mono text-slate-500 text-[11px]">
                      ID: {selectedMember.memberId}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Selected Book</span>
                  <p className="font-semibold text-slate-900">
                    {selectedBook ? selectedBook.title : '— None selected'}
                  </p>
                  {selectedBook && (
                    <span className="font-mono text-slate-500 text-[11px]">
                      Shelf: {selectedBook.shelfLocation}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Issue Date</span>
                    <span className="font-mono font-medium text-slate-700">Today</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Due Date</span>
                    <span className="font-mono font-bold text-[#0D9488]">
                      {calculatedDueDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {selectedBook && (
                  <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200/60 text-[11px] text-teal-900">
                    Inventory Impact: Available copies of this book will reduce from{' '}
                    <span className="font-bold">{selectedBook.availableCopies}</span> to{' '}
                    <span className="font-bold">{selectedBook.availableCopies - 1}</span>.
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full justify-center"
                disabled={!selectedMember || !selectedBook || isIssuing}
                isLoading={isIssuing}
                onClick={handleIssueSubmit}
              >
                Confirm &amp; Issue Book
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ACTIVE LOANS & RETURNS */}
      {/* ============================================================ */}
      {activeTab === 'return' && (
        <div className="space-y-4">
          {/* Return Feedback Toast */}
          {returnFeedback && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="font-medium">{returnFeedback.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setReturnFeedback(null)}
                className="text-emerald-700 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search active loans by student ID, name, or book title..."
                value={activeLoanSearch}
                onChange={(e) => setActiveLoanSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Show:</span>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  loanStatusFilter === 'ALL'
                    ? 'bg-[#1B2A4A] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Active ({loansPagination.total})
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('DUE_SOON')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  loanStatusFilter === 'DUE_SOON'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Due Soon (&lt;48h)
              </button>
              <button
                type="button"
                onClick={() => setLoanStatusFilter('OVERDUE')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  loanStatusFilter === 'OVERDUE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Overdue
              </button>
            </div>
          </div>

          {/* Active Loans Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Book Title &amp; ISBN</th>
                    <th scope="col" className="px-4 py-3">Borrower / Student ID</th>
                    <th scope="col" className="px-4 py-3">Department</th>
                    <th scope="col" className="px-4 py-3">Issue Date</th>
                    <th scope="col" className="px-4 py-3">Due Date</th>
                    <th scope="col" className="px-4 py-3 text-center">Circulation Deadline</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingLoans ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-4 py-3.5"><div className="h-4 bg-slate-200 rounded w-48 mb-1" /></td>
                        <td className="px-4 py-3.5"><div className="h-4 bg-slate-200 rounded w-36" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-28" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-20" /></td>
                        <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-20" /></td>
                        <td className="px-4 py-3.5 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto" /></td>
                        <td className="px-4 py-3.5 text-right"><div className="h-6 bg-slate-200 rounded w-20 ml-auto" /></td>
                      </tr>
                    ))
                  ) : activeLoans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" aria-hidden="true" />
                          <p className="font-semibold text-slate-700 text-sm">No active loans found</p>
                          <p className="text-xs text-slate-400">
                            {loanStatusFilter === 'OVERDUE'
                              ? 'Congratulations! Zero loans are currently overdue.'
                              : 'All books are accounted for on library shelves.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeLoans.map((loan) => {
                      const isOverdue = loan.isOverdue;
                      const dueDateFormatted = new Date(loan.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const issueDateFormatted = new Date(loan.issueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <tr
                          key={loan._id}
                          className="hover:bg-slate-50/70 transition-colors duration-150"
                        >
                          {/* Book */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 leading-tight">
                              {loan.book?.title}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ISBN: {loan.book?.isbn}
                            </span>
                          </td>

                          {/* Member */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {loan.member?.fullName}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {loan.member?.memberId}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3 text-slate-600">
                            {loan.member?.department || '—'}
                          </td>

                          {/* Issue Date */}
                          <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                            {issueDateFormatted}
                          </td>

                          {/* Due Date */}
                          <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                            {dueDateFormatted}
                          </td>

                          {/* Deadline Badge */}
                          <td className="px-4 py-3 text-center">
                            {isOverdue ? (
                              <Badge variant="danger" dot>
                                {loan.overdueDays}d Overdue
                              </Badge>
                            ) : loan.dueSoon ? (
                              <Badge variant="warning" dot>
                                Due Soon
                              </Badge>
                            ) : (
                              <Badge variant="neutral">
                                In {loan.daysRemaining} days
                              </Badge>
                            )}
                          </td>

                          {/* Return Action */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLoanToReturn(loan);
                                setReturnNotes('');
                                setIsReturnModalOpen(true);
                              }}
                            >
                              Check In (Return)
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              pagination={loansPagination}
              onPageChange={(p) => loadActiveLoans(p)}
              isLoading={isLoadingLoans}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RETURN CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Confirm Book Return"
        subtitle="Circulation desk check-in processing"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {selectedLoanToReturn && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">
                  {selectedLoanToReturn.book?.title}
                </span>
                {selectedLoanToReturn.isOverdue ? (
                  <Badge variant="danger">{selectedLoanToReturn.overdueDays} Days Overdue</Badge>
                ) : (
                  <Badge variant="success">On-Time Return</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 block">Borrower</span>
                  <span className="font-semibold text-slate-900">
                    {selectedLoanToReturn.member?.fullName} ({selectedLoanToReturn.member?.memberId})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Due Date</span>
                  <span className="font-mono">
                    {new Date(selectedLoanToReturn.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Check-In Notes <span className="text-slate-400 font-normal">(book condition / damages)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Good condition, returned intact"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
            />
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-md text-teal-900 text-[11px]">
            Inventory Impact: The available physical copy count for this book will be incremented by 1
            and returned to shelf availability.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReturnModalOpen(false)}
              disabled={isReturning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleProcessReturn}
              isLoading={isReturning}
            >
              Confirm Check-in
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
