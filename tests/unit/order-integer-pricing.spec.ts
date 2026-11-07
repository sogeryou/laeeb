import { expect, it } from 'vitest';
import { quoteOrder } from '../../backend/orders/pricing';
import { CompanionApplySchema, AdminOperatorPatchSchema } from '../../shared/schemas';
import { UpdateCompanionProfileSchema } from '../../shared/companionManagement';
import { isValidApplicationPrice } from '../../client/components/application/applicationModel';
import { validateCompanionDraft } from '../../client/hooks/useCompanionProfile';

function setup(value = 13, type = 'PERCENT') {
  const companion = { id: 'cp', userId: 'provider', gameName: 'Game', hourlyRate: 8, status: 'APPROVED', availability: 'ONLINE', services: [{ id: 'extra', name: 'Extra', unit: 'match', unitPrice: 8 }] };
  const ctx: any = { companions: [companion], getBanError: () => null, getUserById: (id: string) => ({ id }), couponGrants: [{ id: 'grant', userId: 'buyer', templateId: 'tpl', status: 'ACTIVE', expiresAt: 9999999999999 }], couponTemplates: [{ id: 'tpl', type, value, minSpend: 0 }] };
  return { ctx, companion, quote: (coupon = true) => quoteOrder(ctx, 'buyer', { companionId: 'cp', serviceId: 'extra', quantity: 1, ...(coupon ? { couponGrantId: 'grant' } : {}) }) };
}

it('floors discounted coins and exposes the effective discount', () => {
  expect(setup().quote()).toMatchObject({ unitPrice: 8, subtotal: 8, discount: 2, totalPrice: 6 });
  expect(setup().quote(false)).toMatchObject({ subtotal: 8, discount: 0, totalPrice: 8 });
});
it('does not round a tiny exact discount away before flooring', () => {
  expect(setup(0.00001).quote()).toMatchObject({ discount: 1, totalPrice: 7 });
});
it('preserves discounts below Decimal subtraction precision', () => {
  expect(setup(1e-27).quote()).toMatchObject({ discount: 1, totalPrice: 7 });
  expect(setup(1e-27, 'FIXED').quote()).toMatchObject({ discount: 1, totalPrice: 7 });
});
it.each(['PERCENT', 'FIXED'])('does not discount a zero-value %s coupon', type => {
  expect(setup(0, type).quote()).toMatchObject({ discount: 0, totalPrice: 8 });
});
it('floors fixed fractional discounts and preserves exact integer boundaries', () => {
  expect(setup(1.01, 'FIXED').quote()).toMatchObject({ discount: 2, totalPrice: 6 });
  expect(setup(1, 'FIXED').quote()).toMatchObject({ discount: 1, totalPrice: 7 });
  expect(setup(100).quote()).toMatchObject({ discount: 8, totalPrice: 0 });
});
it.each(['PERCENT', 'FIXED'])('caps %s discounts at the subtotal', type => {
  expect(setup(200, type).quote()).toMatchObject({ subtotal: 8, discount: 8, totalPrice: 0 });
});
it.each([8.25, 8.001, Number.MAX_SAFE_INTEGER + 1, 0, -1])('rejects invalid selected price %s without mutation', unitPrice => {
  const s = setup(); s.companion.services[0].unitPrice = unitPrice;
  expect(() => s.quote()).toThrow('ORDER_AMOUNT_INVALID');
  expect(s.companion.services[0].unitPrice).toBe(unitPrice);
});
it('rejects fractional prices at application, profile and admin boundaries', () => {
  expect(CompanionApplySchema.safeParse({ gameName: 'Game', intro: 'Duo', hourlyRate: 8.25 }).success).toBe(false);
  expect(AdminOperatorPatchSchema.safeParse({ hourlyRate: 8.25 }).success).toBe(false);
  expect(AdminOperatorPatchSchema.safeParse({ services: [{ id: 'extra', name: 'Extra', unit: 'hr', unitPrice: 8.25 }] }).success).toBe(false);
  expect(UpdateCompanionProfileSchema.safeParse({ gameName: 'Game', intro: 'Duo', hourlyRate: 8, updatedAt: 1, services: [{ id: 'extra', name: 'Extra', unit: 'hr', unitPrice: 8.25 }] }).success).toBe(false);
  expect(isValidApplicationPrice(8.25)).toBe(false);
  expect(validateCompanionDraft({ gameName: 'Game', intro: 'Duo', hourlyRate: '8.25', services: [] })).toBe('hourlyRate');
});
