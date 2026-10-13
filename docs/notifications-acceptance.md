# In-App Notifications Acceptance

Date: 2026-10-13. Baseline: `cd0231286e4547eb7dc9307542288f24f525ea88`.
Repository/branch: `sogeryou/laeeb`, `codex/independent-auth`.

## Delivered Scope

- Persisted companion approval/rejection and funded order status notifications.
- Original notification page and Messages bell use owner-scoped real data, not examples.
- Server-confirmed single/all read operations, stable pagination, refresh recovery and safe target navigation.
- EN/AR copy and RTL layout. Visible polling every 30 seconds plus focus refresh; no external delivery.
- Schema 13 adds an empty notification store to old data without historical backfill.
- Internal event keys deduplicate real events and are excluded from public DTOs. Recipient IDs come from the actual application or order participants.
- Events share the business operation's persistence/rollback boundary. Failed saves restore funds, roles, orders, notifications and affected audit rows without replacing shared entity references.

## API And Permissions

`GET /api/notifications?limit=20&cursor=<last-id>` returns owner ID, items, continuation and all-owner unread count. Limits are positive integers up to 50. Cursor order is descending timestamp then ID.

`POST /api/notifications/:id/read` and `POST /api/notifications/read-all` accept strict empty JSON objects. Authentication and completed-profile eligibility follow existing rules. All endpoints set `Cache-Control: no-store`. Missing and foreign notification IDs have identical 404 responses; foreign/unknown cursors have the same invalid-cursor error. No client-supplied recipient, target, content or event key can create a notification.

Clients reject wrong-owner/kind/target/ID acknowledgements and invalid Date-range timestamps. Session guards invalidate logout, A-B-A switches, unmounts and obsolete navigation. Expanded refreshes cover the retained pagination frontier, including reads performed on another device. Order targets hydrate the authoritative participant order cache before opening the existing detail dialog; application targets show the current saved decision, not an old notification's status.

## Observed Verification

All final commands exited zero:

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
E2E_NOTIFICATION_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3016 node_modules/.bin/playwright test tests/e2e/notifications.spec.ts --workers=1 --reporter=line
git diff --check
```

- Vitest: 52 files, 366 tests passed. The focused event/API/client rerun passed 58 tests.
- Playwright: 4 tests passed on a fresh disposable fixture, including its loopback safety gate, empty/history behavior, 320px toolbar and the full business flow.
- Both TypeScript checks and Vite build passed. Existing large-bundle and react-test-renderer deprecation warnings remain non-blocking.
- Independent read-only reviews found five client issues, all reproduced and fixed with regressions: stale order target cache, expanded arrival gaps, cross-session read-all acknowledgements, cross-session polling of old rows and invalid timestamps. Re-review found no remaining concrete findings. A partially expanded continuation regression was also added.
- Narrow-title overflow was reproduced in Playwright and fixed by tightening toolbar spacing. EN/AR at 320px, 375px and 1440px were captured; heading fit and horizontal overflow are asserted.

Some original dependencies were macOS `dataless` cloud placeholders. Stalled checks were stopped without claiming success. Final checks ran in `/private/tmp/laeeb-notifications-verify-r2hGkY/repo`, cloned at the exact baseline and overlaid with byte-identical changed source/tests. Dependencies were installed with pnpm 9.15.0 and the unchanged frozen lockfile outside the cloud-managed directory. No environment secrets or production storage were copied. Original workspace dependencies were not replaced.

## Disposable Business Evidence

All business writes were performed through visible local UI. Inspection used authenticated GETs; read failures were browser-local 503 mocks. Loopback fixture: sandbox payments, cron disabled, new temporary JSON data, no production credentials or inherited external storage.

- Buyer created and completed one funded 25-coin order. Both participants received CREATED, ACCEPTED, AWAITING_CONFIRMATION and COMPLETED events.
- Buyer applied, was rejected, resubmitted and was approved; two review events were saved. Opening the old rejected notice after approval showed the current approved application and actual PLAYER role.
- Buyer: 6 notices, 0 unread after read-all and reload. Provider: 4 order notices, 4 unread. Admin and unrelated legacy customer: no notices.
- Failed single/all read attempts retained unread state, exposed retry and did not report false success.
- All 39 legacy orders were compared unchanged; 39 original reviews remain. No historical notices were fabricated.
- Test buyer balance: 500 -> 475. Test provider diamond balance: 1900 -> 1925. These are legitimate isolated test settlement results, not real payments.

## Boundaries And Delivery

No SMS, email, mobile push, deployment, main merge or external community publication. No production data mutation. The unrelated `backend/routes/auth 2.ts`, worker reports, downloaded dependencies, screenshots and synthetic storage are excluded from commits.

GitHub delivery uses the existing authorized branch with expected-head protection and exact local/remote tree comparison. Actual published commit IDs are recorded separately in `docs/github-delivery-2026-10-13.md`; local verification is not a claim of GitHub CI or production deployment.
