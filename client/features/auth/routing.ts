import { useEffect, useState } from 'react';
import type { View } from '../../router/routes';

export const AUTH_STEPS = ['login', 'register', 'verify', 'profile', 'interests', 'forgot-password', 'reset-password', 'restricted'] as const;
export type AuthStep = typeof AUTH_STEPS[number];
const RETURN_KEY = 'le3eb_auth_return';
const allowedViews: View[] = ['HOME','COMMUNITY','GAME_DETAIL','PROFILE','ORDER_CONFIRM','IM','IM_DETAIL','ME','WALLET','MY_ORDERS','PLAYER_CENTER','SETTINGS','POST_DETAIL','APPLY_PLAYER'];

export function readAuthStep(path = window.location.pathname): AuthStep | null {
  if (!path.startsWith('/auth/')) return null;
  const step = path.split('/')[2];
  return AUTH_STEPS.includes(step as AuthStep) ? step as AuthStep : 'login';
}
export function navigateAuth(step: AuthStep | null, replace = false) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', step ? `/auth/${step}` : '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function useAuthStep() {
  const [step, setStep] = useState(readAuthStep);
  useEffect(() => { const update = () => setStep(readAuthStep()); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update); }, []);
  return step;
}
export function rememberReturn(view: View, data?: any) {
  if (!allowedViews.includes(view)) return;
  // Only public entity identifiers survive a reload; message text and transaction data never enter URLs/storage.
  sessionStorage.setItem(RETURN_KEY, JSON.stringify({ view, entityId: data?.epal?.id || data?.post?.id || data?.id }));
}
export function takeReturn(): { view: View; entityId?: string } | null {
  const raw = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY);
  try { const value = JSON.parse(raw || 'null'); return value && allowedViews.includes(value.view) && (!value.entityId || typeof value.entityId === 'string') ? value : null; } catch { return null; }
}
