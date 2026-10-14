import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../shared/auth';
import type { AccountProfile } from '../../shared/accountProfile';
import { businessApi } from '../../client/services/businessApi';
import { authApi } from '../../client/features/auth/api';

type Hook = typeof import('../../client/hooks/useAccountProfile').useAccountProfile;
let useAccountProfile: Hook;
let editor: ReturnType<Hook>;
let roots: ReactTestRenderer[];
const browser = new EventTarget();
const user = (id = 'A', username = 'Alpha', bio = ''): AuthUser => ({ id, username, bio, avatar: '/api/auth/avatars/system/peach.svg', email: `${id}@local.test`, role: 'USER', permissions: [], profileComplete: true, accountStatus: 'ACTIVE' });
const profile = (id = 'A', username = 'Alpha', bio = '', revision = 'a'.repeat(64)): AccountProfile => ({ user: user(id, username, bio), bio, revision });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
let published: ReturnType<typeof vi.fn>;
const Host = ({ owner = 'A', token = 'A', enabled = true, active = true }: { owner?: string; token?: string | null; enabled?: boolean; active?: boolean }) => { editor = useAccountProfile(token, owner, enabled, active, published); return null; };
async function render(props: React.ComponentProps<typeof Host> = {}) {
  const modulePath = '../../client/hooks/useAccountProfile';
  const module = await import(modulePath).catch(() => ({}));
  expect(typeof module.useAccountProfile).toBe('function'); useAccountProfile = module.useAccountProfile;
  let root!: ReactTestRenderer; await act(async () => { root = create(React.createElement(Host, props)); }); roots.push(root); return root;
}
const event = (owner: string | null, token: string | null) => browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { token, user: owner ? user(owner) : null } }));
beforeEach(() => { roots = []; published = vi.fn(() => true); vi.stubGlobal('window', browser); vi.stubGlobal('document', { visibilityState: 'visible' }); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => { await act(async () => { roots.forEach(root => root.unmount()); }); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('loads real owner data only for an eligible active editor', async () => {
  const get = vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile());
  const root = await render({ active: false }); expect(get).not.toHaveBeenCalled(); expect(editor.profile).toBeNull();
  await act(async () => root.update(React.createElement(Host, { active: true })));
  expect(editor.draft).toEqual({ username: 'Alpha', bio: '' }); expect(editor.avatarPreview).toBe('/api/auth/avatars/system/peach.svg');
});

it('retains dirty input and acknowledged revision through read failures and background refreshes', async () => {
  const get = vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); await render();
  await act(async () => { editor.change('bio', 'Unsaved teammate bio'); });
  get.mockRejectedValueOnce(Error('NETWORK_ERROR')); await act(async () => { await editor.reload(); });
  expect(editor.draft.bio).toBe('Unsaved teammate bio'); expect(editor.error).toBe('NETWORK_ERROR');
  get.mockResolvedValue(profile('A', 'Changed elsewhere', 'Elsewhere', 'b'.repeat(64)));
  await act(async () => { await editor.reload(); }); expect(editor.profile?.revision).toBe('a'.repeat(64)); expect(editor.draft.bio).toBe('Unsaved teammate bio');
  await act(async () => { await editor.reload(true); }); expect(editor.draft.username).toBe('Changed elsewhere'); expect(editor.dirty).toBe(false);
});

it('saves normalized draft only after acknowledgement and locks duplicate commands synchronously', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile());
  const pending = deferred<AccountProfile>(); const patch = vi.spyOn(businessApi, 'updateAccountProfile').mockReturnValueOnce(pending.promise);
  await render(); await act(async () => { editor.change('username', '  Saved name  '); editor.change('bio', '  Patient teammate  '); });
  let operation!: Promise<boolean>; await act(async () => { operation = editor.save(); void editor.save(); });
  expect(patch).toHaveBeenCalledTimes(1); expect(patch).toHaveBeenCalledWith('A', { username: 'Saved name', bio: 'Patient teammate', revision: 'a'.repeat(64) });
  expect(editor.profile?.user.username).toBe('Alpha'); expect(editor.saved).toBe(false); expect(editor.saving).toBe(true);
  await act(async () => { pending.resolve(profile('A', 'Saved name', 'Patient teammate', 'b'.repeat(64))); expect(await operation).toBe(true); });
  expect(editor.dirty).toBe(false); expect(editor.saved).toBe(true); expect(editor.draft.bio).toBe('Patient teammate'); expect(published).toHaveBeenCalledOnce();
});

it('keeps the original save payload available after a failed save for retry', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile());
  const patch = vi.spyOn(businessApi, 'updateAccountProfile').mockRejectedValueOnce(Error('PROFILE_SAVE_FAILED')).mockResolvedValueOnce(profile('A', 'Saved name', '', 'b'.repeat(64)));
  await render(); await act(async () => { editor.change('username', 'Saved name'); });
  await act(async () => { expect(await editor.save()).toBe(false); }); expect(editor.draft.username).toBe('Saved name'); expect(editor.profile?.user.username).toBe('Alpha'); expect(published).not.toHaveBeenCalled();
  await act(async () => { expect(await editor.save()).toBe(true); }); expect(patch.mock.calls[0]).toEqual(patch.mock.calls[1]);
});

it('does not let a pre-save read overwrite a persisted acknowledgement', async () => {
  const get = vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); const old = deferred<AccountProfile>();
  vi.spyOn(businessApi, 'updateAccountProfile').mockResolvedValue(profile('A', 'Saved name', '', 'b'.repeat(64)));
  await render(); await act(async () => { editor.change('username', 'Saved name'); });
  get.mockReturnValueOnce(old.promise); let loading!: Promise<void>; await act(async () => { loading = editor.reload(); });
  await act(async () => { await editor.save(); }); await act(async () => { old.resolve(profile()); await loading; });
  expect(editor.profile?.user.username).toBe('Saved name'); expect(editor.draft.username).toBe('Saved name');
});

it('hides old data immediately on token-only logout and rejects a late save after A-B-A events', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); const pending = deferred<AccountProfile>();
  vi.spyOn(businessApi, 'updateAccountProfile').mockReturnValueOnce(pending.promise);
  const root = await render(); await act(async () => { editor.change('username', 'Saved name'); });
  let operation!: Promise<boolean>; await act(async () => { operation = editor.save(); event('A', null); });
  expect(editor.profile).toBeNull(); expect(editor.draft.username).toBe('');
  await act(async () => { event('B', 'B'); event('A', 'new-A'); root.update(React.createElement(Host, { token: 'new-A' })); });
  await act(async () => { pending.resolve(profile('A', 'Saved name', '', 'b'.repeat(64))); expect(await operation).toBe(false); });
  expect(published).not.toHaveBeenCalled(); expect(editor.draft.username).toBe('Alpha');
});

it('preserves a draft and valid save result across same-owner credential rotation', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); const pending = deferred<AccountProfile>();
  vi.spyOn(businessApi, 'updateAccountProfile').mockReturnValueOnce(pending.promise);
  const root = await render(); await act(async () => { editor.change('username', 'Saved name'); });
  let operation!: Promise<boolean>; await act(async () => { operation = editor.save(); event('A', 'rotated'); root.update(React.createElement(Host, { token: 'rotated' })); });
  expect(editor.draft.username).toBe('Saved name');
  await act(async () => { pending.resolve(profile('A', 'Saved name', '', 'b'.repeat(64))); expect(await operation).toBe(true); });
  expect(published.mock.calls[0][1]()).toBe(true); expect(editor.saved).toBe(true);
});

it('rejects foreign/malformed responses without publishing identity or discarding a draft', async () => {
  const get = vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile());
  await render(); get.mockResolvedValue(profile('B')); await act(async () => { await editor.reload(true); });
  expect(editor.profile?.user.id).toBe('A'); expect(editor.error).toBe('PROFILE_RESPONSE_INVALID');
  vi.spyOn(businessApi, 'updateAccountProfile').mockResolvedValue(profile('B', 'Saved name'));
  await act(async () => { editor.change('username', 'Saved name'); });
  await act(async () => { expect(await editor.save()).toBe(false); }); expect(published).not.toHaveBeenCalled(); expect(editor.dirty).toBe(true);
  get.mockResolvedValue({ ...profile(), revision: 'bad', bio: '<not matching user>' });
  await act(async () => { await editor.reload(true); }); expect(editor.profile?.revision).toBe('a'.repeat(64));
});

it('keeps selected system/upload avatars as candidates until an acknowledged profile save', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); await render();
  await act(async () => { editor.chooseAvatar('sage'); }); expect(editor.avatarPreview).toBe('/api/auth/avatars/system/sage.svg'); expect(editor.profile?.user.avatar).toBe('/api/auth/avatars/system/peach.svg');
  const id = 'a'.repeat(48), url = `/api/auth/avatars/uploads/${id}.png`;
  vi.spyOn(authApi, 'uploadAvatar').mockResolvedValue({ avatar: { type: 'upload', value: id }, url });
  await act(async () => { await editor.uploadAvatar('data:image/png;base64,AAAA'); });
  expect(editor.draft.avatar).toEqual({ type: 'upload', value: id }); expect(editor.avatarPreview).toBe(url); expect(published).not.toHaveBeenCalled();
  vi.spyOn(businessApi, 'updateAccountProfile').mockResolvedValue({ ...profile('A', 'Alpha', '', 'b'.repeat(64)), user: { ...user(), avatar: url } });
  await act(async () => { expect(await editor.save()).toBe(true); }); expect(editor.profile?.user.avatar).toBe(url);
});

it('rejects malformed upload results and discards old-account uploads before they can change a new draft', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockImplementation(token => Promise.resolve(profile(token)));
  const upload = vi.spyOn(authApi, 'uploadAvatar').mockResolvedValueOnce({ avatar: { type: 'upload', value: 'a'.repeat(48) }, url: 'https://other.test/avatar.png' });
  const root = await render(); await act(async () => { await expect(editor.uploadAvatar('png')).rejects.toThrow('PROFILE_RESPONSE_INVALID'); });
  expect(editor.draft.avatar).toBeUndefined();
  const pending = deferred<any>(); upload.mockReturnValueOnce(pending.promise); let operation!: Promise<void>;
  await act(async () => { operation = editor.uploadAvatar('png'); root.update(React.createElement(Host, { owner: 'B', token: 'B' })); });
  const failure = operation.catch(error => error.message);
  await act(async () => { pending.resolve({ avatar: { type: 'upload', value: 'a'.repeat(48) }, url: `/api/auth/avatars/uploads/${'a'.repeat(48)}.png` }); });
  expect(await failure).toBe('PROFILE_SESSION_CHANGED'); expect(editor.profile?.user.id).toBe('B'); expect(editor.draft.avatar).toBeUndefined();
});

it('blocks invalid input locally and ignores save results after unmount', async () => {
  vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); const patch = vi.spyOn(businessApi, 'updateAccountProfile');
  const root = await render(); await act(async () => { editor.change('username', 'x'); });
  await act(async () => { expect(await editor.save()).toBe(false); }); expect(patch).not.toHaveBeenCalled();
  const pending = deferred<AccountProfile>(); patch.mockReturnValueOnce(pending.promise);
  await act(async () => { editor.change('username', 'Saved name'); }); let operation!: Promise<boolean>;
  await act(async () => { operation = editor.save(); root.unmount(); }); roots = [];
  pending.resolve(profile('A', 'Saved name', '', 'b'.repeat(64))); expect(await operation).toBe(false); expect(published).not.toHaveBeenCalled();
});

it('does not discard newer typing when an explicit saved-profile reload was already pending', async () => {
  const get = vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile());
  await render(); await act(async () => { editor.change('bio', 'Old draft'); });
  const pending = deferred<AccountProfile>(); get.mockReturnValueOnce(pending.promise);
  let operation!: Promise<void>; await act(async () => { operation = editor.reload(true); });
  await act(async () => { editor.change('bio', 'Typed after reload started'); });
  await act(async () => { pending.resolve(profile()); await operation; });
  expect(editor.draft.bio).toBe('Typed after reload started'); expect(editor.dirty).toBe(true);
});

it('invalidates a pending save immediately when a session event removes profile eligibility before props update', async () => {
  const get = vi.spyOn(businessApi, 'getAccountProfile').mockResolvedValue(profile()); const pending = deferred<AccountProfile>();
  vi.spyOn(businessApi, 'updateAccountProfile').mockReturnValueOnce(pending.promise);
  await render(); await act(async () => { editor.change('username', 'Saved name'); }); let operation!: Promise<boolean>;
  const count = get.mock.calls.length;
  await act(async () => { operation = editor.save(); browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { token: 'A', user: { ...user(), profileComplete: false } } })); });
  expect(editor.profile).toBeNull(); expect(editor.draft.username).toBe(''); expect(get.mock.calls.length).toBe(count);
  await act(async () => { pending.resolve(profile('A', 'Saved name', '', 'b'.repeat(64))); expect(await operation).toBe(false); });
  expect(published).not.toHaveBeenCalled();
});
