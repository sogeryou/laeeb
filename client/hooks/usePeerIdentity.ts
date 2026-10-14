import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { EPal } from '@shared/types';
import { businessApi } from '../services/businessApi';
import { AUTH_SESSION_EVENT } from '../features/auth/session';

export function usePeerIdentity(view: string, selected: EPal | null, setSelected: Dispatch<SetStateAction<EPal | null>>,
  token: string | null, ownerId?: string) {
  const peer = ['IM_DETAIL', 'PROFILE'].includes(view) && selected?.userId ? selected.userId : null;
  const scope = `${ownerId || ''}:${token || ''}:${view}:${peer || ''}`;
  const identity = useRef({ scope, epoch: 0 });
  if (identity.current.scope !== scope) identity.current = { scope, epoch: identity.current.epoch + 1 };
  const mounted = useRef(false), sequence = useRef(0);
  const [result, setResult] = useState({ scope: '', loading: false, error: '' });
  const refresh = useCallback(async () => {
    if (!mounted.current || !token || !ownerId || !peer) return;
    const epoch = identity.current.epoch, version = ++sequence.current;
    const valid = () => mounted.current && identity.current.scope === scope && identity.current.epoch === epoch && sequence.current === version;
    setResult({ scope, loading: true, error: '' });
    try {
      const data = await businessApi.getSocialPeer(token, peer);
      if (!valid()) return;
      if (data?.userId !== peer || typeof data.name !== 'string' || !data.name || typeof data.avatarUrl !== 'string'
        || data.bio !== undefined && typeof data.bio !== 'string') throw Error('PROFILE_RESPONSE_INVALID');
      setSelected(previous => {
        if (!valid() || previous?.userId !== peer) return previous;
        if (previous.name === data.name && previous.avatarUrl === data.avatarUrl && (data.bio === undefined || previous.bio === data.bio)) return previous;
        return { ...previous, name: data.name, avatarUrl: data.avatarUrl, ...(data.bio !== undefined ? { bio: data.bio } : {}) };
      });
      setResult({ scope, loading: false, error: '' });
    } catch (error) {
      if (valid()) setResult({ scope, loading: false, error: error instanceof Error ? error.message : 'PROFILE_LOAD_FAILED' });
    }
  }, [scope, token, ownerId, peer, setSelected]);
  useEffect(() => {
    mounted.current = true;
    const changed = (event: Event) => {
      identity.current.epoch++; sequence.current++;
      const detail = (event as CustomEvent).detail;
      if (detail?.token === token && detail?.user?.id === ownerId) void refresh();
    };
    window.addEventListener(AUTH_SESSION_EVENT, changed);
    return () => { mounted.current = false; identity.current.epoch++; sequence.current++; window.removeEventListener(AUTH_SESSION_EVENT, changed); };
  }, [token, ownerId, refresh]);
  useEffect(() => {
    void refresh();
    if (!peer || !token || !ownerId) return;
    const poll = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const timer = window.setInterval(poll, 5000); window.addEventListener('focus', poll);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', poll); sequence.current++; };
  }, [peer, token, ownerId, refresh]);
  return { loading: Boolean(peer && token) && (result.scope !== scope || result.loading), error: result.scope === scope ? result.error : '', refresh };
}
