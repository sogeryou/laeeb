import { expect, it } from 'vitest';
import { rankCompanions } from '../../backend/algo/m6Exposure';
it('fills unused pool slots without duplicating candidates', () => {
  const candidates = Array.from({ length: 8 }, (_, i) => ({ companionId: String(i), level: 1 as const, impressions24h: 0, clicks24h: 0, completedOrders30d: 0, avgRating: 0, activityScore: 0, orderRecencyHours: 99, availability: 'ONLINE' as const }));
  const result = rankCompanions(candidates, { weights: { wOrder: .4, wRating: .35, wActive: .25, wBizGlobal: .15 } }, 6);
  expect(result).toHaveLength(6); expect(new Set(result.map(r => r.companionId)).size).toBe(6);
});
