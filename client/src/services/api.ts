import {
  DashboardSummaryData,
  ApiResponse,
  Book,
  Member,
  Loan,
  Pagination,
  BookSummary,
  MemberSummary,
  NotificationItem,
  NotificationSummary,
  EmailConfigStatus,
  ReminderJobStats,
  ImportJob,
  ImportType,
  ConflictPolicy,
  ImportValidationData,
  ImportSummary,
  DashboardSummaryMetrics,
  CirculationTrendPoint,
  PopularBookStat,
  CategoryStat,
  LoanStatusBreakdown,
  MemberEngagementMetrics,
  OverdueAnalysisMetrics,
  InventoryInsightsMetrics,
  ReportDataResponse,
  ReportType,
  LoginResponseData,
} from '../types';

const API_BASE_URL = '/api';
const ADMIN_API_KEY = 'libtrack-admin-secret-2024';

export function getStoredAdminEmail(): string {
  try {
    const raw = localStorage.getItem('libtrack_admin_user') || sessionStorage.getItem('libtrack_admin_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.email) return parsed.email;
    }
  } catch {}
  return 'jessetemp923@gmail.com';
}

// Helper for HTTP requests
async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const activeEmail = getStoredAdminEmail();
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_API_KEY,
      'x-user-role': 'ADMIN',
    };
    if (activeEmail) {
      defaultHeaders['x-admin-email'] = activeEmail;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...defaultHeaders,
        ...(options?.headers || {}),
      },
      ...options,
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to LibTrack API service. Check that backend server is active.',
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

// --- AUTHENTICATION ---
export async function loginAdmin(credentials: { email: string; password: string }): Promise<ApiResponse<LoginResponseData>> {
  return request<LoginResponseData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function logoutAdmin(): Promise<ApiResponse<{ message: string }>> {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

// --- SYSTEM HEALTH ---
export async function fetchHealth() {
  return request<{
    status: string;
    database: {
      connected: boolean;
      targetUri: string;
      error?: string | null;
      actionRequired?: string | null;
    };
  }>('/health');
}

// --- DASHBOARD ---
export async function fetchDashboardSummary(): Promise<ApiResponse<DashboardSummaryData>> {
  return request<DashboardSummaryData>('/dashboard/summary');
}

// --- BOOK INVENTORY ---
export interface FetchBooksParams {
  search?: string;
  category?: string;
  availability?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BooksResponseData {
  books: Book[];
  pagination: Pagination;
  summary: BookSummary;
}

export async function fetchBooks(params?: FetchBooksParams): Promise<ApiResponse<BooksResponseData>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.availability) query.set('availability', params.availability);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  return request<BooksResponseData>(`/books?${query.toString()}`);
}

export async function fetchBookById(
  id: string
): Promise<ApiResponse<{ book: Book; activeLoans: Loan[]; totalHistoricalLoans: number }>> {
  return request<{ book: Book; activeLoans: Loan[]; totalHistoricalLoans: number }>(`/books/${id}`);
}

export async function createBook(payload: {
  title: string;
  isbn: string;
  authors: string[];
  category: string;
  publisher?: string;
  publicationYear?: number;
  shelfLocation: string;
  totalCopies: number;
}): Promise<ApiResponse<Book>> {
  return request<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBook(
  id: string,
  payload: {
    title: string;
    isbn: string;
    authors: string[];
    category: string;
    publisher?: string;
    publicationYear?: number;
    shelfLocation: string;
    totalCopies: number;
  }
): Promise<ApiResponse<Book>> {
  return request<Book>(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteBook(id: string, archive = true): Promise<ApiResponse<void>> {
  return request<void>(`/books/${id}?archive=${archive}`, {
    method: 'DELETE',
  });
}

export async function fetchBookHistory(
  id: string,
  page = 1
): Promise<ApiResponse<{ loans: Loan[]; pagination: Pagination }>> {
  return request<{ loans: Loan[]; pagination: Pagination }>(`/books/${id}/history?page=${page}`);
}

// --- MEMBERS ---
export interface FetchMembersParams {
  search?: string;
  department?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MembersResponseData {
  members: Member[];
  pagination: Pagination;
  summary: MemberSummary;
}

export async function fetchMembers(params?: FetchMembersParams): Promise<ApiResponse<MembersResponseData>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.department) query.set('department', params.department);
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  return request<MembersResponseData>(`/members?${query.toString()}`);
}

export async function fetchMemberById(
  id: string
): Promise<ApiResponse<{ member: Member; activeLoans: Loan[]; totalHistoricalLoans: number }>> {
  return request<{ member: Member; activeLoans: Loan[]; totalHistoricalLoans: number }>(`/members/${id}`);
}

export async function createMember(payload: {
  memberId: string;
  fullName: string;
  email: string;
  department: string;
  contactNumber?: string;
  memberType?: 'STUDENT' | 'FACULTY' | 'STAFF';
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  maxBorrowLimit?: number;
}): Promise<ApiResponse<Member>> {
  return request<Member>('/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMember(
  id: string,
  payload: {
    memberId: string;
    fullName: string;
    email: string;
    department: string;
    contactNumber?: string;
    memberType?: 'STUDENT' | 'FACULTY' | 'STAFF';
    membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
    maxBorrowLimit?: number;
  }
): Promise<ApiResponse<Member>> {
  return request<Member>(`/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteMember(id: string): Promise<ApiResponse<void>> {
  return request<void>(`/members/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchMemberHistory(
  id: string,
  page = 1
): Promise<ApiResponse<{ loans: Loan[]; pagination: Pagination }>> {
  return request<{ loans: Loan[]; pagination: Pagination }>(`/members/${id}/history?page=${page}`);
}

// --- LOANS (ISSUE & RETURN) ---
export async function issueBook(payload: {
  bookId: string;
  memberId: string;
  borrowDays?: number;
  copyIdentifier?: string;
  notes?: string;
}): Promise<ApiResponse<Loan>> {
  return request<Loan>('/loans/issue', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function returnBook(payload: {
  loanId: string;
  notes?: string;
}): Promise<ApiResponse<{ loan: Loan; isOverdue: boolean; overdueDays: number }>> {
  return request<{ loan: Loan; isOverdue: boolean; overdueDays: number }>('/loans/return', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface FetchActiveLoansParams {
  search?: string;
  status?: string; // ALL, OVERDUE, DUE_SOON
  page?: number;
  limit?: number;
}

export async function fetchActiveLoans(
  params?: FetchActiveLoansParams
): Promise<ApiResponse<{ loans: Loan[]; pagination: Pagination }>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  return request<{ loans: Loan[]; pagination: Pagination }>(`/loans/active?${query.toString()}`);
}

export async function fetchLoanHistory(
  page = 1,
  limit = 15
): Promise<ApiResponse<{ loans: Loan[]; pagination: Pagination }>> {
  return request<{ loans: Loan[]; pagination: Pagination }>(`/loans/history?page=${page}&limit=${limit}`);
}

// --- NOTIFICATIONS & REMINDERS ---
export interface FetchNotificationsParams {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function fetchNotifications(
  params?: FetchNotificationsParams
): Promise<ApiResponse<NotificationItem[]>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.type && params.type !== 'ALL') query.set('type', params.type);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  return request<NotificationItem[]>(`/notifications?${query.toString()}`);
}

export async function fetchNotificationSummary(): Promise<ApiResponse<NotificationSummary>> {
  return request<NotificationSummary>('/notifications/summary');
}

export async function fetchNotificationConfigStatus(): Promise<ApiResponse<EmailConfigStatus>> {
  return request<EmailConfigStatus>('/notifications/config-status');
}

export async function fetchNotificationById(id: string): Promise<ApiResponse<NotificationItem>> {
  return request<NotificationItem>(`/notifications/${id}`);
}

export async function triggerManualReminders(): Promise<ApiResponse<ReminderJobStats>> {
  return request<ReminderJobStats>('/notifications/trigger-reminders', {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function sendTestEmail(recipientEmail: string): Promise<
  ApiResponse<{
    notificationId: string;
    recipientEmail: string;
    status: string;
    isMock: boolean;
    messageId?: string;
  }>
> {
  return request<{
    notificationId: string;
    recipientEmail: string;
    status: string;
    isMock: boolean;
    messageId?: string;
  }>('/notifications/test-email', {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
    body: JSON.stringify({ recipientEmail }),
  });
}

// --- BULK CSV IMPORT & BATCH PROCESSING ---
export function getTemplateDownloadUrl(type: 'books' | 'members'): string {
  return `${API_BASE_URL}/imports/templates/${type}`;
}

export function getErrorReportDownloadUrl(jobId: string): string {
  return `${API_BASE_URL}/imports/${jobId}/error-report`;
}

export async function validateCsvImport(payload: {
  importType: ImportType;
  file?: File;
  csvContent?: string;
  fileName?: string;
}): Promise<ApiResponse<ImportValidationData>> {
  if (payload.file) {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('importType', payload.importType);

    try {
      const res = await fetch(`${API_BASE_URL}/imports/validate`, {
        method: 'POST',
        headers: {
          'x-admin-key': ADMIN_API_KEY,
        },
        body: formData,
      });
      return await res.json();
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_NETWORK_ERROR',
          message: 'Failed to upload CSV file to server.',
          details: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  // JSON payload
  return request<ImportValidationData>('/imports/validate', {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
    body: JSON.stringify({
      importType: payload.importType,
      csvContent: payload.csvContent,
      fileName: payload.fileName,
    }),
  });
}

export async function confirmImportJob(
  jobId: string,
  conflictPolicy: ConflictPolicy
): Promise<
  ApiResponse<{
    jobId: string;
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    skippedRows: number;
    failedRows: number;
    errorsCount: number;
  }>
> {
  return request<{
    jobId: string;
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    skippedRows: number;
    failedRows: number;
    errorsCount: number;
  }>(`/imports/${jobId}/confirm`, {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
    body: JSON.stringify({ conflictPolicy }),
  });
}

export interface FetchImportJobsParams {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function fetchImportJobs(
  params?: FetchImportJobsParams
): Promise<ApiResponse<ImportJob[]>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.type && params.type !== 'ALL') query.set('type', params.type);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  return request<ImportJob[]>(`/imports?${query.toString()}`, {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchImportSummary(): Promise<ApiResponse<ImportSummary>> {
  return request<ImportSummary>('/imports/summary', {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchImportJobById(id: string): Promise<ApiResponse<ImportJob>> {
  return request<ImportJob>(`/imports/${id}`, {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function retryImportJob(jobId: string): Promise<ApiResponse<any>> {
  return request<any>(`/imports/${jobId}/retry`, {
    method: 'POST',
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

// ==============================================================================
// Phase 6: Analytics & Reports API
// ==============================================================================

export interface DateFilterParams {
  preset?: string;
  startDate?: string;
  endDate?: string;
}

export async function fetchAnalyticsSummary(
  params?: DateFilterParams
): Promise<ApiResponse<DashboardSummaryMetrics>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  return request<DashboardSummaryMetrics>(`/analytics/summary?${query.toString()}`, {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchCirculationTrends(
  params?: DateFilterParams & { interval?: string }
): Promise<ApiResponse<{ interval: string; trends: CirculationTrendPoint[] }>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.interval) query.set('interval', params.interval);

  return request<{ interval: string; trends: CirculationTrendPoint[] }>(
    `/analytics/circulation-trends?${query.toString()}`,
    {
      headers: {
        'x-admin-key': ADMIN_API_KEY,
      },
    }
  );
}

export async function fetchPopularBooks(
  params?: DateFilterParams & { limit?: number }
): Promise<ApiResponse<{ books: PopularBookStat[] }>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.limit) query.set('limit', String(params.limit));

  return request<{ books: PopularBookStat[] }>(`/analytics/popular-books?${query.toString()}`, {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchCategoryDistribution(
  params?: DateFilterParams
): Promise<ApiResponse<{ categories: CategoryStat[] }>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  return request<{ categories: CategoryStat[] }>(`/analytics/categories?${query.toString()}`, {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchLoanStatusOverview(
  params?: DateFilterParams
): Promise<ApiResponse<{ statusBreakdown: LoanStatusBreakdown }>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  return request<{ statusBreakdown: LoanStatusBreakdown }>(
    `/analytics/loan-status?${query.toString()}`,
    {
      headers: {
        'x-admin-key': ADMIN_API_KEY,
      },
    }
  );
}

export async function fetchMemberEngagement(
  params?: DateFilterParams
): Promise<ApiResponse<{ engagement: MemberEngagementMetrics }>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  return request<{ engagement: MemberEngagementMetrics }>(
    `/analytics/member-engagement?${query.toString()}`,
    {
      headers: {
        'x-admin-key': ADMIN_API_KEY,
      },
    }
  );
}

export async function fetchOverdueAnalysis(): Promise<ApiResponse<OverdueAnalysisMetrics>> {
  return request<OverdueAnalysisMetrics>('/analytics/overdue-analysis', {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchInventoryInsights(
  lowStockThreshold?: number
): Promise<ApiResponse<InventoryInsightsMetrics>> {
  const query = new URLSearchParams();
  if (lowStockThreshold !== undefined) query.set('lowStockThreshold', String(lowStockThreshold));

  return request<InventoryInsightsMetrics>(`/analytics/inventory?${query.toString()}`, {
    headers: {
      'x-admin-key': ADMIN_API_KEY,
    },
  });
}

export async function fetchReportData(
  reportType: ReportType,
  params?: DateFilterParams & { page?: number; limit?: number; search?: string }
): Promise<ApiResponse<ReportDataResponse>> {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);

  try {
    const res = await fetch(`${API_BASE_URL}/analytics/reports/${reportType}?${query.toString()}`, {
      headers: {
        'x-admin-key': ADMIN_API_KEY,
      },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err?.message || 'Failed to fetch report data.' },
    };
  }
}

export function getReportExportUrl(
  reportType: ReportType,
  params?: DateFilterParams & { search?: string }
): string {
  const query = new URLSearchParams();
  if (params?.preset) query.set('preset', params.preset);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.search) query.set('search', params.search);
  return `${API_BASE_URL}/analytics/reports/${reportType}/export?${query.toString()}`;
}


