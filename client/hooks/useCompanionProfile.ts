import { useCallback, useEffect, useRef, useState } from 'react';
import type { ManagedCompanionProfile, UpdateCompanionProfile } from '@shared/companionManagement';
import { businessApi } from '../services/businessApi';
import { AUTH_SESSION_EVENT } from '../features/auth/session';

export type ServiceDraft = { id: string; name: string; price: string; unit: string };
export type ProfileDraft = { gameName: string; intro: string; hourlyRate: string; services: ServiceDraft[] };
type State = { owner: string; draft: ProfileDraft | null; source: ManagedCompanionProfile | null; loading: boolean; busy: boolean; error: string; conflict: boolean; dirty: boolean };
const empty = (owner = ''): State => ({ owner, draft: null, source: null, loading: false, busy: false, error: '', conflict: false, dirty: false });
const fromProfile = (profile: ManagedCompanionProfile): ProfileDraft => ({ gameName: profile.gameName, intro: profile.intro, hourlyRate: String(profile.hourlyRate), services: profile.services.map(s => ({ id: s.id, name: s.name, price: String(s.unitPrice), unit: s.unit })) });
const price = (value: string) => /^(?:\d+)(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 10000;

export function validateCompanionDraft(draft: ProfileDraft | null): string {
  if (!draft) return 'missing';
  if (!draft.gameName.trim() || draft.gameName.length > 100) return 'gameName';
  if (!price(draft.hourlyRate)) return 'hourlyRate';
  if (!draft.intro.trim() || draft.intro.length > 2000) return 'intro';
  if (draft.services.length > 20) return 'services';
  if (draft.services.some(s => !/^[A-Za-z0-9_-]{1,100}$/.test(s.id) || !s.name.trim() || s.name.length > 100 || !price(s.price) || !['hr', 'match'].includes(s.unit))) return 'services';
  if (new Set(draft.services.map(s => s.id)).size !== draft.services.length) return 'services';
  return '';
}

export function useCompanionProfile(token: string | null, owner: string | undefined) {
  const ownerKey = token && owner ? owner : '';
  const [state, setState] = useState<State>(() => empty(ownerKey));
  const identity = useRef({ token, owner: ownerKey, epoch: 0, accountEpoch: 0 });
  if (identity.current.token !== token || identity.current.owner !== ownerKey) {
    const changed = identity.current.owner !== ownerKey;
    identity.current = { token, owner: ownerKey, epoch: identity.current.epoch + 1, accountEpoch: identity.current.accountEpoch + (changed ? 1 : 0) };
  }
  const mounted = useRef(true);
  const invalidatedOwner = useRef<string | null>(null);
  if (ownerKey && ownerKey !== invalidatedOwner.current) invalidatedOwner.current = null;
  const sequence = useRef(0);
  const lock = useRef<{ owner: string; accountEpoch: number } | null>(null);
  const editVersion = useRef(0);
  const valid = useCallback((session: typeof identity.current) => mounted.current && invalidatedOwner.current !== session.owner && identity.current.accountEpoch === session.accountEpoch && identity.current.owner === session.owner && !!session.owner, []);

  useEffect(() => {
    mounted.current = true;
    const invalidate = (event: Event) => {
      const session = (event as CustomEvent).detail;
      if (session?.user?.id !== identity.current.owner || !session?.token) {
        invalidatedOwner.current = identity.current.owner;
        identity.current.accountEpoch++;
        identity.current.epoch++;
        sequence.current++;
        lock.current = null;
        setState(empty());
      } else if (invalidatedOwner.current === identity.current.owner) {
        invalidatedOwner.current = null;
        identity.current.token = session.token;
        identity.current.epoch++;
        sequence.current++;
        setState(empty(identity.current.owner));
      } else if (session.token !== identity.current.token) {
        identity.current.token = session.token;
        identity.current.epoch++;
        sequence.current++;
      }
    };
    window.addEventListener(AUTH_SESSION_EVENT, invalidate);
    return () => { mounted.current = false; sequence.current++; window.removeEventListener(AUTH_SESSION_EVENT, invalidate); };
  }, []);

  const reload = useCallback(async (discard = false, sessionRefresh = false) => {
    const session = { ...identity.current };
    if (!session.token || !session.owner) return;
    if (!sessionRefresh && lock.current?.owner === session.owner && lock.current.accountEpoch === session.accountEpoch) return;
    const seq = ++sequence.current;
    setState(old => ({ ...(old.owner === session.owner ? old : empty(session.owner)), loading: true, error: old.conflict ? old.error : '' }));
    try {
      const profile = await businessApi.getManagedCompanionProfile(session.token);
      if (!valid(session) || seq !== sequence.current) return;
      if (profile.userId !== session.owner) throw new Error('COMPANION_FORBIDDEN');
      setState(old => ({ ...old, owner: session.owner, source: !discard && old.dirty ? old.source : profile, draft: discard || !old.dirty ? fromProfile(profile) : old.draft, loading: false, error: !discard && old.conflict ? old.error : '', conflict: !discard && old.conflict, dirty: discard ? false : old.dirty }));
    } catch (error) {
      if (valid(session) && seq === sequence.current) setState(old => ({ ...old, owner: session.owner, loading: false, error: (error as Error).message || 'COMPANION_LOAD_FAILED' }));
    }
  }, [valid]);

  useEffect(() => {
    if (!ownerKey) { setState(empty()); return; }
    void reload(false, true);
  }, [ownerKey, token, reload]);

  const edit = useCallback((update: (draft: ProfileDraft) => ProfileDraft) => {
    editVersion.current++;
    setState(old => old.owner === identity.current.owner && old.draft ? { ...old, draft: update(old.draft), dirty: true, error: old.conflict ? old.error : '' } : old);
  }, []);
  const save = useCallback(async (): Promise<boolean> => {
    const session = { ...identity.current };
    if (invalidatedOwner.current === session.owner || (lock.current?.owner === session.owner && lock.current.accountEpoch === session.accountEpoch) || !session.token || !session.owner) return false;
    const current = state.owner === session.owner ? state : empty();
    if (!current.source || !current.draft) return false;
    const validation = validateCompanionDraft(current.draft);
    if (validation) { setState(old => ({ ...old, error: `VALIDATION_${validation}` })); return false; }
    const operation = { owner: session.owner, accountEpoch: session.accountEpoch };
    lock.current = operation;
    sequence.current++;
    const draft = current.draft;
    const version = editVersion.current;
    setState(old => ({ ...old, busy: true, loading: false, error: '' }));
    const input: UpdateCompanionProfile = { gameName: draft.gameName.trim(), intro: draft.intro.trim(), hourlyRate: Number(draft.hourlyRate), updatedAt: current.source.updatedAt, services: draft.services.map(s => ({ id: s.id, name: s.name.trim(), unitPrice: Number(s.price), unit: s.unit as 'hr' | 'match' })) };
    try {
      const saved = await businessApi.updateManagedCompanionProfile(session.token, input);
      if (!valid(session)) return false;
      if (saved.userId !== session.owner || saved.id !== current.source.id) throw new Error('COMPANION_FORBIDDEN');
      sequence.current++;
      setState(old => ({ ...old, source: saved, draft: editVersion.current === version ? fromProfile(saved) : old.draft, dirty: editVersion.current !== version, busy: false, loading: false, error: '', conflict: false }));
      return true;
    } catch (error) {
      if (valid(session)) { const code = (error as Error).message || 'COMPANION_SAVE_FAILED'; setState(old => ({ ...old, busy: false, error: code, conflict: old.conflict || code === 'COMPANION_PROFILE_STALE' })); }
      return false;
    } finally { if (lock.current === operation) lock.current = null; }
  }, [state, valid]);

  return { ...state.owner === ownerKey ? state : empty(ownerKey), reload, edit, save };
}
