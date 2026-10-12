# Companion Service Management

The user approved option 1 on 2026-10-11. Preserve the original profile editor and customer navigation; replace example services and fake save success with persisted data.

## Scope and Contract

- Authenticated GET `/api/companions/me/profile` returns the owner's `ManagedCompanionProfile`; PATCH at the same path saves `UpdateCompanionProfile`.
- `shared/companionManagement.ts` defines `CompanionService { id, name, unitPrice, unit }`, `ManagedCompanionProfile { id, userId, gameName, intro, hourlyRate, status, availability, updatedAt, services }`, and `UpdateCompanionProfile { gameName, intro, hourlyRate, updatedAt, services }`.
- The primary hourly service retains the companion ID; edit its game name and price through `gameName`/`hourlyRate`. Extra services keep immutable IDs. New extra service IDs are generated client-side with `crypto.randomUUID()`. Limit 20 extra services, names 1-100, intro 1-2000, ID 1-100 safe characters, unit `hr` or `match`, positive price with at most two decimal places and maximum 10000. Primary rate follows the existing order price-band policy, not a newly invented level rule.
- Add/edit only this round. Existing extra IDs must remain in updates; no deletion, no duplicate IDs, no primary-ID collision, no changing ownership/status/availability/ranking. Legacy records are readable; invalid legacy units must be corrected before saving. Unknown fields are rejected.
- Owner lookup never accepts a client-supplied owner ID. Frozen/risk-held/suspended/order-restricted or unapproved providers cannot write. Read remains owner-only. Absent companion returns 404, forbidden writes 403, stale `updatedAt` returns 409, save failure returns 503 and restores the entity in memory. Successful timestamp is monotonic.
- Public GET `/api/companions/:id/profile` returns the same customer `EPal` projection used by home/orders, approved unrestricted providers only, no email/internal ranking. It bypasses exposure snapshots for current bio/services; no ranking/exposure policy changes. Responses are no-store.

## Client Experience

Original title, sections, palette, navigation and save placement remain. Controlled real service list, primary game/rate fields, extra service edit/add with name/rate/unit, controlled introduction. Cover/voice controls remain visibly disabled, with no fabricated clip or successful upload.

Owner-scoped loading, empty/not-provider, retry, inline validation, busy and error states. Save only shows success after persisted server response; failure keeps draft. Account changes hide private drafts immediately; stale load/save cannot restore data, navigate or notify for a different owner. Refresh/token rotation must not wipe a dirty draft. Conflict shows reload action. EN/AR text and RTL inputs/layout are supported.

Refresh real customer profile on entering Profile view so updated services/bio appear without relying on stale home snapshots. Existing orders retain their saved service name/unit/price; changed quotes reject old totals before funding.

## Acceptance

1. Owner edits bio/primary service, adds and edits an extra service; reload returns persisted values and stable IDs.
2. Unauthorized/other-user writes, invalid prices/IDs/duplicate/removed services, injected privilege fields and stale drafts are rejected without mutation.
3. Failed persistence rolls back without changing historical orders or balances.
4. Buyer sees updated public services, obtains a new authoritative quote and funds exactly its total; old orders remain unchanged.
5. Loading/failure/retry, EN/AR desktop/mobile layout, account switch/stale responses, unsupported upload/voice, dirty draft and duplicate-click protection are tested.

No real payments, media uploads, production deployment, GitHub push or unrelated refactor. Preserve all previous uncommitted work and `backend/routes/auth 2.ts`.
