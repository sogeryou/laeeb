import type { AdminState } from '../../store/reducer';

export type DataViewMode = '合计' | '按天';

export interface DashboardMetricRow {
  day: string;
  rechargeCoins: number;
  withdrawDiamonds: number;
  registrations: number;
  newCompanions: number;
  orderUsers: number;
  orderCount: number;
  orderSpendCoins: number;
  giftSpendCoins: number;
}

const emptyMetricRow = (day = '合计'): DashboardMetricRow => ({
  day,
  rechargeCoins: 0,
  withdrawDiamonds: 0,
  registrations: 0,
  newCompanions: 0,
  orderUsers: 0,
  orderCount: 0,
  orderSpendCoins: 0,
  giftSpendCoins: 0,
});

export const toDateKey = (value: string): string => value.slice(0, 10);

const inRange = (time: string, start: string, end: string): boolean => {
  const day = toDateKey(time);
  return (!start || day >= start) && (!end || day <= end);
};

const addToDay = (rows: Map<string, DashboardMetricRow>, day: string) => {
  const row = rows.get(day) ?? emptyMetricRow(day);
  rows.set(day, row);
  return row;
};

export function buildDashboardRows(state: AdminState, start = '', end = ''): DashboardMetricRow[] {
  const byDay = new Map<string, DashboardMetricRow>();
  const orderUsersByDay = new Map<string, Set<string>>();

  state.rechargeRecords.filter((item) => inRange(item.time, start, end)).forEach((item) => {
    addToDay(byDay, toDateKey(item.time)).rechargeCoins += item.coinsTotal;
  });

  state.withdrawals.filter((item) => inRange(item.requestedAt, start, end)).forEach((item) => {
    addToDay(byDay, toDateKey(item.requestedAt)).withdrawDiamonds += item.diamonds;
  });

  state.users.filter((item) => inRange(item.registeredAt, start, end)).forEach((item) => {
    addToDay(byDay, toDateKey(item.registeredAt)).registrations += 1;
  });

  const companionIds = new Set(state.companionServices.map((item) => item.id));
  state.users.filter((item) => companionIds.has(item.id) && inRange(item.registeredAt, start, end)).forEach((item) => {
    addToDay(byDay, toDateKey(item.registeredAt)).newCompanions += 1;
  });

  state.orders.filter((item) => inRange(item.time, start, end)).forEach((item) => {
    const day = toDateKey(item.time);
    const row = addToDay(byDay, day);
    row.orderCount += 1;
    row.orderSpendCoins += item.total;
    const users = orderUsersByDay.get(day) ?? new Set<string>();
    users.add(item.userId);
    orderUsersByDay.set(day, users);
  });

  state.ledgers.filter((item) => item.asset === '礼物' && inRange(item.time, start, end)).forEach((item) => {
    addToDay(byDay, toDateKey(item.time)).giftSpendCoins += Math.abs(item.amount);
  });

  orderUsersByDay.forEach((users, day) => {
    addToDay(byDay, day).orderUsers = users.size;
  });

  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export function summarizeDashboardRows(rows: DashboardMetricRow[]): DashboardMetricRow {
  return rows.reduce((total, row) => ({
    day: '合计',
    rechargeCoins: total.rechargeCoins + row.rechargeCoins,
    withdrawDiamonds: total.withdrawDiamonds + row.withdrawDiamonds,
    registrations: total.registrations + row.registrations,
    newCompanions: total.newCompanions + row.newCompanions,
    orderUsers: total.orderUsers + row.orderUsers,
    orderCount: total.orderCount + row.orderCount,
    orderSpendCoins: total.orderSpendCoins + row.orderSpendCoins,
    giftSpendCoins: total.giftSpendCoins + row.giftSpendCoins,
  }), emptyMetricRow());
}

export function buildDashboardTotal(state: AdminState, start = '', end = ''): DashboardMetricRow {
  const rows = summarizeDashboardRows(buildDashboardRows(state, start, end));
  rows.orderUsers = new Set(state.orders.filter((item) => inRange(item.time, start, end)).map((item) => item.userId)).size;
  return rows;
}
