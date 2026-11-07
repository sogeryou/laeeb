import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CommunityView } from '../../client/views/CommunityView';
import { AppShell } from '../../client/app/AppShell';
import { AUTH_SESSION_EVENT } from '../../client/features/auth/session';

let app: any, root: ReactTestRenderer | null;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({ motion: { div: ({ children, ...p }: any) => React.createElement('div', p, children) }, AnimatePresence: ({ children }: any) => children }));
vi.mock('../../client/views/ViewRouter', () => ({ ViewRouter: () => null }));
async function render(element: React.ReactElement) { await act(async () => { root = create(element); }); }
async function editor() { const path = '../../client/views/PostComposerView'; const mod = await import(path).catch(() => ({})); expect(typeof mod.PostComposerView).toBe('function'); await render(React.createElement(mod.PostComposerView)); }
const button = (name: string) => root!.root.findAllByType('button').find(n => n.props['aria-label'] === name || n.children.includes(name));
beforeEach(() => {
  root = null; vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('document', { getElementById: () => null });
  app = { currentView: 'POST_CREATE', locale: 'en', t: (k: string) => k, authUser: { id: 'A' }, authToken: 'token-A',
    social: { postDraft: 'Hello', setPostDraft: vi.fn(), publishPost: vi.fn(async () => false), publishingPost: false, postError: '', postListMode: 'public', setPostListMode: vi.fn(), invalidatePostComposer: vi.fn() },
    communityTab: 'TRENDING', setCommunityTab: vi.fn(), setSelectedGame: vi.fn(), filteredPosts: [], requireAuthAction: vi.fn(() => true),
    handleBack: vi.fn(), navigateTo: vi.fn(), notify: vi.fn(), viewHistory: ['COMMUNITY', 'POST_CREATE'], GAMES: [], notifications: { unreadCount: 0 }, authMode: 'LOGIN',
  };
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.unstubAllGlobals(); });
it('removes the inline editor and text create command from the community feed', async () => {
  app.currentView = 'COMMUNITY'; await render(React.createElement(CommunityView));
  expect(JSON.stringify(root!.toJSON())).not.toContain('Create post'); expect(root!.root.findAllByType('textarea')).toHaveLength(0);
});
it('places an accessible compose icon in the community header and opens the dedicated view', async () => {
  app.currentView = 'COMMUNITY'; app.selectedGame = null; await render(React.createElement(AppShell));
  expect(button('Create post')).toBeTruthy(); expect(button('Create post')!.props.title).toBe('Create post');
  await act(async () => button('Create post')!.props.onClick()); expect(app.navigateTo).toHaveBeenCalledWith('POST_CREATE');
});
it('renders a standalone editor with localized controls and the existing text limit', async () => {
  await editor(); expect(root!.root.findByProps({ 'aria-label': 'Post content' }).props.maxLength).toBe(5000); expect(root!.root.findAllByType('form')).toHaveLength(1);
  expect(button('Publish')!.props.disabled).toBe(false); expect(JSON.stringify(root!.toJSON())).not.toContain('Upload');
});
it.each(['', '   ', 'x'.repeat(5001)])('disables publishing empty or over-limit text', async value => {
  app.social.postDraft = value; await editor(); expect(button('Publish')!.props.disabled).toBe(true);
});
it('cancel preserves draft and restores community history', async () => {
  await editor(); await act(async () => button('Cancel')!.props.onClick()); expect(app.handleBack).toHaveBeenCalledTimes(1); expect(app.social.setPostDraft).not.toHaveBeenCalled();
});
it('keeps failures in the editor and returns to real owner review status only after success', async () => {
  app.social.postError = 'NETWORK_ERROR'; await editor(); expect(root!.root.findAllByProps({ role: 'alert' })).toHaveLength(1);
  await act(async () => { await root!.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); expect(app.handleBack).not.toHaveBeenCalled();
  app.social.publishPost.mockResolvedValueOnce(true);
  await act(async () => { await root!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  expect(app.social.setPostListMode).toHaveBeenCalledWith('mine'); expect(app.setCommunityTab).toHaveBeenCalledWith('LATEST'); expect(app.handleBack).toHaveBeenCalledTimes(1);
});
it('provides Arabic RTL editor labels', async () => {
  app.locale = 'ar'; await editor(); expect(root!.root.findAllByProps({ dir: 'rtl' }).length).toBeGreaterThan(0); expect(button('نشر')).toBeTruthy();
});
it('keeps the legitimate deferred success when the current handler is submitted twice synchronously', async () => {
  let finish!: (success: boolean) => void;
  app.social.publishPost.mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve; }));
  await editor();
  const submit = root!.root.findByType('form').props.onSubmit;
  await act(async () => {
    const first = submit({ preventDefault() {} });
    const duplicate = submit({ preventDefault() {} });
    finish(true);
    await Promise.all([first, duplicate]);
  });
  expect(app.social.publishPost).toHaveBeenCalledTimes(1);
  expect(app.handleBack).toHaveBeenCalledTimes(1);
  expect(app.social.setPostListMode).toHaveBeenCalledWith('mine');
  expect(app.setCommunityTab).toHaveBeenCalledWith('LATEST');
});
it('omits feed navigation padding from the full-height composer route', async () => {
  await render(React.createElement(AppShell));
  expect(root!.root.findByType('main').props.className).not.toContain('pb-32');
});
it.each(['cancel', 'session', 'owner', 'unmount'])('ignores obsolete success after %s without releasing a newer attempt', async reason => {
  let finishOld!: (success: boolean) => void, finishNew!: (success: boolean) => void;
  app.social.publishPost
    .mockImplementationOnce(() => new Promise<boolean>(resolve => { finishOld = resolve; }))
    .mockImplementationOnce(() => new Promise<boolean>(resolve => { finishNew = resolve; }));
  await editor();
  let old!: Promise<void>;
  await act(async () => { old = root!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await act(async () => {
    if (reason === 'cancel') button('Cancel')!.props.onClick();
    if (reason === 'session') {
      const event = new Event(AUTH_SESSION_EVENT);
      Object.defineProperty(event, 'detail', { value: { user: { id: 'A' }, token: 'rotated' } });
      window.dispatchEvent(event);
    }
    if (reason === 'owner') { app.authUser = { id: 'B' }; const { PostComposerView } = await import('../../client/views/PostComposerView'); root!.update(React.createElement(PostComposerView)); }
    if (reason === 'unmount') root!.unmount();
  });
  if (reason === 'unmount') await editor();
  app.handleBack.mockClear();
  let fresh!: Promise<void>;
  await act(async () => { fresh = root!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await act(async () => { finishOld(true); await old; });
  expect(app.handleBack).not.toHaveBeenCalled();
  await act(async () => { await root!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  expect(app.social.publishPost).toHaveBeenCalledTimes(2);
  await act(async () => { finishNew(true); await fresh; });
  expect(app.handleBack).toHaveBeenCalledTimes(1);
});
