# Persistent Order Loop

Approved by the user on 2026-10-09. Preserve the existing customer UI and navigation.

## Scope

Replace prototype checkout, order history, cancellation and reviews with the existing funded escrow workflow. Buyers and companions see persisted orders and the correct conversation peer. Checkout uses a server quote for the selected service, quantity and valid coupon grant. Funding occurs once per buyer-scoped request ID. Account changes immediately hide private order data and stale responses cannot restore it.

## Workflow

- Buyer creates and funds an order: CREATED.
- Companion accepts: IN_SERVICE (no separate start command).
- Companion submits completion evidence: AWAITING_CONFIRMATION.
- Buyer confirms: COMPLETED; existing settlement policy credits the companion.
- Buyer may cancel CREATED orders and receive a refund.
- Buyer may dispute AWAITING_CONFIRMATION with reason and evidence; existing administration resolves disputes.
- Buyer reviews a completed order once, using rating 1-5 and bounded feedback.
- Legacy unfunded orders remain visible but cannot be mutated without reconciliation.

Keep existing 15-minute acceptance and 2-hour confirmation deadlines. Server state, prices, balances, eligibility and permissions remain authoritative. Preserve moderation rules. No real payment-provider integration, historical funding migration or production deployment in this round.

Preserve the original one-ongoing-order-per-buyer/companion rule on the server as well as the checkout navigation guard. Replaying a previously saved request returns that order; genuinely new requests while a funded order is active cannot create a second debit.

## Architecture

Shared order DTOs and a server quote align checkout and persisted amounts. A focused client order hook handles hydration, requests, errors and account isolation. Original IM/My Orders screens reuse one order list. Order and review dialogs expose only the actions allowed for the current role and canonical state. Polling while order screens are open and explicit refresh keep both participants current.

## Acceptance

1. Checkout charges the displayed server quote exactly once; insufficient balance and invalid services never show success.
2. Reload retains orders; retrying one request never repeats funding; conflicting reuse of a key is rejected.
3. Buyer/provider permissions, evidence, cancellation/refund, completion/settlement and duplicate review protections are tested.
4. Both order entry points show real participants, precise status, loading, empty and retry states.
5. Logout/account switching clears private data and rejects stale results.
6. Original visual layout works on desktop/mobile and existing authentication/social flows still pass tests.
