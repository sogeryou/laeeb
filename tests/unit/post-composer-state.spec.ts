import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSocial } from '../../client/hooks/useSocial';

const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const post = (extra = {}) => ({ id: 'real-post', userId: 'A', userName: 'Real user', userAvatar: '/real.png', content: 'Hello', timestamp: 1, likes: 0, comments: 0, status: 'PENDING', ...extra });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
let result: ReturnType<typeof useSocial>, root: ReactTestRenderer | null, browser: EventTarget;
let submit: ReturnType<typeof vi.fn>;
function Host({ owner = 'A', token = 'token-A', view = 'POST_CREATE' }: { owner?: string; token?: string | null; view?: string }) { result = useSocial(token, owner, view, null); return null; }
async function render() { await act(async () => { root = create(React.createElement(Host)); }); }
async function draft(value = 'Hello') { await act(async () => result.setPostDraft(value)); }
async function publish() { let ok = false; await act(async () => { ok = await result.publishPost(); }); return ok; }
const session = (owner = 'A', token: string | null = `token-${owner}`) => browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: token ? { token, user: { id: owner } } : null }));
beforeEach(() => {
  root = null; browser = new EventTarget(); vi.stubGlobal('window', browser); vi.stubGlobal('document', { hidden: false }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  submit = vi.fn(async () => json(post(), 201));
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => init?.method === 'POST' && url.endsWith('/posts') ? submit(url, init) : Promise.resolve(json({ items: [], nextBefore: null }))));
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); vi.unstubAllGlobals(); });

it('accepts only a real acknowledged post and moves it to the owner review list', async () => {
  await render(); await draft('  Hello  '); expect(await publish()).toBe(true);
  expect(result.postDraft).toBe(''); expect(result.postListMode).toBe('mine'); expect(result.posts).toEqual([post()]);
  expect(JSON.parse(submit.mock.calls[0][1].body)).toMatchObject({ content: 'Hello', requestId: expect.any(String) });
});
it('keeps content and the same request ID after an ambiguous failure', async () => {
  await render(); await draft(); submit.mockRejectedValueOnce(Error('NETWORK_ERROR')); expect(await publish()).toBe(false);
  expect(result.postDraft).toBe('Hello'); expect(result.postError).toBe('NETWORK_ERROR'); expect(await publish()).toBe(true);
  expect(JSON.parse(submit.mock.calls[0][1].body).requestId).toBe(JSON.parse(submit.mock.calls[1][1].body).requestId);
});
it('locks repeated submissions synchronously', async () => {
  await render(); await draft(); const pending = deferred<Response>(); submit.mockReturnValueOnce(pending.promise); let first!: Promise<boolean>;
  await act(async () => { first = result.publishPost(); expect(await result.publishPost()).toBe(false); }); expect(submit).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(json(post(), 201)); await first; }); expect(result.publishingPost).toBe(false);
});
it.each(['   ', 'x'.repeat(5001)])('never sends empty or over-limit content', async value => {
  await render(); await draft(value); expect(await publish()).toBe(false); expect(submit).not.toHaveBeenCalled();
});
it.each([
  ['missing', null], ['foreign owner', post({ userId: 'B' })], ['wrong content', post({ content: 'Other' })],
  ['missing status', post({ status: undefined })], ['fake status', post({ status: 'SUCCESS' })], ['bad timestamp', post({ timestamp: -1 })],
])('rejects a malformed %s acknowledgement without erasing the draft', async (_label, value) => {
  await render(); await draft(); submit.mockResolvedValueOnce(json(value)); expect(await publish()).toBe(false);
  expect(result.postDraft).toBe('Hello'); expect(result.posts).toEqual([]); expect(result.postError).toBeTruthy();
});
it('does not submit a stale callback after the user leaves the editor', async () => {
  await render(); await draft(); const oldSubmit = result.publishPost;
  await act(async () => root!.update(React.createElement(Host, { view: 'COMMUNITY' })));
  await act(async () => { expect(await oldSubmit()).toBe(false); }); expect(submit).not.toHaveBeenCalled(); expect(result.postDraft).toBe('Hello');
});
it('rejects an old callback after cancel and reopening the same owner editor', async () => {
  await render(); await draft('Old draft'); const oldSubmit = result.publishPost;
  await act(async () => result.invalidatePostComposer()); await draft('Hello');
  await act(async () => { expect(await oldSubmit()).toBe(false); }); expect(submit).not.toHaveBeenCalled();
  expect(await publish()).toBe(true);
});
it('uses a same-owner rotated credential published before React props update', async () => {
  await render(); await draft(); await act(async () => { session('A', 'rotated-token'); });
  expect(await publish()).toBe(true); expect(submit.mock.calls[0][1].headers.Authorization).toBe('Bearer rotated-token');
});
it.each(['route', 'cancel', 'rotation', 'logout', 'A-B-A', 'unmount'] as const)('ignores a delayed post after %s', async change => {
  await render(); await draft(); const pending = deferred<Response>(); submit.mockReturnValueOnce(pending.promise); let first!: Promise<boolean>;
  await act(async () => { first = result.publishPost(); });
  if (change === 'route') await act(async () => root!.update(React.createElement(Host, { view: 'COMMUNITY' })));
  if (change === 'cancel') await act(async () => { expect(typeof result.invalidatePostComposer).toBe('function'); result.invalidatePostComposer(); });
  if (change === 'rotation') await act(async () => root!.update(React.createElement(Host, { token: 'rotated' })));
  if (change === 'logout') await act(async () => { session('A', null); });
  if (change === 'A-B-A') await act(async () => { session('B'); session('A'); });
  if (change === 'unmount') { await act(async () => root!.unmount()); root = null; }
  await act(async () => { pending.resolve(json(post())); expect(await first).toBe(false); }); expect(result.posts).toEqual([]);
  if (['logout', 'A-B-A'].includes(change)) expect(result.postDraft).toBe('');
  else expect(result.postDraft).toBe('Hello');
});
it('preserves draft through same-owner rotation, but clears it on synchronous owner events', async () => {
  await render(); await draft(); await act(async () => { session('A', 'rotated'); }); expect(result.postDraft).toBe('Hello');
  await act(async () => root!.update(React.createElement(Host, { token: 'rotated' }))); expect(result.postDraft).toBe('Hello');
  await act(async () => { session('B'); }); expect(result.postDraft).toBe('');
});
it('does not let an old finally release a new owner submission lock', async () => {
  await render(); await draft(); const old = deferred<Response>(), fresh = deferred<Response>(); submit.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise); let first!: Promise<boolean>, second!: Promise<boolean>;
  await act(async () => { first = result.publishPost(); });
  await act(async () => root!.update(React.createElement(Host, { owner: 'B', token: 'token-B' }))); await draft();
  await act(async () => { second = result.publishPost(); }); await act(async () => { old.resolve(json(post())); expect(await first).toBe(false); });
  expect(result.publishingPost).toBe(true); await act(async () => { expect(await result.publishPost()).toBe(false); }); expect(submit).toHaveBeenCalledTimes(2);
  await act(async () => { fresh.resolve(json(post({ id: 'B-post', userId: 'B' }))); expect(await second).toBe(true); });
});
it('ignores an obsolete failure after cancel/reopen and leaves the fresh attempt intact', async () => {
  await render(); await draft(); const old = deferred<Response>(); submit.mockReturnValueOnce(old.promise); let first!: Promise<boolean>;
  await act(async () => { first = result.publishPost(); });
  await act(async () => { expect(typeof result.invalidatePostComposer).toBe('function'); result.invalidatePostComposer(); });
  await draft('Fresh'); expect(await publish()).toBe(false); // Current transport returns a mismatched acknowledgement.
  const currentError = result.postError;
  await act(async () => { old.reject(Error('OLD_FAILURE')); expect(await first).toBe(false); }); expect(result.postDraft).toBe('Fresh'); expect(result.postError).toBe(currentError);
});
