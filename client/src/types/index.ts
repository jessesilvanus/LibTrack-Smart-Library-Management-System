export type NavRoute =
  | 'overview'
  | 'inventory'
  | 'members'
  | 'issue-return'
  | 'history'
  | 'due-soon'
  | 'notifications'
  | 'bulk-import'
  | 'analytics'
  | 'settings';

export interface Book {
  _id: string;
  title: string;
  isbn: string;
  authors: string[];
  category: string;
  publisher?: string;
  publicationYear?: number;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookSummary {
  totalTitles: number;
  totalPhysicalCopies: number;
  availableCopies: number;
  inCirculation: number;
  categories: string[];
}

export interface Member {
  _id: string;
  memberId: string;
  fullName: string;
  email: string;
  department: string;
  contactNumber?: string;
  memberType?: 'STUDENT' | 'FACULTY' | 'STAFF';
  maxBorrowLimit?: number;
  membershipStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  currentBorrowedCount?: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberSummary {
  totalMembers: number;
  activeMembers: number;
  borrowingMembersCount: number;
  departments: string[];
}

export interface Loan {
  _id: string;
  book: {
    _id: string;
    title: string;
    isbn: string;
    category?: string;
    shelfLocation?: string;
    totalCopies?: number;
    availableCopies?: number;
  };
  member: {
    _id: string;
    memberId: string;
    fullName: string;
    department?: string;
    email?: string;
    contactNumber?: string;
  };
  copyIdentifier?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  notes?: string;
  reminderMetadata?: {
    reminderCount: number;
    lastReminderSentAt: string | null;
  };
  isOverdue?: boolean;
  overdueDays?: number;
  daysRemaining?: number;
  dueSoon?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardMetrics {
  totalBookTitles: number;
  totalPhysicalCopies: number;
  availableCopies: number;
  activeLoans: number;
  dueSoonLoans: number;
  overdueLoans: number;
}

export interface MonthlyTrend {
  month: string;
  loans: number;
}

export interface PopularBook {
  _id: string;
  title: string;
  isbn: string;
  category: string;
  borrowCount: number;
  availableCopies: number;
}

export interface DashboardSummaryData {
  metrics: DashboardMetrics;
  recentActivity: Loan[];
  upcomingDue: Loan[];
  monthlyTrends: MonthlyTrend[];
  popularBooks: PopularBook[];
  isEmptyDatabase: boolean;
  definitions: {
    dueSoonHours: number;
    timestamp: string;
  };
}

export type NotificationType = 'DUE_SOON' | 'FIRST_OVERDUE' | 'REPEAT_OVERDUE' | 'TEST';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NotificationItem {
  _id: string;
  loan?: {
    _id: string;
    dueDate: string;
    status: string;
  } | null;
  member?: {
    _id: string;
    memberId: string;
    fullName: string;
    email: string;
    department?: string;
    memberType?: string;
  } | null;
  book?: {
    _id: string;
    title: string;
    authors?: string[];
    isbn?: string;
    shelfLocation?: string;
  } | null;
  notificationType: NotificationType;
  recipientEmail: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: DeliveryStatus;
  attemptCount: number;
  errorSummary?: string | null;
  idempotencyKey: string;
  deliveryMetadata?: {
    messageId?: string;
    response?: string;
    provider?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfigStatus {
  configured: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  userConfigured: boolean;
  from: string;
  mode: 'REAL_SMTP' | 'MOCK_TRANSPORT';
  appBaseUrl: string;
  verification?: {
    success: boolean;
    message: string;
  };
  schedulerSchedule?: string;
  leadDaysBeforeDue?: number;
  overdueRepeatIntervalDays?: number;
  cronEnabled?: boolean;
}

export interface ReminderJobStats {
  startedAt: string;
  completedAt: string;
  processedLoans: number;
  dueSoonSent: number;
  firstOverdueSent: number;
  repeatOverdueSent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface NotificationSummary {
  total: number;
  sent: number;
  failed: number;
  pendingOrSkipped: number;
  dueSoon: number;
  overdue: number;
  test: number;
  lastRunStats: ReminderJobStats | null;
  isSchedulerBusy: boolean;
  configStatus: EmailConfigStatus;
}

export type ImportType = 'BOOKS' | 'MEMBERS';
export type JobStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'READY'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';
export type ConflictPolicy = 'SKIP_DUPLICATES' | 'REJECT_CONFLICTS' | 'UPDATE_EXISTING';

export interface RowError {
  rowNumber: number;
  field: string;
  code: string;
  message: string;
  rawValue?: string;
}

export interface ImportJob {
  _id: string;
  jobId: string;
  importType: ImportType;
  fileName: string;
  fileSize: number;
  submittedBy: string;
  status: JobStatus;
  conflictPolicy: ConflictPolicy;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  potentialDuplicates: number;
  processedRows: number;
  successfulRows: number;
  skippedRows: number;
  failedRows: number;
  rowErrors: RowError[];
  previewRows?: Array<Record<string, any>>;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportValidationData {
  jobId: string;
  importType: ImportType;
  fileName: string;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  potentialDuplicates: number;
  previewRows: Array<Record<string, any>>;
  errors: RowError[];
  status: JobStatus;
}

export interface ImportSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  partialJobs: number;
  totalImportedRows: number;
  totalFailedRows: number;
  totalSkippedRows: number;
  batchSize: number;
  maxRowsLimit: number;
  maxFileSizeMb: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==============================================================================
// Phase 6: Analytics & Reports Types
// ==============================================================================

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'current_month' | 'custom';
export type GroupingInterval = 'daily' | 'weekly' | 'monthly';

export interface DashboardSummaryMetrics {
  totalBookTitles: number;
  totalPhysicalCopies: number;
  totalMembers: number;
  activeLoans: number;
  currentlyOverdueLoans: number;
  issuedDuringPeriod: number;
  returnedDuringPeriod: number;
  availableCopies: number;
  dueSoonRemindersSent: number;
  overdueRemindersSent: number;
  failedNotifications: number;
  recentImportsCount: number;
  period: {
    preset: DateRangePreset;
    startDate: string;
    endDate: string;
  };
}

export interface CirculationTrendPoint {
  date: string;
  label: string;
  issued: number;
  returned: number;
}

export interface PopularBookStat {
  _id: string;
  title: string;
  isbn: string;
  authors: string[];
  category: string;
  totalCopies: number;
  availableCopies: number;
  borrowCount: number;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  percentage: number;
}

export interface LoanStatusBreakdown {
  active: number;
  overdue: number;
  returnedInPeriod: number;
  totalActiveAndOverdue: number;
}

export interface TopBorrowerStat {
  memberId: string;
  memberType: string;
  department: string;
  borrowCount: number;
}

export interface MemberEngagementMetrics {
  activeBorrowersInPeriod: number;
  newRegistrationsInPeriod: number;
  totalRegisteredMembers: number;
  borrowerParticipationRate: number;
  topBorrowers: TopBorrowerStat[];
}

export interface OverdueBucket {
  range: string;
  minDays: number;
  maxDays: number | null;
  count: number;
}

export interface OverdueAnalysisMetrics {
  totalOverdueLoans: number;
  buckets: OverdueBucket[];
  overdueByCategory: Array<{ category: string; count: number }>;
}

export interface InventoryInsightsMetrics {
  totalTitles: number;
  totalPhysicalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  utilizationRate: number;
  lowStockThreshold: number;
  lowStockCount: number;
  lowStockBooks: Array<{
    _id: string;
    title: string;
    isbn: string;
    category: string;
    shelfLocation: string;
    totalCopies: number;
    availableCopies: number;
  }>;
}

export type ReportType =
  | 'inventory'
  | 'circulation'
  | 'overdue'
  | 'popular-books'
  | 'member-activity'
  | 'email-notifications'
  | 'bulk-imports';

export interface ReportDataResponse<T = any> {
  data: T[];
  pagination: Pagination;
  reportMetadata: {
    reportType: string;
    generatedAt: string;
    filterSummary: string;
  };
}

export interface AuthUser {
  email: string;
  name: string;
  role: 'ADMIN' | 'LIBRARIAN';
  department?: string;
  token?: string;
}

export interface LoginResponseData {
  user: AuthUser;
  token: string;
  senderEmail: string;
}

