import { expect, it } from 'vitest';
import { initialLevel, readOfficialLevel } from '../../backend/player-center/officialLevel';
import { rankingFromCenter } from '../../client/components/player-center/data';
it('does not infer or overwrite an existing account level from its price', () => {
  expect(readOfficialLevel({ hourlyRate: 150 } as any)).toBeNull();
  const stored = { ...initialLevel(1000), level: 4, score: 850 };
  expect(readOfficialLevel({ hourlyRate: 20, ranking: stored } as any)).toEqual(stored);
});
it('starts new accounts at level one and zero points', () => {
  expect(initialLevel(1000)).toMatchObject({ level: 1, score: 0, source: 'NEW_ACCOUNT', updatedAt: 1000 });
});
it('adapts official level without mixing weekly estimated points into settled score', () => {
  const result = rankingFromCenter({ officialLevel: { ...initialLevel(1000), level: 4, score: 850 }, weeklyTasks: {}, weeklyPoints: { service: 200 } } as any);
  expect(result.pending).toBe(false); expect(result.level).toBe(4); expect(result.score).toBe(850);
});
