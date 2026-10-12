# Persistent Order Loop Acceptance

Date: 2026-10-11. Scope: `docs/superpowers/specs/2026-10-09-order-loop-design.md`.

## Result

PASS for this development round. Original customer navigation and visual style are preserved. Checkout, participant orders, cancellation/refund, completion/settlement and reviews now use persisted server data. At feature acceptance, no deployment, GitHub push, real recharge payment or production data mutation was performed. Existing `backend/routes/auth 2.ts` was not modified. Subsequent user-authorized GitHub delivery is recorded in `github-delivery-2026-10-12.md`.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Full Vitest suite | PASS | 210 tests in 36 files, single worker, 7.16 seconds, exit 0. Existing authentication/social tests included. |
| App typecheck | PASS | `tsc --noEmit`, exit 0 after final UI change. |
| Server build/typecheck | PASS | `tsc -p tsconfig.server.json`, exit 0 after final backend change. |
| Frontend production build | PASS | Vite, 1.89 seconds, exit 0 after final tab-layout change. |
| Full guarded browser suite | PASS | Four Playwright tests, 48.6 seconds, exit 0; `.last-run.json` confirms no failed tests. |
| Final viewport capture follow-up | PASS | Parent rerun: one read-only EN/AR mobile/desktop test, 4.9 seconds, exit 0; no order mutations. |
| Visual inspection | PASS | Parent inspected EN/AR mobile/desktop lists/details, checkout, evidence and review screens. Desktop EN top framing was recaptured. |
| Persisted money and history | PASS | Parent independently checked disposable JSON storage: two funded orders, two debits, one income, one refund, buyer balance 455 and 39 unchanged legacy orders. |
| Whitespace | PASS | `git diff --check`. |

The build retains a non-blocking large-chunk warning: approximately 1.03 MB JavaScript before compression. React test renderer emits a deprecation warning. One earlier parallel Vitest run had transient socket resets; focused and repeated single-worker full runs passed. These earlier failures are not claimed as passing evidence.

## Accepted Journeys

- Buyer and provider log in through the real password UI and complete adult profile/consent when needed.
- The configured 25-coin match service, quantity two and owned fixed-5 coupon produce a server quote of 45. Funding debits exactly that amount once, leaving 455 from the isolated 500-coin balance.
- Reload retains the order, correct participant IDs and canonical status in the original IM and purchase-history entry points.
- Provider accepts and submits required completion evidence. Income is not credited before buyer confirmation.
- Buyer confirms completion; provider receives exactly 45. A four-star review preserves all 135 feedback characters and the Professional tag; reload does not offer another review.
- Buyer rebooks through order details, Chat and the existing participant profile. The second order costs 50; cancellation refunds exactly 50 once, restoring 455.
- EN/AR, LTR/RTL and 375x812/1440x1000 list/detail views pass horizontal-width checks. The four order-tab labels remain on one line.
- Legacy orders remain read-only, including direct review API attempts. Historical workflow versions and balances are not automatically migrated.

Integration/unit tests additionally cover authoritative pricing, owned/expired coupons, insufficient funds, replay/payload conflicts, newly imposed restrictions after funding, provider eligibility, participant permissions, evidence/dispute bounds, deadlines, duplicate settlements/reviews, persistence rollback, logout/account switching, credential rotation and late responses.

## Fixes Found During Verification

- Saved request replay now precedes eligibility checks for new funding. A lost successful response remains recoverable after a buyer restriction.
- Historical unfunded orders no longer block new checkout. Client and server use the same funded active-order states.
- Token-only logout and logout events invalidate pending mutations; same-account non-null credential rotation retains valid operations.
- Development module requests no longer consume the general API limit. Production limits, API limits and health exclusions remain unchanged.
- Mobile tab widths were adjusted after a failing browser measurement demonstrated a split Completed label; EN/AR measurements subsequently passed.

Test helpers were corrected for original Purchase History text, visible checkbox-label clicks and settled viewport captures. The original recommendation exposure cap is preserved; repeat booking uses the real history/chat/profile path rather than altering ranking or fixture eligibility. Initial cloud-dataless dependency hydration and an absent bundled Chromium were environmental issues; the verified runs use installed Chrome with isolated browser contexts.

## Reproduction

Start a fresh disposable fixture before rerunning the full browser journey. It requires an unused buyer with 500 coins and does not reset storage through admin APIs.

```sh
export PATH=/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
PORT=3012 node_modules/.bin/tsx scripts/player-center-preview.ts
```

In another terminal:

```sh
E2E_BROWSER_CHANNEL=chrome E2E_ORDER_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3012 node node_modules/@playwright/test/cli.js test tests/e2e/order-loop.spec.ts --workers=1 --reporter=line --output=/tmp/le3eb-order-loop-browser-qa
```

The suite refuses ordinary/remote URLs for order mutations. Authenticated inspection requests are GET-only; order/review mutations use visible UI controls. Acceptance evidence is retained in disposable fixture `le3eb-player-center-OjnurU`. The live preview at `http://127.0.0.1:3012` has been restarted with clean disposable data. Buyer: `new0@local.test`; provider: `player@local.test`; password: `PreviewOnly123!`. Restarting the fixture creates new disposable data.

## Artifacts

Full journey: `/tmp/le3eb-order-loop-browser-qa-final-oct11/order-loop-isolated-persis-082ef-ew-then-cancellation-refund/`.

Verified PNGs: `checkout-mobile-en.png`, `created-mobile-en.png`, `awaiting-provider-desktop-en.png`, `review-mobile-en.png`, `orders-mobile-en.png`, `orders-mobile-ar.png`, `orders-desktop-ar.png`, and `completed-{mobile,desktop}-{en,ar}.png`.

Final top-framed list captures: `/tmp/le3eb-order-loop-visual-final-oct11/order-loop-isolated-persis-0f853-el-on-one-line-in-EN-and-AR/tabs-{mobile,desktop}-{en,ar}.png`. The earlier scrolled desktop EN capture is superseded. Temporary screenshots are local acceptance evidence, not published assets.

## Release Boundaries

This result is not whole-platform production certification. Real payment/recharge integration, production storage/recovery and monitoring, operational dispute handling, native Arabic copy review and broader launch/security checks remain separate release work. Existing recommendation caps and other prototype product areas were not redesigned in this round.
