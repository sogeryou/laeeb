import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlayerProfileEditView } from '../../client/views/PlayerProfileEditView';
import { businessApi } from '../../client/services/businessApi';
import { AUTH_SESSION_EVENT } from '../../client/features/auth/session';
import { useCompanionProfile } from '../../client/hooks/useCompanionProfile';

let app: any;
let root: ReactTestRenderer;
const profile = { id: 'cp', userId: 'owner', gameName: 'Valorant', intro: 'Real bio', hourlyRate: 8, status: 'APPROVED', availability: 'ONLINE', updatedAt: 10, services: [{ id: 'extra', name: 'Ranked', unitPrice: 7, unit: 'match' }] };
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }) }));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const nodes = (type: string) => root.root.findAllByType(type);
const button = (label: string) => nodes('button').find(n => n.props['aria-label'] === label || n.children.includes(label))!;
const input = (label: string) => [...nodes('input'), ...nodes('textarea')].find(n => n.props['aria-label'] === label)!;
const change = async (label: string, value: string) => { await act(async () => input(label).props.onChange({ target: { value } })); };
const click = async (label: string) => { await act(async () => button(label).props.onClick()); };
const render = async () => { await act(async () => { root = create(React.createElement(PlayerProfileEditView)); }); };
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('crypto', { randomUUID: () => 'new-id' });
  app = { locale: 'en', authToken: 'token', authUser: { id: 'owner' }, handleBack: vi.fn(), notify: vi.fn() };
  vi.spyOn(businessApi, 'getManagedCompanionProfile').mockResolvedValue(profile as any);
  vi.spyOn(businessApi, 'updateManagedCompanionProfile').mockResolvedValue({ ...profile, updatedAt: 11 } as any);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('loads real fields and saves edited primary, extra and bio with stable IDs', async () => {
  await render();
  expect(input('Primary service name').props.value).toBe('Valorant');
  expect(input('Service name extra').props.value).toBe('Ranked');
  await change('Primary service name', 'PUBG');
  await change('Introduction', 'Duo sessions');
  await change('Service name extra', 'Ranked climb');
  await click('Add New Service');
  await change('Service name new-id', 'Coaching');
  await change('Service price new-id', '9.5');
  await click('Save Changes');
  expect(businessApi.updateManagedCompanionProfile).toHaveBeenCalledWith('token', { gameName: 'PUBG', intro: 'Duo sessions', hourlyRate: 8, updatedAt: 10, services: [
    { id: 'extra', name: 'Ranked climb', unitPrice: 7, unit: 'match' },
    { id: 'new-id', name: 'Coaching', unitPrice: 9.5, unit: 'hr' },
  ] });
  expect(app.handleBack).toHaveBeenCalledOnce();
  expect(button('Upload Cover Image').props.disabled).toBe(true);
  expect(button('Upload Cover Image').props.className).toContain('max-h-48');
  expect(button('Voice Intro').props.disabled).toBe(true);
});

it('keeps a dirty draft through token rotation and failed save, then permits retry', async () => {
  await render();
  await change('Introduction', 'Unsaved');
  app = { ...app, authToken: 'rotated' };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  expect(input('Introduction').props.value).toBe('Unsaved');
  vi.mocked(businessApi.updateManagedCompanionProfile).mockRejectedValueOnce(new Error('COMPANION_SAVE_FAILED'));
  await click('Save Changes');
  expect(input('Introduction').props.value).toBe('Unsaved');
  expect(app.notify).not.toHaveBeenCalled();
  await click('Save Changes');
  expect(businessApi.updateManagedCompanionProfile).toHaveBeenLastCalledWith('rotated', expect.objectContaining({ intro: 'Unsaved' }));
});

it('invalidates an in-flight save immediately on account event', async () => {
  const pending = deferred<any>();
  vi.mocked(businessApi.updateManagedCompanionProfile).mockReturnValueOnce(pending.promise);
  await render();
  await act(async () => { void button('Save Changes').props.onClick(); void button('Save Changes').props.onClick(); });
  expect(businessApi.updateManagedCompanionProfile).toHaveBeenCalledTimes(1);
  await act(async () => { (window as EventTarget).dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: { token: 'other', user: { id: 'other' } } })); });
  await act(async () => pending.resolve({ ...profile, updatedAt: 11 }));
  expect(app.notify).not.toHaveBeenCalled();
  expect(app.handleBack).not.toHaveBeenCalled();
  app = { ...app, authToken: 'other', authUser: { id: 'other' } };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  expect(JSON.stringify(root.toJSON())).not.toContain('Real bio');
});

it('shows a conflict and explicit reload without losing the draft', async () => {
  vi.mocked(businessApi.updateManagedCompanionProfile).mockRejectedValueOnce(new Error('COMPANION_PROFILE_STALE'));
  await render();
  await change('Introduction', 'My draft');
  await click('Save Changes');
  expect(input('Introduction').props.value).toBe('My draft');
  expect(button('Reload profile')).toBeDefined();
  await click('Reload profile');
  expect(input('Introduction').props.value).toBe('Real bio');
});

it('does not silently rebase a dirty draft when a rotated token reloads newer data', async () => {
  await render();
  await change('Introduction', 'My draft');
  vi.mocked(businessApi.getManagedCompanionProfile).mockResolvedValueOnce({ ...profile, intro: 'Remote edit', updatedAt: 20 } as any);
  app = { ...app, authToken: 'rotated' };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  expect(input('Introduction').props.value).toBe('My draft');
  await click('Save Changes');
  expect(businessApi.updateManagedCompanionProfile).toHaveBeenLastCalledWith('rotated', expect.objectContaining({ updatedAt: 10 }));
});

it('ignores a late read after save starts', async () => {
  const late = deferred<any>();
  await render();
  await change('Introduction', 'Saved edit');
  vi.mocked(businessApi.getManagedCompanionProfile).mockReturnValueOnce(late.promise);
  app = { ...app, authToken: 'rotated' };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  await click('Save Changes');
  await act(async () => late.resolve({ ...profile, intro: 'Late read', updatedAt: 20 }));
  expect(input('Introduction').props.value).toBe('Real bio');
});

it('does not let an old save release the new owner save lock', async () => {
  const oldSave = deferred<any>();
  const newSave = deferred<any>();
  vi.mocked(businessApi.updateManagedCompanionProfile).mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(newSave.promise);
  await render();
  await act(async () => { void button('Save Changes').props.onClick(); });
  await act(async () => { (window as EventTarget).dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: { token: 'other-token', user: { id: 'other' } } })); });
  vi.mocked(businessApi.getManagedCompanionProfile).mockResolvedValueOnce({ ...profile, id: 'cp2', userId: 'other' } as any);
  app = { ...app, authToken: 'other-token', authUser: { id: 'other' } };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  await act(async () => { void button('Save Changes').props.onClick(); });
  await act(async () => oldSave.resolve({ ...profile, updatedAt: 11 }));
  await act(async () => { void button('Save Changes').props.onClick(); });
  expect(businessApi.updateManagedCompanionProfile).toHaveBeenCalledTimes(2);
  await act(async () => newSave.resolve({ ...profile, id: 'cp2', userId: 'other', updatedAt: 11 }));
});

it('rejects a save result for a different owner', async () => {
  vi.mocked(businessApi.updateManagedCompanionProfile).mockResolvedValueOnce({ ...profile, userId: 'other' } as any);
  await render();
  await click('Save Changes');
  expect(app.notify).not.toHaveBeenCalled();
  expect(app.handleBack).not.toHaveBeenCalled();
});

it('blocks an old save callback immediately after the auth event', async () => {
  await render();
  const oldClick = button('Save Changes').props.onClick;
  await act(async () => { (window as EventTarget).dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: { token: 'other-token', user: { id: 'other' } } })); });
  await act(async () => { void oldClick(); });
  expect(businessApi.updateManagedCompanionProfile).not.toHaveBeenCalled();
});

it('shows missing provider with retry and never exposes example values', async () => {
  vi.mocked(businessApi.getManagedCompanionProfile).mockRejectedValueOnce(new Error('COMPANION_NOT_FOUND'));
  await render();
  expect(JSON.stringify(root.toJSON())).toContain('No companion profile');
  expect(input('Introduction')).toBeUndefined();
  await click('Retry');
  expect(input('Introduction').props.value).toBe('Real bio');
});

it('supports Arabic direction and fixes a legacy invalid service unit before save', async () => {
  app.locale = 'ar';
  vi.mocked(businessApi.getManagedCompanionProfile).mockResolvedValueOnce({ ...profile, services: [{ ...profile.services[0], unit: 'session' }] } as any);
  await render();
  expect(nodes('div').find(n => n.props.dir)?.props.dir).toBe('rtl');
  expect(button('حفظ التغييرات').props['aria-label']).toBe('حفظ التغييرات');
  await click('حفظ التغييرات');
  expect(businessApi.updateManagedCompanionProfile).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain('تحقق من أسماء الخدمات');
  await act(async () => nodes('select')[0].props.onChange({ target: { value: 'match' } }));
  await click('حفظ التغييرات');
  expect(businessApi.updateManagedCompanionProfile).toHaveBeenCalledOnce();
});

it('ignores a token-rotation GET that returns old data after PATCH succeeds', async () => {
  const saving = deferred<any>();
  const oldRead = deferred<any>();
  vi.mocked(businessApi.updateManagedCompanionProfile).mockReturnValueOnce(saving.promise);
  await render();
  await change('Introduction', 'New bio');
  await act(async () => { void button('Save Changes').props.onClick(); });
  vi.mocked(businessApi.getManagedCompanionProfile).mockReturnValueOnce(oldRead.promise);
  app = { ...app, authToken: 'rotated' };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  await act(async () => saving.resolve({ ...profile, intro: 'New bio', updatedAt: 11 }));
  await act(async () => oldRead.resolve(profile));
  expect(input('Introduction').props.value).toBe('New bio');
});

it('does not start a manual reload while save is pending', async () => {
  const saving = deferred<any>();
  vi.mocked(businessApi.updateManagedCompanionProfile).mockReturnValueOnce(saving.promise);
  let hook: ReturnType<typeof useCompanionProfile>;
  const Harness = () => { hook = useCompanionProfile('token', 'owner'); return null; };
  await act(async () => { root = create(React.createElement(Harness)); });
  await act(async () => { hook!.edit(d => ({ ...d, intro: 'New bio' })); });
  await act(async () => { void hook!.save(); });
  expect(hook!.busy).toBe(true);
  await act(async () => { await hook!.reload(true); });
  expect(businessApi.getManagedCompanionProfile).toHaveBeenCalledTimes(1);
  expect(hook!.busy).toBe(true);
  await act(async () => saving.resolve({ ...profile, intro: 'New bio', updatedAt: 11 }));
  expect(hook!.source?.updatedAt).toBe(11);
  expect(hook!.draft?.intro).toBe('New bio');
});

it('recovers same-owner reauthentication without accepting a pre-logout save', async () => {
  const saving = deferred<any>();
  vi.mocked(businessApi.updateManagedCompanionProfile).mockReturnValueOnce(saving.promise);
  await render();
  await act(async () => { void button('Save Changes').props.onClick(); });
  vi.mocked(businessApi.getManagedCompanionProfile).mockResolvedValueOnce({ ...profile, intro: 'New session bio', updatedAt: 20 } as any);
  await act(async () => {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: null }));
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: { token: 'new-session', user: { id: 'owner' } } }));
    app = { ...app, authToken: 'new-session' };
    root.update(React.createElement(PlayerProfileEditView));
  });
  expect(input('Introduction')?.props.value).toBe('New session bio');
  expect(button('Save Changes').props.disabled).toBe(false);
  await act(async () => saving.resolve({ ...profile, intro: 'Old saved result', updatedAt: 11 }));
  expect(input('Introduction').props.value).toBe('New session bio');
  expect(app.notify).not.toHaveBeenCalled();
});

it('keeps conflict recovery across edits and nondiscarding token refresh', async () => {
  vi.mocked(businessApi.updateManagedCompanionProfile).mockRejectedValueOnce(new Error('COMPANION_PROFILE_STALE'));
  await render();
  await change('Introduction', 'My conflicting draft');
  await click('Save Changes');
  await change('Introduction', 'My revised conflicting draft');
  expect(button('Reload profile')).toBeDefined();
  vi.mocked(businessApi.getManagedCompanionProfile).mockResolvedValueOnce({ ...profile, intro: 'Remote edit', updatedAt: 20 } as any);
  app = { ...app, authToken: 'rotated' };
  await act(async () => root.update(React.createElement(PlayerProfileEditView)));
  expect(button('Reload profile')).toBeDefined();
  expect(input('Introduction').props.value).toBe('My revised conflicting draft');
  await click('Reload profile');
  expect(button('Reload profile')).toBeUndefined();
  expect(input('Introduction').props.value).toBe('Real bio');
});
