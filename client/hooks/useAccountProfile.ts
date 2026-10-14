import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountProfile, UpdateAccountProfile } from '@shared/accountProfile';
import { isAuthNicknameValid, type AuthAvatar, type AuthUser } from '@shared/auth';
import { apiUrl } from '@shared/apiClient';
import { businessApi } from '../services/businessApi';
import { authApi } from '../features/auth/api';
import { AUTH_SESSION_EVENT } from '../features/auth/session';
import { avatarPath, validAccountProfile, validBio, validSystemAvatar } from '../components/account-profile/model';

type Session = { token: string | null; owner?: string; enabled: boolean; epoch: number; account: number };
type Draft = { username: string; bio: string; avatar?: AuthAvatar };
type Cache = { owner?: string; account: number; profile: AccountProfile | null; draft: Draft; dirty: boolean; loading: boolean; saving: boolean; uploading: boolean; saved: boolean; error: string };
const empty = (session?: Session): Cache => ({ owner: session?.owner, account: session?.account ?? -1, profile: null, draft: { username: '', bio: '' }, dirty: false, loading: false, saving: false, uploading: false, saved: false, error: '' });

export function useAccountProfile(token: string | null, ownerId: string | undefined, enabled: boolean, active: boolean,
  onSaved: (user: AuthUser, isCurrent: () => boolean) => boolean) {
  const [cache, setCache] = useState<Cache>(empty);
  const cacheRef = useRef(cache); cacheRef.current = cache;
  const identity = useRef<Session>({ token: null, owner: undefined, enabled: false, epoch: 0, account: 0 });
  const props = useRef({ token, owner: ownerId, enabled, active });
  const mounted = useRef(false), sequence = useRef(0);
  const draftRevision = useRef(0);
  const saveLock = useRef<object | null>(null), uploadLock = useRef<object | null>(null);
  const publish = useRef(onSaved); publish.current = onSaved;
  const advance = (access: string | null, owner: string | undefined, eligible: boolean) => {
    const previous = identity.current;
    if (previous.token === access && previous.owner === owner && previous.enabled === eligible) return;
    const changed = previous.owner !== owner || Boolean(previous.token) !== Boolean(access) || previous.enabled !== eligible;
    identity.current = { token: access, owner, enabled: eligible, epoch: previous.epoch + 1, account: previous.account + Number(changed) };
    sequence.current++;
    if (changed) { saveLock.current = null; uploadLock.current = null; }
  };
  const previousProps = useRef<{ token: string | null; owner?: string; enabled: boolean } | null>(null);
  if (!previousProps.current || previousProps.current.token !== token || previousProps.current.owner !== ownerId || previousProps.current.enabled !== enabled) {
    previousProps.current = { token, owner: ownerId, enabled }; advance(token, ownerId, enabled);
  }
  props.current = { token, owner: ownerId, enabled, active };
  const sameAccount = useCallback((session: Session) => mounted.current && Boolean(identity.current.token) && identity.current.enabled
    && identity.current.owner === session.owner && identity.current.account === session.account, []);
  const current = useCallback((session: Session) => sameAccount(session) && identity.current.epoch === session.epoch && identity.current.token === session.token, [sameAccount]);
  const ownCache = (old: Cache, session: Session) => old.owner === session.owner && old.account === session.account ? old : empty(session);

  const reload = useCallback(async (discard = false) => {
    const session = { ...identity.current };
    if (!mounted.current || !session.token || !session.owner || !session.enabled || saveLock.current || uploadLock.current) return;
    const version = ++sequence.current;
    const startedDraft = draftRevision.current;
    setCache(old => ({ ...ownCache(old, session), loading: true, error: '' }));
    try {
      const result = await businessApi.getAccountProfile(session.token);
      if (!current(session) || sequence.current !== version) return;
      if (!validAccountProfile(result, session.owner)) throw Error('PROFILE_RESPONSE_INVALID');
      setCache(previous => {
        const old = ownCache(previous, session);
        if (old.dirty && old.profile && (!discard || startedDraft !== draftRevision.current)) return { ...old, loading: false, error: '' };
        return { ...old, profile: result, draft: { username: result.user.username, bio: result.bio }, dirty: false, loading: false, saved: false, error: '' };
      });
    } catch (error) {
      if (current(session) && sequence.current === version) setCache(old => ({ ...old, loading: false, error: error instanceof Error ? error.message : 'PROFILE_LOAD_FAILED' }));
    }
  }, [current]);

  useEffect(() => {
    mounted.current = true;
    const sessionChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const eligible = Boolean(detail?.user && (detail.user.profileComplete || detail.user.role === 'ADMIN'));
      advance(detail?.token || null, detail?.user?.id || undefined, eligible);
      const session = { ...identity.current };
      setCache(old => ownCache(old, session));
      if (session.token && session.owner && props.current.active) void reload();
    };
    window.addEventListener(AUTH_SESSION_EVENT, sessionChanged);
    return () => { mounted.current = false; identity.current.epoch++; identity.current.account++; sequence.current++; saveLock.current = null; uploadLock.current = null; window.removeEventListener(AUTH_SESSION_EVENT, sessionChanged); };
  }, [reload]);
  useEffect(() => {
    const session = { ...identity.current };
    setCache(old => enabled && token ? ownCache(old, session) : empty(session));
    if (enabled && token && ownerId && active) void reload();
    const focus = () => { if (props.current.active && document.visibilityState !== 'hidden') void reload(); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [token, ownerId, enabled, active, reload]);

  const change = useCallback((field: 'username' | 'bio', value: string) => {
    const session = { ...identity.current };
    if (!sameAccount(session) || saveLock.current || uploadLock.current) return;
    draftRevision.current++;
    setCache(old => ({ ...ownCache(old, session), draft: { ...ownCache(old, session).draft, [field]: value }, dirty: true, saved: false, error: '' }));
  }, [sameAccount]);
  const chooseAvatar = useCallback((id: string) => {
    const session = { ...identity.current };
    if (!sameAccount(session) || saveLock.current || uploadLock.current || !validSystemAvatar(id)) return;
    draftRevision.current++;
    setCache(old => ({ ...ownCache(old, session), draft: { ...ownCache(old, session).draft, avatar: { type: 'system', value: id } }, dirty: true, saved: false, error: '' }));
  }, [sameAccount]);
  const uploadAvatar = useCallback(async (image: string): Promise<void> => {
    const session = { ...identity.current };
    if (!sameAccount(session) || !session.token || saveLock.current || uploadLock.current) throw Error('PROFILE_SESSION_CHANGED');
    const operation = {}; uploadLock.current = operation; sequence.current++;
    setCache(old => ({ ...old, uploading: true, loading: false, saved: false, error: '' }));
    try {
      const result = await authApi.uploadAvatar({ image }, session.token);
      if (!sameAccount(session)) throw Error('PROFILE_SESSION_CHANGED');
      if (result?.avatar?.type !== 'upload' || !/^[a-f0-9]{48}$/.test(result.avatar.value)
        || result.url !== apiUrl(avatarPath(result.avatar))) throw Error('PROFILE_RESPONSE_INVALID');
      draftRevision.current++;
      setCache(old => ({ ...old, draft: { ...old.draft, avatar: result.avatar }, dirty: true, error: '' }));
    } catch (error) {
      if (sameAccount(session)) setCache(old => ({ ...old, error: error instanceof Error ? error.message : 'PROFILE_UPLOAD_FAILED' }));
      throw error;
    } finally {
      if (uploadLock.current === operation) { uploadLock.current = null; if (sameAccount(session)) setCache(old => ({ ...old, uploading: false })); }
    }
  }, [sameAccount]);

  const save = useCallback(async (): Promise<boolean> => {
    const session = { ...identity.current }, old = cacheRef.current;
    if (!sameAccount(session) || !session.token || !session.owner || saveLock.current || uploadLock.current
      || old.owner !== session.owner || old.account !== session.account || !old.profile) return false;
    const username = old.draft.username.trim(), bio = old.draft.bio.trim();
    if (!isAuthNicknameValid(username) || !validBio(bio)) { setCache(previous => ({ ...previous, error: 'PROFILE_INPUT_INVALID', saved: false })); return false; }
    const input: UpdateAccountProfile = { username, bio, revision: old.profile.revision, ...(old.draft.avatar ? { avatar: old.draft.avatar } : {}) };
    const operation = {}; saveLock.current = operation; sequence.current++;
    setCache(previous => ({ ...previous, saving: true, loading: false, error: '', saved: false }));
    try {
      const result = await businessApi.updateAccountProfile(session.token, input);
      if (!sameAccount(session)) return false;
      if (!validAccountProfile(result, session.owner) || result.user.username !== username || result.bio !== bio
        || input.avatar && result.user.avatar !== avatarPath(input.avatar)) throw Error('PROFILE_RESPONSE_INVALID');
      if (!publish.current(result.user, () => sameAccount(session))) throw Error('PROFILE_SESSION_CHANGED');
      if (!sameAccount(session)) return false;
      sequence.current++;
      setCache(previous => ({ ...previous, profile: result, draft: { username: result.user.username, bio: result.bio }, dirty: false, saved: true, error: '' }));
      return true;
    } catch (error) {
      if (sameAccount(session)) setCache(previous => ({ ...previous, error: error instanceof Error ? error.message : 'PROFILE_SAVE_FAILED' }));
      return false;
    } finally {
      if (saveLock.current === operation) { saveLock.current = null; if (sameAccount(session)) setCache(previous => ({ ...previous, saving: false })); }
    }
  }, [sameAccount]);
  const visible = enabled && token && ownerId && identity.current.owner === ownerId && identity.current.token === token
    && cache.owner === ownerId && cache.account === identity.current.account ? cache : empty();
  const avatarPreview = visible.draft.avatar ? apiUrl(avatarPath(visible.draft.avatar)) : visible.profile?.user.avatar ? apiUrl(visible.profile.user.avatar) : null;
  return { ...visible, account: identity.current.account, avatarPreview, change, chooseAvatar, uploadAvatar, save, reload };
}
