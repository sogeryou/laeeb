import { AppProvider } from './AppContext';
import { AdminRoute } from './AdminRoute';
import { AppShell } from './AppShell';
import { useEffect } from 'react';
import { useApp } from './AppContext';
import { AuthExperience } from '../features/auth/AuthExperience';
import { navigateAuth, rememberReturn, useAuthStep } from '../features/auth/routing';

const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

function Routes() {
  const app = useApp();
  const step = useAuthStep();
  useEffect(() => {
    if (!isAdminPath && app.showAuthModal) {
      const target = app.pendingNavigationRef.current;
      rememberReturn(target?.view || app.currentView, target?.data || app.selectedEPal);
      navigateAuth(app.authMode === 'REGISTER' ? 'register' : 'login');
      app.setShowAuthModal(false);
    }
  }, [app.showAuthModal, app.authMode]);
  useEffect(() => {
    if (!isAdminPath && !step && app.authSessionReady && app.authUser?.role !== 'ADMIN' && app.authUser?.profileComplete === false) navigateAuth('profile', true);
  }, [step, app.authSessionReady, app.authUser]);
  return isAdminPath ? <AdminRoute /> : step ? <AuthExperience step={step} /> : <AppShell />;
}

export default function AppRoot() {
  return (
    <AppProvider>
      <Routes />
    </AppProvider>
  );
}
