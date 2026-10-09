import type { AppContext } from '../app/context.js';
import type { StoredMessage } from './social.js';
import { recordLevelEvent } from '../player-center/events.js';

export const GREETING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasGreetingReward(ctx: AppContext, playerId: string, customerId: string) {
  return ctx.levelEvents.some(e => e.kind === 'GREETING_REPLY' && e.userId === playerId && e.referenceId === customerId);
}

export function isNewGreetingCustomer(ctx: AppContext, playerId: string, customerId: string) {
  const companionIds = new Set(ctx.companions.filter(c => c.userId === playerId).map(c => c.id));
  return !ctx.orders.some(o => o.userId === customerId && companionIds.has(o.companionId) && o.status === 'COMPLETED');
}

export function latestGreeting(ctx: AppContext, playerId: string, customerId: string) {
  return [...ctx.socialMessages].reverse().find(m => m.senderId === playerId && m.receiverId === customerId && m.greeting);
}

// Called inside the message save transaction. Eligibility is captured when the greeting is sent.
export function recordGreetingReply(ctx: AppContext, reply: StoredMessage) {
  if (!ctx.companions.some(c => c.userId === reply.receiverId && c.status === 'APPROVED')) return;
  if (hasGreetingReward(ctx, reply.receiverId, reply.senderId)) return;
  const greeting = latestGreeting(ctx, reply.receiverId, reply.senderId);
  if (!greeting?.greeting || reply.timestamp < greeting.timestamp || reply.timestamp > greeting.greeting.expiresAt) return;
  recordLevelEvent(ctx, {
    id: `greeting-reply:${greeting.id}`, userId: reply.receiverId, at: reply.timestamp,
    kind: 'GREETING_REPLY', referenceId: reply.senderId,
  });
}
