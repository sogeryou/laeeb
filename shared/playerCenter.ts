export type CenterPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'ALL';
export interface OfficialLevel {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  score: number;
  noOrderWeeks: number;
  lv1Weeks: number;
  suspended: boolean;
  updatedAt: number;
  source: 'NEW_ACCOUNT' | 'IMPORTED' | 'SETTLEMENT';
  lastSettledWeek?: string;
  ruleVersion: 'PRD-2026-09';
}
export type CustomerGroup = 'ALL' | 'NEW' | 'OLD';
export type CustomerSort = 'TIME' | 'ORDERS' | 'INCOME';
export const LEVEL_RULES = [
  { level: 1, threshold: 0, decay: 2, minPrice: 20, maxPrice: 30, exposure: 0, income: 0 },
  { level: 2, threshold: 200, decay: 4, minPrice: 30, maxPrice: 40, exposure: 5, income: 0 },
  { level: 3, threshold: 400, decay: 5, minPrice: 40, maxPrice: 60, exposure: 10, income: 300 },
  { level: 4, threshold: 800, decay: 6, minPrice: 50, maxPrice: 80, exposure: 20, income: 800 },
  { level: 5, threshold: 1500, decay: 7, minPrice: 60, maxPrice: 100, exposure: 30, income: 1500 },
  { level: 6, threshold: 2500, decay: 8, minPrice: 80, maxPrice: 150, exposure: 50, income: 3000 },
] as const;
export interface CustomerRow {
  id: string; name: string; group: 'NEW' | 'OLD'; orders: number; income: number;
  latest: number; first: number; rating: number | null;
}
export interface TaskInputs { newCustomers: number; repeatCustomers: number; ratingStars: number; income: number; giftIncome: number }
export interface CenterAnalytics {
  period: CenterPeriod; asOf: number; timezone: string; range: { start: number; end: number };
  income: { total: number; service: number; gift: number | null; services: { id: string; name: string; income: number; orders: number }[] };
  customers: { counts: { total: number; new: number; old: number }; items: CustomerRow[]; services: { id: string; name: string; orders: number; rating: number | null; reviews: number }[] };
  tasks: TaskInputs; warnings: string[];
}
export interface CenterResponse extends CenterAnalytics {
  snapshot: string; expiresAt: number; offset: number; nextOffset: number | null; filteredCount: number;
  weeklyTasks: TaskInputs;
  weeklyPoints: { newCustomers: number; repeatCustomers: number; rating: number; gift: number; income: number; service: number; total: number };
  levelStatus: 'PREVIEW_ONLY' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_INITIALIZATION';
  officialLevel?: OfficialLevel | null;
  activity?: { loginDays: number; postDays: number; greetings: number; replyRate: number | null; acceptanceRate: number | null; points: number };
  connectedActivity?: Array<'login' | 'accept' | 'post' | 'reply' | 'greet'>;
}
