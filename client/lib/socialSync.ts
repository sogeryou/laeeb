import type { Message, Post } from '@shared/types';
type MessagePage = { items: Message[]; nextBefore: string | null };

export async function catchUpMessages(fetchPage: (before?: string) => Promise<MessagePage>, known: Set<string>, initialized: boolean): Promise<MessagePage> {
  let page = await fetchPage();
  const items = [...page.items], cursors = new Set<string>();
  while (initialized && page.nextBefore && !page.items.some(m => known.has(m.id))) {
    if (cursors.has(page.nextBefore)) throw new Error('INVALID_MESSAGE_CURSOR');
    cursors.add(page.nextBefore);
    page = await fetchPage(page.nextBefore);
    items.unshift(...page.items);
  }
  return { items: [...new Map(items.map(m => [m.id, m])).values()], nextBefore: page.nextBefore };
}

export function reconcilePosts(snapshot: Post[], publishedSinceRequest: Post[]) {
  return [...new Map([...snapshot, ...publishedSinceRequest].map(post => [post.id, post])).values()].sort((a, b) => b.timestamp - a.timestamp);
}

export async function flushReadQueue(pending: Set<string>, send: (ids: string[]) => Promise<unknown>, visible: () => boolean) {
  while (pending.size && visible()) {
    const ids = [...pending].slice(0, 100);
    await send(ids);
    ids.forEach(id => pending.delete(id));
  }
}
