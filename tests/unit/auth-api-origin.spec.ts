import { afterEach, expect, it, vi } from 'vitest';
import { authApi } from '../../client/features/auth/api';
vi.mock('../../shared/apiClient', () => ({ apiUrl: (path: string) => `https://api.example.test${path}` }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('resolves uploaded avatar previews against the configured API origin', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ avatar: { type: 'upload', value: 'avatar-id' }, url: '/api/auth/avatars/uploads/avatar-id.png' }), { headers: { 'content-type': 'application/json' } })));
  const result = await authApi.uploadAvatar({ image: 'data:image/png;base64,fixture', registrationToken: 'fixture-proof' });
  expect(result.url).toBe('https://api.example.test/api/auth/avatars/uploads/avatar-id.png');
  expect(result.avatar.value).toBe('avatar-id');
});
