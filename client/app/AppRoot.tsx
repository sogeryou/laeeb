import { AppProvider } from './AppContext';
import { AdminRoute } from './AdminRoute';
import { AppShell } from './AppShell';
import { useEffect } from 'react';
import { useApp } from './AppContext';
import { navigateAuth, rememberReturn } from '../features/auth/routing';
import { UserEntryGate } from '../features/auth/UserEntryGate';

const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

function Routes() {
  const app = useApp();
  useEffect(() => {
    if (!isAdminPath && app.showAuthModal) {
      const target = app.pendingNavigationRef.current;
      rememberReturn(target?.view || app.currentView, target?.data || app.selectedEPal);
      navigateAuth(app.authMode === 'REGISTER' ? 'register' : 'login');
      app.setShowAuthModal(false);
    }
  }, [app.showAuthModal, app.authMode]);
  return isAdminPath ? <AdminRoute /> : <UserEntryGate><AppShell /></UserEntryGate>;
}

export default function AppRoot() {
  return (
    <AppProvider>
      <Routes />
    </AppProvider>
  );
}
