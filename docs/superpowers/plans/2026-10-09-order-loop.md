# Persistent Order Loop Implementation Plan

**Goal:** Make the original checkout and order screens operate on funded, persistent orders.

**Architecture:** Extend existing escrow routes with shared DTOs, authoritative quotes and idempotency. Add a focused client order hook and reuse an order list/dialog pair in existing screens.

**Tech Stack:** React, TypeScript, Express, Zod, Vitest, Playwright.

## Constraints

Preserve user edits, existing styles/navigation, authentication and escrow policy. Do not modify `backend/routes/auth 2.ts`. Do not publish, deploy, push or use production data. Do not automatically fund legacy orders. Use isolated development fixtures.

## Tasks

- [x] Backend contracts: add `shared/orders.ts`; extend `shared/schemas.ts`, `backend/domain/types.ts`, `backend/routes/business.ts` and order helpers. Add isolated route tests first for quote/service/coupon agreement, duplicate funding, permissions, suspension, reviews and dispute risk events; verify red then green.
- [x] Client state: add `client/hooks/useOrders.ts` and `client/services/orderPresentation.ts`; extend `businessApi.ts` and `shared/types.ts`; remove prototype order/coupon seeds in `useAppState.ts`. Test hydration and account-switch stale responses before implementing.
- [x] Original screens: connect `OrderConfirmView.tsx`, `MyOrdersView.tsx`, `ImView.tsx` and `ViewOverlays.tsx` to persistent operations. Preserve visual structure; add real participant resolution, precise state, loading/retry/error and safe action controls.
- [x] Verification: run typecheck, full Vitest suite and production build; use disposable buyer/provider fixtures for checkout, reload, acceptance, evidence, confirmation, review and cancellation/refund in the browser. Inspect desktop/mobile screenshots. Document results and remaining release dependencies.

Final evidence on 2026-10-11: 210 Vitest tests, four guarded browser checks, app/server typechecks and production build passed. A read-only follow-up verified top-framed EN/AR mobile/desktop screenshots. See `docs/order-loop-acceptance.md` for money invariants, discovered fixes and release boundaries.

## Interfaces

`OrderQuote`: companionId, optional serviceId, serviceName, unit, quantity, unitPrice, subtotal, discount, totalPrice, optional couponGrantId.

`BusinessOrder`: persisted order fields plus role (`BUYER` or `COMPANION`), participant (`EPal`), reviewed flag and optional review. Preserve canonical backend statuses and workflowVersion.

`POST /api/orders/quote` consumes companionId, optional serviceId/serviceName, quantity and optional couponGrantId. `POST /api/orders` also consumes a stable requestId and quoted expected total. `GET /api/orders` returns role-aware DTOs. Action bodies carry evidence/reason as required.

Client `orders`: items, loading, error, pendingId, refresh, quote, create, act and review. Mutations return persisted DTOs and ignore responses from replaced sessions. Checkout navigates only after successful funding; review dialog closes only after persisted review response.
