import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  History,
  AlertTriangle,
  Mail,
  BarChart3,
  Settings,
  UploadCloud,
  X,
  GraduationCap,
} from 'lucide-react';
import { NavRoute } from '../../types';

interface SidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  id: NavRoute;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'inventory', label: 'Book Inventory', icon: BookOpen },
  { id: 'members', label: 'Members Directory', icon: Users },
  { id: 'issue-return', label: 'Issue & Return Desk', icon: ArrowLeftRight },
  { id: 'history', label: 'Borrowing History', icon: History },
  { id: 'due-soon', label: 'Due Soon & Overdue', icon: AlertTriangle, badge: 'Alert', badgeColor: 'rose' },
  { id: 'bulk-import', label: 'Bulk Data Import', icon: UploadCloud },
  { id: 'notifications', label: 'Email Reminders', icon: Mail },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  mobileOpen,
  onMobileClose,
}) => {
  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0A0E1A]/95 text-slate-100 select-none border-r border-white/[0.08] backdrop-blur-2xl">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-glow-emerald ring-2 ring-emerald-500/30">
            <BookOpen className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight text-white">LibTrack</span>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight">LIBRARY OS • VTU</span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Close navigation sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Institutional Context Chip */}
      <div className="px-4 pt-3.5 pb-1.5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 shadow-inner">
          <GraduationCap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate font-semibold tracking-tight text-[11px] font-sans">Central Library System</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Core Operations
        </div>

        {navItems.map((item) => {
          const isActive = currentRoute === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                onRouteChange(item.id);
                onMobileClose();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border-l-4 border-emerald-400 text-white font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_20px_rgba(16,185,129,0.2)] pl-2.5'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white hover:translate-x-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-emerald-400 stroke-[2.2] drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-sans">{item.label}</span>
              </div>

              {item.badge && !isActive && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  item.badgeColor === 'rose'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-white/[0.08] text-xs text-slate-400 bg-[#070A12]/90">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-slate-400">Design System:</span>
          <span className="text-[11px] font-mono font-bold text-emerald-400">STUDIO MAX</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">VTU SCHEME 2022 • SEM 7</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0 border-r border-white/10 z-30 shadow-glass">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl transform transition-transform duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
