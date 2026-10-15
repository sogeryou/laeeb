import { z } from 'zod';
import { getDiscoveryGame, resolveDiscoveryGameId, type GameDiscoveryPage, type GameDiscoveryQuery } from '@shared/gameDiscovery';

const count = z.number().int().nonnegative().safe();
const price = z.number().finite().nonnegative().max(10000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-7);
const text = z.string().max(4096);
const servicePrice = z.number().finite().nonnegative().refine(n => Number.isSafeInteger(Math.round(n * 100)));
const variant = z.object({ name: text, price: servicePrice, unit: z.string().min(1).max(100) });
const service = z.object({ id: text.min(1), name: text.min(1), icon: text, posterUrl: text, description: text, rating: z.number().finite().min(0).max(5), orderCount: text, screenshots: z.array(text).max(20), variants: z.array(variant).min(1).max(20) });
const item = z.object({
  id: text.min(1), userId: text.min(1), name: text.min(1), avatarUrl: text.min(1), game: text.min(1),
  price, rating: z.number().finite().min(0).max(5), reviewCount: count, completedOrders30d: count,
  orderCount: z.string().regex(/^(0|[1-9]\d*)$/), tags: z.array(text).max(200),
  onlineStatus: z.enum(['Online', 'Busy', 'Offline']), profileGender: z.enum(['M', 'F', 'U']).optional(),
  bookable: z.boolean(), bio: text.optional(), services: z.array(service).min(1).max(21),
});
const querySchema = z.object({ status: z.enum(['ALL', 'ONLINE']), gender: z.enum(['ALL', 'M', 'F', 'U']), minPrice: price, maxPrice: price, sort: z.enum(['DEFAULT', 'ORDERS', 'SCORE']) }).strict();
const pageSchema = z.object({ gameId: text, gameName: text, query: querySchema, page: count.positive(), limit: count.positive().max(50), total: count, onlineCount: count, items: z.array(item).max(50), nextPage: count.positive().nullable() });

export function discoveryQueryKey(query: GameDiscoveryQuery): string {
  return JSON.stringify([query.status, query.gender, query.minPrice, query.maxPrice, query.sort]);
}

export function readDiscoveryPage(value: unknown, gameId: string, query: GameDiscoveryQuery, page: number, limit: number): GameDiscoveryPage {
  const parsed = pageSchema.safeParse(value), game = getDiscoveryGame(gameId);
  if (!parsed.success || !game) throw Error('DISCOVERY_RESPONSE_INVALID');
  const data = parsed.data as GameDiscoveryPage, offset = (page - 1) * limit;
  const expectedLength = Math.min(limit, Math.max(0, data.total - offset));
  if (data.gameId !== gameId || data.gameName !== game.name || data.page !== page || data.limit !== limit
    || discoveryQueryKey(data.query) !== discoveryQueryKey(query) || data.query.minPrice > data.query.maxPrice
    || !Number.isSafeInteger(offset) || data.items.length !== expectedLength
    || data.nextPage !== (offset + data.items.length < data.total ? page + 1 : null)
    || new Set(data.items.map(p => p.id)).size !== data.items.length
    || data.onlineCount < data.items.filter(p => p.onlineStatus === 'Online').length
    || data.items.some(p => {
      const primary = p.services[0], choice = primary.variants[0];
      return resolveDiscoveryGameId(p.game) !== gameId || p.price < query.minPrice || p.price > query.maxPrice
        || query.status === 'ONLINE' && p.onlineStatus !== 'Online'
        || query.gender !== 'ALL' && p.profileGender !== query.gender
        || Number(p.orderCount) !== p.completedOrders30d || primary.id !== p.id || choice.price !== p.price || choice.unit !== 'hr'
        || p.reviewCount === 0 && p.rating !== 0 || p.reviewCount > 0 && p.rating < 1
        || p.bookable && p.onlineStatus !== 'Online';
    })) throw Error('DISCOVERY_RESPONSE_INVALID');
  return data;
}
