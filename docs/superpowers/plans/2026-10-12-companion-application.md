# Companion Application Implementation Plan

**Goal:** Turn the original application page and administration review into a persisted approval-gated companion onboarding flow.

**Architecture:** Shared strict application contracts, focused application/review routes registered into existing business/server modules, a scoped client hook and original-page integration, existing admin table actions with a rejection dialog. JSON remains the local persistence layer, with reversible synchronous writes.

**Tech Stack:** Existing React, TypeScript, Express, Zod, Vitest and Playwright. Runtime PATH `/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.

## Global Constraints

Exact requirements and DTOs: `docs/superpowers/specs/2026-10-12-companion-application-design.md`. Preserve original UI and previous verified code. Do not touch `backend/routes/auth 2.ts`, production data, payments or deployments. Workers do not commit/push; the parent handles verified GitHub delivery. Test-first implementation and focused independent review are required.

### Task 1: Persisted Application and Approval API

Files: new `shared/companionApplications.ts`, `backend/companions/applications.ts`, `tests/integration/companion-applications.spec.ts`; additive domain metadata, schema export, business apply route replacement/registration and server review route replacement/registration.

- [x] Write and observe failing tests for pending creation, owner hydration, replay/conflict, restrictions, rejected resubmission, approval role gating, rejection reason, idempotent audit, stale review, rollback and history/quote isolation.
- [x] Implement GET/POST application and admin review contracts from the spec. Keep old minimal apply bodies compatible; remove all automatic approval/elevation.
- [x] Run application tests, existing companion management/order/auth regressions, and client/server type checks. Return precise DTO/error contracts to frontend workers.

```ts
expect((await apply({ gameName: 'PUBG Mobile', intro: 'Duo sessions', hourlyRate: 8, requestId: 'attempt1' })).body.status).toBe('PENDING');
expect(state.users.find(u => u.id === 'applicant')?.role).toBe('USER');
expect((await review('APPROVE')).body.status).toBe('APPROVED');
expect(state.users.find(u => u.id === 'applicant')?.role).toBe('PLAYER');
```

### Task 2: Original Application Wizard and Private State

Files: new `client/hooks/useCompanionApplication.ts`, focused `client/components/application/*` and hook/view tests; `client/services/businessApi.ts`, `client/app/useAppState.ts`, `client/views/ApplyPlayerView.tsx`, minimal Me status integration.

- [x] Write failing hook/view/API tests for real submission, pending hydration, rejected prefill/resubmit, stable key and duplicate lock, dirty draft/refresh, account switch/late response/role refresh and unavailable media/promotion behavior.
- [x] Add `getCompanionApplication(token)` and `submitCompanionApplication(token,input)` API methods. Keep the existing legacy apply helper if callers remain.
- [x] Keep original four steps; replace fake submit, asset and recording handlers; relax only unavailable-media requirements. Poll real status and refresh real session before Player Center.
- [x] Run focused tests and type check. Do not refactor unrelated app views.

```ts
await businessApi.submitCompanionApplication('access', { gameName: 'PUBG Mobile', intro: 'Duo', hourlyRate: 8, requestId: 'stable', details: { serviceName: 'Ranked duo', unit: 'match' } });
expect(JSON.parse(fetcher.mock.calls[0][1].body).requestId).toBe('stable');
```

### Task 3: Existing Admin Review and End-to-End Acceptance

Files: `admin/services/adminApi.ts`, focused `admin/components/CompanionReviewActions.tsx`, action integration in `admin/AdminWorkbench.tsx`, admin tests; guarded `tests/e2e/companion-applications.spec.ts`, acceptance documentation.

- [x] Test pending-only controls, required rejection reason, expected revision, busy/error handling and no fake review success. Implement in both original table/card contexts.
- [x] Start fresh disposable preview on port 3014; never run write checks against remote/ordinary URLs. Exercise real applicant/admin UI reject/resubmit/approve and account role reload, EN/AR desktop/mobile layout and media controls.
- [x] Run full single-worker tests, types/build and whitespace checks; independent review, fix and rerun all findings.
- [ ] Commit only approved files, publish to the authorized GitHub branch via available authenticated connection, compare exact local/remote trees and retain unrelated user files. Record commit URL and release limitations.

Acceptance: `docs/companion-application-acceptance.md`. Final local checks: 295 tests/45 files, four guarded browser tests, client/server types, Vite build and whitespace all pass. Publication is verified after creating the source snapshot; the final receipt will record the actual remote commit and tree.

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
```
