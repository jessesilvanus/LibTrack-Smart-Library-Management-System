import React from 'react';
import { Menu, Search, Bell, Database, LogOut } from 'lucide-react';
import { NavRoute, AuthUser } from '../../types';

interface HeaderProps {
  currentRoute: NavRoute;
  onMobileMenuToggle: () => void;
  isDbConnected: boolean;
  onNavigate?: (route: NavRoute) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

const routeTitles: Record<NavRoute, { title: string; category: string }> = {
  overview: { title: 'Operational Overview', category: 'Dashboard' },
  inventory: { title: 'Book Inventory Catalog', category: 'Catalog Management' },
  members: { title: 'Member & Student Directory', category: 'User Management' },
  'issue-return': { title: 'Book Issue & Return Circulation', category: 'Circulation Desk' },
  history: { title: 'Borrowing History & Circulation Ledger', category: 'Audit Records' },
  'due-soon': { title: 'Due Soon & Overdue Action Tracker', category: 'Urgent Actions' },
  notifications: { title: 'Automated Email Reminders', category: 'Automation' },
  'bulk-import': { title: 'Bulk Data Ingestion & Batch Processing', category: 'Data Management' },
  analytics: { title: 'Library Usage Analytics & Reports', category: 'Intelligence' },
  settings: { title: 'System & Institutional Settings', category: 'Configuration' },
};

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onMobileMenuToggle,
  isDbConnected,
  onNavigate,
  currentUser,
  onLogout,
}) => {
  const current = routeTitles[currentRoute] || { title: 'LibTrack', category: 'System' };
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && onNavigate) {
      onNavigate('inventory');
    }
  };

  return (
    <header className="h-16 backdrop-blur-2xl bg-[#0A0E1A]/90 border-b border-white/[0.08] sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-glass">
      {/* Left: Mobile Toggle & Breadcrumb / Page Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            <span>LibTrack</span>
            <span aria-hidden="true" className="text-slate-600">/</span>
            <span className="truncate text-emerald-400 font-semibold">{current.category}</span>
          </div>
          <h1 className="font-display text-base sm:text-lg font-bold text-white truncate tracking-tight">
            {current.title}
          </h1>
        </div>
      </div>

      {/* Center: Search entry point */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Quick search catalog or press / to jump to inventory..."
            className="w-full h-9 pl-9 pr-12 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all shadow-inner font-sans"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
              ↵
            </kbd>
          </div>
        </form>
      </div>

      {/* Right Controls: Database Health, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Database Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            isDbConnected
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
          title={isDbConnected ? 'MongoDB connected and operational' : 'MongoDB offline / pending reconnect'}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
          <span className="hidden sm:inline font-mono text-[11px]">
            {isDbConnected ? 'MONGO ONLINE' : 'DB OFFLINE'}
          </span>
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isDbConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => onNavigate?.('notifications')}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all active:scale-95"
          aria-label="View notifications"
          title="Notification center"
        >
          <Bell className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-obsidian-surface shadow-glow-emerald" />
        </button>

        {/* User Account / Librarian Profile */}
        <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-white/10">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-display font-bold text-xs ring-2 ring-emerald-500/30 shadow-glow-emerald flex-shrink-0"
            title={`Active Sender: ${currentUser?.email || 'admin@libtrack.edu'}`}
          >
            {currentUser?.name
              ? currentUser.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'LA'}
          </div>
          <div className="hidden lg:flex flex-col text-left max-w-[150px]">
            <span className="text-xs font-bold text-white leading-tight truncate">
              {currentUser?.name || 'Chief Librarian'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono truncate" title={`Emails dispatched from: ${currentUser?.email || 'admin@libtrack.edu'}`}>
              {currentUser?.email || 'admin@libtrack.edu'}
            </span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all ml-0.5"
              title={`Sign out (${currentUser?.email || 'Admin'})`}
              aria-label="Sign out of librarian session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
