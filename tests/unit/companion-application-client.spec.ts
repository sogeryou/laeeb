import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { businessApi } from '../../client/services/businessApi';
import { applicationPayload, draftFromApplication, isValidApplicationPrice, legacyDetailsToDraft, newApplicationAttempt } from '../../client/components/application/applicationModel';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useCompanionApplication } from '../../client/hooks/useCompanionApplication';
import { applicationErrorText } from '../../client/components/application/applicationCopy';
import { refreshApprovedOwnerSession } from '../../client/components/application/approvedSession';
import * as applicationSession from '../../client/components/application/approvedSession';
import * as applicationModel from '../../client/components/application/applicationModel';

const storage = new Map<string, string>();
const browser = new EventTarget() as EventTarget & { setInterval: typeof setInterval; clearInterval: typeof clearInterval };
browser.setInterval = setInterval;
browser.clearInterval = clearInterval;
beforeEach(() => {
  storage.clear();
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', { visibilityState: 'visible' });
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('companion application client', () => {
  it.each(['PENDING', 'APPROVED'] as const)('retains a confirmed %s application through a transient refresh failure', async status => {
    const owner = `refresh-${status}`;
    const saved = { id: `cp-${owner}`, userId: owner, status } as any;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValueOnce({ application: saved }).mockRejectedValueOnce(new Error('COMPANION_LOAD_FAILED'));
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication(owner, 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    expect(hook.application).toEqual(saved);
    await act(async () => { await hook.refresh(); });
    expect(hook.application).toEqual(saved);
    expect(hook.error).toBe('COMPANION_LOAD_FAILED');
    expect(hook.loading).toBe(false);
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
  });

  it('recovers a rejected resubmission draft and original request ID after remount', async () => {
    const saved = { id: 'recovery-cp', userId: 'rejected-recovery', status: 'REJECTED', gameName: 'PUBG', intro: 'Original intro', hourlyRate: 8, details: { gameId: 'pubg', serviceName: 'Original service', unit: 'hr' } } as any;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: saved });
    const post = vi.spyOn(businessApi, 'submitCompanionApplication').mockRejectedValueOnce(new Error('COMPANION_SAVE_FAILED')).mockResolvedValueOnce({ ...saved, status: 'PENDING' });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication(saved.userId, 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.editRejected(); });
    await act(async () => { hook.setDraft(draft => ({ ...draft, intro: 'Improved intro', serviceName: 'Improved service' })); });
    await act(async () => { await hook.submit('PUBG'); });
    const originalAttempt = post.mock.calls[0][1];
    await act(async () => { renderer.unmount(); });
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.editRejected(); });
    expect(hook.draft.intro).toBe('Improved intro');
    expect(hook.draft.serviceName).toBe('Improved service');
    expect(hook.attemptPending).toBe(true);
    await act(async () => { await hook.submit('PUBG'); });
    expect(post.mock.calls[1][1]).toEqual(originalAttempt);
    expect(hook.application?.status).toBe('PENDING');
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
    post.mockRestore();
  });
  it('requires both an approved application and a server PLAYER role for Player Center', () => {
    expect(applicationModel.canEnterPlayerCenter).toBeTypeOf('function');
    expect(applicationModel.canEnterPlayerCenter('PLAYER', 'APPROVED')).toBe(true);
    for (const status of ['NONE', 'PENDING', 'REJECTED'] as const) expect(applicationModel.canEnterPlayerCenter('PLAYER', status)).toBe(false);
    expect(applicationModel.canEnterPlayerCenter('USER', 'APPROVED')).toBe(false);
  });

  it('synchronizes a resubmitted legacy role only from the current owner server session', async () => {
    expect(applicationSession.refreshApplicationOwnerSession).toBeTypeOf('function');
    const session = vi.spyOn(businessApi, 'getSession').mockResolvedValue({ id: 'A', role: 'USER' } as any);
    const save = vi.fn();
    expect(await applicationSession.refreshApplicationOwnerSession('token', 'A', () => true, 'USER', save)).toBe(true);
    expect(save).toHaveBeenCalledWith({ token: 'token', user: { id: 'A', role: 'USER' } });
    save.mockClear();
    expect(await applicationSession.refreshApplicationOwnerSession('token', 'A', () => false, 'USER', save)).toBe(false);
    session.mockResolvedValue({ id: 'B', role: 'USER' } as any);
    expect(await applicationSession.refreshApplicationOwnerSession('token', 'A', () => true, 'USER', save)).toBe(false);
    session.mockResolvedValue({ id: 'A', role: 'PLAYER' } as any);
    expect(await applicationSession.refreshApplicationOwnerSession('token', 'A', () => true, 'USER', save)).toBe(false);
    expect(save).not.toHaveBeenCalled();
    session.mockRestore();
  });
  it('reads wrapped owner status and posts only supported details with a stable key', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ application: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cp1', status: 'PENDING' }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    expect(await businessApi.getCompanionApplication('access')).toEqual({ application: null });
    const draft = { gameId: 'pubg', rank: 'Gold', mainPosition: '', server: 'NA', platform: 'PC', style: 'calm', intro: 'Duo', screenshots: ['fake'], voiceUrl: 'fake', coverUrl: 'fake', coverIntro: 'Hello', serviceName: 'Ranked duo', price: 8, unit: 'Round', promotion: { type: 'DISCOUNT' } };
    const attempt = newApplicationAttempt();
    const input = applicationPayload(draft, 'PUBG Mobile', attempt);
    expect(input).toEqual({ gameName: 'PUBG Mobile', intro: 'Duo', hourlyRate: 8, requestId: attempt, details: { gameId: 'pubg', rank: 'Gold', server: 'NA', platform: 'PC', style: 'calm', coverIntro: 'Hello', serviceName: 'Ranked duo', unit: 'match' } });
    expect(await businessApi.submitCompanionApplication('access', input)).toMatchObject({ id: 'cp1', status: 'PENDING' });
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(input);
  });

  it('discards a late A response after switching to B and back to A', async () => {
    let resolveA!: (value: any) => void;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockImplementationOnce(() => new Promise(resolve => { resolveA = resolve; }))
      .mockResolvedValue({ application: null });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = ({ owner }: { owner: string }) => { hook = useCompanionApplication(owner, owner, true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host, { owner: 'A' })); });
    await act(async () => { renderer.update(React.createElement(Host, { owner: 'B' })); });
    await act(async () => { renderer.update(React.createElement(Host, { owner: 'A' })); });
    await act(async () => { resolveA({ application: { id: 'old', userId: 'A', status: 'PENDING' } }); });
    expect(hook.application).toBeNull();
    expect(get).toHaveBeenCalledTimes(3);
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
  });

  it('locks duplicate submits and retries the identical attempt after an ambiguous failure', async () => {
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: null });
    let rejectFirst!: (reason: Error) => void;
    const post = vi.spyOn(businessApi, 'submitCompanionApplication').mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject; }))
      .mockResolvedValue({ id: 'saved', userId: 'C', status: 'PENDING' } as any);
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('C', 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.setDraft(d => ({ ...d, gameId: 'pubg', intro: 'Duo', serviceName: 'Ranked', price: 8 })); });
    let first!: Promise<void>;
    await act(async () => { first = hook.submit('PUBG'); void hook.submit('PUBG'); });
    expect(post).toHaveBeenCalledTimes(1);
    await act(async () => { rejectFirst(new Error('network')); await first; });
    await act(async () => { await hook.submit('PUBG'); });
    expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
    expect(hook.application?.status).toBe('PENDING');
    await act(async () => { renderer.unmount(); });
    get.mockRestore(); post.mockRestore();
  });

  it('keeps a dirty draft through same-owner token rotation but hides it on logout', async () => {
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: null });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = ({ owner, token }: { owner: string | null; token: string | null }) => { hook = useCompanionApplication(owner, token, true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host, { owner: 'A', token: 'first' })); });
    await act(async () => { hook.setDraft(d => ({ ...d, intro: 'My draft' })); });
    await act(async () => { renderer.update(React.createElement(Host, { owner: 'A', token: 'rotated' })); });
    expect(hook.draft.intro).toBe('My draft');
    await act(async () => { browser.dispatchEvent(new Event('le3eb:session')); renderer.update(React.createElement(Host, { owner: null, token: null })); });
    expect(hook.draft.intro).toBe('');
    expect(hook.application).toBeNull();
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
  });

  it('prefills rejected supported fields and maps the saved unit back to the selector', () => {
    expect(draftFromApplication({ status: 'REJECTED', intro: 'Duo', hourlyRate: 9, details: { gameId: 'pubg', serviceName: 'Ranked', unit: 'match' } } as any))
      .toMatchObject({ gameId: 'pubg', intro: 'Duo', price: 9, serviceName: 'Ranked', unit: 'Game' });
    expect(applicationPayload({ gameId: 'pubg', rank: '', mainPosition: '', server: '', platform: '', style: '', intro: 'Duo', coverIntro: '', serviceName: 'Ranked', price: 9, unit: 'Hour' }, 'PUBG', 'new').details?.unit).toBe('hr');
  });

  it('renders server validation and save errors in the selected language', () => {
    expect(applicationErrorText('INPUT_INVALID', 'en')).toContain('Check');
    expect(applicationErrorText('COMPANION_SAVE_FAILED', 'ar')).toContain('لم');
  });

  it('prefills a rejected application and resubmits with a new request ID', async () => {
    const rejected = { id: 'cp1', userId: 'D', status: 'REJECTED', gameName: 'PUBG', intro: 'old intro', hourlyRate: 8, details: { gameId: 'pubg', serviceName: 'Ranked', unit: 'match' }, rejectionReason: 'More detail needed' } as any;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: rejected });
    const post = vi.spyOn(businessApi, 'submitCompanionApplication').mockResolvedValue({ ...rejected, status: 'PENDING' });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('D', 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    expect(hook.application?.rejectionReason).toBe('More detail needed');
    await act(async () => { hook.editRejected(); });
    expect(hook.draft).toMatchObject({ intro: 'old intro', serviceName: 'Ranked', price: 8 });
    await act(async () => { await hook.submit('PUBG'); });
    expect(post.mock.calls[0][1]).toMatchObject({ gameName: 'PUBG', intro: 'old intro', hourlyRate: 8 });
    expect(post.mock.calls[0][1].requestId).toBeTruthy();
    expect(hook.application?.status).toBe('PENDING');
    await act(async () => { renderer.unmount(); });
    get.mockRestore(); post.mockRestore();
  });

  it('continues submitting when session storage is denied, without stranding the busy lock', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } });
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: null });
    const post = vi.spyOn(businessApi, 'submitCompanionApplication').mockResolvedValue({ id: 'saved', userId: 'E', status: 'PENDING' } as any);
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('E', 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.setDraft(d => ({ ...d, intro: 'Duo', serviceName: 'Ranked', price: 8 })); });
    expect(hook.draft.intro).toBe('Duo');
    await act(async () => { await hook.submit('PUBG'); });
    expect(post).toHaveBeenCalledTimes(1);
    expect(hook.busy).toBe(false);
    expect(hook.application?.status).toBe('PENDING');
    await act(async () => { renderer.unmount(); });
    get.mockRestore(); post.mockRestore();
  });

  it('does not accept GET or POST application DTOs owned by another account', async () => {
    const wrong = { id: 'other', userId: 'B', status: 'PENDING' } as any;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: wrong });
    const post = vi.spyOn(businessApi, 'submitCompanionApplication').mockResolvedValue(wrong);
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('A', 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    expect(hook.application).toBeNull();
    await act(async () => { await hook.submit('PUBG'); });
    expect(hook.application).toBeNull();
    expect(hook.busy).toBe(false);
    await act(async () => { renderer.unmount(); });
    get.mockRestore(); post.mockRestore();
  });

  it('rejects a resubmission DTO that changes the existing companion ID', async () => {
    const rejected = { id: 'original', userId: 'Same', status: 'REJECTED', gameName: 'PUBG', intro: 'intro', hourlyRate: 8, details: {} } as any;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: rejected });
    const post = vi.spyOn(businessApi, 'submitCompanionApplication').mockResolvedValue({ ...rejected, id: 'different', status: 'PENDING' });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('Same', 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.editRejected(); });
    await act(async () => { await hook.submit('PUBG'); });
    expect(hook.application?.id).toBe('original');
    expect(hook.error).toBe('COMPANION_APPLICATION_CONFLICT');
    await act(async () => { renderer.unmount(); });
    get.mockRestore(); post.mockRestore();
  });

  it('invalidates immediately when a session event removes only the token', async () => {
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockResolvedValue({ application: null });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = ({ token }: { token: string | null }) => { hook = useCompanionApplication('L', token, true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host, { token: 'access' })); });
    await act(async () => { hook.setDraft(d => ({ ...d, intro: 'private' })); });
    const guard = hook.sessionGuard('L', 'access');
    await act(async () => { browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { user: { id: 'L' }, token: null } })); });
    expect(hook.draft.intro).toBe('');
    expect(guard()).toBe(false);
    await act(async () => { renderer.update(React.createElement(Host, { token: null })); });
    expect(hook.application).toBeNull();
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
  });

  it('accepts valid cents and rejects excess decimals', () => {
    expect(isValidApplicationPrice(4.56)).toBe(true);
    expect(isValidApplicationPrice(8.03)).toBe(true);
    expect(isValidApplicationPrice(8.031)).toBe(false);
  });

  it('carries legacy selection into the canonical wizard without applying discounts', () => {
    const draft = legacyDetailsToDraft({ gameId: 'pubg', rank: '', mainPosition: '', server: '', platform: '', style: '', intro: '', coverIntro: '', serviceName: '', price: 0, unit: 'Game' }, 'pubg', 'Ranked Carry', { rank: 'Gold', platform: 'PC', style: 'Calm', price: '4.56', discount: '20' });
    expect(draft).toMatchObject({ gameId: 'pubg', serviceName: 'Ranked Carry', rank: 'Gold', platform: 'PC', style: 'Calm', price: 4.56 });
    expect(applicationPayload(draft, 'PUBG', 'key')).not.toHaveProperty('discount');
  });

  it('refreshes an approved role only for the current owner and token', async () => {
    const session = vi.spyOn(businessApi, 'getSession').mockResolvedValue({ id: 'A', role: 'PLAYER' } as any);
    const store = vi.fn();
    expect(await refreshApprovedOwnerSession('token', 'A', () => false, store)).toBe(false);
    expect(store).not.toHaveBeenCalled();
    expect(await refreshApprovedOwnerSession('token', 'A', () => true, store)).toBe(true);
    expect(store).toHaveBeenCalledWith({ token: 'token', user: { id: 'A', role: 'PLAYER' } });
    session.mockRestore();
  });

  it('does not publish a late approved role after the session generation changes', async () => {
    let resolve!: (user: any) => void;
    const session = vi.spyOn(businessApi, 'getSession').mockImplementation(() => new Promise(done => { resolve = done; }));
    const store = vi.fn();
    let current = true;
    const pending = refreshApprovedOwnerSession('old', 'A', () => current, store);
    current = false;
    resolve({ id: 'A', role: 'PLAYER' });
    expect(await pending).toBe(false);
    expect(store).not.toHaveBeenCalled();
    session.mockRestore();
  });

  it('rehydrates the same owner after a fast logout and login without accepting an old response', async () => {
    let resolveOld!: (value: any) => void;
    const get = vi.spyOn(businessApi, 'getCompanionApplication')
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue({ application: null });
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = ({ token }: { token: string }) => { hook = useCompanionApplication('F', token, true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host, { token: 'old' })); });
    await act(async () => { hook.setDraft(d => ({ ...d, intro: 'saved draft' })); });
    await act(async () => {
      browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { user: { id: 'F' }, token: null } }));
      browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { user: { id: 'F' }, token: 'new' } }));
      renderer.update(React.createElement(Host, { token: 'new' }));
    });
    expect(hook.draft.intro).toBe('saved draft');
    await act(async () => { resolveOld({ application: { id: 'stale', userId: 'F', status: 'PENDING' } }); });
    expect(hook.application).toBeNull();
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
  });

  it('handles A-B-A session events before any prop render without reviving old status', async () => {
    let resolveOld!: (value: any) => void;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('Q', 'token-a', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.setDraft(d => ({ ...d, intro: 'Q draft' })); });
    await act(async () => {
      browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { user: { id: 'B' }, token: 'token-b' } }));
      browser.dispatchEvent(new CustomEvent('le3eb:session', { detail: { user: { id: 'Q' }, token: 'token-a' } }));
    });
    expect(hook.draft.intro).toBe('Q draft');
    await act(async () => { resolveOld({ application: { id: 'stale', userId: 'Q', status: 'PENDING' } }); });
    expect(hook.application).toBeNull();
    await act(async () => { renderer.unmount(); });
    get.mockRestore();
  });

  it('ignores a pending GET after unmount without clearing the retained draft', async () => {
    let resolve!: (value: any) => void;
    const get = vi.spyOn(businessApi, 'getCompanionApplication').mockImplementation(() => new Promise(done => { resolve = done; }));
    let hook!: ReturnType<typeof useCompanionApplication>;
    const Host = () => { hook = useCompanionApplication('Unmount', 'token', true); return null; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(Host)); });
    await act(async () => { hook.setDraft(d => ({ ...d, intro: 'kept' })); });
    await act(async () => { renderer.unmount(); });
    await act(async () => { resolve({ application: { id: 'late', userId: 'Unmount', status: 'PENDING' } }); });
    expect(JSON.parse(storage.get('companion-application:Unmount') || '{}').draft?.intro).toBe('kept');
    get.mockRestore();
  });
});
