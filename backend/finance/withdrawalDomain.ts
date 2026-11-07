/** Pure v1 withdrawal domain. No persistence, network or authorization boundary. */
export type WithdrawalStatus = 'PENDING_REVIEW' | 'APPROVED_AWAITING_PAYMENT' | 'PAYMENT_UNKNOWN' | 'PAID' | 'CANCELLED' | 'REJECTED' | 'CLOSED_UNPAID';
export type Wallet = { available: number; frozen: number };
export type Actor = { kind: 'owner' | 'finance'; userId: string };
export type WithdrawalQuote = { cents: number; diamondAmount: number; grossUsdt: string; platformFeeUsdt: string };
export type Command = { type: 'CANCEL' } | { type: 'REJECT'; reason: string } | { type: 'APPROVE' } | { type: 'MARK_UNKNOWN'; reason: string } | { type: 'CONFIRM_PAID'; actualChainFeeUsdt: string; paymentProof: string } | { type: 'CLOSE_UNPAID'; nonpaymentEvidence: string };
type EventCommand = Command | { type: 'APPLY' };
export type WithdrawalEvent = { revision: number; at: number; actor: Actor; command: EventCommand };
type Payout = { actualChainFeeUsdt: string; netUsdt: string; paymentProof: string };
export type WithdrawalTicket = { schemaVersion: 1; id: string; userId: string; address: string; quote: WithdrawalQuote; status: WithdrawalStatus; revision: number; createdAt: number; updatedAt: number; events: WithdrawalEvent[]; payout?: Payout };
export type WithdrawalErrorCode = 'INVALID_USD' | 'BELOW_MINIMUM' | 'INVALID_STEP' | 'UNSAFE_AMOUNT' | 'INVALID_INPUT' | 'INVALID_WALLET' | 'INSUFFICIENT_BALANCE' | 'INSUFFICIENT_RESERVE' | 'ACTIVE_TICKET' | 'DUPLICATE_ID' | 'INVALID_TICKET' | 'FORBIDDEN' | 'STALE_VERSION' | 'TERMINAL_TICKET' | 'INVALID_TRANSITION' | 'INVALID_FEE' | 'INVALID_COMMAND';
export class WithdrawalDomainError extends Error {
  constructor(public readonly code: WithdrawalErrorCode, public readonly suggestions?: string[]) { super(code); this.name = 'WithdrawalDomainError'; }
}
function fail(code: WithdrawalErrorCode): never { throw new WithdrawalDomainError(code); }
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function text(value: unknown, max: number, code: WithdrawalErrorCode = 'INVALID_INPUT'): asserts value is string {
  if (typeof value !== 'string' || value.length > max || !value.trim()) fail(code);
}
function money(cents: bigint): string { return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`; }
export function quoteWithdrawalUsd(usd: string): WithdrawalQuote {
  if (typeof usd !== 'string' || usd.length > 32 || !/^\d+(?:\.\d{1,2})?$/.test(usd)) fail('INVALID_USD');
  const [whole, fraction = ''] = usd.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > MAX || cents * 3n > MAX * 2n) fail('UNSAFE_AMOUNT');
  if (cents < 2000n) fail('BELOW_MINIMUM');
  if (cents % 2n) throw new WithdrawalDomainError('INVALID_STEP', [money(cents - 1n), money(cents + 1n)]);
  return { cents: Number(cents), diamondAmount: Number(cents / 2n * 3n), grossUsdt: money(cents), platformFeeUsdt: '0' };
}
function wallet(value: unknown): asserts value is Wallet {
  if (!record(value) || !integer(value.available) || !integer(value.frozen)) fail('INVALID_WALLET');
}
function actor(value: unknown, userId: string): asserts value is Actor {
  if (!record(value) || (value.kind !== 'owner' && value.kind !== 'finance')) fail('FORBIDDEN');
  text(value.userId, 128, 'FORBIDDEN');
  if (value.kind === 'owner' && value.userId !== userId) fail('FORBIDDEN');
}
const transitions: Record<WithdrawalStatus, Partial<Record<Command['type'], WithdrawalStatus>>> = {
  PENDING_REVIEW: { CANCEL: 'CANCELLED', REJECT: 'REJECTED', APPROVE: 'APPROVED_AWAITING_PAYMENT' },
  APPROVED_AWAITING_PAYMENT: { MARK_UNKNOWN: 'PAYMENT_UNKNOWN', CONFIRM_PAID: 'PAID', CLOSE_UNPAID: 'CLOSED_UNPAID' },
  PAYMENT_UNKNOWN: { CONFIRM_PAID: 'PAID', CLOSE_UNPAID: 'CLOSED_UNPAID' },
  PAID: {}, CANCELLED: {}, REJECTED: {}, CLOSED_UNPAID: {},
};
function active(status: WithdrawalStatus): boolean { return status === 'PENDING_REVIEW' || status === 'APPROVED_AWAITING_PAYMENT' || status === 'PAYMENT_UNKNOWN'; }
// Exact scaled-integer subtraction, independent of shared Decimal precision.
function payout(command: Extract<Command, { type: 'CONFIRM_PAID' }>, quote: WithdrawalQuote): Payout {
  const fee = command.actualChainFeeUsdt;
  if (typeof fee !== 'string' || fee.length > 128 || !/^\d+(?:\.\d+)?$/.test(fee)) fail('INVALID_FEE');
  const [whole, fraction = ''] = fee.split('.');
  const scale = Math.max(2, fraction.length);
  const gross = BigInt(quote.cents) * 10n ** BigInt(scale - 2);
  const actual = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'));
  if (actual >= gross) fail('INVALID_FEE');
  const net = String(gross - actual).padStart(scale + 1, '0');
  const netUsdt = `${net.slice(0, -scale)}.${net.slice(-scale)}`.replace(/0+$/, '').replace(/\.$/, '');
  text(command.paymentProof, 4096, 'INVALID_COMMAND');
  return { actualChainFeeUsdt: fee, netUsdt, paymentProof: command.paymentProof };
}
function commandCopy(value: unknown, quote: WithdrawalQuote): Command {
  if (!record(value)) fail('INVALID_COMMAND');
  switch (value.type) {
    case 'CANCEL': case 'APPROVE': return { type: value.type };
    case 'REJECT': case 'MARK_UNKNOWN':
      text(value.reason, 4096, 'INVALID_COMMAND'); return { type: value.type, reason: value.reason };
    case 'CLOSE_UNPAID':
      text(value.nonpaymentEvidence, 4096, 'INVALID_COMMAND'); return { type: value.type, nonpaymentEvidence: value.nonpaymentEvidence };
    case 'CONFIRM_PAID': {
      const candidate = value as unknown as Extract<Command, { type: 'CONFIRM_PAID' }>;
      payout(candidate, quote);
      return { type: 'CONFIRM_PAID', actualChainFeeUsdt: candidate.actualChainFeeUsdt, paymentProof: candidate.paymentProof };
    }
    default: return fail('INVALID_COMMAND');
  }
}
function nextStatus(status: WithdrawalStatus, command: Command, by: Actor): WithdrawalStatus {
  if ((command.type === 'CANCEL' && by.kind !== 'owner') || (command.type !== 'CANCEL' && by.kind !== 'finance')) fail('FORBIDDEN');
  if (!active(status)) fail('TERMINAL_TICKET');
  const next = transitions[status][command.type];
  if (!next) fail('INVALID_TRANSITION');
  return next;
}
/** Structural consistency, not authenticity: callers must load trusted records. */
function ticket(value: unknown): asserts value is WithdrawalTicket {
  try {
    if (!record(value) || value.schemaVersion !== 1 || !integer(value.revision) || !integer(value.createdAt) || !integer(value.updatedAt) || value.updatedAt < value.createdAt) fail('INVALID_TICKET');
    text(value.id, 128); text(value.userId, 128); text(value.address, 512);
    if (!record(value.quote) || typeof value.quote.grossUsdt !== 'string') fail('INVALID_TICKET');
    const quote = quoteWithdrawalUsd(value.quote.grossUsdt);
    const storedQuote = value.quote;
    if (Object.keys(quote).some(key => quote[key as keyof WithdrawalQuote] !== storedQuote[key])) fail('INVALID_TICKET');
    if (!Array.isArray(value.events) || value.events.length !== value.revision + 1 || !value.events.length) fail('INVALID_TICKET');
    let status: WithdrawalStatus = 'PENDING_REVIEW';
    let lastTime = value.createdAt;
    let payment: Payout | undefined;
    for (let index = 0; index < value.events.length; index++) {
      const event: unknown = value.events[index];
      if (!record(event) || event.revision !== index || !integer(event.at) || event.at < lastTime) fail('INVALID_TICKET');
      actor(event.actor, value.userId);
      if (index === 0) {
        if (!record(event.command) || event.command.type !== 'APPLY' || event.actor.kind !== 'owner' || event.at !== value.createdAt) fail('INVALID_TICKET');
      } else {
        const command = commandCopy(event.command, quote);
        status = nextStatus(status, command, event.actor);
        if (command.type === 'CONFIRM_PAID') payment = payout(command, quote);
      }
      lastTime = event.at;
    }
    if (value.status !== status || value.updatedAt !== lastTime) fail('INVALID_TICKET');
    if (payment) {
      const storedPayout = value.payout;
      if (!record(storedPayout) || Object.keys(payment).some(key => payment![key as keyof Payout] !== storedPayout[key])) fail('INVALID_TICKET');
    } else if (value.payout !== undefined) fail('INVALID_TICKET');
  } catch { fail('INVALID_TICKET'); }
}
export function createWithdrawal(input: { id: string; userId: string; usd: string; address: string; now: number; wallet: Wallet; existingTickets: readonly WithdrawalTicket[] }): { ticket: WithdrawalTicket; wallet: Wallet } {
  if (!record(input)) fail('INVALID_INPUT');
  text(input.id, 128); text(input.userId, 128); text(input.address, 512);
  if (!integer(input.now) || !Array.isArray(input.existingTickets)) fail('INVALID_INPUT');
  wallet(input.wallet);
  const quote = quoteWithdrawalUsd(input.usd);
  for (const existing of input.existingTickets) {
    ticket(existing);
    if (existing.userId === input.userId && active(existing.status)) fail('ACTIVE_TICKET');
    if (existing.id === input.id) fail('DUPLICATE_ID');
  }
  if (input.wallet.available < quote.diamondAmount) fail('INSUFFICIENT_BALANCE');
  const frozen = BigInt(input.wallet.frozen) + BigInt(quote.diamondAmount);
  if (frozen > MAX) fail('INVALID_WALLET');
  return {
    ticket: { schemaVersion: 1, id: input.id, userId: input.userId, address: input.address, quote, status: 'PENDING_REVIEW', revision: 0, createdAt: input.now, updatedAt: input.now, events: [{ revision: 0, at: input.now, actor: { kind: 'owner', userId: input.userId }, command: { type: 'APPLY' } }] },
    wallet: { available: input.wallet.available - quote.diamondAmount, frozen: Number(frozen) },
  };
}
export function transitionWithdrawal(input: { ticket: WithdrawalTicket; wallet: Wallet; command: Command; actor: Actor; now: number; expectedVersion: number }): { ticket: WithdrawalTicket; wallet: Wallet } {
  if (!record(input)) fail('INVALID_INPUT');
  ticket(input.ticket); wallet(input.wallet);
  const current = input.ticket;
  actor(input.actor, current.userId);
  if (!integer(input.expectedVersion) || input.expectedVersion !== current.revision) fail('STALE_VERSION');
  if (!integer(input.now) || input.now < current.updatedAt || current.revision === Number.MAX_SAFE_INTEGER) fail('INVALID_INPUT');
  if (!active(current.status)) fail('TERMINAL_TICKET');
  if (input.wallet.frozen < current.quote.diamondAmount) fail('INSUFFICIENT_RESERVE');
  const command = commandCopy(input.command, current.quote);
  const status = nextStatus(current.status, command, input.actor);
  const updatedWallet = { available: input.wallet.available, frozen: input.wallet.frozen };
  if (status === 'PAID') updatedWallet.frozen -= current.quote.diamondAmount;
  if (status === 'CANCELLED' || status === 'REJECTED' || status === 'CLOSED_UNPAID') {
    const available = BigInt(updatedWallet.available) + BigInt(current.quote.diamondAmount);
    if (available > MAX) fail('INVALID_WALLET');
    updatedWallet.available = Number(available);
    updatedWallet.frozen -= current.quote.diamondAmount;
  }
  const revision = current.revision + 1;
  const events: WithdrawalEvent[] = current.events.map(event => ({ revision: event.revision, at: event.at, actor: { kind: event.actor.kind, userId: event.actor.userId }, command: event.command.type === 'APPLY' ? { type: 'APPLY' } : commandCopy(event.command, current.quote) }));
  events.push({ revision, at: input.now, actor: { kind: input.actor.kind, userId: input.actor.userId }, command });
  const updatedTicket: WithdrawalTicket = { schemaVersion: 1, id: current.id, userId: current.userId, address: current.address, quote: quoteWithdrawalUsd(current.quote.grossUsdt), status, revision, createdAt: current.createdAt, updatedAt: input.now, events };
  if (command.type === 'CONFIRM_PAID') updatedTicket.payout = payout(command, current.quote);
  return { ticket: updatedTicket, wallet: updatedWallet };
}
