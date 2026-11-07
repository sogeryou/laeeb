# Withdrawal Domain Implementation Plan

> **For agentic workers:** Use subagent-driven-development and test-driven-development; implement this single bounded task before runtime integration.

**Goal:** Implement approved withdrawal quotation and pure ticket transitions with explicit available/frozen diamond effects.

**Architecture:** New versioned domain module independent of legacy WithdrawalRequest and money.ts. Pure functions return new state; no I/O, persistence, server imports or live endpoints. An eventual transaction adapter must save ticket/wallet/audit/idempotency atomically; this batch does not enable withdrawals.

**Tech Stack:** TypeScript, existing Decimal.js with local clone if needed, Vitest. No new dependencies.

## Global Constraints

- User-confirmed150 integer diamonds=1USD, minimum20USD, USD step0.02=3diamonds, zero platform fee. GrossUSD=USDT1:1, netUSDT=gross minus actual chain fee. Reject invalid inputs, never round silently.
- At most one active ticket per user; application moves available to frozen. Pending can cancel/reject and release once. Approval does not debit again and forbids cancel/address mutation. Unknown payment stays frozen. Paid consumes frozen only; confirmed unpaid closes/releases. No automated transfer or retry, no post-paid correction.
- Preserve real historical balances/orders/withdrawals untouched. New domain is not wired into old routes or storage. Tests use constructed data only.
- No claim of full API authorization, atomic persistence, restart idempotency, address checksum validation or external payment verification in this pure module. These remain integration tasks; client/UI unchanged.

### Task 1: Pure quote and ticket core

Create backend/finance/withdrawalDomain.ts, tests/unit/withdrawal-domain.spec.ts, docs/mvp/withdrawal-domain-contract.md. Existing runtime source remains unchanged.

Contract:

```ts
type Status = 'PENDING_REVIEW' | 'APPROVED_AWAITING_PAYMENT' | 'PAYMENT_UNKNOWN' | 'PAID' | 'CANCELLED' | 'REJECTED' | 'CLOSED_UNPAID';
type Wallet = { available: number; frozen: number };
// public quoteWithdrawalUsd(usd: string) returns cents/diamondAmount/grossUsdt/platformFeeUsdt.
// USD input uses plain decimal with 0-2fractiondigits only; no exponent, sign, whitespace or coercion.
// createWithdrawal receives id,userId,usd,address,now,wallet,existingTickets and returns {ticket,wallet}.
// transitionWithdrawal receives ticket,wallet,command,actor,now,expectedVersion and returns {ticket,wallet}.
// actor discriminant owner/finance; owner.userId must match ticket.userId. Finance role is a trusted caller capability, NOT an API permission check.
// commands: CANCEL, REJECT(reason), APPROVE, MARK_UNKNOWN(reason), CONFIRM_PAID(actualChainFeeUsdt,paymentProof), CLOSE_UNPAID(nonpaymentEvidence).
```

Ticket contains version1 schema marker, monotonically increasing revision, immutable identifiers/user/address/quote, status, createdAt/updatedAt and append-only command events with actor identity/time. Keep estimates out of this core until integration can provide trusted quotes. Initial status PENDING_REVIEW and revision0. Validation errors should use stable typed codes. Calling with stale expectedVersion or any terminal state rejects and returns no mutations. Repeated terminal operation must not transfer funds twice.

- [x] Add RED quote tests:20→3000,20.02→3003;20.01 throws step error with20.00/20.02 suggestions without auto-selection;below20/fractional-cent/NaN/exponent/signed/empty/unsafe-range strings reject. Exact integer arithmetic protects safe cents and diamonds. Example algorithm parse cents as BigInt, require cents%2n===0n and cents>=2000n; diamonds=cents/2n*3n; bound values before Number conversion.
- [x] Add RED lifecycle tests: available5000/frozen0 apply20.02→1997/3003; other user active allowed, same user PENDING/APPROVED/UNKNOWN blocked; insufficient or fractional/negative/unsafe wallet rejected; approval wallet unchanged; pending cancel/reject release3003; approved cancel rejected; unknown preserves reserve; unknown→paid or confirmedunpaid; terminal replay and stale revision blocked; owner cannot finance actions and cannot cancel another user's ticket.
- [x] Add RED payout tests:20.02 withfee1 yields19.02 exact string, no platformfee; fee0 allowed, negative/nonfinite/malformed or >=gross rejected without changing state; proof/nonpayment evidence/rejection reason required; pending→paid disallowed; APPROVED/UNKNOWN maypaid orclosedunpaid; unknown cannot become approved/retry. Payment proof is evidence text, not blockchain verification. Validate wallet has at least this ticket's reserve before any approved/unknown/pending transition; don't consume another ticket's reserve beyond target amount.
- [x] Implement minimal pure core with explicit allowed-transition table and exhaustive commands. Clone ticket/events rather than mutate input; preserve immutable fields. Validate runtime shape/version/quote consistency so forged/fractional/corrupt stored ticket cannot move funds. Address is nonempty opaque string for this layer; downstream must validate TRC20/checksum before creation. Bound lengths of identifiers/evidence defensively without introducing monetary business caps. Finite nonnegative integer timestamps, actor identity, monotonic time, safe revision arithmetic.
- [x] Add deep-freeze and invariant tests: original objects and events unchanged on success/failure; available+frozen conserved except PAID reduces total by exact diamondAmount; no release overflow; zero residual plus another unrelated reserve preserved; input proof strings don't override immutable ticket data; corrupted quote/reserve/ticket schema rejected. Use exact fee subtraction independent of shared global Decimal precision (local clone or integer decimal helper), and retain precision rather than silently round fees. Document string contract and representational input length bounds.
- [x] Run focused test, full suite once, both app/server tsc. Record RED/GREEN commands and outputs, changed paths and limitations at .superpowers/mvp/withdrawal-domain-report.md. Independent review follows; controller commits only after fixes and final verification.

## Integration remaining

Atomically persisted ledger/reserves, trusted authorization, account restrictions, durable request idempotency and unique proof enforcement, authenticated endpoints, address validation, manual operations UI and wallet refresh, real backup/reconciliation/migration and runtime enablement remain separate next batches. Pure domain completion is not user-visible withdrawal completion.
