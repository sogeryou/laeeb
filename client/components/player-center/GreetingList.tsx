import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { EPal, GreetingCandidate, GreetingCandidatePage, Message } from '@shared/types';
import { apiUrl, readJsonResponse } from '@shared/apiClient';

function errorText(code: string) {
  const errors: Record<string, string> = {
    GREETING_NOT_ELIGIBLE: 'This user has already completed an order with you. Refresh the list.',
    GREETING_ALREADY_REWARDED: 'You have already received the greeting reward for this user.',
    GREETING_PENDING: 'A greeting is already waiting for a reply. Open the chat to continue.',
    CHAT_UNAVAILABLE: 'Messaging is currently unavailable for this account.',
    MESSAGE_RATE_LIMIT: 'You are sending too quickly. Please try again shortly.',
    PLAYER_REQUIRED: 'An approved player account is required.',
    AUTH_UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  };
  return errors[code] || 'Unable to complete the request. Please try again.';
}

export function GreetingList({ token, onBack, onChat }: { token: string | null; onBack: () => void; onChat: (peer: EPal) => void }) {
  const [items, setItems] = useState<GreetingCandidate[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const generation = useRef(0), fetchRevision = useRef(0), busy = useRef(false);
  const attempt = useRef<{ peer: string; content: string; key: string } | null>(null);
  const call = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    if (!token) throw new Error('AUTH_UNAUTHORIZED');
    return readJsonResponse<T>(await fetch(apiUrl(`/api/social${path}`), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
  }, [token]);
  const load = useCallback(async (after?: string) => {
    const version = generation.current, revision = ++fetchRevision.current;
    setLoading(true); setError('');
    try {
      const page = await call<GreetingCandidatePage>(`/greetings/candidates${after ? `?after=${encodeURIComponent(after)}` : ''}`);
      if (generation.current !== version || fetchRevision.current !== revision) return;
      setItems(old => after ? [...new Map([...old, ...page.items].map(i => [i.participant.userId, i])).values()] : page.items);
      setCursor(page.nextAfter); setLoaded(true);
    } catch (e) { if (generation.current === version && fetchRevision.current === revision) setError(errorText((e as Error).message)); }
    finally { if (generation.current === version && fetchRevision.current === revision) setLoading(false); }
  }, [call]);
  useEffect(() => {
    generation.current++; setItems([]); setCursor(null); setLoaded(false); setSelected(null); setDraft(''); setSending(false); busy.current = false; attempt.current = null;
    void load();
    return () => { generation.current++; };
  }, [load]);

  const send = async (candidate: GreetingCandidate) => {
    const peer = candidate.participant.userId!, content = draft.trim(), version = generation.current;
    if (!content || busy.current) return;
    if (attempt.current?.peer !== peer || attempt.current?.content !== content) attempt.current = { peer, content, key: crypto.randomUUID() };
    busy.current = true; setSending(true); setError('');
    try {
      await call<Message>('/greetings', { recipientId: peer, content, requestId: attempt.current.key });
      if (generation.current !== version) return;
      attempt.current = null; setDraft(''); onChat(candidate.participant);
    } catch (e) { if (generation.current === version) setError(errorText((e as Error).message)); }
    finally { if (generation.current === version) { busy.current = false; setSending(false); } }
  };

  return <section className="px-6 py-6 space-y-5 max-w-md mx-auto">
    <div className="flex items-center gap-3">
      <button onClick={onBack} disabled={sending} aria-label="Back to tasks" className="p-2 rounded-xl bg-white/[0.04] disabled:opacity-40"><ArrowLeft className="w-5 h-5" /></button>
      <h2 className="text-lg font-black">Greet New Users</h2>
    </div>
    <p className="text-xs text-gray-400 leading-relaxed">Meet users who have not completed an order with you. Earn 5 points when they reply within 24 hours, once per user. Up to 50 points per week.</p>
    <button onClick={() => void load()} disabled={loading || sending} className="text-xs text-emerald-400 disabled:opacity-40">Refresh users</button>
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    {loading && <p role="status" className="text-xs text-gray-400">Loading users…</p>}
    {loaded && !loading && !error && !items.length && <p className="text-xs text-gray-400">No eligible users right now. Check back later.</p>}
    {items.map(candidate => <div key={candidate.participant.userId} className="p-4 bg-white/[0.04] border border-white/[0.07] rounded-3xl space-y-3">
      <div className="flex items-center gap-3">
        <img src={candidate.participant.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{candidate.participant.name}</p>
          <p className="text-[10px] text-gray-400">{candidate.status === 'PENDING' ? 'Waiting for reply' : candidate.status === 'EXPIRED' ? 'Previous greeting expired' : 'New to your service'}</p>
          {candidate.expiresAt && candidate.status === 'PENDING' && <p className="text-[10px] text-gray-500">Reply by {new Date(candidate.expiresAt).toLocaleString()}</p>}
        </div>
        <button disabled={sending} onClick={() => candidate.status === 'PENDING' ? onChat(candidate.participant) : (setSelected(candidate.participant.userId!), setDraft(''), setError(''))} className="px-3 py-2 bg-emerald-600 rounded-xl text-[10px] font-black disabled:opacity-40">
          {candidate.status === 'PENDING' ? 'Open chat' : 'Say hello'}
        </button>
      </div>
      {selected === candidate.participant.userId && candidate.status !== 'PENDING' && <div className="space-y-2">
        <label className="text-[10px] text-gray-400" htmlFor="greeting-message">Your greeting</label>
        <textarea id="greeting-message" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} disabled={sending} rows={3} className="w-full bg-black/20 rounded-xl p-3 text-sm border border-white/[0.07]" placeholder="Introduce yourself…" />
        <button onClick={() => void send(candidate)} disabled={sending || !draft.trim()} className="w-full py-2 bg-emerald-600 rounded-xl text-xs font-bold disabled:opacity-40 flex justify-center items-center gap-2"><MessageCircle className="w-4 h-4" />{sending ? 'Sending…' : 'Send greeting'}</button>
      </div>}
    </div>)}
    {cursor && <button onClick={() => void load(cursor)} disabled={loading || sending} className="w-full py-3 text-xs text-emerald-400 disabled:opacity-40">Load more users</button>}
  </section>;
}
