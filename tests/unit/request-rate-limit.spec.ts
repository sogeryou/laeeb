import { expect, it } from 'vitest';
import { skipRequestLimit } from '../../backend/middleware/rateLimit';

it('does not charge local development module loads against the API request limit', () => {
  for (const path of ['/', '/views/MeView.tsx', '/@vite/client', '/@fs/example.js', '/assets/app.js']) {
    expect(skipRequestLimit(path, false)).toBe(true);
    expect(skipRequestLimit(path, true)).toBe(false);
  }
});

it('retains API limits and existing health exclusions in both environments', () => {
  for (const production of [false, true]) {
    for (const path of ['/api', '/api/orders', '/api/auth/login', '/api/uploads']) expect(skipRequestLimit(path, production)).toBe(false);
    for (const path of ['/healthz', '/ready', '/metrics']) expect(skipRequestLimit(path, production)).toBe(true);
  }
});
