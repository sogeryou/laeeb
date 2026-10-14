import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProfileView } from '../../client/views/ProfileView';
import { MeView } from '../../client/views/MeView';

let app: any; let root: ReactTestRenderer;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({ AnimatePresence: ({ children }: any) => children, motion: new Proxy({}, { get: (_, tag: string) => tag }) }));
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); app = { locale: 'en', t: (key: string) => key, isAuthenticated: true,
  authUser: { id: 'owner', username: 'Saved nickname', avatar: '/saved.png', bio: '<b>Saved personal bio</b>' },
  userRole: 'USER', playerApplicationStatus: 'NONE', userStatus: 'ONLINE', wallet: { balance: 500 },
  selectedEPal: { id: 'cp', userId: 'provider', name: 'Saved nickname', avatarUrl: '/saved.png', rating: 0, tags: [], services: [], bio: '<b>Saved personal bio</b>' },
  followedEPals: new Set(), profileTab: 'Service', publicProfile: { loading: false, error: '', refresh: vi.fn() }, navigateTo: vi.fn(),
}; });
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });
it('shows the actual personal bio on Me as escaped text', async () => {
  await act(async () => { root = create(React.createElement(MeView)); });
  expect(root.root.findAllByType('p').some(node => node.children.includes(app.authUser.bio))).toBe(true);
  expect(root.root.findAllByType('b')).toHaveLength(0);
});
it('shows authoritative public bio as plain text rather than treating it as markup', async () => {
  await act(async () => { root = create(React.createElement(ProfileView)); });
  expect(root.root.findAllByType('p').some(node => node.children.includes(app.selectedEPal.bio))).toBe(true);
  expect(root.root.findAllByType('b')).toHaveLength(0);
});
