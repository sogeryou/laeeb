import { expect, it } from 'vitest';
import { recordLevelEvent, weeklyActivity, settleLevelWeek } from '../../backend/player-center/events';
import { initialLevel } from '../../backend/player-center/officialLevel';

const start = Date.parse('2026-09-20T21:00:00Z'), end = start + 7 * 86400000;
function setup() { return { levelEvents: [], companions: [{ id: 'c', userId: 'p', ranking: initialLevel(start - 1) }], levelSettlements: [], persistState() {} } as any; }
it('deduplicates event ids and daily login awards in platform timezone', () => {
  const ctx = setup();
  for (const id of ['a', 'a', 'b']) recordLevelEvent(ctx, { id, userId: 'p', kind: 'LOGIN', at: start + 1000 });
  expect(ctx.levelEvents).toHaveLength(2);
  expect(weeklyActivity(ctx.levelEvents, 'p', start, end, 'Asia/Riyadh').points).toBe(3);
});
it('caps activity and counts reply/acceptance rates from actual opportunities', () => {
  const events: any[] = Array.from({ length: 7 }, (_, i) => ({ id: String(i), userId: 'p', kind: 'LOGIN', at: start + i * 86400000 }));
  events.push({ id: 'r', userId: 'p', kind: 'REPLY_OPPORTUNITY', at: start, referenceId: 'm' }, { id: 'r2', userId: 'p', kind: 'REPLY', at: start + 300001, referenceId: 'm' });
  const result = weeklyActivity(events, 'p', start, end, 'Asia/Riyadh');
  expect(result.login).toBe(15); expect(result.reply).toBe(0); expect(result.replyRate).toBe(0);
});
it('refuses settlement with incomplete sources without changing the ranking', () => {
  const ctx = setup(), before = { ...ctx.companions[0].ranking };
  expect(() => settleLevelWeek(ctx, 'p', { start, end, points: 200, income: 300, hasOrders: true, completeSources: false }, end)).toThrow('INCOMPLETE');
  expect(ctx.companions[0].ranking).toEqual(before); expect(ctx.levelSettlements).toHaveLength(0);
});
it('settles a closed week once and retains before/after records', () => {
  const ctx = setup(), input = { start, end, points: 200, income: 300, hasOrders: true, completeSources: true };
  settleLevelWeek(ctx, 'p', input, end + 300000); settleLevelWeek(ctx, 'p', input, end + 300000);
  expect(ctx.companions[0].ranking.level).toBe(2); expect(ctx.companions[0].ranking.score).toBe(200);
  expect(ctx.levelSettlements).toHaveLength(1);
  expect(ctx.levelSettlements[0].before.level).toBe(1);
});
it('rejects partial weeks and skipped weeks without mutating the official level', () => {
  const ctx = setup(), input = { start, end, points: 200, income: 300, hasOrders: true, completeSources: true };
  expect(() => settleLevelWeek(ctx, 'p', { ...input, end: end - 1000 }, end + 300000)).toThrow('INVALID_LEVEL_WEEK');
  settleLevelWeek(ctx, 'p', input, end + 300000);
  const before = { ...ctx.companions[0].ranking };
  expect(() => settleLevelWeek(ctx, 'p', { ...input, start: end + 7 * 86400000, end: end + 14 * 86400000 }, end + 15 * 86400000)).toThrow('LEVEL_WEEK_GAP');
  expect(ctx.companions[0].ranking).toEqual(before);
  expect(ctx.levelSettlements).toHaveLength(1);
});
it('rejects invalid income and non-finite settlement clocks', () => {
  const ctx = setup(), input = { start, end, points: 200, income: 300, hasOrders: true, completeSources: true };
  expect(() => settleLevelWeek(ctx, 'p', { ...input, income: -1 }, end + 300000)).toThrow('INVALID_LEVEL_INPUT');
  expect(() => settleLevelWeek(ctx, 'p', input, NaN)).toThrow('WEEK_NOT_CLOSED');
  expect(ctx.levelSettlements).toHaveLength(0);
});
it('applies confirmed deductions once, floors at zero and discards the unpaid remainder', () => {
  const ctx = setup();
  ctx.levelReviews = [{ id: 'r', userId: 'p', status: 'CONFIRMED', deduction: 5, reviewedAt: start + 1000 }];
  const input = { start, end, points: 3, income: 0, hasOrders: true, completeSources: true };
  const row = settleLevelWeek(ctx, 'p', input, end + 300000);
  expect(row.after.score).toBe(0);
  expect(ctx.levelReviews[0]).toMatchObject({ status: 'APPLIED', appliedAmount: 3, discardedAmount: 2 });
  expect(row).toMatchObject({ reviewDeduction: 3, discardedDeduction: 2, reviewIds: ['r'] });
  expect(settleLevelWeek(ctx, 'p', input, end + 300000)).toBe(row);
  const following = settleLevelWeek(ctx, 'p', { ...input, start: end, end: end + 7 * 86400000, points: 3 }, end + 7 * 86400000 + 300000);
  expect(following.after.score).toBe(3);
});
it('does not apply pending or future confirmations, and rolls back deductions on save failure', () => {
  const ctx = setup();
  ctx.levelReviews = [{ id: 'pending', userId: 'p', status: 'PENDING', deduction: 5 }, { id: 'future', userId: 'p', status: 'CONFIRMED', deduction: 5, reviewedAt: end }];
  const input = { start, end, points: 3, income: 0, hasOrders: true, completeSources: true };
  expect(settleLevelWeek(ctx, 'p', input, end + 300000).after.score).toBe(3);
  const other = setup(); other.levelReviews = [{ id: 'r', userId: 'p', status: 'CONFIRMED', deduction: 5, reviewedAt: start }];
  other.persistState = () => { throw new Error('disk'); };
  expect(() => settleLevelWeek(other, 'p', input, end + 300000)).toThrow('disk');
  expect(other.levelReviews[0].status).toBe('CONFIRMED'); expect(other.levelSettlements).toHaveLength(0);
});
it('includes confirmed deductions when evaluating an upgrade threshold', () => {
  const ctx = setup(); ctx.companions[0].ranking.score = 199;
  ctx.levelReviews = [{ id: 'r', userId: 'p', status: 'CONFIRMED', deduction: 5, reviewedAt: start + 1000 }];
  const row = settleLevelWeek(ctx, 'p', { start, end, points: 1, income: 0, hasOrders: true, completeSources: true }, end + 300000);
  expect(row.after.level).toBe(1); expect(row.after.score).toBe(191);
  expect(row.reviewDeduction).toBe(5);
});
