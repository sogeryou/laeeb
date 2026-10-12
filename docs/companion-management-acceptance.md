# Companion Management Acceptance

Date: 2026-10-12. Approved scope: `docs/superpowers/specs/2026-10-11-service-management-design.md`.

**Status: PASS for this local development round.** Preserve original customer navigation and profile editor styling; persist real primary/extra services and introduction. This is not whole-platform production certification.

## Verification

| Check | Observed result |
| --- | --- |
| Full single-worker Vitest | 248 tests, 41 files passed; 9.34 seconds, exit 0 |
| Client type check | `tsc --noEmit`, exit 0 |
| Server type check/build | `tsc -p tsconfig.server.json`, exit 0 |
| Frontend production build | Vite, 2175 modules, 2.18 seconds, exit 0 |
| Final guarded browser suite | 4 passed, 47.0 seconds, exit 0; repeated after a 47.9-second passing run to settle the coupon-panel screenshot |
| Visual inspection | EN/AR editor at 375x812 and 1440x1000, public-service mobile view, stable discounted checkout; no horizontal overflow or incoherent control overlap |
| Independent focused review | Backend and session/conflict fixes approved; final public-profile/coupon deltas had no actionable P1/P2 findings, 25 focused tests passed |
| Persisted test-state inspection | Buyer 500 -> 490, one funded order for 10, one ORDER_PAY, coupon USED; 39 historical orders retain 1900 total |
| Whitespace | `git diff --check`, exit 0 |

Existing non-blocking warnings: React test renderer deprecation and frontend bundle above 500 kB (approximately 1.04 MB before gzip). No dependency upgrade or unrelated bundle refactor was included.

## Accepted Journeys

1. Provider loads real primary game/rate, introduction and existing extra services; edits primary rate to 20, an existing match service to 7.5 and adds a 9.5/hour service with a stable UUID. UI save, authenticated GET and page reload agree.
2. Owner-only read/write, provider restrictions, strict payload/price validation, duplicate/colliding/removed service IDs, stale revisions and reversible persistence failures are integration-tested. The old application endpoint cannot mutate or reapprove an existing companion.
3. Load failure exposes Retry. Invalid price sends no PATCH. Rapid double-click sends one PATCH. Failed save retains the draft; conflict retains the explicit reload action. Cover and voice controls are disabled, with no fabricated recording or upload success.
4. Dirty drafts keep their original revision through token rotation. Logout/account switching rejects late responses; rapid same-owner reauthentication recovers without accepting a pre-logout save. Background refresh and subsequent edits do not remove unresolved conflict recovery.
5. Customer sees current services and introduction, including profile entry from a service-less companion chat summary. Ordinary customer chat profiles are not queried as companions. Failed public reads block stale booking and support retry.
6. Actual UI checkout selects the edited match service, quantity two and the fixed-5 coupon: 7.5 x 2 = 15, discount 5, funded total 10. Wallet becomes 490. Historical service name/unit/price snapshots remain unchanged; server tests reject a stale quoted total before funding and verify one debit on retry.

Acceptance item 4 exercised the full saved-profile -> public-profile -> quote -> funded-order path in the browser. Account event and stale-response races were exercised by renderer/hook tests, not a separate multi-tab browser scenario.

## Fixes Found During Acceptance

- Existing application writes bypassed profile restrictions; they now reject existing companions without mutation or reapproval.
- Same-owner rapid relogin and conflict recovery had reproducible hook failures; test-first fixes preserve account generation and explicit conflict reload until resolved.
- New users' first coupon read could be denied before profile completion. Entering checkout now reloads coupons, with account and redemption guards still intact.
- The old public refresh guard skipped companion chat summaries without services. It now distinguishes companion IDs from plain customer IDs and hydrates those summaries.
- Original newcomer exposure caps remain unchanged. The browser uses the Home screen already shown after login, avoiding a redundant navigation that exhausted the fixture's cap.
- Disabled desktop cover placeholder is capped at 192 pixels; mobile sizing stays unchanged. Final checkout capture waits for the coupon sheet to finish closing.

## Reproduction and Evidence

Use a freshly started disposable preview before the full browser suite. It requires the original 25-price services and an unused buyer with 500 coins; it never resets production data through admin APIs.

```sh
export PATH=/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
PORT=3013 node_modules/.bin/tsx scripts/player-center-preview.ts
# In a separate terminal:
E2E_COMPANION_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3013 \
  node_modules/.bin/playwright test tests/e2e/companion-management.spec.ts \
  --workers=1 --reporter=line --output=/tmp/le3eb-companion-browser-accepted-oct12
```

The suite refuses remote/ordinary/wrong-port origins and uses installed Chrome. Login and profile/order writes use the visible UI. Inspection is authenticated GET only; browser failure mocks never modify server storage.

- Accepted run artifacts: `/tmp/le3eb-companion-browser-accepted-oct12/` (`.last-run.json` reports passed, no failed tests).
- Inspected EN/AR editor matrix: `/tmp/le3eb-companion-browser-final2-oct12/companion-management-dispo-0b38d-rted-controls-stay-disabled/editor-{mobile,desktop}-{en,ar}.png`.
- Stable checkout: `/tmp/le3eb-companion-browser-accepted-oct12/companion-management-dispo-2b87b-s-without-rewriting-history/checkout-mobile-en.png`.
- Accepted disposable storage: `/var/folders/gj/s_rf53w56mv6nfdm9xqv199c0000gn/T/le3eb-player-center-ZWxX50/storage.json`.
- Accepted funded order: `ord_eacaa072-3f05-420d-a03b-f83645fc23b7`, total 10. Historical fixture records remain separate and unfunded.

Live preview: `http://127.0.0.1:3013`, restarted with clean disposable data after acceptance. Provider `player@local.test`, buyer `new0@local.test`, password `PreviewOnly123!`. Entry: Me -> Player Center -> Game Services. Complete the existing first-login profile step when prompted. Every preview restart creates a new directory and invalidates old sessions; accepted evidence is retained separately.

## Release Boundaries

At feature acceptance, changes were local and uncommitted with no GitHub push, production writes, real payments or deployment. The user subsequently authorized verified GitHub delivery on 2026-10-12; see `github-delivery-2026-10-12.md`. Service deletion, cover/media upload and voice recording remain outside this round. Real payment handling, transaction-safe production storage, migration/reconciliation, monitoring, security/launch certification and native Arabic copy review still require separate work. EN/AR verification here covers the changed editor, not full translation of every existing platform screen.
