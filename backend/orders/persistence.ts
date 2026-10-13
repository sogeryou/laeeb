import type { AppContext } from '../app/context.js';
import { notificationRows } from '../notifications/events.js';

export class OrderSaveError extends Error {
  constructor() { super('ORDER_PERSISTENCE_UNAVAILABLE'); }
}

function restoreObject(target: object, saved: object) {
  for (const key of Object.keys(target)) delete (target as Record<string, unknown>)[key];
  Object.assign(target, saved);
}

// Keep the server's shared collection and entity references intact on rollback.
export function persistOrderMutation<T>(ctx: AppContext, mutate: () => T): T {
  notificationRows(ctx);
  const undo: Array<() => void> = [];
  for (const key of ['orders', 'reviews', 'walletTransactions', 'couponGrants', 'levelEvents', 'riskEvents', 'notifications', 'auditLogs'] as const) {
    const collection = ctx[key];
    if (!collection) continue;
    const rows = collection.slice();
    const saved = structuredClone(rows);
    undo.push(() => {
      rows.forEach((row, index) => restoreObject(row, saved[index]));
      (collection as object[]).splice(0, collection.length, ...rows);
    });
  }
  for (const key of ['wallets', 'diamondWallets'] as const) {
    const collection = ctx[key];
    const rows = { ...collection };
    const saved = structuredClone(rows);
    undo.push(() => {
      for (const id of Object.keys(collection)) delete collection[id];
      for (const [id, row] of Object.entries(rows)) {
        restoreObject(row, saved[id]); collection[id] = row;
      }
    });
  }
  let result: T;
  try { result = mutate(); } catch (error) { undo.forEach(restore => restore()); throw error; }
  try { ctx.persistState(); } catch { undo.forEach(restore => restore()); throw new OrderSaveError(); }
  return result;
}
