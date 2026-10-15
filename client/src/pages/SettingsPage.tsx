import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Mail,
  Clock,
  Layers,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { fetchHealth, fetchNotificationSummary } from '../services/api';
import { EmailConfigStatus } from '../types';

export const SettingsPage: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; uri?: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<string>('');

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const [healthRes, notifRes] = await Promise.all([
        fetchHealth(),
        fetchNotificationSummary(),
      ]);

      if (healthRes.success) {
        setDbStatus({
          connected: healthRes.data.database.connected,
          uri: healthRes.data.database.targetUri,
        });
      }

      if (notifRes.success) {
        setEmailStatus(notifRes.data.configStatus);
      }
    } catch (err) {
      console.error('Failed to load settings telemetry:', err);
    } finally {
      setIsLoading(false);
      setLastCheck(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0D9488]" />
            System &amp; Institutional Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Library circulation policies, Big Data batch ingestion limits, automated reminder parameters, and system telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStatus}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Grid of Configuration Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Institutional Academic Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Institutional Identity &amp; Scheme</h2>
              <p className="text-xs text-slate-400">VTU Academic Curriculum Mapping</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Institution:</span>
              <span className="font-semibold text-slate-800">Visvesvaraya Technological University (VTU)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Academic Scheme:</span>
              <span className="font-semibold text-slate-800">2022 Scheme — 7th Semester B.E.</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Course &amp; Subject:</span>
              <span className="font-semibold text-slate-800">Big Data Project Laboratory</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-800">Computer Science &amp; Engineering</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Software Version:</span>
              <span className="font-mono font-semibold text-[#0D9488]">LibTrack v1.0.0 (Production Candidate)</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Circulation Desk Policy Parameters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Circulation &amp; Borrowing Quotas</h2>
              <p className="text-xs text-slate-400">Institutional Lending Limits</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Undergraduate Student Quota:</span>
              <span className="font-bold text-slate-800 font-mono">4 Books Maximum</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Faculty &amp; Staff Quota:</span>
              <span className="font-bold text-slate-800 font-mono">10 Books Maximum</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Standard Loan Duration:</span>
              <span className="font-bold text-slate-800 font-mono">14 Days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Default Renewal Extension:</span>
              <span className="font-bold text-slate-800 font-mono">14 Days (Up to 2 Times)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Grace Period:</span>
              <span className="font-bold text-emerald-700 font-mono">1 Day (No Fine)</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Automated Email Scheduler Parameters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Email Notification Engine</h2>
              <p className="text-xs text-slate-400">Nodemailer Dispatch Telemetry</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
              <span className="text-slate-500">Active Delivery Mode:</span>
              <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {emailStatus?.mode || 'MOCK_TRANSPORT'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Automated Background Cron:</span>
              <span className="font-mono font-semibold text-slate-800">
                {emailStatus?.schedulerSchedule || '0 8 * * *'} (Daily at 08:00 AM)
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Advance Due-Soon Lead Time:</span>
              <span className="font-bold text-slate-800 font-mono">
                {emailStatus?.leadDaysBeforeDue || 3} Days Prior to Due Date
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Overdue Repeat Escalation:</span>
              <span className="font-bold text-slate-800 font-mono">
                Every {emailStatus?.overdueRepeatIntervalDays || 7} Days
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Sender Identity:</span>
              <span className="font-mono text-slate-600 truncate max-w-xs">
                {emailStatus?.from || 'LibTrack Central Library <notifications@libtrack.edu>'}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 4: Big Data Batch Ingestion Parameters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Big Data Batch Ingestion Limits</h2>
              <p className="text-xs text-slate-400">High-Throughput Processing Boundaries</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Maximum Single CSV File Size:</span>
              <span className="font-mono font-bold text-slate-800">10 MB (10,485,760 Bytes)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Maximum Rows Per Ingestion:</span>
              <span className="font-mono font-bold text-slate-800">5,000 Records</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Batch Processing Chunk Size:</span>
              <span className="font-mono font-bold text-teal-700">50 Rows / Transactional Checkpoint</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Worker Mutex Lock:</span>
              <span className="font-semibold text-emerald-700">Active (Prevents Concurrent Ingestion Collisions)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Formula Injection Mitigation:</span>
              <span className="font-semibold text-emerald-700">CWE-1236 Sanitizer Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database & Host Infrastructure Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Backend &amp; Database Telemetry</h2>
              <p className="text-xs text-slate-400">Live operational server diagnostics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                dbStatus?.connected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {dbStatus?.connected ? 'Database Connected' : 'Database Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">MongoDB URI / Engine</span>
            <p className="font-mono text-slate-800 text-[11px] truncate mt-1" title={dbStatus?.uri}>
              {dbStatus?.uri || 'mongodb://127.0.0.1:27017/libtrack'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Backend Server Status</span>
            <p className="font-mono font-bold text-slate-800 text-sm mt-1">
              Operational (Node.js &amp; Express)
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium">Telemetry Last Polled</span>
            <p className="font-mono font-bold text-slate-800 text-sm mt-1">
              {lastCheck || 'Just now'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
