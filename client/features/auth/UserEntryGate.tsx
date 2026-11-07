import { useEffect, type ReactNode } from 'react';
import { useApp } from '../../app/AppContext';
import { AuthExperience } from './AuthExperience';
import { navigateAuth, useAuthStep } from './routing';
import { BUSINESS_TOKEN_KEY } from '../../router/routes';

/** A resolved restore attempt is not itself permission to mount private UI. */
export function UserEntryGate({ children }: { children: ReactNode }) {
  const app = useApp();
  const step = useAuthStep();
  const ar = app.locale === 'ar';
  let credentialIsCurrent = false;
  try { credentialIsCurrent = Boolean(app.authToken && localStorage.getItem(BUSINESS_TOKEN_KEY) === app.authToken); }
  catch { /* Unavailable credential storage must never admit private UI. */ }
  const verified = credentialIsCurrent && Boolean(app.authUser);
  const required = verified
    ? app.authUser!.accountStatus !== 'ACTIVE' ? 'restricted'
      : !app.authUser!.profileComplete && app.authUser!.role !== 'ADMIN' ? 'profile' : null
    : 'login';
  const target = required === 'login' && step && !['interests', 'restricted'].includes(step) ? step : required;
  useEffect(() => {
    if (!app.authSessionReady || app.authSessionError) return;
    if (target && step !== target) navigateAuth(target, true);
  }, [app.authSessionReady, app.authSessionError, target, step]);
  if (!app.authSessionReady) return <main className="auth-page" dir={ar ? 'rtl' : 'ltr'}><p role="status">{ar ? 'جارٍ التحقق من الجلسة…' : 'Verifying your session…'}</p></main>;
  if (app.authSessionError) return <main className="auth-page" dir={ar ? 'rtl' : 'ltr'}><section><p role="alert">{ar ? 'تعذر التحقق من الجلسة. حاول مرة أخرى.' : 'Unable to verify your session. Please try again.'}</p><button type="button" onClick={() => void app.retryAuthSession()}>{ar ? 'إعادة المحاولة' : 'Retry'}</button><button type="button" onClick={() => void app.handleLogout()}>{ar ? 'تسجيل الخروج' : 'Sign out'}</button></section></main>;
  if (target) return <AuthExperience step={target} />;
  // Legacy interests URLs are redirect-only; AuthFlow resolves the real saved return.
  if (step) return <AuthExperience step={step === 'interests' ? 'login' : step} />;
  return children;
}
