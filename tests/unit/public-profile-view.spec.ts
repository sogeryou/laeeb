import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProfileView } from '../../client/views/ProfileView';

let app: any, root: ReactTestRenderer;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({ AnimatePresence: ({ children }: any) => children, motion: new Proxy({}, { get: (_, tag: string) => tag }) }));
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  app = { locale: 'en', t: (s: string) => s, selectedEPal: { id: 'cp', name: 'Player', avatarUrl: '', rating: 0, tags: [], services: [], bio: 'Duo' },
    followedEPals: new Set(), profileTab: 'Service', publicProfile: { loading: true, error: '', refresh: vi.fn() }, navigateTo: vi.fn() };
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });
const play = () => root.root.findAllByType('button').find(b => b.children.includes(' Play'))!;
it('disables new booking until current public service data has loaded', async () => {
  await act(async () => { root = create(React.createElement(ProfileView)); });
  expect(play().props.disabled).toBe(true);
  app.publicProfile.loading = false;
  await act(async () => root.update(React.createElement(ProfileView)));
  expect(play().props.disabled).toBe(false);
});
it('blocks stale booking on profile read failure and offers a retry', async () => {
  app.publicProfile = { loading: false, error: 'Unavailable', refresh: vi.fn() };
  await act(async () => { root = create(React.createElement(ProfileView)); });
  expect(play().props.disabled).toBe(true);
  const retry = root.root.findAllByType('button').find(b => b.props['aria-label'] === 'Retry profile')!;
  expect(retry).toBeDefined();
  await act(async () => retry.props.onClick());
  expect(app.publicProfile.refresh).toHaveBeenCalledOnce();
});
