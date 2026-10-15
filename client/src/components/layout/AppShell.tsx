import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NavRoute, AuthUser } from '../../types';

interface AppShellProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  isDbConnected: boolean;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  isDbConnected,
  currentUser,
  onLogout,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#080C14] text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans relative overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={onRouteChange}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentRoute={currentRoute}
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          isDbConnected={isDbConnected}
          onNavigate={onRouteChange}
          currentUser={currentUser}
          onLogout={onLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
