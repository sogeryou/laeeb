import { expect, it } from 'vitest';
import { AuthProfileSchema, isAdultBirthDate, maxBirthDate, platformDate, profileAllowsRequest, toAuthUser } from '../../backend/auth/profile';

it('uses the platform calendar, validates actual dates and observes March 1 leap-birthday anniversaries', () => {
  expect(platformDate(Date.parse('2026-10-08T23:30:00Z'), 'Asia/Shanghai')).toBe('2026-10-09');
  expect(maxBirthDate('2026-10-08')).toBe('2008-10-08');
  expect(isAdultBirthDate('2008-02-29', '2026-02-28')).toBe(false);
  expect(isAdultBirthDate('2008-02-29', '2026-03-01')).toBe(true);
  expect(maxBirthDate('2024-02-29')).toBe('2006-02-28');
  expect(isAdultBirthDate('2005-02-29', '2026-03-01')).toBe(false);
  expect(isAdultBirthDate('2008-10-08', '2026-10-08')).toBe(true);
  expect(isAdultBirthDate('2008-10-09', '2026-10-08')).toBe(false);
});

it('gates ordinary incomplete-account business while preserving session, support and admin access', () => {
  const user: any = { id: 'old', username: 'Old', email: 'old@example.test', role: 'USER', passwordHash: '', createdAt: 1 };
  expect(profileAllowsRequest(user, '/api/orders', 'POST')).toBe(false);
  expect(profileAllowsRequest(user, '/api/social/messages', 'POST')).toBe(false);
  expect(profileAllowsRequest(user, '/api/auth/profile/complete', 'POST')).toBe(true);
  expect(profileAllowsRequest(user, '/api/tickets', 'POST')).toBe(true);
  expect(profileAllowsRequest(user, '/api/wallet', 'GET')).toBe(true);
  expect(profileAllowsRequest({ ...user, role: 'ADMIN' }, '/api/admin/dashboard', 'GET')).toBe(true);
  expect(toAuthUser({ ...user, birthDate: '1999-01-01', avatar: '/api/auth/avatars/system/sage.svg', consent: { termsVersion: 'x', privacyVersion: 'x', acceptedAt: 1 } })?.profileComplete).toBe(true);
  expect(toAuthUser({ ...user, birthDate: '1999-01-01' })).not.toHaveProperty('birthDate');
});
