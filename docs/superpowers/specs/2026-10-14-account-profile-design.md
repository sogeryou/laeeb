# Persistent Account Profile Design

Approved scope: existing Edit Profile page; real nickname, personal bio and avatar persistence; Me/chat/public identity synchronization, EN/AR, retries and account isolation. Preserve the existing dark presentation. No password, role, consent, age, service-price or companion-review edits. No external publication or deployment; verified code may go to the existing authorized GitHub branch.

## Contract

`shared/accountProfile.ts` defines `ACCOUNT_BIO_MAX_LENGTH=280`, `AccountProfile={user:AuthUser;bio:string;revision:string}` and `UpdateAccountProfile={revision:string;username:string;bio:string;avatar?:AuthAvatar}`. Revision is a SHA-256 opaque digest of owner ID and current nickname, bio and avatar, rather than a version that existing profile writers can accidentally bypass. Bio is optional on existing UserEntity/AuthUser records; old data defaults to an empty personal bio without backfill or schema churn.

GET `/api/account/profile` and PATCH `/api/account/profile` are authenticated, owner-only, no-store routes. PATCH is a strict object with no recipient, role, password, consent, age or arbitrary avatar URL. Nicknames reuse the shared 2-32 visible-character validation and trim whitespace; case-insensitive collisions with another user's nickname return 409 `PROFILE_NICKNAME_TAKEN`. Personal bio is trimmed plain text, up to 280 graphemes, with a bounded raw length and no non-text control characters; empty bio intentionally clears it. Rendering always escapes text.

Avatar omission keeps the existing avatar. System IDs use the existing allowlist; uploads must refer to an upload owned by `user:<authenticated-id>` and the canonical URL derived from its upload ID, never a supplied URL. Invalid/foreign uploads return 400 `PROFILE_AVATAR_INVALID` without revealing ownership. Existing upload/crop infrastructure is reused; uncommitted upload candidates never change the saved profile. Upload persistence failure must not leave a usable in-memory upload record or report success.

PATCH compares the submitted revision to current fields before mutation; a stale changed update returns 409 `PROFILE_STALE`. An exact desired-state replay/no-op returns the current result without saving, so a lost successful response can be retried safely. Snapshot and restore the same user object on save failure; return 503 `PROFILE_SAVE_FAILED`. Validation returns 400 `INPUT_INVALID`. Existing auth eligibility/errors remain authoritative. Return the freshly projected AuthUser so the client does not fabricate privileges or identity fields.

## Identity Projections

The saved nickname/avatar/personal bio feed Me, authenticated social peers/conversations, post/comment author identity and existing public companion projection. A provider's personal bio uses `user.bio` when present, with the existing companion intro as legacy fallback; service descriptions keep their original companion intro. No service, application, review, wallet, order or notification data is rewritten when saving a profile. Public projections expose only existing public identity fields, never email, birth date, consent, credentials or upload ownership.

## Client

Focused profile API adapter/model/hook and EN/AR copy replace only Edit Profile's static values. Use controlled inputs, actual saved avatar, empty bio, load/error/refresh states, valid counters, saving/saved/error states and the existing avatar picker/cropper. The save action sends a full nickname/bio and optional chosen avatar ID with the last acknowledged revision. No optimistic success or fake avatar upload.

Dirty drafts survive transient load/save failure and same-account non-null token rotation; explicit reload can discard a stale draft. Logout, A-B-A switches, eligibility loss and unmount invalidate reads/uploads/saves immediately, including session events before props render. Old account data is hidden synchronously; duplicate saves are locked synchronously. Reads begun before a save acknowledgement cannot overwrite confirmed state. Only a validated same-owner result may update global auth identity, using the currently stored token rather than reviving an obsolete token. Saved records are recovered from the server after refresh; no private draft is placed in cross-account storage.

Me shows saved personal bio. Chat/header/profile identity reconciles from current participant projections while retaining service data. Entering an ordinary user's profile uses the existing authenticated social-peer projection; provider profiles keep their authoritative public service lookup. Identity lookups are scope guarded and do not query the companion service API for ordinary buyers.

## Acceptance

TDD covers validation/permissions/replays/concurrent revisions/save rollback/upload ownership, restoration/public projections, API methods, dirty drafts, loading/retries/double lock, stale reads, token rotation, session events, A-B-A and unmount. Existing auth/social/order/application/notification tests must remain green.

Guarded browser QA uses loopback port 3018 and disposable sandbox fixture only; all business writes occur through visible UI and authenticated inspections are GET-only. Verify system avatar and actual PNG crop/upload, save failure retaining old profile, retry and reload, other-account isolation, chat and public identity, unchanged provider service settings/roles/balances/39 legacy orders/reviews, and EN/AR mobile/desktop fit. Run full single-worker Vitest, both TypeScript checks, Vite and whitespace checks, plus independent review. Record exact source/remote tree delivery without claiming production deployment or remote CI.
