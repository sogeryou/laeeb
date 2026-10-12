import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { EPal } from '@shared/types';
import { businessApi } from '../services/businessApi';

export function usePublicCompanionProfile(view: string, selected: EPal | null, setSelected: Dispatch<SetStateAction<EPal | null>>, userId?: string) {
  const isCompanion = selected?.userId && (selected.services !== undefined || selected.id !== selected.userId);
  const peerId = view === 'PROFILE' && isCompanion ? selected!.id : null;
  const identity = `${userId || ''}:${peerId || ''}`;
  const current = useRef(identity);
  current.current = identity;
  const requestId = useRef(0);
  const [result, setResult] = useState({ identity: '', loading: false, error: '' });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; requestId.current++; }; }, []);
  const refresh = useCallback(async () => {
    if (!peerId) return;
    const sequence = ++requestId.current;
    setResult({ identity, loading: true, error: '' });
    const valid = () => mounted.current && current.current === identity && sequence === requestId.current;
    try {
      const profile = await businessApi.getPublicCompanionProfile(peerId);
      if (!valid()) return;
      setSelected(previous => previous?.id === peerId ? { ...previous, ...profile } : previous);
      setResult({ identity, loading: false, error: '' });
    } catch (error) {
      if (valid()) setResult({ identity, loading: false, error: error instanceof Error ? error.message : 'PROFILE_UNAVAILABLE' });
    }
  }, [identity, peerId, setSelected]);
  useEffect(() => { void refresh(); return () => { requestId.current++; }; }, [refresh]);
  return { loading: Boolean(peerId) && (result.identity !== identity || result.loading), error: result.identity === identity ? result.error : '', refresh };
}
