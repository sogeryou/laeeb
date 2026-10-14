# Persistent Personal Profile Acceptance

Date: 2026-10-14. Baseline: `c93d768841f5fb495b97902ffac465e8a5c631f8`.
Repository/branch: `sogeryou/laeeb`, `codex/independent-auth`.

## Delivered Scope

- Existing personal editor now loads and persists nickname, personal bio and avatar, rather than example values or simulated success.
- Saved identity survives reload and appears on Me, public profiles, live chat peers and existing social author projections.
- Existing system-avatar picker and actual photo upload/cropper are reused. Uploading a candidate does not replace the saved avatar until the profile save is acknowledged.
- EN/AR copy, RTL, field counters, validation, loading, failed-save retry and explicit saved-profile reload are supported.
- Password, role, birthday, adult consent, application decisions, provider services, prices and funds are outside this editor's write contract.

## API And Ownership

`GET /api/account/profile` returns `{ user, bio, revision }` for the authenticated owner. `PATCH /api/account/profile` accepts only `{ revision, username, bio, avatar? }`. Both set `Cache-Control: no-store`; unknown fields and arbitrary avatar URLs are rejected.

Nickname follows the existing 2..32 grapheme policy and case-insensitive collision protection. Bio is trimmed plain text, up to 280 graphemes, with a 4096-code-unit raw input bound. Disallowed control/format characters are rejected; multiline text and supported joiners remain valid. Client and server use the same bio rule. Empty bio explicitly clears the personal bio; absent legacy bio keeps the original provider-intro fallback.

Revision is a digest of the owner's actual persisted identity. Changed stale submissions return `PROFILE_STALE`; an already-applied desired-state retry returns current success without another persistence write. Strict system IDs and owner-scoped uploaded IDs are the only avatar choices. Uploaded PNG paths are derived canonically, never accepted from a submitted URL. Unknown/foreign uploads share the same invalid-avatar response.

Persistence failure restores the original user object and properties, including absent legacy bio. Failed avatar-upload persistence removes only the new upload record and PNG. Public identity DTOs do not expose email, birthday, consent, credentials, permissions, session versions or upload ownership. Companion service descriptions still come from the provider's service intro, not the personal bio. Storage remains schema 13; no historical backfill is introduced.

## Client Session Safety

Owner/account generations and request guards reject logout, A-B-A switching, eligibility loss, obsolete reads and unmounted acknowledgements. Same-owner token rotation retains drafts and valid saves; publishing a saved user uses currently stored credentials and does not revive an old token. Failed reads/saves retain a dirty draft. A pending explicit reload cannot discard typing begun after that reload started.

Profile publication also guards existing session restoration, application-approved session lookup and onboarding profile/interests responses. An old authentication response cannot overwrite a newer profile save or another signed-in user. Public/chat hydration updates identity only, preserving provider service/price data and distinguishing ordinary peers from companions. Chat/public peer identity refreshes on entry, focus and visible five-second polling; this is not an external push integration.

## Observed Verification

The final runtime passed all of the following checks in the byte-identical isolated snapshot:

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
E2E_ACCOUNT_PROFILE_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3018 node_modules/.bin/playwright test tests/e2e/account-profile.spec.ts --workers=1 --reporter=line
git diff --check
```

- Vitest: 61 files and 459 tests passed, including 57 focused backend profile/projection/upload cases and 36 new client cases. Existing authentication, order, application, provider-management and notification regressions remain green.
- Playwright: four tests passed with the explicit disposable loopback guard, real load/save failures and retries, invalid-input prevention, complete identity/upload flow and EN/AR field geometry. Targets other than the permitted loopback fixture are rejected.
- Both TypeScript checks and the Vite build passed. Existing bundle-size and react-test-renderer deprecation warnings remain non-blocking.
- Independent backend and whole-feature review is complete with no remaining actionable findings. Reload/new-typing, eligibility-loss, old approved-session and onboarding publication concerns were reproduced first, fixed narrowly and verified with regression tests and re-review.
- EN/AR screenshots cover 320px, 375px and 1440px. Heading count/fit, horizontal overflow and label/counter separation are asserted. Captures wait for a single stable page heading instead of retaining an exiting motion view.

An initial full unit run had a `socket hangup` in an unchanged order test; that test passed on its focused rerun and later full runs passed without weakening assertions or altering the order test. Initial backend checks also encountered a socket reset and later passed. These transient failures are not counted as passing checks or assigned an unproven root cause.

Adding the layout test before the discovery-dependent browser flow initially exhausted the shared fixture's existing three-impression newcomer exposure cap. Network traces returned an empty home feed and persisted exposure records showed exactly three impressions. The layout test now follows discovery. A fresh fixture is required for the complete suite; no product exposure rule, business data or test assertion was weakened to bypass the cap.

The main macOS workspace contains cloud-managed `dataless` dependency files. Stalled checks were not treated as successes. Actual checks used `/private/tmp/laeeb-profile-verify-20261014`, cloned at the exact baseline and overlaid with byte-identical changed source/tests. Resident dependencies come from the prior frozen-lockfile pnpm 9.15.0 installation at `/private/tmp/laeeb-notifications-verify-r2hGkY/repo/node_modules`. The lockfile and original workspace dependencies were not changed. Secrets and production storage were not copied.

## Disposable Browser Evidence

Business writes were made through visible local UI. Inspection used authenticated GETs and a separate read-only check of temporary JSON storage; failure simulation was browser-local 503 responses. The fixture uses fresh temporary storage, loopback binding, sandbox payments and disabled settlement cron, with no inherited production storage/mail credentials.

- Buyer saved an English nickname, mixed English/Arabic bio and Sage system avatar. Failed PATCH retained the draft and left server identity unchanged; retry saved the real values. Another account's open chat received the saved identity and its public profile showed the personal bio.
- A synthetic green PNG was selected through the file chooser, cropped and uploaded through the existing avatar endpoint. Saved image is a canonical owner-uploaded 48-hex-ID PNG. Actual image natural width was 256; canvas pixel inspection matched RGBA `[38, 162, 105, 255]`, not a broken or placeholder asset.
- Buyer then saved an Arabic nickname/bio, reloaded and recovered the saved fields with the uploaded avatar intact. Me and public/chat identity displayed actual data rather than editor examples.
- Provider saved a separate personal nickname/bio while retaining PLAYER role, original managed service profile, original intro, approved status and 25-coin service pricing. Customer and administrator identities remained separate.
- All 39 original orders were compared unchanged except live display-name projections; all 39 original reviews remain. Buyer balance stayed 500 and provider diamond balance stayed 1900. No profile-change notifications were fabricated.

## Boundaries And Delivery

No production deployment, main merge, real payment, SMS, email, mobile push or community publication. Existing unavailable unrelated workflows are not presented as newly completed features. No password/role/review qualification or provider-service write is added.

Only approved source, focused tests and delivery documentation are published. The unrelated `backend/routes/auth 2.ts`, `.superpowers/` reports, dependencies, build output, browser media and synthetic storage remain excluded. GitHub delivery uses expected-head protection and exact local/remote tree comparison on the authorized original branch; actual published commit IDs are recorded in `docs/github-delivery-2026-10-14.md`. Local acceptance is not a claim of GitHub CI or production deployment.
