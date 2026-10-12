import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApplyPlayerView } from '../../client/views/ApplyPlayerView';

let app: any;
let renderer: ReactTestRenderer | undefined;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: { div: ({ children, ...props }: any) => React.createElement('div', props, children) },
}));
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { if (renderer) await act(async () => renderer!.unmount()); renderer = undefined; vi.unstubAllGlobals(); });

it.each(['PENDING', 'APPROVED'] as const)('shows a refresh error without reopening the %s application form', async status => {
  const refresh = vi.fn(async () => {});
  app = {
    locale: 'en', t: (key: string) => key, GAMES: [], playerApplicationStep: 1,
    showApplySelectionModal: { show: false },
    playerApplicationStatus: status,
    companionApplication: { application: { status }, loading: false, error: 'COMPANION_LOAD_FAILED', refresh },
  };
  await act(async () => { renderer = create(React.createElement(ApplyPlayerView)); });
  expect(renderer!.root.findAll(node => node.props.role === 'alert')).toHaveLength(1);
  expect(renderer!.root.findAllByType('input')).toHaveLength(0);
  expect(renderer!.root.findAllByType('fieldset')).toHaveLength(0);
  const retry = renderer!.root.findAllByType('button').find(node => node.children.includes('Refresh'))!;
  expect(retry).toBeTruthy();
  await act(async () => { await retry.props.onClick(); });
  expect(refresh).toHaveBeenCalledOnce();
});
