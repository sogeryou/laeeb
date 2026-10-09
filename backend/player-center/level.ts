import { LEVEL_RULES, type TaskInputs } from '../../shared/playerCenter.js';

export function taskPoints(input: TaskInputs) {
  const newCustomers = Math.min(100, Math.max(0, input.newCustomers) * 10);
  const repeatCustomers = Math.min(100, Math.max(0, input.repeatCustomers) * 5);
  const rating = input.ratingStars >= 150 ? 50 : input.ratingStars >= 100 ? 30 : input.ratingStars >= 50 ? 10 : input.ratingStars >= 20 ? 5 : 0;
  const gift = Math.min(100, Math.floor(Math.max(0, input.giftIncome) / 10) * 2);
  const income = Math.min(200, Math.floor(Math.max(0, input.income) / 20));
  const service = newCustomers + repeatCustomers + rating + gift + income;
  return { newCustomers, repeatCustomers, rating, gift, income, service, total: service };
}

export interface SettlementInput {
  level: number; score: number; points: number; income: number; noOrderWeeks: number;
  hasOrders: boolean; lv1Weeks: number; suspendedFullWeek?: boolean;
  reviewDeduction?: number;
}
export function previewSettlement(input: SettlementInput) {
  const reviewDeduction = input.reviewDeduction ?? 0;
  if (!Number.isSafeInteger(reviewDeduction) || reviewDeduction < 0) throw new Error('Invalid review deduction');
  for (const key of ['level', 'score', 'points', 'noOrderWeeks', 'lv1Weeks'] as const) {
    if (!Number.isSafeInteger(input[key]) || input[key] < 0) throw new Error(`Invalid ${key}`);
  }
  if (input.level < 1 || input.level > 6 || input.points > 700 || !Number.isFinite(input.income)) throw new Error('Invalid settlement input');
  if (input.suspendedFullWeek) return { ...input, decay: 0, penalty: 0, suspend: false };
  const noOrderWeeks = input.hasOrders ? 0 : input.noOrderWeeks + 1;
  const penalty = Math.min(4, noOrderWeeks) * 50;
  const candidate = Math.max(0, input.score + input.points - penalty - reviewDeduction);
  const rule = LEVEL_RULES[input.level - 1];
  const next = LEVEL_RULES[input.level];
  const upgrade = !!next && candidate >= next.threshold && input.income >= next.income;
  // Integer percentages avoid IEEE rounding at exact integer boundaries.
  const decayed = Math.floor(input.score * (100 - rule.decay) / 100);
  const score = upgrade ? candidate : Math.max(0, decayed + input.points - penalty - reviewDeduction);
  const level = upgrade ? input.level + 1 : score < rule.threshold ? Math.max(1, input.level - 1) : input.level;
  const streak = level === 1 ? input.lv1Weeks + 1 : 0;
  return { level, score, noOrderWeeks, penalty, decay: upgrade ? 0 : input.score - decayed, lv1Weeks: streak >= 4 ? 0 : streak, suspend: streak >= 4 };
}
