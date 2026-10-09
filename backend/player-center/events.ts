import type { OfficialLevel } from '../../shared/playerCenter.js';
import type { CompanionEntity } from '../domain/types.js';
import { previewSettlement } from './level.js';
import { readOfficialLevel } from './officialLevel.js';
import { periodRange } from './analytics.js';
import type { LevelReview } from '../routes/socialContent.js';

export interface LevelEvent {
  id: string; userId: string; at: number;
  kind: 'LOGIN' | 'POST' | 'GREETING_REPLY' | 'REPLY_OPPORTUNITY' | 'REPLY' | 'ACCEPT_OPPORTUNITY' | 'ACCEPT';
  referenceId?: string;
  revokedAt?: number;
}
export interface LevelSettlement { userId: string; start: number; end: number; before: OfficialLevel; after: OfficialLevel; points: number; income: number; decay: number; penalty: number; settledAt: number; reviewDeduction?: number; discardedDeduction?: number; reviewIds?: string[] }
type Store = { levelEvents: LevelEvent[]; levelSettlements: LevelSettlement[]; levelReviews?: LevelReview[]; companions: CompanionEntity[]; persistState: () => void };
// Internal server hook only. No endpoint accepts client-supplied task events or points.
export function recordLevelEvent(ctx: Pick<Store, 'levelEvents'>, event: LevelEvent) {
  if (!event.id || !event.userId || !Number.isFinite(event.at) || event.at < 0) throw new Error('INVALID_LEVEL_EVENT');
  const old = ctx.levelEvents.find(e => e.id === event.id);
  if (old) {
    if (old.userId !== event.userId || old.kind !== event.kind || old.referenceId !== event.referenceId) throw new Error('LEVEL_EVENT_ID_CONFLICT');
    return;
  }
  ctx.levelEvents.push({ ...event });
}
export function weeklyActivity(events: LevelEvent[], userId: string, start: number, end: number, timezone: string) {
  const relevant = events.filter(e => e.userId === userId && e.at >= start && e.at < end && e.revokedAt === undefined);
  const day = (t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
  const countDays = (kind: LevelEvent['kind']) => new Set(relevant.filter(e => e.kind === kind).map(e => day(e.at))).size;
  const rate = (opportunity: LevelEvent['kind'], response: LevelEvent['kind']) => {
    const opportunities = new Map(relevant.filter(e => e.kind === opportunity && e.referenceId).map(e => [e.referenceId!, e]));
    let success = 0;
    for (const [id, opportunity] of opportunities) if (events.some(e => e.userId === userId && e.kind === response && e.referenceId === id && e.at >= opportunity.at && e.at <= opportunity.at + 300000)) success++;
    return opportunities.size ? success / opportunities.size : null;
  };
  const replyRate = rate('REPLY_OPPORTUNITY', 'REPLY'), acceptanceRate = rate('ACCEPT_OPPORTUNITY', 'ACCEPT');
  const ratePoints = (value: number | null) => value === null ? 0 : value >= .9 ? 35 : value >= .75 ? 20 : value >= .6 ? 5 : 0;
  const loginDays = countDays('LOGIN'), postDays = countDays('POST');
  const greetings = new Set(relevant.filter(e => e.kind === 'GREETING_REPLY' && e.referenceId).map(e => e.referenceId)).size;
  const login = Math.min(15, loginDays * 3), post = Math.min(15, postDays * 5), greet = Math.min(50, greetings * 5), reply = ratePoints(replyRate), accept = ratePoints(acceptanceRate);
  return { loginDays, postDays, greetings, replyRate, acceptanceRate, login, post, greet, reply, accept, points: login + post + greet + reply + accept };
}
// Call only after trusted source aggregation has verified whole-week coverage.
export function settleLevelWeek(ctx: Store, userId: string, input: { start: number; end: number; points: number; income: number; hasOrders: boolean; completeSources: boolean }, now = Date.now(), timezone = 'Asia/Riyadh') {
  if (!input.completeSources) throw new Error('LEVEL_SOURCES_INCOMPLETE');
  if (!Number.isSafeInteger(input.start) || !Number.isSafeInteger(input.end) || input.start >= input.end || !Number.isFinite(now) || now < input.end + 300000) throw new Error('WEEK_NOT_CLOSED');
  const week = periodRange('WEEK', input.start, timezone);
  if (week.start !== input.start || week.end !== input.end) throw new Error('INVALID_LEVEL_WEEK');
  if (!Number.isFinite(input.income) || input.income < 0 || typeof input.hasOrders !== 'boolean') throw new Error('INVALID_LEVEL_INPUT');
  const existing = ctx.levelSettlements.find(s => s.userId === userId && s.start === input.start && s.end === input.end);
  if (existing) return existing;
  const companion = ctx.companions.find(c => c.userId === userId), before = readOfficialLevel(companion);
  if (!companion || !before) throw new Error('LEVEL_NOT_INITIALIZED');
  if (before.updatedAt > input.start || ctx.levelSettlements.some(s => s.userId === userId && s.end > input.start)) throw new Error('LEVEL_WEEK_OVERLAP');
  if (before.source === 'SETTLEMENT' && before.updatedAt !== input.start) throw new Error('LEVEL_WEEK_GAP');
  if (before.suspended) throw new Error('LEVEL_SUSPENDED_REVIEW_REQUIRED');
  const deductions = (ctx.levelReviews || []).filter(r => r.userId === userId && r.status === 'CONFIRMED' && Number.isFinite(r.reviewedAt) && r.reviewedAt! < input.end).sort((a, b) => a.reviewedAt! - b.reviewedAt! || a.id.localeCompare(b.id));
  if (deductions.some(r => !Number.isSafeInteger(r.deduction) || r.deduction! < 0 || r.deduction! > 15)) throw new Error('INVALID_REVIEW_DEDUCTION');
  const requested = deductions.reduce((sum, r) => sum + r.deduction!, 0);
  const result = previewSettlement({ level: before.level, score: before.score, points: input.points, income: input.income, hasOrders: input.hasOrders, noOrderWeeks: before.noOrderWeeks, lv1Weeks: before.lv1Weeks, reviewDeduction: requested });
  const available = Math.max(0, before.score - result.decay + input.points - result.penalty);
  const actual = Math.min(requested, available);
  const after: OfficialLevel = { ...before, level: result.level as OfficialLevel['level'], score: result.score, noOrderWeeks: result.noOrderWeeks, lv1Weeks: result.lv1Weeks, suspended: result.suspend, updatedAt: input.end, source: 'SETTLEMENT', lastSettledWeek: String(input.start) };
  const row: LevelSettlement = { userId, start: input.start, end: input.end, before, after, points: input.points, income: input.income, decay: result.decay, penalty: result.penalty, settledAt: now, reviewDeduction: actual, discardedDeduction: requested - actual, reviewIds: deductions.map(r => r.id) };
  const originalReviews = deductions.map(r => ({ ...r })); let remaining = actual;
  for (const review of deductions) {
    const applied = Math.min(review.deduction!, remaining); remaining -= applied;
    Object.assign(review, { status: 'APPLIED', appliedAt: now, appliedWeek: input.start, appliedAmount: applied, discardedAmount: review.deduction! - applied });
  }
  companion.ranking = after; ctx.levelSettlements.push(row);
  try { ctx.persistState(); } catch (error) {
    companion.ranking = before; ctx.levelSettlements.pop();
    deductions.forEach((r, i) => { for (const key of Object.keys(r)) delete (r as any)[key]; Object.assign(r, originalReviews[i]); });
    throw error;
  }
  return row;
}
