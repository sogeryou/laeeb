import { expect, it } from 'vitest';
import { catchUpMessages, reconcilePosts, flushReadQueue } from '../../client/lib/socialSync';
import type { Message, Post } from '../../shared/types';

it('catches up more than 50 messages after an empty chat was opened', async () => {
  const messages = Array.from({ length: 120 }, (_, n) => ({ id: String(n), timestamp: n } as Message));
  const page = async (before?: string) => { const end = before ? Number(before) : messages.length; return { items: messages.slice(Math.max(0, end - 50), end), nextBefore: end > 50 ? String(end - 50) : null }; };
  const result = await catchUpMessages(page, new Set(), true);
  expect(result.items).toHaveLength(120);
  expect(result.nextBefore).toBeNull();
  expect((await catchUpMessages(page, new Set(['10']), true)).items.some(m => m.id === '10')).toBe(true);
  expect((await catchUpMessages(page, new Set(), false)).items).toHaveLength(50);
});
it('retains posts published after a feed request began without duplicating them', () => {
  const a = { id: 'a', timestamp: 1 } as Post, b = { id: 'b', timestamp: 2 } as Post;
  expect(reconcilePosts([a], [b]).map(p => p.id)).toEqual(['b', 'a']);
  expect(reconcilePosts([b, a], [b])).toHaveLength(2);
});
it('retains unread acknowledgements after failure and retries all batches', async () => {
  const pending = new Set(Array.from({ length: 120 }, (_, n) => String(n)));
  await expect(flushReadQueue(pending, async () => { throw new Error('offline'); }, () => true)).rejects.toThrow('offline');
  expect(pending.size).toBe(120);
  const sent: string[][] = [];
  await flushReadQueue(pending, async ids => { sent.push(ids); }, () => true);
  expect(sent.map(ids => ids.length)).toEqual([100, 20]); expect(pending.size).toBe(0);
});
