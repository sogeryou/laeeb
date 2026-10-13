# In-App Notifications Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement each deliverable with TDD and review. The parent owns final integration, QA, commits and publication.

**Goal:** Replace example notifications with persisted review/order results and safe read/navigation flows.

**Architecture:** A shared notification contract, focused backend event/route helpers coupled to existing synchronous transaction rollback, an account-scoped client hook, original page integration and guarded browser acceptance.

**Tech Stack:** Existing React, TypeScript, Express, Zod, Vitest and Playwright. Runtime PATH `/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.

## Global Constraints

The approved contract, endpoint names, event map, owner/rollback rules, locale/UX behavior and delivery boundaries are in `docs/superpowers/specs/2026-10-13-notifications-design.md`. Preserve original layout and old business data. No email/push/payment/deployment. Never touch `backend/routes/auth 2.ts`. Do not commit worker scratch reports or synthetic storage/screenshots.

### Task 1: Backend Store, Events and Owner API

Files: `shared/notifications.ts`, `backend/notifications/events.ts`, `backend/notifications/routes.ts`, additive domain/context/JSON migration changes, event integration in `backend/companions/applications.ts`, `backend/orders/escrow.ts`, `backend/orders/persistence.ts`, scoped server registration/arbitration; focused notification unit/integration tests.

- [x] Write failing list/read tests: ownership, stable pages, invalid cursor/limits, no-store, identical 404 for foreign/missing IDs, strict read bodies, replay/no-op, save rollback preserving references.
- [x] Implement the exact shared DTOs and owner routes from the spec. Test old v12 state migration with no historical backfill.
- [x] Write failing event tests: review cycles and terminal replay, funded creation/transitions/deadlines/arbitration, actual participants, no unauthorized/failed/legacy notifications, notification/role/funds/audit rollback.
- [x] Integrate deduplicated notification emission inside existing business transaction boundaries; strengthen only funded arbitration's snapshot.
- [x] Run focused existing application/order/auth/storage tests and type checks. Report errors/status contracts and exact changed files for review.

```ts
expect((await listAs('other')).body.items).toEqual([]);
expect((await markAs('other', own.id)).status).toBe(404);
expect(afterFailedSave.notifications).toEqual(before.notifications);
expect(afterReplay.notifications).toHaveLength(before.notifications.length);
```

### Task 2: Owner Hook, Original Notification View and Targets

Files: `client/services/businessApi.ts`, `client/hooks/useNotifications.ts`, `client/components/notifications/copy.ts`, `client/components/notifications/target.ts`, `client/views/NotificationsView.tsx`, minimal `client/app/useAppState.ts` and `client/app/AppShell.tsx` integration; API/hook/view/target tests.

- [x] Write failing API/hook tests for owner DTO validation, empty/loaded/error retention, pages, read acknowledgements/retries/double lock, late reads after mutation, logout/A-B-A/token rotation/unmount.
- [x] Implement `listNotifications(token,{cursor?,limit?})`, `readNotification(token,id)`, `readAllNotifications(token)` and the scoped hook with server-confirmed state only.
- [x] Write failing EN/AR view and target tests: no examples, empty/error/refresh, unread/read controls, read-all, load-more, actual application/order lookup, missing target and scope change.
- [x] Integrate the real list and bell unread count. Open the actual application or current My Orders detail through existing navigation; do not invent target records or grant roles.
- [x] Run focused client tests and type checks; review the complete changed client surface.

```ts
const saved = await hook.markRead(id);
expect(saved?.readAt).toBe(serverReadAt);
expect(hook.items.find(item => item.id === id)?.readAt).toBe(serverReadAt);
expect(await resolveNotificationTarget(token, notification, owner)).toMatchObject({ type: 'ORDER', order: { id: realOrderId } });
```

### Task 3: Whole-Flow QA and Authorized GitHub Delivery

Files: guarded `tests/e2e/notifications.spec.ts`, `docs/notifications-acceptance.md`, completed plan/receipt.

- [x] Start fresh disposable fixture on 3016; UI review creates a real result notification, UI funded order creates real participant notifications; no events for 39 legacy orders.
- [x] Exercise read/read-all/reload/targets/failure/account isolation; capture EN/AR mobile/desktop, notification bell and existing dialogs without overlap.
- [x] Run full single-worker suite, both type checks, Vite build and whitespace checks. Obtain independent read-only review, TDD-fix findings and rerun affected/full checks.
- [ ] Explicitly stage only approved files, commit, publish to `sogeryou/laeeb` / `codex/independent-auth` through authenticated connection with expected-head protection, fetch and compare exact tested trees; leave unrelated files intact.

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
E2E_NOTIFICATION_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3016 node_modules/.bin/playwright test tests/e2e/notifications.spec.ts --workers=1 --reporter=line
```
