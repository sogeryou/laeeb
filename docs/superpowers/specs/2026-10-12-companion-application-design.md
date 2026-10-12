# Companion Application and Review

Approved by the user on 2026-10-12 through the acquisition/development priority question. Preserve the original four-step application page and existing administration layout; make application submission, status and approval real. Completed and verified work may be committed and delivered to `sogeryou/laeeb`, `codex/independent-auth`. Deployment and real payments remain excluded.

## Shared Contract

Create `shared/companionApplications.ts` with `CompanionApplicationDetails` (optional `gameId`, `rank`, `mainPosition`, `server`, `platform`, `style`, `coverIntro`, `serviceName`, `unit: 'hr' | 'match'`), `SubmitCompanionApplication` (`gameName`, `intro`, `hourlyRate`, optional `requestId`, optional `details`), `CompanionApplication` (owner-safe `id`, `userId`, `status`, `gameName`, `intro`, `hourlyRate`, `details`, `submittedAt`, `updatedAt`, optional `rejectionReason`, `reviewedAt`), and `CompanionApplicationResponse { application: CompanionApplication | null }`.

GET `/api/companions/me/application` is authenticated, owner-only and no-store. It returns null for no companion; legacy companions use sensible actual-field fallbacks, never invented application data. POST `/api/companions/apply` uses strict validation and the existing rate-band policy (maximum two price decimals). Preserve existing minimal gameName/intro/hourlyRate payload compatibility, but all new applications now start PENDING and OFFLINE. The frontend sends a stable requestId and full supported details. Unknown privilege/status/media/promotion fields are rejected.

One companion per owner. Same-key/same-payload replay returns the saved application without another write; conflicting keys/payloads do not mutate a pending application. APPROVED records reject reapplication with `COMPANION_ALREADY_EXISTS`. REJECTED owners may resubmit with a new key, keeping the same companion ID, returning to PENDING and clearing prior review metadata. No applicant becomes PLAYER before approval. Admins and frozen/risk-held/banned/suspended applicants cannot submit. Existing approved providers and historical order data must not change.

Application details are stored in additive companion metadata; internal request fingerprints and reviewer IDs are not returned to ordinary owners. Preserve the existing primary game/hourly service contract. When an application declares a named service/unit, initialize one stable configured extra service with that name, price and hr/match unit, so submitted service information is not discarded. Game/Round UI units map to match; Hour maps to hr. No media is fabricated or made mandatory in this round.

## Administrative Review

Keep existing POST `/api/admin/companions/:id/review`, authenticated with COMPANION_REVIEW permission. Strict APPROVE/REJECT action, optional safe integer expectedUpdatedAt, rejection reason 1-1000 required for REJECT. Review only PENDING records; terminal same-action replays are idempotent and create no duplicate audit. Opposite terminal actions return a conflict rather than revoke/change prior review.

APPROVE atomically changes companion status, user role to PLAYER and review metadata, but leaves availability OFFLINE. REJECT stores the reason, leaves a non-admin applicant USER and OFFLINE. Always preserve ADMIN roles. If persistence fails, restore companion/user/audit collection and entity references; never report success. Pending entities cannot enter exposure, quote, fund, accept orders or use player-only analytics. Existing backend status restrictions remain authoritative.

Show pending-only review controls in both existing administration views, with a rejection-reason dialog, submit busy lock, safe retry/error states and confirmed server status. Display submitted supported game/service/intro fields for review; do not invent photos or recordings. Ordinary users cannot review their own applications.

## Original Client Flow

Original category/game selection, game detail selectors, introduction and service pricing stay. Screenshot, cover and recording controls become visibly unavailable and no longer inject stock URLs/placeholder audio. Remove those unavailable assets from Next/Submit requirements. Keep optional cover introduction. Promotions remain visibly unavailable and are not submitted; do not promise discounts without authoritative server rules.

A focused owner-scoped application hook hydrates and polls while Me/Application are open; reload after submission preserves PENDING status. Pending is read-only. Rejected shows real reason and an explicit edit/resubmit action with existing details prefilled. Approved shows the real result and refreshes the authenticated session from the server before displaying Player Center; never elevate a client role from local form state.

Loading, missing application, invalid input, failure/retry and stable request-ID recovery are visible. Unsuccessful or ambiguous submit retains the draft and request ID; repeated submit cannot create duplicates. Account changes/logout immediately hide draft/status; stale requests, save completions and role refreshes cannot restore old account data. Token rotation does not wipe a dirty draft. Provide EN/AR state labels and responsive layouts. No unrelated redesign.

## Acceptance

1. Real UI submits supported fields once; GET/reload preserves them, status PENDING, account USER, no exposure/bookable service before approval.
2. Duplicate retry, unknown fields, bad price/unit, cross-account reads/reviews and restricted applicants are rejected without mutation.
3. Admin reviews with permission, expected revision and rejection reason; approval grants PLAYER, rejection persists reason, reapplication preserves ID and requires a new review. Repeated clicks/replays do not duplicate audit or change terminal decisions.
4. Failed persistence rolls back all coupled changes. Old approved providers, management behavior and historical orders still pass regression tests.
5. Browser exercises submit -> pending reload -> admin reject -> owner edit/resubmit -> admin approve -> owner confirmed Player Center, with isolated data and visible UI writes only. Check EN/AR mobile/desktop and unsupported media controls.
6. Full automated tests, types/build, independent review and exact source-tree verification precede authorized GitHub delivery.
