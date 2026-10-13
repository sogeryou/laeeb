# Persisted In-App Notifications

The user approved this scope on 2026-10-13: retain the existing notification page, replace example rows with real application review/order events, add read/unread state and safe target navigation, recover on refresh, isolate accounts, test and publish to the existing development branch. SMS, email, mobile/browser push, promotions, chat notifications and production deployment are excluded.

## Contract and Persistence

Create `shared/notifications.ts`:

```ts
export type NotificationKind = 'COMPANION_APPROVED' | 'COMPANION_REJECTED'
  | 'ORDER_CREATED' | 'ORDER_ACCEPTED' | 'ORDER_AWAITING_CONFIRMATION'
  | 'ORDER_COMPLETED' | 'ORDER_CANCELLED' | 'ORDER_DISPUTED' | 'ORDER_REFUNDED';
export type NotificationTarget = { type: 'APPLICATION' | 'ORDER'; id: string };
export type AppNotification = {
  id: string; userId: string; kind: NotificationKind; target: NotificationTarget;
  serviceName?: string; createdAt: number; readAt?: number;
};
export type NotificationsPage = { ownerId: string; items: AppNotification[]; nextCursor: string | null; unreadCount: number };
export type NotificationReadResult = { ownerId: string; notification: AppNotification; unreadCount: number };
export type NotificationsReadAllResult = { ownerId: string; updatedIds: string[]; readAt: number; unreadCount: number };
```

Internal persisted rows also contain `eventKey`, which is never included in public DTOs. Store rows in `PersistedState.notifications`, wire the same array into AppContext/server, migrate old state to an empty array without backfilling historical business events. Keep entity/collection references intact during rollback.

GET `/api/notifications?limit=20&cursor=<last-id>`: authenticated, no-store, owner-only, default 20/max 50 positive integer limit. Sort createdAt descending then id descending. A cursor must refer to that owner's row; invalid cursor/limit returns 400, without distinguishing another owner's row. Return all-owner unreadCount, not just the page's unread count. Only return a non-null nextCursor if further rows remain.

POST `/api/notifications/:id/read`, POST `/api/notifications/read-all`: authenticated, strict empty object bodies, owner-only. Missing or another owner's ID returns the same 404. Single read returns NotificationReadResult; all-read returns NotificationsReadAllResult and marks the requesting owner's current unread rows only. Already-read/no-op operations are idempotent and do not persist again. Failed saving returns 503 `NOTIFICATION_SAVE_FAILED` and restores readAt/rows; reads do not create events. No write endpoints accept ownerId, target, eventKey or notification content from clients.

## Authoritative Event Sources

Review transitions emit one owner notification after APPROVE/REJECT state, role and audit changes are prepared, inside the same persistence transaction. Key: companion ID plus actual reviewed updatedAt and status; new review cycles after resubmission must produce new results. Same-action terminal replays emit nothing. Do not include request fingerprints, reviewer IDs, evidence or rejection reasons in notifications; the application page displays the actual review details.

Funded v2 order creation emits ORDER_CREATED to buyer and provider. State transitions map IN_SERVICE to ORDER_ACCEPTED, AWAITING_CONFIRMATION to ORDER_AWAITING_CONFIRMATION, COMPLETED to ORDER_COMPLETED, CANCELLED to ORDER_CANCELLED, DISPUTED to ORDER_DISPUTED, REFUNDED to ORDER_REFUNDED. Send to the two actual participants, deduplicating a coincident recipient. Key: order ID and new state plus recipient. Failed/unauthorized transitions, terminal replays, quotes and old unfunded records emit nothing. Deadline expiry and real administrative arbitration use the same domain transitions. Notification generation belongs inside the order persistence snapshot, including notification/audit restoration on failure; protect the funded arbitration branch with that snapshot too. Do not broaden legacy order behavior.

Notification titles/bodies are generated in the selected locale from typed kinds and an optional actual service-name snapshot. They state a result, not who performed it: automatic completion must not falsely claim buyer confirmation. No invented recharge-success/chat/system-update rows.

## Client and Navigation

Add focused owner-scoped `useNotifications(token, ownerId, enabled)` and API methods `listNotifications`, `readNotification`, `readAllNotifications`. Only enable for an authenticated completed profile (or ADMIN); poll every 30 seconds while visible and refresh on focus. Keep last confirmed list/count on errors and token rotation. Invalidate immediately on logout, token-only logout and A-B-A account changes, including session events before props update. Ignore old/unmounted responses and malformed owner/ID DTOs. A read mutation must not be overwritten by a read begun before it; synchronous locks prevent double writes. Do not show a read state until persisted server acknowledgement.

Retain the original notification header/list composition; provide EN/AR copy, empty/loading/error/retry, load-more, individual read/open controls and mark-all-read. Merge/deduplicate pages and refreshes by ID in stable order; keep an expanded pagination frontier during background refresh and reset it only on explicit full refresh. Show a real unread indicator on the existing Messages notification bell, with accessible labels and tooltips. Remove the page's decorative unread blur and static example rows.

Click: persist single read (or confirm already-read), then fetch authoritative application/order data for the current owner. APPLICATION opens the existing Apply Player page only when returned ID/owner matches. ORDER opens My Orders plus its existing detail dialog only when the latest returned order belongs to the requester as buyer/provider. Never navigate to supplied URLs, use stale notification status to grant roles, or fall back to a placeholder order. Account/token guards apply across read, target lookup and navigation. A failed read/target lookup shows a retryable error; an acknowledged read stays read even if later target lookup fails.

## Verification and Delivery

TDD for owner-only listing, pagination, read idempotency/rollback, migration, deduplicated events and failed business writes; client API/owner isolation/read races/token rotation/unmount/page merge; real view empty/error/read states and safe navigation. Use a disposable loopback fixture on port 3016, installed Chrome, one worker; visible UI writes only, GET inspections allowed. Test review result notifications and funded order events, read/read-all/reload, unrelated account isolation, EN/AR mobile/desktop and no fabricated notifications for 39 legacy orders. Preserve historical providers/orders/balances. Full single-worker Vitest, both TypeScript checks, Vite build, whitespace validation and independent review precede GitHub publication. Exclude `backend/routes/auth 2.ts`, production data, temporary fixtures/screenshots, dependencies and build output.
