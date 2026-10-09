# Independent authentication implementation plan

Goal: implement the approved purple independent registration/login flow and upload the verified application to https://github.com/sogeryou/laeeb on a development branch.

Architecture: keep editable visual tokens, translated copy and individual step components separate from flow state and HTTP adapters. Reuse the existing Express account IDs, wallets, companion relationships and login events. Authentication routes delegate to focused services for challenges, sessions, profile validation and mail delivery.

Tech stack: existing React 19, TypeScript, motion, lucide-react, Express, JSON persistence, Vitest and existing object storage interfaces.

## Global constraints

- Palette: #0f071a background, #9333ea CTA; design source docs/design/auth-independent-pages/social-v3.html.
- Email verification → avatar, nickname, gender, date of birth → explicit terms consent → optional tags. Uploaded or system avatars allowed; birth date required, minimum 18 calendar years by server business date. Preserve existing user IDs and financial/social data.
- English/Arabic RTL, visible field labels, concise copy, reduced-motion support. Subsequent visual changes should not require changing backend logic.
- Default new account USER. No auto-creation from passwordless login until profile and consent complete. Existing password and administrator login remain compatible.
- Routes: /auth/login, /auth/register, /auth/verify, /auth/profile, /auth/interests, /auth/forgot-password, /auth/reset-password, /auth/restricted.
- Keep tokens/codes/passwords out of URL and logs in production. Persist cooldown/challenge consumption safely in the existing single-process deployment; fail closed for unavailable production email delivery.
- Upload only project source, docs and approved assets. Exclude environment files, local account data, logs and dependencies. Preserve the target repository's existing main branch; no force push.

## Task 1 — Server authentication and contract

Files: backend/auth/*, backend/routes/auth.ts, backend/domain/types.ts, backend/server.ts and state/context adaptations where needed; shared/auth.ts; focused tests/integration/auth-independent.spec.ts; tests/unit/auth-profile.spec.ts.

Implement challenge verification, short-lived registration/reset grants, atomic/idempotent account creation, private birth date and consent records, preferences, upload sanitization, password reset, session refresh/revocation and production mail adapter. Add backward-compatible self-session profile metadata and explicit public serializers. Use configurable policy constants and stable tag/system-avatar IDs.

HTTP contract is defined in task-1-auth-backend.md. Validate age boundary, email purpose isolation, wrong/expired/reused codes, duplicate completion, no role escalation, old identity/balance retention, private data, logout/reset revocation and mail failure. Run focused tests and typecheck; report exact evidence.

## Task 2 — Editable frontend and application integration

Files: client/features/auth/{api,config,copy,routing,session,useAuthFlow,AuthExperience,AvatarPicker,auth.css}; client/app/{AppRoot,useAppState}; client/services/businessApi.ts integration as needed; public/auth assets. Keep shared AuthModal available to the administrator route only.

Implement independent full-screen URLs with browser history, email/code/profile/interests/password/restricted steps, typed HTTP adapter, persistent safe return context, session restoration/refresh and explicit errors. Use ordinary semantic forms with request locking, preserved non-sensitive draft, 18+ calendar max, system avatars and cropped upload preview, consent and stable tag IDs. Tags remain optional, max five and editable via configuration. Restore original in-app destination without auto-submitting orders/messages.

## Task 3 — Verification and delivery

Run project typecheck, relevant integration/unit suite, build and repository validation. Inspect live desktop/mobile/RTL registration and login. Review backend and frontend boundaries for missing authorization or accidental public fields. Document real external dependencies (mail credentials) honestly. Compare target repo before creating a non-destructive development branch, commit complete project changes, push only to sogeryou/laeeb, verify remote SHA and report the GitHub branch URL.

## Progress

- [x] Server contract and implementation
- [x] Frontend flow and integration
- [x] Review and verification
- [x] GitHub upload verified

Delivery: https://github.com/sogeryou/laeeb/tree/codex/independent-auth

The uploaded application tree `bfd582c4010df9b6dee50fa3188a53625a1a9159` matches the verified local snapshot exactly. The development branch starts from the target repository's existing main commit; main remains unchanged at `899a123488b7bb1ed79166f82bd785a0026dbc4f`. Fresh verification on 2026-10-09: 31 test files and 119 tests passed. This is a source upload, not a production deployment; live email delivery still requires provider configuration and inbox acceptance.
