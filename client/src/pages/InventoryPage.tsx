import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  Copy,
  CheckCircle2,
  BookmarkCheck,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  ArrowUpDown,
  Archive,
} from 'lucide-react';
import { Book, BookSummary, Pagination, Loan } from '../types';
import {
  fetchBooks,
  createBook,
  updateBook,
  deleteBook,
  fetchBookById,
} from '../services/api';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { PaginationControls } from '../components/ui/PaginationControls';

interface BookFormData {
  title: string;
  isbn: string;
  authors: string;
  category: string;
  publisher: string;
  publicationYear: string;
  shelfLocation: string;
  totalCopies: number;
}

const initialFormData: BookFormData = {
  title: '',
  isbn: '',
  authors: '',
  category: '',
  publisher: '',
  publicationYear: '',
  shelfLocation: '',
  totalCopies: 1,
};

export const InventoryPage: React.FC = () => {
  // Data states
  const [books, setBooks] = useState<Book[]>([]);
  const [summary, setSummary] = useState<BookSummary>({
    totalTitles: 0,
    totalPhysicalCopies: 0,
    availableCopies: 0,
    inCirculation: 0,
    categories: [],
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Drawer states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Details Drawer
  const [selectedBookDetails, setSelectedBookDetails] = useState<{
    book: Book;
    activeLoans: Loan[];
    totalHistoricalLoans: number;
  } | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Delete/Archive Confirmation Modal
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load books from API
  const loadBooks = useCallback(async (pageToLoad = pagination.page) => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchBooks({
      search,
      category,
      availability,
      sortBy,
      sortOrder,
      page: pageToLoad,
      limit: pagination.limit,
    });

    if (res.success) {
      setBooks(res.data.books);
      setPagination(res.data.pagination);
      setSummary(res.data.summary);
    } else {
      setErrorMessage(res.error.message || 'Failed to load books');
    }
    setIsLoading(false);
  }, [search, category, availability, sortBy, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    loadBooks(1);
  }, [search, category, availability, sortBy, sortOrder]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingBookId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setFormSuccessMessage(null);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (book: Book) => {
    setEditingBookId(book._id);
    setFormData({
      title: book.title,
      isbn: book.isbn,
      authors: book.authors.join(', '),
      category: book.category,
      publisher: book.publisher || '',
      publicationYear: book.publicationYear ? String(book.publicationYear) : '',
      shelfLocation: book.shelfLocation,
      totalCopies: book.totalCopies,
    });
    setFormErrors({});
    setFormSuccessMessage(null);
    setIsAddEditModalOpen(true);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.isbn.trim()) errors.isbn = 'ISBN is required';
    if (!formData.authors.trim()) errors.authors = 'At least one author is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.shelfLocation.trim()) errors.shelfLocation = 'Shelf location is required';
    if (!formData.totalCopies || formData.totalCopies < 1) errors.totalCopies = 'Minimum 1 copy required';

    if (formData.publicationYear) {
      const year = parseInt(formData.publicationYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1400 || year > currentYear + 1) {
        errors.publicationYear = `Enter a valid year between 1400 and ${currentYear + 1}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormSuccessMessage(null);

    const authorsList = formData.authors
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const payload = {
      title: formData.title.trim(),
      isbn: formData.isbn.trim().toUpperCase(),
      authors: authorsList,
      category: formData.category.trim(),
      publisher: formData.publisher.trim() || undefined,
      publicationYear: formData.publicationYear ? parseInt(formData.publicationYear, 10) : undefined,
      shelfLocation: formData.shelfLocation.trim(),
      totalCopies: Number(formData.totalCopies),
    };

    if (editingBookId) {
      const res = await updateBook(editingBookId, payload);
      if (res.success) {
        setFormSuccessMessage('Book details updated successfully.');
        setTimeout(() => {
          setIsAddEditModalOpen(false);
          loadBooks();
        }, 800);
      } else {
        setFormErrors({ general: res.error.message });
      }
    } else {
      const res = await createBook(payload);
      if (res.success) {
        setFormSuccessMessage('New book accessioned and added to catalog.');
        setTimeout(() => {
          setIsAddEditModalOpen(false);
          loadBooks(1);
        }, 800);
      } else {
        setFormErrors({ general: res.error.message });
      }
    }
    setIsSubmitting(false);
  };

  // View Book Details Drawer
  const handleViewDetails = async (book: Book) => {
    setIsLoadingDetails(true);
    setIsDetailsDrawerOpen(true);
    const res = await fetchBookById(book._id);
    if (res.success) {
      setSelectedBookDetails(res.data);
    }
    setIsLoadingDetails(false);
  };

  // Delete / Archive Confirmation
  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    setDeleteErrorMessage(null);

    const res = await deleteBook(bookToDelete._id, true);
    if (res.success) {
      setIsDeleteModalOpen(false);
      setBookToDelete(null);
      loadBooks();
    } else {
      setDeleteErrorMessage(res.error.message);
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Book Titles</span>
            <BookOpen className="w-4 h-4 text-[#1B2A4A]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary.totalTitles}</p>
          <span className="text-[11px] text-slate-400">Unique catalog records</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Copies</span>
            <Copy className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary.totalPhysicalCopies}</p>
          <span className="text-[11px] text-slate-400">Accessioned physical volumes</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{summary.availableCopies}</p>
          <span className="text-[11px] text-slate-400">Ready on shelves for loan</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Circulating</span>
            <BookmarkCheck className="w-4 h-4 text-[#0D9488]" />
          </div>
          <p className="text-2xl font-bold text-[#0D9488]">{summary.inCirculation}</p>
          <span className="text-[11px] text-slate-400">Currently issued to members</span>
        </div>
      </div>

      {/* 2. Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, ISBN, shelf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] focus:bg-white transition-all"
            />
          </div>

          {/* Action Button */}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddModal}
          >
            Accession Book
          </Button>
        </div>

        {/* Secondary Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          >
            <option value="">All Categories</option>
            {summary.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available on Shelf</option>
            <option value="unavailable">All Copies Checked Out</option>
            <option value="archived">Archived Books</option>
          </select>

          {/* Sort By Filter */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
            >
              <option value="createdAt">Recently Accessioned</option>
              <option value="title">Book Title (A-Z)</option>
              <option value="availableCopies">Available Stock</option>
              <option value="totalCopies">Total Copies</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
              title={`Sorting ${sortOrder.toUpperCase()}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <p>{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={() => loadBooks()}>
            Retry
          </Button>
        </div>
      )}

      {/* 3. Main Books Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-4 py-3">Book Title &amp; Authors</th>
                <th scope="col" className="px-4 py-3">ISBN</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Location</th>
                <th scope="col" className="px-4 py-3 text-center">Copies (Avail / Total)</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-slate-200 rounded w-48 mb-1" />
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </td>
                    <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-28" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto" /></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-6 bg-slate-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-8 h-8 text-slate-300" aria-hidden="true" />
                      <p className="font-semibold text-slate-700 text-sm">No books found matching criteria</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Try adjusting your search terms or filters, or accession a new book into the catalog.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                books.map((book) => {
                  let statusBadge: { label: string; variant: BadgeVariant };
                  if (book.isArchived) {
                    statusBadge = { label: 'Archived', variant: 'neutral' };
                  } else if (book.availableCopies > 0) {
                    statusBadge = { label: 'Available', variant: 'success' };
                  } else {
                    statusBadge = { label: 'Out of Stock', variant: 'danger' };
                  }

                  return (
                    <tr
                      key={book._id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* Title & Author */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {book.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                          {book.authors.join(', ')}
                        </div>
                      </td>

                      {/* ISBN */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {book.isbn}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {book.category}
                        </span>
                      </td>

                      {/* Shelf Location */}
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                        {book.shelfLocation}
                      </td>

                      {/* Copies */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            book.availableCopies === 0 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {book.availableCopies}
                        </span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{book.totalCopies}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusBadge.variant} dot>
                          {statusBadge.label}
                        </Badge>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(book)}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Book Details & Circulation History"
                            aria-label={`View details for ${book.title}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(book)}
                            className="p-1.5 rounded text-slate-500 hover:text-[#0D9488] hover:bg-teal-50 transition-colors"
                            title="Edit Book Details"
                            aria-label={`Edit ${book.title}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setBookToDelete(book);
                              setDeleteErrorMessage(null);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Archive or Delete Book"
                            aria-label={`Archive or delete ${book.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination */}
        <PaginationControls
          pagination={pagination}
          onPageChange={(p) => loadBooks(p)}
          isLoading={isLoading}
        />
      </div>

      {/* ============================================================ */}
      {/* ADD / EDIT BOOK MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingBookId ? 'Edit Book Details' : 'Accession New Book'}
        subtitle={
          editingBookId
            ? 'Update catalog information. Total copies cannot be reduced below active loans.'
            : 'Enter institutional bibliographic details to register physical copies in LibTrack.'
        }
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formErrors.general}
            </div>
          )}
          {formSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {formSuccessMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Book Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Introduction to Algorithms (4th Edition)"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
            />
            {formErrors.title && <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.title}</p>}
          </div>

          {/* ISBN & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ISBN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                placeholder="e.g. 978-0262046305"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.isbn && <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.isbn}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category / Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.category && (
                <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.category}</p>
              )}
            </div>
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Author(s) <span className="text-rose-500">*</span>{' '}
              <span className="font-normal text-slate-400">(separate multiple with commas)</span>
            </label>
            <input
              type="text"
              required
              value={formData.authors}
              onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
              placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
            />
            {formErrors.authors && (
              <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.authors}</p>
            )}
          </div>

          {/* Shelf Location & Total Copies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shelf Location / Stack Tag <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.shelfLocation}
                onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                placeholder="e.g. Stack CS-04"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.shelfLocation && (
                <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.shelfLocation}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Physical Copies <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.totalCopies}
                onChange={(e) => setFormData({ ...formData, totalCopies: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.totalCopies && (
                <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.totalCopies}</p>
              )}
            </div>
          </div>

          {/* Publisher & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Publisher <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                placeholder="e.g. MIT Press"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Publication Year <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                value={formData.publicationYear}
                onChange={(e) => setFormData({ ...formData, publicationYear: e.target.value })}
                placeholder="e.g. 2022"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.publicationYear && (
                <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.publicationYear}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingBookId ? 'Save Changes' : 'Accession Book'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* BOOK DETAILS DRAWER */}
      {/* ============================================================ */}
      <Drawer
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        title={selectedBookDetails?.book.title || 'Book Details'}
        subtitle="Catalog & Circulation Status"
        width="lg"
      >
        {isLoadingDetails || !selectedBookDetails ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading book circulation records...
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Bibliographic Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">{selectedBookDetails.book.title}</span>
                <Badge
                  variant={
                    selectedBookDetails.book.isArchived
                      ? 'neutral'
                      : selectedBookDetails.book.availableCopies > 0
                      ? 'success'
                      : 'danger'
                  }
                  dot
                >
                  {selectedBookDetails.book.isArchived
                    ? 'Archived'
                    : selectedBookDetails.book.availableCopies > 0
                    ? 'Available'
                    : 'Out of Stock'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 block">ISBN</span>
                  <span className="font-mono font-semibold text-slate-900">{selectedBookDetails.book.isbn}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Category</span>
                  <span className="font-semibold text-slate-900">{selectedBookDetails.book.category}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Authors</span>
                  <span className="text-slate-900">{selectedBookDetails.book.authors.join(', ')}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Shelf Stack</span>
                  <span className="font-mono text-slate-900 font-semibold">{selectedBookDetails.book.shelfLocation}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Publisher</span>
                  <span>{selectedBookDetails.book.publisher || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Year</span>
                  <span>{selectedBookDetails.book.publicationYear || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Copy Metrics Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Total Copies</span>
                <span className="text-lg font-bold text-slate-900">{selectedBookDetails.book.totalCopies}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[11px] block">On Shelves</span>
                <span className="text-lg font-bold text-emerald-700">{selectedBookDetails.book.availableCopies}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[11px] block">In Circulation</span>
                <span className="text-lg font-bold text-[#0D9488]">
                  {selectedBookDetails.book.totalCopies - selectedBookDetails.book.availableCopies}
                </span>
              </div>
            </div>

            {/* Currently Active Loans Section */}
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Active Loans ({selectedBookDetails.activeLoans.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Total Lifetime Loans: {selectedBookDetails.totalHistoricalLoans}
                </span>
              </div>

              {selectedBookDetails.activeLoans.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
                  No copies currently in circulation. All copies ready on shelf.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedBookDetails.activeLoans.map((loan) => {
                    const isOverdue = new Date(loan.dueDate).getTime() < Date.now();
                    return (
                      <div
                        key={loan._id}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{loan.member?.fullName}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono">{loan.member?.memberId}</span>
                            <span>•</span>
                            <span>{loan.member?.department}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">
                            Due: {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                          <Badge variant={isOverdue ? 'danger' : 'info'} dot>
                            {isOverdue ? 'Overdue' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================ */}
      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Removal / Archive"
        subtitle="Library inventory compliance check"
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteErrorMessage ? (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Action Prohibited</p>
                <p className="mt-0.5">{deleteErrorMessage}</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Institutional Audit Rule:</p>
                <p className="mt-0.5">
                  Are you sure you want to remove <span className="font-semibold">"{bookToDelete?.title}"</span>?
                  If this book has past borrowing transactions, it will be safely archived to preserve student history and audit integrity.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {!deleteErrorMessage && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Archive className="w-4 h-4" />}
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Proceed with Archive
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
