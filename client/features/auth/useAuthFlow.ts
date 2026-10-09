import { useEffect, useRef, useState } from 'react';
import type { AuthAvatar, AuthConfig, AuthEmailPurpose, AuthSession } from '@shared/auth';
import { isAuthNicknameValid } from '@shared/auth';
import { useApp } from '../../app/AppContext';
import { authApi, AuthApiError } from './api';
import { authCopy, errorCopy } from './copy';
import { navigateAuth, type AuthStep } from './routing';
import { storeSession } from './session';
import { authPresentation } from './config';

/** Step state and side effects live here; components are replaceable without changing the HTTP contract. */
export function useAuthFlow(step: AuthStep) {
  const app = useApp();
  const language = app.locale === 'ar' ? 'ar' : 'en';
  const c = authCopy[language];
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  const [purpose, setPurpose] = useState<AuthEmailPurpose>('login');
  const [grant, setGrant] = useState<{ token: string; expiresAt: number } | null>(null);
  const [resetGrant, setResetGrant] = useState<{ token: string; expiresAt: number } | null>(null);
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'' | 'F' | 'M' | 'U'>('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState<AuthAvatar | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const initializedUser = useRef('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const loadConfig = async () => {
    try { const value = await authApi.config(); if (mounted.current) { setConfig(value); setError(''); } }
    catch (e) { if (mounted.current) setError(errorCopy((e as Error).message, c)); }
  };
  useEffect(() => { void loadConfig(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (app.authUser && initializedUser.current !== app.authUser.id) {
      initializedUser.current = app.authUser.id;
      setUsername(app.authUser.username); setGender(app.authUser.gender || ''); setTags(app.authUser.tags || []);
    }
  }, [app.authUser]);

  const enter = (next: AuthStep, replace = false) => { setError(''); setNotice(''); navigateAuth(next, replace); };
  const accept = (session: AuthSession) => {
    storeSession(session);
    setPassword(''); setCode(''); setDevelopmentCode('');
    if (session.user.accountStatus !== 'ACTIVE') enter('restricted', true);
    else if (!session.user.profileComplete && session.user.role !== 'ADMIN') enter('profile', true);
    else app.finishAuthSession(session, false);
  };

  useEffect(() => {
    if (!app.authSessionReady || busy) return;
    if (app.authUser && ['login','register'].includes(step)) {
      if (app.authUser.accountStatus !== 'ACTIVE') navigateAuth('restricted', true);
      else if (!app.authUser.profileComplete && app.authUser.role !== 'ADMIN') navigateAuth('profile', true);
      else app.finishAuthSession({ token: app.authToken!, user: app.authUser }, false);
    }
    if (step === 'profile' && !app.authUser && !grant) navigateAuth('register', true);
    if (step === 'interests' && !app.authUser) navigateAuth('login', true);
    if (step === 'verify' && !email) navigateAuth('login', true);
    if (step === 'reset-password' && !resetGrant) navigateAuth('forgot-password', true);
    if (step === 'restricted' && !app.authUser) navigateAuth('login', true);
  }, [step, app.authSessionReady, app.authUser, busy, grant, resetGrant]);

  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (e) {
      if (mounted.current) {
        const failure = e as AuthApiError;
        setError(errorCopy(failure.code || failure.message, c));
        if (failure.retryAfterSec) setCooldownUntil(Date.now() + failure.retryAfterSec * 1000);
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };

  const send = (intent: AuthEmailPurpose = purpose) => run(async () => {
    const result = await authApi.send({ email: email.trim(), purpose: intent, locale: language, deviceId: app.deviceId || undefined });
    setPurpose(intent); setCode(''); setDevelopmentCode(result.developmentCode || '');
    setCooldownUntil(Date.now() + result.cooldownSec * 1000); setGrant(null); setResetGrant(null); enter('verify');
  });
  const verify = () => run(async () => {
    const result = await authApi.verify({ email: email.trim(), code, purpose, deviceId: app.deviceId || undefined });
    setCode(''); setDevelopmentCode('');
    if (result.kind === 'session') accept(result.session);
    if (result.kind === 'registration') { setGrant({ token: result.registrationToken, expiresAt: result.expiresAt }); setEmail(result.email); enter('profile'); }
    if (result.kind === 'reset') { setResetGrant({ token: result.resetToken, expiresAt: result.expiresAt }); enter('reset-password'); }
  });
  const login = () => run(async () => accept(await authApi.login(email.trim(), password, app.deviceId || undefined)));
  const validBirthDate = !!config && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birthDate <= config.maxBirthDate &&
    Number.isFinite(Date.parse(birthDate)) && new Date(birthDate).toISOString().slice(0, 10) === birthDate;
  const profileValid = !!avatar && !!gender && !!consent && validBirthDate && isAuthNicknameValid(username);
  const completeProfile = () => run(async () => {
    if (!profileValid || !config) return;
    const profile = { username: username.trim(), gender: gender as 'F' | 'M' | 'U', birthDate, avatar: avatar!, acceptedTerms: true as const, termsVersion: config.termsVersion, privacyVersion: config.privacyVersion };
    if (app.authToken && app.authUser) {
      const user = await authApi.completeProfile(profile, app.authToken);
      storeSession({ token: app.authToken, user });
    } else {
      if (!grant || grant.expiresAt <= Date.now()) throw new AuthApiError('AUTH_GRANT_EXPIRED', 401);
      const session = await authApi.register({ ...profile, registrationToken: grant.token });
      storeSession(session); setGrant(null);
    }
    setBirthDate(''); enter('interests');
  });
  const chooseAvatar = (value: string) => {
    const item = authPresentation.avatars.find(a => a.id === value);
    if (item) { setAvatar({ type: 'system', value }); setAvatarUrl(item.url); }
  };
  const uploadAvatar = async (image: string) => {
    const result = await authApi.uploadAvatar({ image, ...(grant ? { registrationToken: grant.token } : {}) }, app.authToken || undefined);
    setAvatar(result.avatar); setAvatarUrl(result.url);
  };
  const finish = (skip = false) => run(async () => {
    if (!app.authToken || !app.authUser) return;
    if (!skip) await authApi.preferences(tags, app.authToken);
    app.finishAuthSession({ token: app.authToken, user: { ...app.authUser, tags: skip ? app.authUser.tags : tags } }, false);
  });
  const toggleTag = (id: string) => {
    setError('');
    if (tags.includes(id)) setTags(tags.filter(t => t !== id));
    else if (tags.length < authPresentation.maxTags) setTags([...tags, id]);
    else setError(c.maxTags);
  };
  const reset = () => run(async () => {
    if (password !== confirmPassword) { setError(c.mismatch); return; }
    if (!resetGrant || resetGrant.expiresAt <= Date.now()) throw new AuthApiError('AUTH_GRANT_EXPIRED', 401);
    await authApi.reset(resetGrant.token, password); setPassword(''); setConfirmPassword(''); setResetGrant(null); enter('login', true); setNotice(c.resetComplete);
  });
  const back = () => {
    if (busy) return;
    if (step === 'verify') { setCode(''); setDevelopmentCode(''); enter(purpose === 'reset' ? 'forgot-password' : purpose); }
    else if (step === 'interests') enter('profile');
    else if (step === 'profile' && !app.authUser) { setGrant(null); enter('register'); }
    else if (['forgot-password','reset-password'].includes(step)) enter('login');
    else navigateAuth(null, true);
  };
  return { app, language, c, config, loadConfig, email, setEmail, code, setCode, password, setPassword, confirmPassword, setConfirmPassword,
    passwordMode, setPasswordMode, purpose, username, setUsername, gender, setGender, birthDate, setBirthDate, avatar, avatarUrl, consent, setConsent,
    tags, toggleTag, busy, error, notice, developmentCode, cooldown: Math.max(0, Math.ceil((cooldownUntil - now) / 1000)),
    profileValid, validBirthDate, enter, send, verify, login, completeProfile, chooseAvatar, uploadAvatar, finish, reset, back };
}
export type AuthFlow = ReturnType<typeof useAuthFlow>;
