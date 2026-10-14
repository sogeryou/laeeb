import { expect, it } from 'vitest';
import { validBio, visibleLength } from '../../client/components/account-profile/model';

it('uses the server plain-text control rules while allowing Arabic and emoji joiners', () => {
  expect(validBio('\u202ehello')).toBe(false);
  expect(validBio('مرحبا 👨\u200d👩\u200d👧\u200d👦\nTeammate')).toBe(true);
  expect(validBio('\u0085hello')).toBe(false);
});
it('counts graphemes separately from the raw safety bound', () => {
  const combined = 'a' + '\u0301'.repeat(3000);
  expect(visibleLength(combined)).toBe(1); expect(validBio(combined)).toBe(true);
  expect(validBio('a' + '\u0301'.repeat(4096))).toBe(false);
  expect(validBio('😀'.repeat(280))).toBe(true); expect(validBio('😀'.repeat(281))).toBe(false);
});
