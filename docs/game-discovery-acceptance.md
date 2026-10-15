# Real Game Companion Discovery Acceptance

Date: 2026-10-15. Branch: `codex/independent-auth`. Approved scope: preserve the existing game-detail experience and replace prototype companions with real approved services, filters and existing profile/chat/quote navigation.

## Delivered Behavior

- Public read-only `GET /api/games/:gameId/companions`, strict bounded query validation, no-store responses and explicit public DTOs. Exact normalized game aliases exclude unrelated prefixes and PUBG PC. Current primary game takes precedence over stale application metadata.
- Only approved providers with valid public owners and no relevant account/provider/order restrictions appear. Malformed legacy rows are isolated without modifying stored services.
- Actual online count, availability, primary hourly price, approved review score/count and settled completed orders in the last 30 days. Default price range is 0..10000; services above 100 are not silently hidden. Existing checkout pricing eligibility remains authoritative.
- Online/gender/price filters, order/rating sorts, pagination, empty/error/retry and same-query refresh. Session, game and filter changes invalidate obsolete responses and booking actions. Busy/offline/self/unbookable/stale results cannot start a booking.
- Existing game hero, assets, profile, chat and quote flow retained. English and Arabic/RTL supported. Unsupported server/platform/rank filters show unavailable; absent recordings and play links are not fabricated.

## Verification

All 21 changed runtime, test and preview-script files were byte-compared against the validation snapshot after the navigation fixes. Tests used the exact repository baseline with frozen existing dependencies in `/private/tmp/laeeb-game-discovery-verify-20261014`, avoiding unrelated macOS cloud placeholders in the original checkout. No dependency changes.

| Check | Final result |
| --- | --- |
| Full Vitest suite | 627 passed, 68 files, 16.79 seconds |
| New focused coverage | 97 backend/catalog + 27 client + 43 actual AppState navigation + 1 preview safety tests |
| Frontend TypeScript | Passed |
| Server TypeScript | Passed |
| Vite production build | Passed; existing large-chunk advisory remains |
| Guarded Playwright acceptance | 5 passed, 46.6 seconds, on a fresh disposable fixture |
| Whitespace check | Passed on integrated validation snapshot |
| Independent backend spec/quality review | Passed, no actionable findings |
| Independent integrated spec/quality review | Passed after fixes; both original findings closed, no new actionable findings |

New behavior was developed with failing regression tests before fixes. Two earlier full runs encountered a transient `ECONNRESET` in an unchanged avatar integration test; its focused suite passed, and subsequent full runs passed without weakening assertions or changing timeout policy. Existing React test-renderer deprecation warnings remain.

The initial integrated review reproduced a shared game-state reset on account changes and prototype-only resolution of saved auth-return IDs. Both were fixed with failing regressions first: public game identity is separated from private application drafts, and saved real targets receive a guarded fresh public profile read with an explicit actual primary service. Forty-three actual AppState tests cover initial restore, owner/logout/A-B-A, same-owner rotation, private draft clearing, Back, reentry, unavailable acknowledgements and stale completion. The parent additionally reproduced the original booking failure in a browser; the extended three-path guest test now passes for booking/chat login reload recovery and returning to discovery after login. The fresh complete 5-case browser suite also passed. Independent re-review passed and additionally checked private/public context separation, latest ongoing-order protection during delayed resolution and fresh primary-service selection in memory.

## Browser Evidence And Business Boundaries

Acceptance target: `http://127.0.0.1:3020/`, final disposable JSON fixture `le3eb-game-discovery-g4Kkw5`. The preview clears inherited production storage/mail credentials, disables cron and refuses production mode or another port. Browser tests require the explicit fixture flag and exact loopback origin/root.

- Real public endpoint returns 25 eligible Valorant companions, 23 online, over pages of 20 and 5. A real 150-coin legacy service remains visible but cannot bypass existing checkout price rules. Pending/restricted and nonmatching game providers remain excluded.
- Covered initial failure/retry, failed second page retaining confirmed rows, retry without duplicate cards, gender/price filters, reset, real orders/score sorts, exact PUBG Mobile matching and an empty game.
- Buyer/provider login and onboarding occur through visible UI. Public profile and one synthetic chat message work. The selected primary service reaches the existing quote with `preview-cp`, `hr`, quantity 1 and total 25. No order submission or payment was clicked.
- Historical fixture remains 39 orders, 39 reviews and 39 wallet transactions; buyer balance 500 coins, provider balance 1900 diamonds, original service prices and USER/PLAYER roles retained, zero notifications. Profile navigation may use the existing exposure behavior; the new discovery endpoint itself has explicit zero-write regression coverage.
- Twelve screenshots cover list and filter dialog in English/Arabic at 320, 375 and 1440 pixels. Checked real loaded hero/avatar image pixels, stable motion/font completion, readable controls and no horizontal overflow.

Final visual sign-off: the parent individually inspected all twelve final screenshots from the fresh 5-case run. English/Arabic lists and dialogs fit; both desktop footer action labels are visible. The earlier intermittent pre-font/repaint screenshot qualification is closed for these final captures.

Screenshot directory (local validation artifact, not committed): `test-results/game-discovery-disposable--bf3b7-top-with-real-loaded-assets/` under the validation snapshot. Screenshots are synthetic local data, not production claims.

## Limits

No production migration, deployment, main-branch merge, real payment, notification delivery or external promotion. No change to authentication, approval, service prices, payment rules or review policy. No throughput benchmark or production-scale performance claim; discovery currently reads the existing in-memory state. Unsupported metadata stays unavailable rather than being inferred.

GitHub delivery must use the verified remote head, a non-force update and exact committed-tree comparison. Actual publication identifiers belong in the dated delivery receipt, not inferred from local review commits.
