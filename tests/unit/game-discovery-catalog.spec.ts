import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_DISCOVERY_QUERY, getDiscoveryGame, resolveDiscoveryGameId } from '../../shared/gameDiscovery';

const games = [
  ['lol', 'League of Legends', 'League Pro'],
  ['val', 'Valorant', 'Tactical Duo'],
  ['pubg', 'PUBG Mobile', 'Battle Royale'],
  ['genshin', 'Genshin Impact', 'Open World'],
  ['apex', 'Apex Legends', 'Apex Legends'],
  ['dota', 'Dota 2', 'Dota 2'],
  ['csgo', 'Counter-Strike: Global Offensive', 'CS:GO'],
  ['minecraft', 'Minecraft', 'Minecraft'],
  ['chat', 'Just Chatting', 'Just Chatting'],
];

describe('discovery catalog', () => {
  it.each(games)('resolves canonical and old display names for %s', (id, name, oldName) => {
    expect(getDiscoveryGame(id)).toEqual({ id, name });
    for (const alias of [name, oldName]) {
      expect(resolveDiscoveryGameId(alias)).toBe(id);
      expect(resolveDiscoveryGameId(`  ${alias.toUpperCase().replaceAll(' ', '  ')}  `)).toBe(id);
    }
  });

  it.each(['PUBG', 'PUBG PC', 'PUBG: BATTLEGROUNDS', 'BATTLEGROUNDS', 'Battle Royale PC', 'Battle Chess', 'League Racing', 'Tactical Chess', 'Open Season', 'Apex', 'Dota', 'CS2', 'Minecraft Dungeons', 'Just Dance', 'Valorant coaching', 'Custom Game', '', 'toString', '__proto__'])('does not guess a game from %s', name => {
    expect(resolveDiscoveryGameId(name)).toBeNull();
  });

  it.each(['PUBG', 'unknown', 'toString', '__proto__', ' pubg ', ''])('requires a stable supported ID: %s', id => {
    expect(getDiscoveryGame(id)).toBeNull();
  });

  it('defaults to the full price range and all statuses and genders', () => {
    expect(DEFAULT_GAME_DISCOVERY_QUERY).toEqual({ status: 'ALL', gender: 'ALL', minPrice: 0, maxPrice: 10000, sort: 'DEFAULT' });
  });
});
