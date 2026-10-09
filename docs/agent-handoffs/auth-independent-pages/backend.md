# Backend handoff — independent authentication

Date: 2026-10-08. Project: `/Users/soger/Documents/New project/Le3eb_Club`.

## Status and scope

Implemented and locally tested against the actual Express service. No commit, push or remote deployment was performed by this agent. Existing dirty business/social/player-center changes were preserved. Frontend integration and combined upload belong to the parent agent.

Coverage: AUTH-01 API support; AUTH-02 verified registration and one-account/one-wallet behavior; AUTH-03 profile/age/consent validation; AUTH-04 legacy password login and reset; AUTH-05 purpose isolation, expiration, persisted limits and retries; optional tag preferences and safe cropped avatars from the approved social-v3 design/task brief.

## Contract and routes

Authoritative shared contract: `shared/auth.ts`. Exports `AuthProfileInput`, `AuthConfig`, `AuthVerifyResult`, `AuthSession`, `AuthUser`, `AuthAvatar`, `AuthEmailPurpose`, request/result types and policy constants. System avatar IDs: peach/lavender/sage/gold. Tags: valorant/pubg/fc/ml/chill/ranked/voice/night/music/anime/football/coffee; zero to five unique IDs.

| Route | Behavior |
| --- | --- |
| GET `/api/auth/config` | Server calendar date, latest adult birth date, agreement versions, honest delivery mode. |
| POST `/api/auth/email-code/send` | Normalized email, login/register/reset purpose, optional English/Arabic locale and device ID. Five-minute code; 60-second cross-purpose email cooldown. Only successful delivery replaces an older code. |
| POST `/api/auth/email-code/verify` | Existing login/register email returns `{kind:'session',session}`; unknown email returns registration grant without creating an account or wallet; reset returns a single-use reset grant only for an existing email after proof. |
| POST `/api/auth/registration/complete` | Validates grant, Unicode nickname, gender, actual adult calendar birth date, server-issued/system avatar and current consent versions. Creates a USER and zero-balance wallet together. Same-grant retries return the same session; deterministic login-event IDs prevent duplicate rewards on retry/restart. |
| POST `/api/auth/profile/complete` | Bearer or existing legacy authentication; updates old account in place without replacing IDs, wallet, orders or status. |
| POST `/api/auth/avatar` | Registration grant or authenticated old account. Only cropped square PNG data; decoded bytes ≤2MiB, dimensions 64–2048, one frame. Sharp decodes/re-encodes to 256px PNG and strips metadata. Upload ID is owner/grant-bound. |
| GET `/api/auth/avatars/system/:id.svg` | Four deterministic same-origin system avatars. |
| GET `/api/auth/avatars/uploads/:id.png` | Sanitized same-origin local asset. No remote URL fetching. |
| PUT `/api/auth/preferences` | Validates optional tag selection, uniqueness and maximum count. |
| POST `/api/auth/password/reset` | 15–128 Unicode code points, bundled common-pattern/blocklist rejection, Argon2id storage, single-use grant. Increments persisted session version and removes legacy sessions. Does not log in. |
| POST `/api/auth/login` | Existing password login retained, including original shorter/legacy-scrypt passwords and hash upgrades. Uniform credential errors. |
| POST `/api/auth/refresh` | One-time refresh rotation, including concurrent retry exclusion; rejects pre-reset session versions. |
| POST `/api/auth/logout` | Revokes current JWT, caller-owned supplied refresh token and caller's legacy sessions; cannot revoke another account's refresh token. |
| GET `/api/auth/session` | Safe own-account AuthUser; no full birth date, credential material or consent internals. |

Intentional compatibility changes: old POST `/api/auth/register` returns 410 `AUTH_REGISTRATION_REQUIRED` to prevent bypassing verified age/consent registration. Old `/api/auth/email-code/login` preserves the direct AuthSession shape for existing users but unknown emails now receive a registration result instead of automatic account creation. Migrate any old smoke/API consumers accordingly.

Validation errors use `INPUT_INVALID`; expired/consumed grants use `AUTH_PROOF_INVALID`; bad codes use `AUTH_EMAIL_CODE_INVALID`; business access before completion uses `AUTH_PROFILE_INCOMPLETE`; throttles use `AUTH_RATE_LIMITED` with `error.details.retryAfterSec`; delivery failures return 503 `AUTH_MAIL_UNAVAILABLE` without secret/provider response details.

## Security, persistence and calendar

- Email trims and lowercases only. Plus suffixes/dots are not rewritten.
- Codes and purpose-specific grants are hashed at rest. Codes are consumed before asynchronous session work; five attempts maximum. Persisted failed authentication attempts share a 10-failure/15-minute limit across password and code verification.
- Email limits: five sends/hour, ten/day across purposes. Additional source limit 100/hour and 500/day; optional device limit 20/hour and 50/day. In-flight email sends are also excluded.
- Ordinary authenticated business routes are blocked for incomplete non-admin accounts. Auth/session/profile, tickets/support, and read-only wallet/order account access remain available. Admin access remains available without profile completion.
- Account status is included in AuthUser and preserved. Existing business restrictions remain authoritative.
- State schema version 12 adds backward-compatible optional profile and authentication security metadata. No destructive migration and no user/account merge. Existing accounts without verified birth/consent remain incomplete rather than being silently marked complete.
- JSON snapshots now use private mode 0600, fsync, then same-directory atomic rename. Failed creation/session writes roll back in-memory account/wallet/session/reward changes appropriately. Registration can recover after account creation if session issuance is temporarily unavailable.
- Platform timezone defaults to UTC (`AUTH_PLATFORM_TZ`); age is calendar-based. A February 29 birthday reaches the anniversary on March 1 in a non-leap year. Date parsing rejects invalid dates; the birth date is not a public field.
- Reset revocation uses persisted `sessionVersion`, checked against access JWTs and refresh sessions. Existing tokens without a version are version zero for compatibility. Production refresh storage continues to require the repository's Redis configuration.

## Configuration and actual external dependencies

New documented names in `.env.example` / `backend/config/env.ts`:

- `AUTH_PLATFORM_TZ` (default UTC).
- `AUTH_EMAIL_DELIVERY`: unavailable by default; development or provider must be explicit.
- `AUTH_MAIL_API_KEY`, `AUTH_MAIL_FROM`, optional `AUTH_MAIL_ENDPOINT` (default Resend HTTPS endpoint; configurable Resend-compatible HTTP protocol).
- `AUTH_AVATAR_DIR`: local asset directory; configure a persistent volume in production. Default development path is `backend/data/auth-avatars`, ignored by Git.

Development delivery returns `developmentCode` only outside production and does not claim to send email. Production refuses development delivery. The old console sender now throws instead of logging codes or pretending to deliver. Provider delivery makes a real timeout-bounded HTTP request and reports rejection honestly. No provider key, code, password or grant is logged by the new code.

External production dependency remains: configure a valid provider API key and verified sender, then perform live inbox delivery acceptance. Local HTTP-provider tests are not evidence of delivery to real users. No production mail credentials were present or used. The bundled password blocklist handles common patterns; this is not an external breached-password lookup.

Current storage limitation: the server still owns an in-process JSON-backed aggregate. Durable codes/quotas/grants survive a single process restart, but process-local in-flight locks and JSON writes do NOT make concurrent application instances safe. Run one application writer only. A shared transactional user/wallet/auth store with unique email constraints and distributed locking is required before horizontal scale; the existing `DATABASE_URL` option alone does not migrate this implementation. Local avatar storage also requires a shared/persistent volume if deployment topology changes. Expired auth state and abandoned-upload retention need an operational cleanup policy for sustained production use.

## Changed files owned by this task

- `shared/auth.ts` (new contract).
- `backend/auth/{state,profile,mail}.ts` (new); `backend/auth/{contracts,emailCode,password,tokens}.ts`.
- `backend/routes/auth.ts`.
- `backend/config/env.ts`, `backend/domain/types.ts`, `backend/app/context.ts`, `backend/state/jsonState.ts`, scoped authentication/body-parser changes in `backend/server.ts`.
- `package.json`, `pnpm-lock.yaml`: sharp was added by this backend task. The parent subsequently added React test-renderer development dependencies for frontend security regression tests. Available pnpm 11 regenerated peer snapshots in the v9-format lockfile; packageManager remains pnpm@9.15.0.
- `.env.example`, `.gitignore`.
- `tests/integration/auth-independent.spec.ts` and `tests/unit/auth-{mail,policy,storage}.spec.ts`.

## Verification evidence

Runtime prefix used: `/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` on PATH. Direct executable calls avoid the local package-manager wrapper trying to reinstall an already-existing modules tree.

At 22:51–22:52 Asia/Shanghai:

1. `node node_modules/vitest/vitest.mjs run`: **26 files / 98 tests passed** (18 focused authentication checks plus existing suite).
2. `node node_modules/typescript/bin/tsc -p tsconfig.server.json --noEmit`: **exit 0**.
3. Scoped `git diff --check` on owned backend/config/dependency files: **exit 0**. Whole-tree check reports existing trailing whitespace in client HomeView, LegendListView and MeView; no client files were modified by this backend agent.

Focused tests cover no pre-profile account creation; same-grant concurrent retry; code purpose/reuse/expiration; expired grants; adult/leap-day calendar rules; consent versions; upload spoofing and metadata stripping; owner binding; old password/id/balance preservation; old profile completion; reset single use and all session-family revocation; common-password rejection; quotas/failed-code attempts; refresh rotation; logout owner boundaries; provider HTTP success/rejection; production development-code refusal; failed resend preserving old code; storage rollback/atomicity/migration; tag uniqueness/count/skip; business/support/admin profile policies.

Actual server smoke (separate temporary JSON state, port 43191, explicit development mail; stopped afterward): config/send/verify/registration/session/system-avatar/logout all HTTP 200; post-logout JWT HTTP 401. An existing demo account authenticated in place, reported incomplete, was blocked from POST orders with 403 `AUTH_PROFILE_INCOMPLETE`, could read wallet (200) and create support ticket (201), completed its profile with the same ID and unchanged wallet. Server started with a harmless already-in-use Vite HMR websocket warning; HTTP checks succeeded. Test fixtures were kept separate from real project state; earlier generated test avatar images were moved into `/tmp/le3eb-auth-fixture-backup-Wlrr8O` for recoverable cleanup.

## Parent/frontend follow-up

Use explicit development mail mode for local review; show a development code only when the API returns it. Consume the verification union, retain access/refresh tokens, send current agreement versions from config, and redirect `profileComplete:false` / restricted-status users appropriately. Avatar submission uses returned opaque upload IDs, never returned URLs as values. A restored profile does not need or receive its full birth date. Final frontend browser acceptance, production build, email-provider inbox acceptance, deployment and combined commit/push are outside this backend agent's actions.

## Security review follow-up — 2026-10-09

Independent review identified and reproduced two important authentication races and one avatar ownership integration issue. All were fixed in `backend/auth/tokens.ts`, `backend/routes/auth.ts` and the focused integration tests; no frontend edits or commits/uploads were made by this backend agent.

### Device-session families and logout/rotation races

- Every newly issued login now creates a random session-family ID shared by its access JWT, all rotated refresh generations, and its legacy compatibility session.
- JWT verification and refresh rotation require an unexpired active family and no revoked-family marker. Logout installs a cache-backed revoked marker and removes the active family. This invalidates already-issued successor JWTs and refresh tokens, not just the literal tokens presented at logout.
- Rotation checks the family before and after creating its successor. A refresh that already read its predecessor, or writes its successor after logout, cannot create a usable post-logout session.
- Consumed-token ownership/family metadata is retained for logout compatibility. Original refresh records without a family are migrated to a deterministic family on rotation. Legacy bearers remain supported; a known legacy bearer can close its own access/refresh family even without a refresh token.
- The signed access-family ID is authoritative. A different device's supplied refresh token cannot make logout close that device instead. Other-device JWTs, refresh tokens and legacy sessions stay valid. Logout removes only the current device's mapped legacy session rather than every legacy session for the account.
- Compatibility limitation: pre-family access JWTs remain verifiable with their existing JTI/session-version policy until their short access TTL expires. Their supplied refresh token can revoke the corresponding migrated family, but previously issued pre-family JWT siblings cannot be associated retroactively. Newly issued JWTs always carry the family ID.

Family storage uses the existing cache abstraction (`sf:*`, `sf-revoked:*`, refresh-family metadata and legacy-family mappings). In production this requires the already-mandatory Redis configuration. Redis persistence/availability must be configured operationally; this change is not a JSON/SQL migration. Missing active family state fails closed. Without Redis in local development the cache is process-local: restart invalidates new family-backed JWT/refresh sessions, while old persisted legacy sessions retain their existing compatibility behavior. It must not be described as durable multi-instance user/account storage; the aggregate user/wallet JSON state still requires one writer.

Each family has an **absolute** lifetime of `JWT_REFRESH_TTL_SEC` from its initial login (default 30 days). Refresh tokens rotate within that lease; rotation never recreates or extends the active-family lease. Revoked markers remain at least the maximum configured access/refresh TTL plus a margin. Users must establish a new login after the absolute family lifetime. No new configuration names or API response-shape changes were introduced.

### Password reset versus in-flight password login

- Password login captures both the password hash and session version before asynchronous verification.
- It checks that snapshot after password verification and again after a legacy-hash upgrade, before writing a rehash or issuing a session. A concurrent reset therefore cannot make an old password obtain the new session version or overwrite the newly reset password with an old-password rehash.
- Session issuance captures its expected version/hash, binds the asynchronous refresh/legacy family, then checks the snapshot again before adding the legacy session and login reward. A reset during token-cache operations cannot leave a late usable legacy session. Invalidated in-flight login returns the existing uniform 401 credential error.

### Uploaded avatar ownership after registration

Selected uploaded-avatar ownership is transferred from the registration grant to the new user as part of the account snapshot. Failed account persistence restores grant ownership. A subsequent session-persistence failure can retry against the committed user ownership without losing the image or creating a second account. The newly created user can reuse the opaque upload ID through `/api/auth/profile/complete`; another user still cannot use it.

### Fresh red/green verification

Before fixes, the expanded integration suite reproduced five failing checks: successor JWT survived logout; a paused refresh produced a live successor after logout; logout deleted another device's legacy session; and password verification / rehash each accepted credentials replaced by reset. The avatar follow-up separately reproduced HTTP 400 for the rightful owner's profile resubmission.

After fixes, on 2026-10-09:

1. `node node_modules/vitest/vitest.mjs run tests/integration/auth-independent.spec.ts tests/unit/auth-mail.spec.ts tests/unit/auth-policy.spec.ts tests/unit/auth-storage.spec.ts`: **4 files / 26 tests passed**, including **20 authentication integration tests**.
2. `node node_modules/typescript/bin/tsc -p tsconfig.server.json --noEmit`: **exit 0**.
3. `git diff --check -- backend/auth/tokens.ts backend/routes/auth.ts tests/integration/auth-independent.spec.ts`: **exit 0**.

Additional passing interleaving tests cover a successor refresh write after family revocation, legacy-bearer logout without a refresh token, resetting credentials during asynchronous legacy-family binding, same-account other-device preservation even with a mismatched supplied refresh token, and uploaded-avatar account/session persistence rollback/retry. Interleavings use controlled promises around real cache operations; no timing sleeps are used. A combined full-suite run was stopped at the parent's request while it corrected an unrelated new frontend test mock loop; the parent owns fresh final full-suite/build verification.

### Expired-access logout follow-up

The reviewer also reproduced idle-device logout failing at the ordinary access-token middleware: the expired bearer was rejected before its still-valid refresh family could be revoked. Added a strictly logout-only proof verifier that checks the JWT signature, JTI/family revocation state and active family while allowing the access expiration timestamp to have passed. The logout endpoint independently checks the persisted current account session version. It neither issues a token nor authorizes any normal authenticated action; `/api/auth/session` and business access continue to reject the expired JWT.

The verified signed family remains authoritative even if a foreign refresh token is supplied. Forged JWTs cannot authorize logout, and a mismatched foreign token cannot revoke another identity's family. Existing unexpired legacy-bearer logout remains supported. No API response shape or configuration was changed.

Two new tests failed with HTTP 401 before the fix and pass afterward: expired original JWT plus its valid rotated refresh can revoke the whole family (including a still-active refreshed JWT and legacy token), and expired logout ignores foreign refresh families while rejecting forged signed claims. Final focused verification for this backend follow-up: **4 files / 28 tests passed, including 22 integration tests**; server TypeScript **exit 0**; scoped backend diff check **exit 0**. Parent still owns the final combined full suite/build run.
