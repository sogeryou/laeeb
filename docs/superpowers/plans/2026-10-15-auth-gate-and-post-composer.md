# Auth Gate And Post Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. The user approved the concept and written spec and asked to continue implementation. Use TDD, independent task/final reviews and the existing authorized branch delivery; no further execution-choice prompt is needed.

**Goal:** Require standalone login before entering the user app, finish registration without interests, and create posts from a community-header action in a dedicated view.

**Architecture:** A user-entry boundary resolves verified session state before rendering AppShell, leaving AdminRoute separate. Existing AuthFlow completes after profile acknowledgement. A protected POST_CREATE view reuses the real social submission contract with owner/session/view lifecycle guards and in-memory drafts.

**Tech Stack:** Existing React, TypeScript, Express, Zod, Vitest, React test renderer, Supertest and Playwright. No dependency changes.

## Global Constraints

- Binding approved specification: `docs/superpowers/specs/2026-10-15-auth-gate-and-post-composer-design.md` (approved in chat).
- Repository `/Users/soger/Documents/New project/Le3eb_Club`, branch `codex/independent-auth`. Remote baseline `cd45264e897ed4af917a82db78333b7240d731da`; local design-only commit `ea5fbc84a7129264d7e18bf29c13cc306a0aed24` must be included in final delivery.
- Reuse the current checkout, no managed attachment is present. Test in the fresh exact-remote clone `/private/tmp/laeeb-auth-composer-verify-20261015` with the existing frozen dependency symlink. Node PATH `/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin`. Original checkout has macOS cloud placeholders; do not refresh unrelated files or replace dependencies.
- Protect user-owned untracked `backend/routes/auth 2.ts` and unrelated changes. No whole-tree staging, force update, unrelated `origin` push, main merge, deployment, real mail/payment or production storage. Existing `/admin` modal/auth/roles remain separate and unchanged.
- English/Arabic, RTL and 320/375/1440px. Keep original auth imagery/style and community cards. Text-only posts <=5000 characters, blank prohibited. Public only after existing approval; no new upload, game-tag or reward rules.
- Auth restoration must not reveal AppShell before verification; transient restore failure retains credentials and exposes retry/logout, not anonymous application access. Existing session API, refresh and account restrictions remain authoritative. No empty tags write or deletion of old user tags.
- Drafts are current-owner memory only. Cancel preserves community context and draft; account/session end clears private state. Delayed A-B-A/session/view/unmount results must not mutate a new context or release a newer operation's lock. Existing primary-service/order/login-return behavior remains intact.
- Parent owns index/commits/publication. Workers edit only their explicit files and report covering commands/results, red/green history and limitations. Tests are mechanically overlaid to the isolated clone by explicit path only. Parent final verification includes both workers' exact file bytes.

### Task 1: Verified User Entry And Two-Step Registration

**Owner:** one fresh auth implementer, disjoint from parent composer files.

**Files:** modify `client/app/AppRoot.tsx`, focused auth portions of `client/app/useAppState.ts`, `client/features/auth/useAuthFlow.ts`, `AuthExperience.tsx`, `StepForms.tsx`, `routing.ts`; `session.ts`, `copy.ts`, `auth.css` only where needed. Create `client/features/auth/UserEntryGate.tsx` and focused `tests/unit/auth-entry-gate.spec.ts`, `auth-entry-session.spec.ts`, `auth-registration-completion.spec.ts`. Update the now-obsolete interests expectations in `tests/unit/account-profile-auth-flow.spec.ts` and user-login signal assertions in `tests/unit/game-discovery-navigation.spec.ts` only where approved policy changes require it. Do not edit AdminRoute, backend, social/composer, router view definitions, AppShell or browser tests.

**Interfaces:** Existing AuthFlow/API/session signatures stay compatible. AppState adds `authSessionError: string` and `retryAuthSession: () => Promise<void>` for a retryable startup read. Existing `authSessionReady` signals that the current attempt has resolved, not permission to enter. `UserEntryGate({ children }: { children: React.ReactNode })` guards only user routes, consuming the current verified AppState/session and auth step. AdminRoute remains outside it. Keep existing method names consumed by views if removing their signals would cause unrelated mechanical churn, but user login actions must route to the standalone page without rendering a modal.

- [x] Write and run failing gate/session tests: no credentials -> standalone login without AppShell; pending restore -> loading; verified complete -> app; incomplete -> profile; restricted -> restricted page; temporary lookup error -> retained token + retry, never app; invalid credentials -> login; logout/Back -> no private shell. Control actual AppState restore promises and session events, not an extracted copy of its function.
- [x] Write and run failing registration tests: profile success directly completes current auth session, no interests UI/step or preferences call; registration response after unmount/owner change cannot sign in; same-owner rotation uses current token; old interests URL has guarded compatibility redirects. Preserve stale profile-publication guards and old tags. Replace only expectations for the removed feature, not unrelated assertions.

```ts
expect(authApi.preferences).not.toHaveBeenCalled();
expect(app.finishAuthSession).toHaveBeenCalledWith(
  { token: 'rotated-token', user: expect.objectContaining({ id: 'A' }) }, false,
);
expect(localStorage.getItem('business_workbench_token')).toBe('rotated-token');
```

- [x] Implement the entry boundary and retryable restore operation with generation/mount/current-credential guards. Hide shell synchronously for missing/incomplete/restricted session and while initial verification is unresolved. Do not interpret a network error as logout or let stale restore success/error overwrite a newer login. Remove user guest exits including auth Help and Back; preserve admin-only AuthModal usage.
- [x] Finish profile/register flow directly after a valid acknowledged current profile; remove tag selection render/progress/state/submission and obsolete InterestsStep exports. Keep `/auth/interests` as a redirect-only compatibility route, not an available registration step. Prevent AuthFlow effect reentry/double completion and preserve existing real saved return resolution.
- [x] Run new focused tests plus auth storage/client/private-cache, account-profile auth/session, game-discovery navigation and order-client regressions in the isolated clone. Self-review bounds, refresh errors, account restrictions, reentry and direct URLs. Report exact changed paths, covering commands/results and red/green evidence to `.superpowers/auth-composer/auth-report.md`.
- [x] Parent byte-checks integration, records task snapshot, packages full task diff, obtains independent spec/quality review and fixes concrete findings before marking complete. Do not publish this partial stage.

### Task 2: Dedicated Community Composer And Safe Submission

**Owner:** parent, while auth implementation has a disjoint write set.

**Files:** modify `client/app/AppShell.tsx`, `client/router/routes.ts`, `client/views/ViewRouter.tsx`, `client/views/CommunityView.tsx`, focused post lifecycle in `client/hooks/useSocial.ts`. Create `client/views/PostComposerView.tsx`, `client/components/community/postCopy.ts`, `tests/unit/post-composer-view.spec.ts`, `post-composer-state.spec.ts`; reuse existing `tests/unit/auth-social-refresh.spec.ts` for unchanged token-rotation draft semantics. Do not edit auth-owned files.

**Interfaces:** Add `POST_CREATE` to `View` and `PROTECTED_VIEWS`. `PostComposerView` consumes `useApp()` with `social.postDraft/setPostDraft/publishPost/publishingPost/postError`, auth identity, locale, community setters and handleBack. Preserve `social.publishPost(): Promise<boolean>`; it returns true only for a validated successful acknowledgement in the live composer scope. The real request remains `POST /api/social/posts` with `{ content, requestId }`, no extra inputs. Expose focused composer-lifetime invalidation only if needed to distinguish cancel/reopen and synchronous session events. Do not change chat protocol or polling policy.

- [x] Write failing view tests proving no inline Create post/form in CommunityView, actual localized header action goes to POST_CREATE, route renders dedicated editor without bottom navigation, text length/blank controls, Cancel retains draft, loading and visible failure, and only actual success returns to mine/LATEST. Use real renderer/events with mocked useApp transport state where necessary.
- [x] Write failing hook tests for real response validation, double-click lock, same request ID after ambiguous failure, whitespace/5000 limit, retained failure draft, owner/logout/A-B-A, same-owner rotation, cancel/reopen, route change/unmount and old finally not releasing new lock. Reuse current real session events in tests; no public/private cached snapshots.

```ts
expect(root.root.findByProps({ 'aria-label': 'Post content' }).props.maxLength).toBe(5000);
expect(root.root.findAllByType('form')).toHaveLength(1);
expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/social/posts'),
  expect.objectContaining({ body: expect.stringContaining('requestId') }));
```

- [x] Add a compact lucide compose icon action in the AppShell community header with aria-label/title and fixed 40px target; let horizontal game choices scroll rather than squeeze/cover the action. Localize list-mode controls/error/status touched by the new workflow and honor RTL. Remove only the inline editor block; retain genuine feed and cards.
- [x] Add POST_CREATE routing and a full-height unframed editor: localized Cancel/Publish header, plain textarea with maxLength=5000, counter, error/retry state and moderation hint. Existing bottom navigation's allowlist naturally hides it for the new route. Focus textarea after mount; return focus to the compose trigger after Cancel. Cancel uses history Back, preserving list mode/tab/game and owner draft. Success sets mine/LATEST, clears game filter and returns, reporting actual moderation status.
- [x] Harden only post submission with mounted, session/account/view/attempt identities and explicit public post acknowledgement validation; retain no-more-than-one attempt in the current context and correct operation cleanup. Preserve same-owner token-rotation drafts while invalidating obsolete submission actions; synchronous owner/logout events clear private drafts even before a React prop update. Keep existing chat functionality unchanged.
- [x] Run focused composer/social and existing auth-social, social-sync, social integration/moderation regressions; exact-byte overlay and self-review. Record `.superpowers/auth-composer/composer-report.md`, obtain independent spec/quality review and fix concrete findings.

### Task 3: Fresh Local Whole-Flow Acceptance And Authorized Delivery

**Files:** create `scripts/auth-composer-preview.ts`, `tests/unit/auth-composer-fixture.spec.ts`, `tests/e2e/auth-composer.spec.ts`, `docs/auth-composer-acceptance.md` and `docs/github-delivery-auth-composer-2026-10-15.md`. Update this plan as gates pass. Adjust existing game-discovery E2E helpers only for approved no-interests/entry-gate behavior; replace obsolete guest-browse expectations with equivalent logged-in discovery/auth-return contract tests rather than weakening pricing/data assertions.

- [x] Create a new loopback-only port 3021 fixture by following the existing isolated preview pattern: fresh own-prefix JSON directory, sandbox payment, disabled cron, cleared remote storage/mail/admin/JWT inheritance, random signing secret. Preserve the existing 39 historical orders/reviews/transactions, buyer500/provider1900, roles/services. Add only explicit disposable local accounts needed for registration/login/restriction/old tags. Unit-test refusal of production/another port. Leave prior previews and their data alone.
- [x] Guard browser suite with `E2E_AUTH_COMPOSER_FIXTURE=1`, exact http loopback port3021 root/no credentials/query/fragment. Business mutations only through visible UI. Cover root login/no flash, login/refresh/logout/Back, restore503/retry with token retained, invalid session, two-step development-email registration with no interests/preference request, old interests route, valid restricted and admin boundaries. Do not send real email.
- [x] Through visible community UI verify header action, distinct editor/no nav, cancel/context/draft restoration, blank/length, simulated transport failure without false success, retry same attempt, one real PENDING post, mine status not publicly visible. Read-only authenticated GET/fixture inspection validates no historical financial/service/role changes. Never pay or publish to an external channel.
- [x] Capture and individually inspect EN/AR login/register/profile/community/editor at320/375/1440 with stable fonts/motion, nonblank loaded media, accessible names/focus, no clipping/overlap/horizontal overflow. Preserve the original dark auth layout and existing visual assets.
- [ ] Run full Vitest, both TypeScript checks, Vite build, whitespace and exact tested-source comparison. Obtain final independent full-feature review, fix findings with failing regressions and rerun relevant final gates. Record actual failures and residual limits, never imply production validation.
- [ ] Commit only explicit approved files. Deliver full diff relative to original remote baseline, including local design commit, using authenticated GitHub expected-head/non-force update and exact tree equality; native fetch confirms. Add actual source SHA receipt in docs-only follow-up, verify0/0 local/remote and unchanged tested runtime. No deployment.

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
E2E_AUTH_COMPOSER_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3021 node_modules/.bin/playwright test tests/e2e/auth-composer.spec.ts --workers=1 --reporter=line
git diff --check
```

## Resume and verification — 2026-10-21

The old 2026-10-15 temporary clone and its dependency symlink were pruned by the host. A fresh exact-remote clone at `/private/tmp/laeeb-auth-composer-20261021-FgZeQ4/repo` was used, with the existing frozen dependencies restored; manifests unchanged. Task1/2 independent reviews approved. Baseline68/627; final76/721 tests passed serially, both TypeScript checks and Vite build passed. Auth/composer and discovery browser suites plus30 individually inspected stable EN/AR screenshots completed. Original untracked auth tests are retained byte-for-byte; extra tests live in `auth-entry-gate-state.spec.ts` and `auth-entry-session-state.spec.ts`. Final independent whole-feature review and authorized expected-head upload remain final gates.
