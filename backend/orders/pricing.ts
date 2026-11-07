import { Decimal } from 'decimal.js';
import type { CreateOrderInput, OrderQuote } from '../../shared/orders.js';
import type { AppContext } from '../app/context.js';
import type { CompanionEntity } from '../domain/types.js';
import { assertRateInLevelBand } from '../policy/index.js';
import { levelFromHourlyRate } from '../policy/leveling.js';
import { providerRestricted } from './eligibility.js';
import { OrderFlowError } from './escrow.js';

export const fromMinor = (amount: number): number => amount / 100;
export function toMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new OrderFlowError('ORDER_AMOUNT_INVALID');
  const result = new Decimal(amount).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  if (!Number.isSafeInteger(result)) throw new OrderFlowError('ORDER_AMOUNT_INVALID');
  return result;
}

export function serviceChoices(companion: CompanionEntity) {
  return [
    { id: companion.id, name: companion.gameName, unitPrice: companion.hourlyRate, unit: 'hr' },
    ...(companion.services || []).filter(service => service.id !== companion.id),
  ];
}

export function quoteOrder(ctx: AppContext, userId: string, input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>, now = Date.now()): OrderQuote {
  if (ctx.getBanError(ctx.getUserById(userId), 'ORDER')) throw new OrderFlowError('ORDER_ACTION_BLOCKED', 403);
  const companion = ctx.companions.find(c => c.id === input.companionId && c.status === 'APPROVED');
  if (!companion) throw new OrderFlowError('ORDER_COMPANION_NOT_FOUND', 404);
  if (companion.userId === userId) throw new OrderFlowError('SELF_ORDER_NOT_ALLOWED');
  const provider = ctx.getUserById(companion.userId);
  if (!provider || providerRestricted(companion, provider) || ctx.getBanError(provider, 'ACCEPT_ORDER')) throw new OrderFlowError('ORDER_ACTION_BLOCKED', 403);
  if (companion.availability !== 'ONLINE') throw new OrderFlowError('ORDER_COMPANION_UNAVAILABLE');
  if (!assertRateInLevelBand(levelFromHourlyRate(companion.hourlyRate), companion.hourlyRate).ok) throw new OrderFlowError('PRICE_OUT_OF_LEVEL_BAND', 422);
  const selectedId = input.serviceId || companion.id;
  const service = serviceChoices(companion).find(s => s.id === selectedId);
  if (!service || (input.serviceName !== undefined && input.serviceName !== service.name)) throw new OrderFlowError('ORDER_SERVICE_NOT_FOUND', 400);
  if (!service.name || !service.unit || !Number.isSafeInteger(service.unitPrice) || service.unitPrice <= 0) throw new OrderFlowError('ORDER_AMOUNT_INVALID');
  const subtotal = new Decimal(service.unitPrice).mul(input.quantity);
  if (!Number.isSafeInteger(subtotal.toNumber()) || !Number.isSafeInteger(subtotal.mul(100).toNumber())) throw new OrderFlowError('ORDER_AMOUNT_INVALID');
  let discount = new Decimal(0);
  if (input.couponGrantId) {
    const grant = ctx.couponGrants.find(g => g.id === input.couponGrantId && g.userId === userId);
    if (!grant || grant.status !== 'ACTIVE' || !Number.isFinite(grant.expiresAt) || grant.expiresAt <= now) throw new OrderFlowError('COUPON_INVALID', 400);
    const template = ctx.couponTemplates.find(t => t.id === grant.templateId);
    if (!template) throw new OrderFlowError('COUPON_TEMPLATE_MISSING', 400);
    if (subtotal.lt(fromMinor(toMinor(template.minSpend)))) throw new OrderFlowError('COUPON_MIN_SPEND', 400);
    if (!Number.isFinite(template.value) || template.value < 0) throw new OrderFlowError('COUPON_INVALID', 400);
    discount = template.type === 'FIXED' ? new Decimal(template.value)
      : subtotal.mul(template.value).div(100);
    discount = Decimal.min(subtotal, discount);
  }
  // For integer subtotal S, floor(S - D) = S - ceil(D). Round D first so
  // Decimal subtraction cannot erase a tiny positive discount near S.
  const totalPrice = subtotal.minus(discount.toDecimalPlaces(0, Decimal.ROUND_CEIL)).toNumber();
  return {
    companionId: companion.id, serviceId: service.id, serviceName: service.name, unit: service.unit,
    quantity: input.quantity, unitPrice: service.unitPrice, subtotal: subtotal.toNumber(),
    discount: subtotal.minus(totalPrice).toNumber(), totalPrice,
    ...(input.couponGrantId ? { couponGrantId: input.couponGrantId } : {}),
  };
}

export function orderRequestPayload(input: CreateOrderInput): string {
  return JSON.stringify({
    companionId: input.companionId, serviceId: input.serviceId ?? null, serviceName: input.serviceName ?? null,
    quantity: input.quantity, couponGrantId: input.couponGrantId ?? null, expectedTotal: input.expectedTotal ?? null,
  });
}
