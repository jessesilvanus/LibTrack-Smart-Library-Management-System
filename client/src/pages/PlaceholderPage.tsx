import React from 'react';
import { NavRoute } from '../types';
import {
  BookOpen,
  Users,
  ArrowLeftRight,
  History,
  AlertTriangle,
  Mail,
  BarChart3,
  Settings,
  Construction,
  Layers,
  UploadCloud,
} from 'lucide-react';

interface PlaceholderPageProps {
  route: NavRoute;
}

const moduleDetails: Record<
  Exclude<NavRoute, 'overview'>,
  {
    title: string;
    icon: React.ElementType;
    phase: string;
    description: string;
    plannedFeatures: string[];
  }
> = {
  inventory: {
    title: 'Book Inventory Catalog',
    icon: BookOpen,
    phase: 'Phase 3',
    description: 'Centralized catalog of all book titles, accession numbers, editions, and multi-copy tracking.',
    plannedFeatures: [
      'Full catalog search and filtering by ISBN, author, category, and shelf location',
      'Add, edit, and archive book records with Mongoose validation',
      'Accession number generator and physical barcode tag mapping',
      'Individual copy condition tracking and shelf allocation',
    ],
  },
  members: {
    title: 'Member & Student Directory',
    icon: Users,
    phase: 'Phase 3',
    description: 'Student and faculty membership database with borrowing privileges and clearance status.',
    plannedFeatures: [
      'Student ID validation and department-based classification',
      'Borrowing quota enforcement (e.g. max 4 books for students, 10 for faculty)',
      'Clearance status and fee tracking',
      'Profile view with active and historical loans',
    ],
  },
  'issue-return': {
    title: 'Book Issue & Return Circulation',
    icon: ArrowLeftRight,
    phase: 'Phase 4',
    description: 'High-speed circulation desk workflow for issuing books, scanning returns, and renewing loans.',
    plannedFeatures: [
      'Rapid checkout flow with auto-complete member ID and barcode scan',
      'Automatic due date calculation based on member type (14 days for students, 30 days for faculty)',
      'Check-in return processing with instant damage/delay assessment',
      'One-click renewal with loan extension policy checks',
    ],
  },
  history: {
    title: 'Borrowing History & Audit Logs',
    icon: History,
    phase: 'Phase 4',
    description: 'Complete audit trail of historical circulation records for compliance and academic audits.',
    plannedFeatures: [
      'Comprehensive search across historical transactions',
      'Filter by date range, department, student cohort, or course subject',
      'CSV/Excel export for institutional reporting',
      'Audit log tracking librarian actions and override permissions',
    ],
  },
  'due-soon': {
    title: 'Due Soon & Overdue Tracking',
    icon: AlertTriangle,
    phase: 'Phase 5',
    description: 'Dedicated monitoring dashboard for loans approaching due date or past due.',
    plannedFeatures: [
      'Categorized views: Due in 48 hours, Due Today, 1-7 days overdue, and severely overdue',
      'Batch reminder trigger and contact details lookup',
      'Overdue fine calculation matrix based on college rules',
      'Escalation alerts for unreturned reserved volumes',
    ],
  },
  notifications: {
    title: 'Automated Email Reminders',
    icon: Mail,
    phase: 'Phase 5',
    description: 'Automated email dispatch service for due-soon alerts, overdue notices, and return receipts.',
    plannedFeatures: [
      'Configurable background scheduler (cron jobs) for automated daily reminder runs',
      'HTML email templates with personalized borrower name, book details, and return desk hours',
      'Email dispatch audit log with delivery status tracking',
      'Manual broadcast trigger for library holidays and schedule changes',
    ],
  },
  'bulk-import': {
    title: 'Bulk Data Ingestion & Batch Processing',
    icon: UploadCloud,
    phase: 'Phase 5',
    description: 'Scalable batch ingestion of catalog and patron records via validated CSV uploads with conflict resolution.',
    plannedFeatures: [
      'Downloadable standardized CSV templates with sample records',
      'Client and server-side syntax, constraint, and duplicate pre-validation',
      'Configurable conflict policies: Skip, Reject, and Safe Overwrite',
      'Batched database processing with atomic transaction checkpoints',
    ],
  },
  analytics: {
    title: 'Library Usage Analytics & Reports',
    icon: BarChart3,
    phase: 'Phase 6',
    description: 'Comprehensive institutional business intelligence on collection utilization and readership trends.',
    plannedFeatures: [
      'Departmental borrowing distribution and course-wise readership charts',
      'Peak desk hours and seasonal circulation heatmap',
      'Dead stock analysis (unborrowed books over 12 months)',
      'Accreditation-ready summary reports for NAAC/NIRF/ABET audits',
    ],
  },
  settings: {
    title: 'System & Institutional Settings',
    icon: Settings,
    phase: 'Phase 6',
    description: 'Global system configuration, academic calendars, circulation rules, and email credentials.',
    plannedFeatures: [
      'Borrowing period and fine rate configuration by member role',
      'Academic calendar management with holiday exclusion for due dates',
      'SMTP mail server configuration and test dispatch tool',
      'Database backup, restore, and maintenance utilities',
    ],
  },
};

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ route }) => {
  if (route === 'overview') return null;

  const module = moduleDetails[route];
  const Icon = module.icon;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-[#1B2A4A] flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 stroke-[1.75]" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {module.title}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <Construction className="w-3 h-3" />
                  Scheduled for {module.phase}
                </span>
              </div>
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                {module.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Planned Feature Specification Roadmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 text-sm font-bold text-slate-900">
          <Layers className="w-4 h-4 text-[#0D9488]" />
          Planned Module Architecture ({module.phase})
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {module.plannedFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-700"
            >
              <span className="w-5 h-5 rounded-full bg-white border border-slate-300 font-mono text-[10px] font-bold text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Design System Compliance: Master Design System active</span>
          <span className="font-mono text-slate-400">LibTrack Architecture v0.2</span>
        </div>
      </div>
    </div>
  );
};
