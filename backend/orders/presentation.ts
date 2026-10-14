import type { BusinessOrder } from '../../shared/orders.js';
import type { EPal } from '../../shared/types.js';
import type { AppContext } from '../app/context.js';
import type { CompanionEntity, OrderEntity } from '../domain/types.js';
import { serviceChoices } from './pricing.js';

export const orderAvatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#281940"/><text x="50" y="65" text-anchor="middle" font-size="50" fill="white">\u265f</text></svg>');

export function companionProfile(ctx: AppContext, companion: CompanionEntity, rating = 0, orderCount = '0'): EPal {
  const user = ctx.users.find(u => u.id === companion.userId);
  const avatarUrl = user?.avatar || orderAvatar;
  return {
    id: companion.id, userId: companion.userId, name: user?.username || 'Player', avatarUrl,
    rating, orderCount, price: serviceChoices(companion)[0].unitPrice, game: companion.gameName,
    tags: user?.tags || [], onlineStatus: companion.availability === 'ONLINE' ? 'Online' : companion.availability === 'BUSY' ? 'Busy' : 'Offline', bio: user?.bio ?? companion.intro,
    services: serviceChoices(companion).map(service => ({
      id: service.id, name: service.name, icon: '\u{1F3AE}', posterUrl: avatarUrl, description: companion.intro,
      rating, orderCount, screenshots: [], variants: [{ name: service.name, price: service.unitPrice, unit: service.unit }],
    })),
  };
}

export function toBusinessOrder(ctx: AppContext, order: OrderEntity, viewerId: string): BusinessOrder {
  const companion = ctx.companions.find(c => c.id === order.companionId);
  const role = order.userId === viewerId ? 'BUYER' : 'COMPANION';
  const buyer = ctx.users.find(u => u.id === order.userId);
  const participant: EPal = role === 'BUYER' && companion ? companionProfile(ctx, companion) : {
    id: role === 'BUYER' ? order.companionId : order.userId,
    ...(role === 'COMPANION' ? { userId: order.userId } : {}),
    name: role === 'COMPANION' ? buyer?.username || 'User' : 'Player',
    avatarUrl: role === 'COMPANION' ? buyer?.avatar || orderAvatar : orderAvatar,
    rating: 0, orderCount: '0', price: 0, game: order.serviceName, tags: role === 'COMPANION' ? buyer?.tags || [] : [],
  };
  const review = ctx.reviews.find(r => r.orderId === order.id);
  const { requestPayload: _internal, ...fields } = order;
  return { ...fields, role, participant, reviewed: Boolean(review), ...(review ? { review } : {}) };
}
