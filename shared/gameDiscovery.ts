import type { EPal } from './types.js';

export type GameDiscoveryQuery = {
  status: 'ALL' | 'ONLINE';
  gender: 'ALL' | 'M' | 'F' | 'U';
  minPrice: number;
  maxPrice: number;
  sort: 'DEFAULT' | 'ORDERS' | 'SCORE';
};

export type GameCompanion = EPal & {
  profileGender?: 'M' | 'F' | 'U';
  reviewCount: number;
  completedOrders30d: number;
  bookable: boolean;
};

export type GameDiscoveryPage = {
  gameId: string;
  gameName: string;
  query: GameDiscoveryQuery;
  page: number;
  limit: number;
  total: number;
  onlineCount: number;
  items: GameCompanion[];
  nextPage: number | null;
};

export const DEFAULT_GAME_DISCOVERY_QUERY: GameDiscoveryQuery = Object.freeze({
  status: 'ALL', gender: 'ALL', minPrice: 0, maxPrice: 10000, sort: 'DEFAULT',
});

const games = [
  { id: 'lol', name: 'League of Legends', aliases: ['League Pro'] },
  { id: 'val', name: 'Valorant', aliases: ['Tactical Duo'] },
  { id: 'pubg', name: 'PUBG Mobile', aliases: ['Battle Royale'] },
  { id: 'genshin', name: 'Genshin Impact', aliases: ['Open World'] },
  { id: 'apex', name: 'Apex Legends', aliases: [] },
  { id: 'dota', name: 'Dota 2', aliases: [] },
  { id: 'csgo', name: 'Counter-Strike: Global Offensive', aliases: ['CS:GO'] },
  { id: 'minecraft', name: 'Minecraft', aliases: [] },
  { id: 'chat', name: 'Just Chatting', aliases: [] },
];

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
const aliases = new Map(games.flatMap(game => [game.name, ...game.aliases].map(name => [normalize(name), game.id] as const)));

export function getDiscoveryGame(id: string): { id: string; name: string } | null {
  const game = games.find(entry => entry.id === id);
  return game ? { id: game.id, name: game.name } : null;
}

export function resolveDiscoveryGameId(name: string): string | null {
  return aliases.get(normalize(name)) ?? null;
}
