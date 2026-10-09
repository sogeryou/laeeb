import type { AppContext } from '../app/context.js';
import type { CenterAnalytics, CenterPeriod } from '../../shared/playerCenter.js';

type Source = Pick<AppContext, 'orders' | 'companions' | 'reviews' | 'users' | 'walletTransactions'>;
const partsAt = (time: number, timezone: string) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(time);
  const n = (key: string) => Number(p.find(v => v.type === key)?.value);
  return [n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')];
};
function localMidnight(date: Date, timezone: string) {
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const [y, m, d, h, min, s] = partsAt(guess, timezone);
    const delta = target - Date.UTC(y, m, d, h, min, s);
    guess += delta;
    if (!delta) break;
  }
  return guess;
}
export function periodRange(period: CenterPeriod, now: number, timezone: string) {
  if (period === 'ALL') return { start: 0, end: now + 1 };
  const [y, m, d] = partsAt(now, timezone);
  const start = new Date(Date.UTC(y, m, d));
  if (period === 'WEEK') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period === 'MONTH') start.setUTCDate(1);
  const end = new Date(start);
  if (period === 'MONTH') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (period === 'WEEK' ? 7 : 1));
  return { start: localMidnight(start, timezone), end: localMidnight(end, timezone) };
}

export function buildAnalytics(ctx: Source, userId: string, period: CenterPeriod, now = Date.now(), timezone = 'Asia/Riyadh'): CenterAnalytics {
  const range = periodRange(period, now, timezone);
  const inside = (t: number) => Number.isFinite(t) && t >= range.start && t < range.end && t <= now;
  const ids = new Set(ctx.companions.filter(c => c.userId === userId).map(c => c.id));
  const candidates = ctx.orders.filter(o => ids.has(o.companionId) && o.status === 'COMPLETED' && o.settlementDone);
  const validIds = new Set(candidates.map(o => o.id));
  const seen = new Set<string>();
  const txs = ctx.walletTransactions.filter(t => {
    if (seen.has(t.id) || t.userId !== userId || t.type !== 'INCOME' || !validIds.has(t.referenceId) || !Number.isFinite(t.amount) || !Number.isFinite(t.timestamp) || t.timestamp > now) return false;
    seen.add(t.id); return true;
  });
  const settledAt = new Map<string, number>();
  for (const t of txs) if (t.amount > 0) settledAt.set(t.referenceId, Math.min(settledAt.get(t.referenceId) ?? Infinity, t.timestamp));
  // Use the server ledger settlement time, never the order completion time.
  const orders = candidates.filter(o => settledAt.has(o.id)).map(o => ({ ...o, completedAt: settledAt.get(o.id)! }))
    .sort((a, b) => a.completedAt - b.completedAt || a.id.localeCompare(b.id));
  // Ledger uses decimal amounts already. Round to hundredths at the boundary, sum integers.
  const minor = (n: number) => Math.round(n * 100);
  const perOrder = new Map<string, number>();
  for (const tx of txs) perOrder.set(tx.referenceId, (perOrder.get(tx.referenceId) || 0) + minor(tx.amount));
  const incomeTxs = txs.filter(t => inside(t.timestamp));
  const services = new Map<string, { id: string; name: string; cents: number; orders: Set<string> }>();
  const orderMap = new Map(orders.map(o => [o.id, o]));
  const serviceKey = (o: Source['orders'][number]) => o.serviceId || `legacy:${o.companionId}:${o.serviceName}`;
  for (const tx of incomeTxs) {
    const order = orderMap.get(tx.referenceId);
    if (!order) continue;
    const id = serviceKey(order);
    const name = order.serviceName || 'Service';
    const row = services.get(id) || { id, name, cents: 0, orders: new Set<string>() };
    row.cents += minor(tx.amount); row.orders.add(tx.referenceId); services.set(id, row);
  }
  const reviews = new Map<string, Source['reviews'][number]>();
  for (const r of ctx.reviews) {
    if (!validIds.has(r.orderId) || r.status !== 'APPROVED' || r.rating < 1 || r.rating > 5 || !Number.isInteger(r.rating) || (r.updatedAt || r.createdAt) > now) continue;
    const old = reviews.get(r.orderId);
    if (!old || (old.updatedAt || old.createdAt) < (r.updatedAt || r.createdAt)) reviews.set(r.orderId, r);
  }
  const first = new Map<string, string>();
  for (const o of orders) if (!first.has(o.userId)) first.set(o.userId, o.id);
  const periodOrders = orders.filter(o => inside(o.completedAt!));
  const serviceReviews = new Map<string, { id: string; name: string; orders: number; ratings: number[] }>();
  for (const o of periodOrders) {
    const id = serviceKey(o);
    const row = serviceReviews.get(id) || { id, name: o.serviceName, orders: 0, ratings: [] };
    row.orders++;
    if (reviews.has(o.id)) row.ratings.push(reviews.get(o.id)!.rating);
    serviceReviews.set(id, row);
  }
  const activeIds = new Set(periodOrders.map(o => o.userId));
  const items = [...activeIds].map(id => {
    const own = periodOrders.filter(o => o.userId === id);
    const firstAt = orderMap.get(first.get(id)!)!.completedAt!;
    const ratings = own.flatMap(o => reviews.has(o.id) ? [reviews.get(o.id)!.rating] : []);
    const user = ctx.users.find(u => u.id === id);
    const name = user && (!user.accountStatus || user.accountStatus === 'ACTIVE') ? user.username : 'Unavailable user';
    return { id, name, group: (firstAt >= range.start ? 'NEW' : 'OLD') as 'NEW' | 'OLD', orders: own.length,
      income: own.reduce((sum, o) => sum + (perOrder.get(o.id) || 0), 0) / 100, latest: Math.max(...own.map(o => o.completedAt!)), first: firstAt,
      rating: ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10 : null };
  });
  const newCount = items.filter(c => c.group === 'NEW').length;
  const total = incomeTxs.filter(t => orderMap.has(t.referenceId)).reduce((sum, t) => sum + minor(t.amount), 0) / 100;
  const warnings = ['Gift income, historical adjustments and IM/activity events are not connected.', 'Level rules are preview-only; no account level or pricing is changed.'];
  if (candidates.some(o => !settledAt.has(o.id))) warnings.push('Some orders marked settled have no positive income ledger entry; these orders are excluded pending reconciliation.');
  if (periodOrders.some(o => !o.serviceId)) warnings.push('Legacy orders without service IDs use companion + historical service name; renamed legacy services remain separate.');
  return { period, asOf: now, timezone, range,
    income: { total, service: total, gift: null, services: [...services.values()].map(s => ({ id: s.id, name: s.name, income: s.cents / 100, orders: s.orders.size })).sort((a, b) => b.income - a.income || a.id.localeCompare(b.id)) },
    customers: { counts: { total: items.length, new: newCount, old: items.length - newCount }, items,
      services: [...serviceReviews.values()].map(s => ({ id: s.id, name: s.name, orders: s.orders, reviews: s.ratings.length, rating: s.ratings.length ? Math.round(s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length * 10) / 10 : null })) },
    tasks: { newCustomers: newCount, repeatCustomers: new Set(periodOrders.filter(o => first.get(o.userId) !== o.id).map(o => o.userId)).size,
      ratingStars: periodOrders.reduce((sum, o) => sum + (reviews.get(o.id)?.rating || 0), 0), income: total, giftIncome: 0 }, warnings };
}
