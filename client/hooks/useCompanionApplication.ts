import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CompanionApplication, SubmitCompanionApplication } from '@shared/companionApplications';
import { businessApi } from '../services/businessApi';
import { AUTH_SESSION_EVENT } from '../features/auth/session';
import { applicationPayload, draftFromApplication, newApplicationAttempt, type ApplicationDraft } from '../components/application/applicationModel';

export type WizardDraft = ApplicationDraft & {
  screenshots: string[]; voiceUrl: string; coverUrl: string;
  promotion: { type: 'NONE' | 'FIRST_ORDER_DISCOUNT' | 'DISCOUNT' | 'BUY_X_GET_Y'; value: number; buyX: number; getY: number; limitType: 'NONE' | 'TIME' | 'QUANTITY'; limitValue: number };
};

export const emptyApplicationDraft = (): WizardDraft => ({
  gameId: '', rank: '', mainPosition: '', server: '', platform: '', style: '', intro: '', screenshots: [],
  voiceUrl: '', coverUrl: '', coverIntro: '', serviceName: '', price: 0, unit: 'Game',
  promotion: { type: 'NONE', value: 0, buyX: 0, getY: 0, limitType: 'NONE', limitValue: 0 },
});

type StoredAttempt = { input: SubmitCompanionApplication };
type StoredDraft = { draft: WizardDraft; attempt: StoredAttempt | null };
type PrivateState = { owner: string | null; draft: WizardDraft; application: CompanionApplication | null; loading: boolean; error: string; busy: boolean; editing: boolean; attempt: StoredAttempt | null };

const memoryDrafts = new Map<string, StoredDraft | null>();
const storageKey = (owner: string) => `companion-application:${owner}`;

function readDraft(owner: string): StoredDraft | null {
  if (memoryDrafts.has(owner)) return memoryDrafts.get(owner)!;
  try { return JSON.parse(sessionStorage.getItem(storageKey(owner)) || 'null') as StoredDraft | null; }
  catch { return null; }
}

function writeDraft(owner: string, value: StoredDraft) {
  memoryDrafts.set(owner, value);
  try { sessionStorage.setItem(storageKey(owner), JSON.stringify(value)); } catch { /* Memory retains the attempt. */ }
}

function removeDraft(owner: string) {
  memoryDrafts.set(owner, null);
  try { sessionStorage.removeItem(storageKey(owner)); } catch { /* The confirmed state remains in memory. */ }
}

function hydratedState(owner: string): PrivateState {
  const stored = readDraft(owner);
  const draft = stored?.draft
    ? { ...emptyApplicationDraft(), ...stored.draft, screenshots: [], voiceUrl: '', coverUrl: '', promotion: emptyApplicationDraft().promotion }
    : emptyApplicationDraft();
  const attempt = stored?.attempt?.input?.requestId ? stored.attempt : null;
  return { owner, draft, application: null, loading: false, error: '', busy: false, editing: false, attempt };
}

export function useCompanionApplication(ownerId: string | null, token: string | null, active: boolean) {
  const [state, setState] = useState<PrivateState>({ owner: null, draft: emptyApplicationDraft(), application: null, loading: false, error: '', busy: false, editing: false, attempt: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  const generation = useRef(0);
  const ownerRef = useRef<string | null>(null);
  const tokenRef = useRef(token);
  const propsRef = useRef<{ ownerId: string | null; token: string | null }>({ ownerId: null, token: null });
  const revokedRef = useRef(!token);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const requestSequence = useRef(0);
  if (propsRef.current.ownerId !== ownerId || propsRef.current.token !== token) {
    propsRef.current = { ownerId, token };
    ownerRef.current = ownerId;
    tokenRef.current = token;
    revokedRef.current = !token;
    generation.current++; requestSequence.current++; busyRef.current = false;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; generation.current++; requestSequence.current++; busyRef.current = false; };
  }, []);

  useEffect(() => {
    const onSession = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const next = detail?.user?.id || null;
      const nextToken = detail?.token || null;
      if (next !== ownerRef.current || !nextToken) {
        ownerRef.current = next; tokenRef.current = nextToken; revokedRef.current = !nextToken;
        generation.current++; busyRef.current = false; requestSequence.current++;
        setState(next && nextToken ? hydratedState(next) : { owner: null, draft: emptyApplicationDraft(), application: null, loading: false, error: '', busy: false, editing: false, attempt: null });
      } else if (nextToken !== tokenRef.current) {
        tokenRef.current = nextToken; generation.current++; busyRef.current = false; requestSequence.current++;
        revokedRef.current = false;
        setState(previous => previous.owner === next ? { ...previous, busy: false, loading: false } : hydratedState(next));
      }
    };
    window.addEventListener(AUTH_SESSION_EVENT, onSession);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, onSession);
  }, []);

  useEffect(() => {
    if (!ownerId || !token) { setState({ owner: null, draft: emptyApplicationDraft(), application: null, loading: false, error: '', busy: false, editing: false, attempt: null }); return; }
    setState(hydratedState(ownerId));
  }, [ownerId, Boolean(token)]);

  const visible = !revokedRef.current && Boolean(token) && state.owner === ownerId && Boolean(ownerId);
  const draft = visible ? state.draft : emptyApplicationDraft();
  const application = visible ? state.application : null;

  const setDraft: Dispatch<SetStateAction<WizardDraft>> = useCallback(update => {
    const owner = ownerRef.current;
    if (!owner || busyRef.current) return;
    setState(previous => {
      if (previous.owner !== owner || previous.attempt) return previous;
      const next = typeof update === 'function' ? update(previous.draft) : update;
      const draft = { ...next, screenshots: [], voiceUrl: '', coverUrl: '', promotion: emptyApplicationDraft().promotion };
      writeDraft(owner, { draft, attempt: previous.attempt });
      return { ...previous, draft };
    });
  }, []);

  const refresh = useCallback(async () => {
    const owner = ownerRef.current;
    const access = tokenRef.current;
    if (!owner || !access || revokedRef.current || busyRef.current || !mountedRef.current) return;
    const version = generation.current;
    const sequence = ++requestSequence.current;
    setState(previous => previous.owner === owner ? { ...previous, loading: true, error: '' } : previous);
    try {
      const response = await businessApi.getCompanionApplication(access);
      if (!mountedRef.current || version !== generation.current || owner !== ownerRef.current || sequence !== requestSequence.current || busyRef.current || revokedRef.current) return;
      if (response.application && (!response.application.id || response.application.userId !== owner)) throw new Error('COMPANION_APPLICATION_FORBIDDEN');
      if (response.application && stateRef.current.application?.id && response.application.id !== stateRef.current.application.id) throw new Error('COMPANION_APPLICATION_CONFLICT');
      if (response.application?.status === 'PENDING') removeDraft(owner);
      setState(previous => previous.owner === owner ? { ...previous, application: response.application, attempt: response.application?.status === 'PENDING' ? null : previous.attempt, loading: false, error: '' } : previous);
    } catch (error) {
      if (!mountedRef.current || version !== generation.current || owner !== ownerRef.current || sequence !== requestSequence.current || busyRef.current || revokedRef.current) return;
      setState(previous => previous.owner === owner ? { ...previous, loading: false, error: (error as Error).message } : previous);
    }
  }, []);

  useEffect(() => {
    if (!active || !ownerId || !token) return;
    void refresh();
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(poll); window.removeEventListener('focus', focus); };
  }, [active, ownerId, token, refresh]);

  const submit = useCallback(async (gameName: string) => {
    const owner = ownerRef.current;
    const access = tokenRef.current;
    if (!owner || !access || revokedRef.current || !mountedRef.current || busyRef.current || state.owner !== owner || state.application?.status === 'PENDING' || state.application?.status === 'APPROVED') return;
    const input = state.attempt?.input || applicationPayload(state.draft, gameName, newApplicationAttempt());
    const attempt = { input };
    busyRef.current = true;
    requestSequence.current++;
    const version = generation.current;
    writeDraft(owner, { draft: state.draft, attempt });
    setState(previous => ({ ...previous, attempt, busy: true, error: '' }));
    try {
      const saved = await businessApi.submitCompanionApplication(access, input);
      if (!mountedRef.current || version !== generation.current || owner !== ownerRef.current || revokedRef.current) return;
      if (!saved.id || saved.userId !== owner) throw new Error('COMPANION_APPLICATION_FORBIDDEN');
      if (state.application?.id && saved.id !== state.application.id) throw new Error('COMPANION_APPLICATION_CONFLICT');
      removeDraft(owner);
      setState(previous => ({ ...previous, application: saved, attempt: null, editing: false, busy: false, error: '' }));
    } catch (error) {
      if (!mountedRef.current || version !== generation.current || owner !== ownerRef.current || revokedRef.current) return;
      const message = (error as Error).message;
      const definitive = /^(INPUT_INVALID|PRICE_OUT_OF_LEVEL_BAND|COMPANION_APPLICATION_FORBIDDEN|COMPANION_APPLICATION_CONFLICT|COMPANION_ALREADY_EXISTS)$/.test(message);
      if (definitive) writeDraft(owner, { draft: state.draft, attempt: null });
      setState(previous => ({ ...previous, busy: false, attempt: definitive ? null : previous.attempt, error: message }));
    } finally { if (version === generation.current) busyRef.current = false; }
  }, [state]);

  const editRejected = useCallback(() => {
    const owner = ownerRef.current;
    if (!owner || state.owner !== owner || state.application?.status !== 'REJECTED') return;
    const retained = readDraft(owner);
    const draft = retained?.draft ? state.draft : { ...emptyApplicationDraft(), ...draftFromApplication(state.application) };
    const attempt = retained?.draft ? state.attempt : null;
    writeDraft(owner, { draft, attempt });
    setState(previous => ({ ...previous, draft, attempt, editing: true, error: '' }));
  }, [state]);

  const sessionGuard = useCallback((owner: string, access: string) => {
    const version = generation.current;
    return () => mountedRef.current && !revokedRef.current && generation.current === version
      && ownerRef.current === owner && tokenRef.current === access;
  }, []);

  return { draft, setDraft, application, loading: (!visible && Boolean(ownerId && token) && !revokedRef.current) || (visible && state.loading), busy: visible && state.busy, attemptPending: visible && Boolean(state.attempt), error: visible ? state.error : '', editing: visible && state.editing, refresh, submit, editRejected, sessionGuard };
}
