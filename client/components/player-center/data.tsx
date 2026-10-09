import { useEffect, useRef, useState } from 'react';
import type { CenterPeriod, CenterResponse, CustomerGroup, CustomerSort } from '@shared/playerCenter';
import { LEVEL_RULES } from '@shared/playerCenter';
import { apiUrl, readJsonResponse } from '@shared/apiClient';
import { useApp } from '../../app/AppContext';

export const COMPANION_LEVELS = LEVEL_RULES.map((r, i) => ({ ...r, name: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'][i], minPoints: r.threshold, maxPoints: LEVEL_RULES[i + 1]?.threshold - 1 || Infinity, decayRate: r.decay / 100, exposureBoost: `+${r.exposure}%` }));
export interface PlayerRanking {
  pending: boolean; level: number; score: number; nextLevelThreshold: number;
  connectedActivity?: Array<'login' | 'accept' | 'post' | 'reply' | 'greet'>;
  hasReplyOpportunities?: boolean;
  hasAcceptanceOpportunities?: boolean;
  justLeveledUpThisWeek: boolean; weeksWithoutOrder: number;
  weeklyPointsBreakdown: { activity: number; service: number; decay: number; penalty: number };
  weeklyStats: { logins: number; posts: number; greetings: number; responseRate: number; acceptanceRate: number; newUsersServed: number; repeatUsersServed: number; rating: number; totalStars: number; giftIncome: number; totalIncome: number; noOrderWeeks: number; consecutiveL1Weeks: number };
  status: 'ACTIVE' | 'SUSPENDED'; lastUpdateTimestamp: number;
}
export interface TaskProgress { id: string; name: string; description: string; earnedPts: number; capPts: number; currentValue: number; status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED'; type: 'ACTIVITY' | 'SERVICE'; unit?: string; rate?: number }
export function rankingFromCenter(data: CenterResponse | null): PlayerRanking {
  const official = data?.officialLevel;
  return { pending: !official, level: official?.level ?? 1, score: official?.score ?? 0, nextLevelThreshold: LEVEL_RULES.find(r => r.level === (official?.level ?? 1) + 1)?.threshold ?? 2500, justLeveledUpThisWeek: false, weeksWithoutOrder: official?.noOrderWeeks ?? 0,
    connectedActivity: data?.connectedActivity || [],
    hasAcceptanceOpportunities: data?.activity?.acceptanceRate != null,
    hasReplyOpportunities: data?.activity?.replyRate != null,
    weeklyPointsBreakdown: { activity: data?.activity?.points ?? 0, service: data?.weeklyPoints.service || 0, decay: 0, penalty: 0 },
    weeklyStats: { logins: data?.activity?.loginDays ?? 0, posts: data?.activity?.postDays ?? 0, greetings: data?.activity?.greetings ?? 0, responseRate: data?.activity?.replyRate ?? 0, acceptanceRate: data?.activity?.acceptanceRate ?? 0,
      newUsersServed: data?.weeklyTasks.newCustomers || 0, repeatUsersServed: data?.weeklyTasks.repeatCustomers || 0,
      rating: 0, totalStars: data?.weeklyTasks.ratingStars || 0, giftIncome: 0, totalIncome: data?.weeklyTasks.income || 0, noOrderWeeks: official?.noOrderWeeks ?? 0, consecutiveL1Weeks: official?.lv1Weeks ?? 0 },
    status: official?.suspended ? 'SUSPENDED' : 'ACTIVE', lastUpdateTimestamp: official?.updatedAt || data?.asOf || 0 };
}
export const placeholderAvatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="24" fill="#152b24"/><circle cx="50" cy="37" r="16" fill="#78968a"/><path d="M19 90c0-38 62-38 62 0" fill="#78968a"/></svg>');

export function useCenterData(period: CenterPeriod = 'WEEK', group: CustomerGroup = 'ALL', sort: CustomerSort = 'TIME', direction: 'ASC' | 'DESC' = 'DESC') {
  const { authToken } = useApp();
  const [data, setData] = useState<CenterResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const id = ++generation.current;
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    setData(null); setLoading(true); setMore(false); setError('');
    const params = new URLSearchParams({ period, group, sort, direction });
    fetch(apiUrl(`/api/player-center?${params}`), { headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal })
      .then(readJsonResponse<CenterResponse>).then(value => { if (id === generation.current) setData(value); })
      .catch(e => { if (!controller.signal.aborted && id === generation.current) setError(e.message); })
      .finally(() => { if (id === generation.current) setLoading(false); });
    return () => { controller.abort(); abort.current?.abort(); generation.current++; };
  }, [authToken, period, group, sort, direction, revision]);
  const loadMore = async () => {
    if (!data || data.nextOffset === null || more) return;
    const id = generation.current;
    const controller = new AbortController(); abort.current = controller;
    setMore(true); setError('');
    try {
      const params = new URLSearchParams({ period, group, sort, direction, snapshot: data.snapshot, offset: String(data.nextOffset) });
      const result = await fetch(apiUrl(`/api/player-center?${params}`), { headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal }).then(readJsonResponse<CenterResponse>);
      if (id === generation.current) setData(old => old ? { ...result, customers: { ...result.customers, items: [...old.customers.items, ...result.customers.items] } } : result);
    } catch (e) { if (!controller.signal.aborted && id === generation.current) setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { if (id === generation.current) setMore(false); }
  };
  return { data, loading, error, more, loadMore, refresh: () => setRevision(v => v + 1) };
}
export function DataNotice({ resource }: { resource: ReturnType<typeof useCenterData> }) {
  return <div className="px-6 py-3 text-[10px] text-gray-500" aria-live="polite">
    {resource.loading ? 'Loading…' : resource.error ? <span role="alert">{resource.error === 'SNAPSHOT_EXPIRED' ? 'Snapshot expired.' : 'Unable to load data.'} <button onClick={resource.refresh} className="text-emerald-400 underline">Retry</button></span> : resource.data ? <span>Updated {new Date(resource.data.asOf).toLocaleString()} · Diamonds · <button className="text-emerald-400" onClick={resource.refresh}>Refresh</button></span> : null}
  </div>;
}
