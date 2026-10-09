import { expect, it } from 'vitest';
import * as contract from '../../shared/auth';
it('uses visible Unicode graphemes consistently for frontend and backend nicknames', () => {
  const validate = contract.isAuthNicknameValid;
  expect(typeof validate).toBe('function');
  expect(validate('e\u0301')).toBe(false);
  expect(validate('e\u0301'.repeat(32))).toBe(true);
  expect(validate('e\u0301'.repeat(33))).toBe(false);
  expect(validate('  لاعب  ')).toBe(true);
  expect(validate('ab\u0000')).toBe(false);
});
