import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Eye,
  Info,
  Server,
  X,
  Radio,
} from 'lucide-react';
import {
  fetchNotifications,
  fetchNotificationSummary,
  fetchNotificationConfigStatus,
  triggerManualReminders,
  sendTestEmail,
  getStoredAdminEmail,
} from '../services/api';
import {
  NotificationItem,
  NotificationSummary,
  EmailConfigStatus,
  Pagination,
  ReminderJobStats,
} from '../types';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { PaginationControls } from '../components/ui/PaginationControls';

export const NotificationsPage: React.FC = () => {
  // Data state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [configStatus, setConfigStatus] = useState<EmailConfigStatus | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Dialogs & Drawers
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [testRecipientInput, setTestRecipientInput] = useState('');
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  const [isRunConfirmOpen, setIsRunConfirmOpen] = useState(false);
  const [runStatsResult, setRunStatsResult] = useState<ReminderJobStats | null>(null);

  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load summary and config
  const loadSummaryAndConfig = useCallback(async () => {
    try {
      const [summaryRes, configRes] = await Promise.all([
        fetchNotificationSummary(),
        fetchNotificationConfigStatus(),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (configRes.success && configRes.data) {
        setConfigStatus(configRes.data);
      }
    } catch (err: unknown) {
      console.error('Error fetching notification metadata:', err);
    }
  }, []);

  // Load notifications table
  const loadNotifications = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetchNotifications({
          page: pageToLoad,
          limit: pagination.limit,
          search: search.trim() || undefined,
          type: selectedType !== 'ALL' ? selectedType : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        });

        if (res.success) {
          setNotifications(res.data || []);
          const paginationMeta = (res as any).pagination;
          if (paginationMeta) {
            setPagination({
              page: paginationMeta.page || pageToLoad,
              limit: paginationMeta.limit || 10,
              total: paginationMeta.total || (res.data ? res.data.length : 0),
              totalPages: paginationMeta.totalPages || 1,
            });
          }
        } else {
          setErrorMessage(res.error?.message || 'Failed to load notifications history.');
        }
      } catch (err: unknown) {
        setErrorMessage('A network error occurred while querying notifications.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [pagination.limit, search, selectedType, selectedStatus]
  );

  useEffect(() => {
    loadSummaryAndConfig();
    loadNotifications(1);
  }, [loadSummaryAndConfig, loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSummaryAndConfig(), loadNotifications(pagination.page)]);
  };

  // Trigger manual reminder run
  const handleTriggerReminders = async () => {
    setIsTriggeringReminders(true);
    setErrorMessage(null);
    try {
      const res = await triggerManualReminders();
      if (res.success) {
        setRunStatsResult(res.data);
        setSuccessToast(
          `Reminder check finished: ${res.data.dueSoonSent} due-soon, ${res.data.firstOverdueSent} first overdue, ${res.data.repeatOverdueSent} repeat overdue sent.`
        );
        loadSummaryAndConfig();
        loadNotifications(1);
      } else {
        setErrorMessage(res.error.message || 'Failed to execute reminder evaluation job.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to trigger reminder job.');
    } finally {
      setIsTriggeringReminders(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipientInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipientInput.trim())) {
      setTestEmailError('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setTestEmailError(null);

    try {
      const res = await sendTestEmail(testRecipientInput.trim());
      if (res.success) {
        setSuccessToast(res.message || `Test message dispatched to ${testRecipientInput.trim()}`);
        setIsTestEmailModalOpen(false);
        setTestRecipientInput('');
        loadSummaryAndConfig();
        loadNotifications(1);
      } else {
        setTestEmailError(res.error.message || 'Dispatch attempt failed.');
      }
    } catch (err: any) {
      setTestEmailError(err?.message || 'Failed to send test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Sent
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            Failed
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Skipped
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3 mr-1 text-slate-500" />
            Pending
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DUE_SOON':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Due Soon
          </span>
        );
      case 'FIRST_OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            First Overdue
          </span>
        );
      case 'REPEAT_OVERDUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-900 border border-red-300">
            Repeat Overdue
          </span>
        );
      case 'TEST':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            Test Email
          </span>
        );
      default:
        return <span className="text-xs text-slate-600">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Email Notifications</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-brand-teal border border-teal-200">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Automated Reminders Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Monitor automated student/faculty due-date warnings, overdue escalation notices, and SMTP delivery health.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setTestRecipientInput(getStoredAdminEmail() || '');
              setIsTestEmailModalOpen(true);
            }}
            className="inline-flex items-center px-3 py-2 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Send Test Email
          </button>

          <button
            onClick={() => setIsRunConfirmOpen(true)}
            disabled={isTriggeringReminders}
            className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs font-semibold rounded-md shadow-sm text-white bg-brand-navy hover:bg-slate-800 transition disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 mr-1.5 ${isTriggeringReminders ? 'animate-spin' : ''}`} />
            {isTriggeringReminders ? 'Evaluating Reminders...' : 'Run Reminder Check'}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-sm text-emerald-800 animate-fadeIn">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
            {successToast}
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Configuration Status Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-brand-navy shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notification Subsystem Status
                </span>
                {configStatus?.mode === 'REAL_SMTP' ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live SMTP Connected ({configStatus.host})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200">
                    Mock Transport Mode (Local Simulation &amp; In-Memory Logging)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {configStatus?.verification?.message ||
                  'Scheduler runs automatically every morning at 08:00 AM IST to check upcoming due dates and overdue loans.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 border-t md:border-t-0 pt-2 md:pt-0">
            <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lead Time</span>
              <span className="font-semibold text-slate-800">
                {configStatus?.leadDaysBeforeDue ?? 3} Days Before Due
              </span>
            </div>
            <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Overdue Repeat</span>
              <span className="font-semibold text-slate-800">
                Every {configStatus?.overdueRepeatIntervalDays ?? 7} Days
              </span>
            </div>
            <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cron Schedule</span>
              <span className="font-mono text-slate-800">{configStatus?.schedulerSchedule ?? '0 8 * * *'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Dispatches</span>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary?.total ?? '—'}</p>
          <span className="text-xs text-slate-500">Recorded notification events</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Successfully Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary?.sent ?? '—'}</p>
          <span className="text-xs text-emerald-600">Accepted by mail transport</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Due Soon Reminders</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary?.dueSoon ?? '—'}</p>
          <span className="text-xs text-amber-600">3-day advance alerts issued</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue Notices</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700">{summary?.overdue ?? '—'}</p>
          <span className="text-xs text-rose-600">Escalation &amp; overdue notices</span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by recipient email or event idempotency key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Type:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="ALL">All Types</option>
              <option value="DUE_SOON">Due Soon Warnings</option>
              <option value="FIRST_OVERDUE">First Overdue Notice</option>
              <option value="REPEAT_OVERDUE">Repeat Overdue Notice</option>
              <option value="TEST">Admin Test Emails</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Status:</span>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-teal mb-2" />
            <p className="text-sm text-slate-500">Loading notification history...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-8 text-center text-rose-600">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">{errorMessage}</p>
            <button
              onClick={() => loadNotifications(pagination.page)}
              className="mt-3 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
            >
              Retry Query
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Mail className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">No Notification Records Found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No matching email dispatch records were found for the current filters. Run a reminder check or trigger a
              test email above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Recipient &amp; Member
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Associated Material
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Notice Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Dispatched / Scheduled
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {notifications.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/75 transition-colors">
                    {/* Recipient / Member */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.recipientEmail}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.member ? (
                          <>
                            {item.member.fullName} &bull; {item.member.memberId}
                          </>
                        ) : (
                          <span className="italic text-slate-400">System / Direct Recipient</span>
                        )}
                      </div>
                    </td>

                    {/* Associated Book */}
                    <td className="px-4 py-3">
                      {item.book ? (
                        <div>
                          <div className="font-medium text-slate-900 truncate max-w-xs">{item.book.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.book.shelfLocation || 'Main Stacks'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">N/A (System Test)</span>
                      )}
                    </td>

                    {/* Notice Type */}
                    <td className="px-4 py-3 whitespace-nowrap">{getTypeBadge(item.notificationType)}</td>

                    {/* Dispatched Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      <div>
                        {item.sentAt
                          ? new Date(item.sentAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : new Date(item.scheduledAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(item.sentAt || item.scheduledAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                      {item.attemptCount > 1 && (
                        <span className="text-[10px] text-slate-400 ml-1.5">({item.attemptCount} tries)</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setSelectedNotification(item);
                          setIsDrawerOpen(true);
                        }}
                        className="inline-flex items-center px-2 py-1 border border-slate-200 text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 transition"
                      >
                        <Eye className="w-3 h-3 mr-1 text-slate-500" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <PaginationControls
            pagination={pagination}
            onPageChange={(page) => {
              setPagination((prev) => ({ ...prev, page }));
              loadNotifications(page);
            }}
          />
        </div>
      </div>

      {/* Notification Inspection Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Notification Event Details"
      >
        {selectedNotification && (
          <div className="space-y-6 text-sm">
            {/* Header Status */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Notification Type</span>
                {getTypeBadge(selectedNotification.notificationType)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Delivery Status</span>
                {getStatusBadge(selectedNotification.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase">Dispatch Attempts</span>
                <span className="font-semibold text-slate-800">{selectedNotification.attemptCount}</span>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient Profile</h4>
              <div>
                <span className="text-xs text-slate-400 block">Email Address:</span>
                <span className="font-medium text-slate-900">{selectedNotification.recipientEmail}</span>
              </div>
              {selectedNotification.member && (
                <>
                  <div>
                    <span className="text-xs text-slate-400 block">Member Name:</span>
                    <span className="text-slate-800">{selectedNotification.member.fullName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">ID / USN:</span>
                    <span className="font-mono text-slate-800">{selectedNotification.member.memberId}</span>
                  </div>
                  {selectedNotification.member.department && (
                    <div>
                      <span className="text-xs text-slate-400 block">Department:</span>
                      <span className="text-slate-800">{selectedNotification.member.department}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Book Details */}
            {selectedNotification.book && (
              <div className="border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Circulating Material</h4>
                <div>
                  <span className="text-xs text-slate-400 block">Title:</span>
                  <span className="font-semibold text-slate-900">{selectedNotification.book.title}</span>
                </div>
                {selectedNotification.book.isbn && (
                  <div>
                    <span className="text-xs text-slate-400 block">ISBN:</span>
                    <span className="font-mono text-slate-800">{selectedNotification.book.isbn}</span>
                  </div>
                )}
                {selectedNotification.book.shelfLocation && (
                  <div>
                    <span className="text-xs text-slate-400 block">Shelf Location:</span>
                    <span className="text-slate-800">{selectedNotification.book.shelfLocation}</span>
                  </div>
                )}
              </div>
            )}

            {/* Technical Metadata & Idempotency */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Audit &amp; Idempotency Metadata
              </h4>
              <div>
                <span className="text-xs text-slate-400 block">Idempotency Key:</span>
                <span className="font-mono text-[11px] text-slate-700 break-all bg-slate-50 p-1 rounded border border-slate-100 block">
                  {selectedNotification.idempotencyKey}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Scheduled Timestamp:</span>
                <span className="text-xs text-slate-700">
                  {new Date(selectedNotification.scheduledAt).toISOString()}
                </span>
              </div>
              {selectedNotification.sentAt && (
                <div>
                  <span className="text-xs text-slate-400 block">Sent Timestamp:</span>
                  <span className="text-xs text-slate-700">
                    {new Date(selectedNotification.sentAt).toISOString()}
                  </span>
                </div>
              )}
              {selectedNotification.deliveryMetadata?.messageId && (
                <div>
                  <span className="text-xs text-slate-400 block">Provider Message ID:</span>
                  <span className="font-mono text-xs text-slate-700">
                    {selectedNotification.deliveryMetadata.messageId}
                  </span>
                </div>
              )}
              {selectedNotification.deliveryMetadata?.response && (
                <div>
                  <span className="text-xs text-slate-400 block">Provider SMTP Response:</span>
                  <span className="font-mono text-xs text-slate-600 bg-slate-50 p-1 rounded block">
                    {selectedNotification.deliveryMetadata.response}
                  </span>
                </div>
              )}
              {selectedNotification.errorSummary && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                  <span className="font-semibold block">Error Summary:</span>
                  {selectedNotification.errorSummary}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Send Test Email Modal */}
      <Modal
        isOpen={isTestEmailModalOpen}
        onClose={() => setIsTestEmailModalOpen(false)}
        title="Send Administrator Test Email"
      >
        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <p className="text-xs text-slate-600">
            Dispatch an individual test message to verify that the configured email transport (or in-memory mock) is
            functioning correctly.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. librarian@college.edu"
              value={testRecipientInput}
              onChange={(e) => setTestRecipientInput(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enter the inbox you want the test message delivered to. No library members will be contacted.
            </p>
          </div>

          {testEmailError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
              {testEmailError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 space-y-1">
            <div className="flex items-center text-slate-700 font-medium">
              <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Safety Policy Notice
            </div>
            <p>
              Test messages are strictly addressed only to the single recipient entered above. No library member will be
              contacted.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTestEmailModalOpen(false)}
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSendingTest}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-slate-800 rounded-md shadow-xs transition disabled:opacity-50 flex items-center"
            >
              <Send className={`w-3.5 h-3.5 mr-1.5 ${isSendingTest ? 'animate-spin' : ''}`} />
              {isSendingTest ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Run Reminder Evaluation Modal */}
      <Modal
        isOpen={isRunConfirmOpen}
        onClose={() => setIsRunConfirmOpen(false)}
        title="Execute Manual Reminder Check"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Triggering an immediate reminder check will evaluate all active and overdue loans against the library
            notification rules (due in 3 days, first overdue, and repeat 7-day overdue cycles).
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
            <div className="font-semibold flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Idempotent Evaluation
            </div>
            <p>
              This action uses the exact same safe reminder engine as the daily cron schedule. No duplicate reminder
              emails will be sent if a reminder was already delivered for the current cycle.
            </p>
          </div>

          {runStatsResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">Last Execution Results:</div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Due-Soon Reminders Dispatched: {runStatsResult.dueSoonSent}</li>
                <li>First Overdue Notices Dispatched: {runStatsResult.firstOverdueSent}</li>
                <li>Repeat Overdue Notices Dispatched: {runStatsResult.repeatOverdueSent}</li>
                <li>Skipped (Already Notified / Invalid): {runStatsResult.skipped}</li>
                <li>Failures Encountered: {runStatsResult.failed}</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRunConfirmOpen(false);
                setRunStatsResult(null);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isTriggeringReminders}
              onClick={handleTriggerReminders}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-navy hover:bg-slate-800 rounded-md shadow-xs transition disabled:opacity-50 flex items-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTriggeringReminders ? 'animate-spin' : ''}`} />
              {isTriggeringReminders ? 'Processing...' : 'Run Reminder Check Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
