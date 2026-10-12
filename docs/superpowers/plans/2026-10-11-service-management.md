# Companion Service Management Implementation Plan

> Execute in this session using focused agents and test-driven development. Do not commit, push or deploy.

This was the boundary during implementation. On 2026-10-12 the user authorized verified commits and direct GitHub pushes; see `docs/github-delivery-2026-10-12.md`. Production deployment remains outside that authorization.

**Goal:** Persist real companion services and introduction through the original editor and expose them to customer checkout.

**Architecture:** Shared management DTOs, owner-only validated routes with optimistic concurrency and rollback; a focused editor hook/component; fresh public profile hydration at customer entry. Existing pricing and order snapshots remain authoritative.

**Tech Stack:** React 19, TypeScript, Express, Zod, Vitest, Playwright; existing dependencies only.

## Global Constraints

Read `docs/superpowers/specs/2026-10-11-service-management-design.md` for exact contract and limits. Preserve original UI, unrelated dirty work and historical orders. All files remain local. Runtime PATH: `/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.

### Task 1: Owner Service API

Files: new `shared/companionManagement.ts`, `backend/companions/profile.ts`, `tests/integration/companion-management.spec.ts`; modify `backend/routes/business.ts` only to register routes.

- [x] Write and run failing route tests: GET owner, PATCH bio/primary/extra services, state roundtrip, unauthorized/invalid/stale/rollback, public projection, changed quote and historical immutability.
- [x] Implement shared DTOs and strict Zod validation, owner lookup, provider restriction, optimistic timestamp and reversible synchronous persistence.
- [x] Verify `vitest run tests/integration/companion-management.spec.ts` and existing order workflow suite.

```ts
const updated = await request(app).patch('/api/companions/me/profile')
  .set('Authorization', 'provider')
  .send({ gameName: 'PUBG Mobile', intro: 'Saudi duo sessions', hourlyRate: 9,
    updatedAt: 1, services: [{ id: 'ranked', name: 'Ranked match', unitPrice: 7.5, unit: 'match' }] });
expect(updated.status).toBe(200);
expect((await request(app).get('/api/companions/cp/profile')).body.bio).toBe('Saudi duo sessions');
```

### Task 2: Original Editor and Client State

Files: `client/services/businessApi.ts`, `client/views/PlayerProfileEditView.tsx`; new `client/components/companion/*`, `client/hooks/useCompanionProfile.ts`, `tests/unit/companion-profile-editor.spec.ts`.

- [x] Add failing API/renderer/hook tests for real values, controlled edit/add, unsupported controls, save failures, account switching, stale saves, token rotation/dirty draft and duplicate submit.
- [x] Add `getManagedCompanionProfile`, `updateManagedCompanionProfile`, `getPublicCompanionProfile` methods using shared DTOs.
- [x] Replace only editor example fields with controlled real values and original-style accessible controls, EN/AR labels, fixed busy/error/retry states.
- [x] Run targeted tests and `tsc --noEmit`.

```ts
await businessApi.updateManagedCompanionProfile('access', draft);
expect(fetcher.mock.calls[0][0]).toBe('/api/companions/me/profile');
expect(fetcher.mock.calls[0][1].method).toBe('PATCH');
```

### Task 3: Public Profile Freshness and Acceptance

Files: `client/app/useAppState.ts` or focused public-profile hook; unit tests, new `tests/e2e/companion-management.spec.ts`, `docs/companion-management-acceptance.md`.

- [x] Test current profile entry hydration, ignore stale peer/account responses and keep existing history untouched. Implement focused refresh for real selected providers without rewriting navigation.
- [x] Start disposable local preview on an unused loopback port; browser mutations only through visible UI. Verify edit/save/reload, public profile and priced checkout, old order preservation, EN/AR mobile/desktop screenshots and no overflow.
- [x] Run full single-worker Vitest, client/server types, production Vite build, whitespace check; review changes with separate reviewer and fix findings.
- [x] Write actual acceptance evidence and remaining limitations. Keep clean disposable preview running and deliver URL and credentials.

Final verification on 2026-10-12: 248 tests across 41 files passed; client/server types and Vite build passed. Guarded browser suite passed all four tests in 47.0 seconds. Independent review findings were reproduced, fixed test-first and approved on rereview. See `docs/companion-management-acceptance.md` for evidence, boundaries and the retained disposable transaction record.

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
```
