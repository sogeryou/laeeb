import { useEffect, useRef, useState } from 'react';
import type { Post, PostComment } from '@shared/types';
import { apiUrl, readJsonResponse } from '@shared/apiClient';

export function usePostDetail(id: string | undefined, token: string | null, userId: string | undefined) {
  const [post, setPost] = useState<Post | null>(null), [error, setError] = useState(''), [draft, setDraft] = useState(''), [sending, setSending] = useState(false);
  const version = useRef(0), busy = useRef(false), attempt = useRef<{ text: string; key: string } | null>(null);
  const reload = useRef<() => Promise<void>>(async () => {});
  const latestToken = useRef(token); latestToken.current = token;
  const authenticated = Boolean(token);
  useEffect(() => {
    const generation = ++version.current; let active = true, loading = false;
    setPost(null); setError(''); setDraft(''); attempt.current = null;
    const load = async () => {
      if (!id || loading || document.hidden) return; loading = true;
      try {
        const value = await readJsonResponse<Post>(await fetch(apiUrl(`/api/social/posts/${encodeURIComponent(id)}`), { headers: latestToken.current ? { Authorization: `Bearer ${latestToken.current}` } : {} }));
        if (active && generation === version.current) { setPost(value); setError(''); }
      } catch (e) { if (active) { setError((e as Error).message); setPost(null); } }
      finally { loading = false; }
    };
    reload.current = load; void load(); const timer = setInterval(load, 5000);
    return () => { active = false; version.current++; clearInterval(timer); };
  }, [id, authenticated, userId]);
  const submit = async () => {
    const text = draft.trim(), generation = version.current;
    if (!token || !id || !text || busy.current) return;
    if (attempt.current?.text !== text) attempt.current = { text, key: crypto.randomUUID() };
    busy.current = true; setSending(true);
    try {
      await readJsonResponse<PostComment>(await fetch(apiUrl(`/api/social/posts/${encodeURIComponent(id)}/comments`), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, requestId: attempt.current.key }) }));
      if (version.current !== generation) return;
      setDraft(old => old.trim() === text ? '' : old); attempt.current = null; await reload.current();
    } catch (e) { if (version.current === generation) setError((e as Error).message); }
    finally { busy.current = false; setSending(false); }
  };
  return { post, error, draft, setDraft, sending, submit };
}
