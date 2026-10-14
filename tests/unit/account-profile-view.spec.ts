import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SettingsEditProfileView } from '../../client/views/SettingsEditProfileView';

let app: any; let root: ReactTestRenderer;
vi.mock('../../client/app/AppContext', () => ({ useApp: () => app }));
vi.mock('motion/react', () => ({ motion: { div: ({ children, ...props }: any) => React.createElement('div', props, children) }, AnimatePresence: ({ children }: any) => children }));
vi.mock('../../client/features/auth/AvatarPicker', () => ({ AvatarPicker: ({ onChoose }: any) => React.createElement('button', { onClick: () => onChoose('sage') }, 'Picker sage') }));
const render = async () => { await act(async () => { root = create(React.createElement(SettingsEditProfileView)); }); };
const button = (name: string) => root.root.findAllByType('button').find(node => node.props['aria-label'] === name || node.children.includes(name))!;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); app = { locale: 'en', authUser: { id: 'A' }, setCurrentView: vi.fn(), accountProfile: {
  account: 1, owner: 'A', profile: { user: { id: 'A', username: 'Real Nick' }, bio: 'Patient teammate', revision: 'a'.repeat(64) },
  draft: { username: 'Real Nick', bio: 'Patient teammate' }, avatarPreview: '/real.png', dirty: true, loading: false, saving: false, uploading: false, saved: false, error: '',
  change: vi.fn(), chooseAvatar: vi.fn(), uploadAvatar: vi.fn(), save: vi.fn(async () => true), reload: vi.fn(async () => {}),
} }; });
afterEach(async () => { if (root) await act(async () => root.unmount()); vi.unstubAllGlobals(); });

it('renders the real saved editor values and avatar without Alex or example bio', async () => {
  await render(); const input = root.root.findByType('input'), bio = root.root.findByType('textarea');
  expect(input.props.value).toBe('Real Nick'); expect(bio.props.value).toBe('Patient teammate');
  expect(root.root.findByType('img').props.src).toBe('/real.png'); expect(JSON.stringify(root.toJSON())).not.toContain('Gaming is life');
  await act(async () => input.props.onChange({ target: { value: 'New name' } })); expect(app.accountProfile.change).toHaveBeenCalledWith('username', 'New name');
  await act(async () => root.root.findByType('form').props.onSubmit({ preventDefault: vi.fn() })); expect(app.accountProfile.save).toHaveBeenCalledOnce();
});
it('uses the existing avatar picker and only records a candidate choice', async () => {
  await render(); await act(async () => button('Choose avatar').props.onClick());
  await act(async () => button('Picker sage').props.onClick()); expect(app.accountProfile.chooseAvatar).toHaveBeenCalledWith('sage'); expect(app.accountProfile.save).not.toHaveBeenCalled();
});
it('shows load/save failures and offers an explicit saved-profile reload without fake success', async () => {
  app.accountProfile.error = 'PROFILE_STALE'; await render(); expect(root.root.findAll(node => node.props.role === 'alert')).toHaveLength(1);
  await act(async () => button('Reload saved profile').props.onClick()); expect(app.accountProfile.reload).toHaveBeenCalledWith(true);
  expect(JSON.stringify(root.toJSON())).not.toContain('Profile saved');
});
it('uses Arabic RTL, blocks invalid or busy saves and shows only acknowledged saved status', async () => {
  app.locale = 'ar'; app.accountProfile.saving = true; await render();
  expect(root.root.findAll(node => node.props.dir === 'rtl').length).toBeGreaterThan(0); expect(JSON.stringify(root.toJSON())).toContain('تعديل الملف الشخصي');
  expect(root.root.findByProps({ type: 'submit' }).props.disabled).toBe(true);
  app.accountProfile.saving = false; app.accountProfile.saved = true; app.accountProfile.dirty = false;
  await act(async () => root.update(React.createElement(SettingsEditProfileView)));
  expect(JSON.stringify(root.toJSON())).toContain('تم حفظ الملف الشخصي');
});
