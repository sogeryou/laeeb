# Integer Order Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** New orders use integer coin service prices and floor discounted payable coins, while preserving historical financial records.

**Architecture:** Keep the existing authoritative quote and escrow flow. Validate new service prices at mutation boundaries and quotation; retain historical minor-unit helpers for existing order settlement/refunds. UI consumes server quotes without re-pricing locally.

**Tech Stack:** TypeScript, Zod, Decimal.js, Vitest, React.

## Global Constraints

- Service unit prices are positive integer coins. Final payable coins after discounts are rounded down to an integer.
- The server quote displayed before purchase must equal escrow and settlement amounts; one spent coin yields one diamond on settlement.
- Do not reprice historical orders, silently round stored fractional prices, or migrate existing balances.
- Preserve original purple UI and interactions. No auth redesign, remote push or deployment.
- Recharge and withdrawal conversion/ticket changes are separate batches, not part of this task.

### Task 1: Authoritative integer order pricing

**Files:** backend/orders/pricing.ts; shared/schemas.ts; shared/companionManagement.ts; companion price validation call sites and existing service price form; tests/integration/order-workflow.spec.ts and focused schema/pricing tests.

**Interfaces:** Preserve quoteOrder signature and OrderQuote shape; subtotal-discount must equal totalPrice. Keep fromMinor/toMinor available for historical escrow arithmetic.

- [x] Add failing tests: integer service 8 coins with 13% discount returns totalPrice6 and effective discount2; no coupon returns8; fractional selected service8.25 rejects without altering stored data; final discount cannot produce negative payable. Include a tiny percent discount whose exact payable is just below an integer, so intermediate rounding cannot undo flooring.
- [x] Run focused Vitest tests and record expected policy failures.
- [x] Remove silent service unit price rounding. Validate selected price with `Number.isSafeInteger(service.unitPrice) && service.unitPrice > 0`. Compute exact discount with Decimal, cap to subtotal, then `totalPrice = subtotal.minus(discount).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber()`; expose effective `discount = subtotal - totalPrice` for consistent existing quote UI.
- [x] Require positive integer prices at new application/profile/admin service mutation schemas and validators. Set existing form step to1 and show actionable integer-price validation without layout changes. Existing invalid stored price remains unchanged and cannot make a new order.
- [x] Update old fractional test fixtures meaningfully; retain idempotency, timeout, authorization and escrow assertions. Add create/fund/settle test proving server quote equals coin debit and diamond credit after a fractional discount.
- [x] Run affected tests, full suite once, app/server typechecks. Record commands/results and any existing warnings.
- [x] Independent task review; fix Important/Critical findings and rerun covering tests. Following the user's real-funds confirmation, retain finance source in the isolated development checkout; original runtime integration is gated on reconciliation and an approved migration plan.

## Subsequent independent batches

Withdrawal policy/tickets, exchange, recharge provider hardening and their UI integrations remain tracked in docs/mvp/2026-10-22-progress.md. This plan does not claim those delivered.
