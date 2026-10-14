# Persistent Account Profile Implementation Plan

> **For agentic workers:** Use subagent-driven-development with test-first implementation and independent task/final reviews. Parent owns integration, guarded browser QA and authorized GitHub publication.

**Goal:** Replace the static account editor with persisted owner-scoped identity and existing avatar uploads.

**Architecture:** Shared profile contract, focused backend routes and dynamic identity projections; a guarded client editor hook and existing page/picker integration; disposable whole-flow acceptance. Main workspace remains on `codex/independent-auth`; unrelated `backend/routes/auth 2.ts` and scratch files are excluded. A byte-identical validation snapshot outside macOS cloud-managed files uses the unchanged frozen dependencies.

**Tech Stack:** Existing React, TypeScript, Express, Zod, Sharp, Vitest and Playwright.

## Global Constraints

All precise contracts, errors, limits, ownership/replay rules and boundaries are in `../specs/2026-10-14-account-profile-design.md`. No production data/payment/mail/push/deployment; no role/password/consent/age/service/application changes. API fields and endpoints must match that contract. No arbitrary avatar URLs; public identity stays privacy scoped. Use existing helpers and additive optional fields; no unrelated refactor.

### Task 1: Owner API And Identity Projections

Files: create `shared/accountProfile.ts`, `backend/account/profile.ts`, `tests/integration/account-profile.spec.ts`; modify `shared/auth.ts`, `backend/domain/types.ts`, `backend/auth/profile.ts`, `backend/routes/auth.ts` (only avatar rollback), `backend/routes/social.ts`, `backend/routes/socialContent.ts`, `backend/orders/presentation.ts`, `backend/server.ts` (route registration).

- [x] Write failing API tests for current owner/default bio, no-store, strict validation, nickname collisions, system/owned-upload selection, invalid foreign ID, stale revisions, desired-state replay and reference-preserving save rollback.
- [x] Implement the shared DTO/schema and owner routes; expose optional bio in AuthUser without changing old-record privilege fields or schema.
- [x] Add failing projection/upload-rollback tests; derive current public identity and preserve companion service descriptions and sensitive fields.
- [x] Run focused tests in the validation snapshot and hand off exact files, results and concerns for review.

```ts
expect(await loadAs('buyer')).toMatchObject({ user: { id: 'buyer' }, bio: '' });
expect((await patchAs('buyer', { ...body, role: 'ADMIN' })).status).toBe(400);
expect((await patchAs('buyer', { ...body, revision: oldRevision })).status).toBe(409);
expect(afterFailedSave.users[0]).toBe(originalUserReference);
```

### Task 2: Guarded Client Editor And Existing Pages

Files: `client/services/businessApi.ts`; create `client/components/account-profile/model.ts`, `copy.ts`, `client/hooks/useAccountProfile.ts`, focused API/hook/view/session tests; replace only `client/views/SettingsEditProfileView.tsx`; minimal `client/app/useAppState.ts`, `client/views/MeView.tsx`, `client/views/ProfileView.tsx` and guarded peer identity hydration as needed.

- [x] Write failing wrapper/hook tests for GET/PATCH, DTO validation, saved/dirty/loading/error/retry, avatar candidates, no fake success and synchronous save lock.
- [x] Implement `businessApi.getAccountProfile(token)` / `updateAccountProfile(token,input)` and the owner/session-guarded hook with authoritative acknowledgements.
- [x] Test and implement token rotation, session events, A-B-A/logout/unmount, stale read invalidation and validated global session updates without old-token revival.
- [x] Write failing EN/AR original-editor tests, then integrate controlled nickname/bio, actual avatar and existing picker/cropper. Keep labels/accessibility, load/error/retry/save states and visible limits.
- [x] Sync saved Me/public/chat identity while preserving provider services and ordinary-peer handling; run client regressions and independent review.

```ts
await hook.save();
expect(hook.profile.user.username).toBe(serverNickname);
expect(hook.draft.bio).toBe(acknowledgedBio);
expect(publish).not.toHaveBeenCalled();
```

### Task 3: Whole-Flow Verification And Delivery

Files: guarded `tests/e2e/account-profile.spec.ts`, `docs/account-profile-acceptance.md`, delivery receipt and completed plan.

- [x] Start fresh disposable loopback fixture on 3018; run actual visible profile save/upload/retry/reload and other-account/public/chat inspection.
- [x] Capture EN/AR at 320/375/1440px, check headings/text fit, actual bitmap avatar pixels and no overlapping controls. Check unchanged business/role/service data.
- [x] Run full tests, both type checks, build and whitespace; independent review and regression fixes; verify staged source equals tested snapshot.
- [x] Explicitly commit approved files only and publish to `sogeryou/laeeb` / `codex/independent-auth` with expected-head protection, exact tree comparison and native fetch confirmation; preserve unrelated files.

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
E2E_ACCOUNT_PROFILE_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3018 node_modules/.bin/playwright test tests/e2e/account-profile.spec.ts --workers=1 --reporter=line
```
