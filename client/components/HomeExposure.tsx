import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EPal } from '@shared/types';
import { apiUrl, readJsonResponse } from '@shared/apiClient';

type Feed = { snapshot: string; items: EPal[]; nextOffset: number | null };
export function useHomeFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const busy = useRef(false), controller = useRef<AbortController | null>(null);
  async function load(reset = false) {
    if (busy.current || (!reset && feed?.nextOffset === null)) return;
    busy.current = true; setLoading(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const query = !reset && feed ? `?snapshot=${encodeURIComponent(feed.snapshot)}&offset=${feed.nextOffset}` : '';
      const result = await fetch(apiUrl(`/api/home/feed${query}`), { signal: abort.signal }).then(readJsonResponse<Feed>);
      setFeed(old => !reset && old ? { ...result, items: [...old.items, ...result.items] } : result);
    } catch (e) { if (!abort.signal.aborted) setError('Unable to load recommendations. Refresh to try again.'); }
    finally { if (!abort.signal.aborted) { busy.current = false; setLoading(false); } }
  }
  useEffect(() => { busy.current = false; void load(true); return () => controller.current?.abort(); }, []);
  function track(id: string, type: 'impression' | 'click' | 'detail') {
    if (!feed) return;
    void fetch(apiUrl('/api/home/events'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot: feed.snapshot, events: [{ companionId: id, type }] }), keepalive: true }).catch(() => {});
  }
  return { items: feed?.items || [], snapshot: feed?.snapshot, loading, error, hasMore: feed?.nextOffset != null, loadMore: () => load(), refresh: () => load(true), track };
}
export function FeedSentinel({ enabled, load }: { enabled: boolean; load: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !enabled) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) load(); });
    observer.observe(ref.current); return () => observer.disconnect();
  }, [enabled, load]);
  return <div ref={ref} className="h-1" />;
}
export function ExposureCard({ children, id, snapshot, track, className }: { key?: string; children: ReactNode; id: string; snapshot?: string; track: (id: string, type: 'impression') => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef('');
  useEffect(() => {
    if (!ref.current || !snapshot) return;
    let visible = false;
    const report = () => {
      if (visible && document.visibilityState === 'visible' && sent.current !== snapshot) {
        sent.current = snapshot; track(id, 'impression');
      }
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= .5); report();
    }, { threshold: .5 });
    document.addEventListener('visibilitychange', report);
    observer.observe(ref.current); return () => { observer.disconnect(); document.removeEventListener('visibilitychange', report); };
  }, [id, snapshot, track]);
  return <div ref={ref} className={className}>{children}</div>;
}
