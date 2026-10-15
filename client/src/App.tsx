import { useState, useEffect, useCallback } from 'react';
import { NavRoute, AuthUser } from './types';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { MembersPage } from './pages/MembersPage';
import { IssueReturnPage } from './pages/IssueReturnPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BorrowingHistoryPage } from './pages/BorrowingHistoryPage';
import { DueSoonPage } from './pages/DueSoonPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { fetchHealth, logoutAdmin } from './services/api';

const VALID_ROUTES: NavRoute[] = [
  'overview',
  'inventory',
  'members',
  'issue-return',
  'bulk-import',
  'history',
  'due-soon',
  'notifications',
  'analytics',
  'settings',
];

function getRouteFromHash(): NavRoute {
  const hash = window.location.hash.replace('#', '').trim() as NavRoute;
  if (VALID_ROUTES.includes(hash)) {
    return hash;
  }
  return 'overview';
}

function getInitialUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('libtrack_admin_user') || sessionStorage.getItem('libtrack_admin_user');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getInitialUser);
  const [currentRoute, setCurrentRoute] = useState<NavRoute>(getRouteFromHash);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  // Sync route changes to browser history hash
  const handleNavigate = useCallback((newRoute: NavRoute) => {
    setCurrentRoute(newRoute);
    if (window.location.hash.replace('#', '') !== newRoute) {
      window.location.hash = newRoute;
    }
  }, []);

  // Listen for browser Back/Forward navigation (hashchange & popstate)
  useEffect(() => {
    const handleHashChange = () => {
      const route = getRouteFromHash();
      setCurrentRoute(route);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const checkHealth = useCallback(async () => {
    const res = await fetchHealth();
    if (res.success && res.data.database.connected) {
      setIsDbConnected(true);
    } else {
      setIsDbConnected(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Re-check database status every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const renderContent = () => {
    switch (currentRoute) {
      case 'overview':
        return <DashboardPage onRefreshHealth={checkHealth} onNavigate={handleNavigate} />;
      case 'inventory':
        return <InventoryPage />;
      case 'members':
        return <MembersPage />;
      case 'issue-return':
        return <IssueReturnPage />;
      case 'bulk-import':
        return <BulkImportPage />;
      case 'history':
        return <BorrowingHistoryPage onNavigate={handleNavigate} />;
      case 'due-soon':
        return <DueSoonPage onNavigate={handleNavigate} />;
      case 'notifications':
        return <NotificationsPage />;
      case 'analytics':
        return <AnalyticsPage onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <PlaceholderPage route={currentRoute} />;
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await logoutAdmin();
    } catch {}
    localStorage.removeItem('libtrack_admin_user');
    sessionStorage.removeItem('libtrack_admin_user');
    setCurrentUser(null);
  }, []);

  // If unauthenticated, present dedicated Obsidian Space LoginPage
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <AppShell
      currentRoute={currentRoute}
      onRouteChange={handleNavigate}
      isDbConnected={isDbConnected}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AppShell>
  );
}

export default App;

