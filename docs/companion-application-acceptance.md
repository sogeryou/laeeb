# Companion Application Acceptance

Verified on 2026-10-12. Scope: persisted application and administrative review, preserving the original application wizard and administration layout.

## Environment and Safety

- Disposable preview: `scripts/player-center-preview.ts`, `http://127.0.0.1:3014/`.
- Installed Chrome, one Playwright worker. The suite requires `E2E_APPLICATION_FIXTURE=1` and rejects remote, wrong-port, credentialed and non-root URLs.
- All application/review mutations use visible UI. Authenticated GET requests inspect results; browser-local 503 mocks test failures without writing server data.
- Final acceptance data directory: `/var/folders/gj/s_rf53w56mv6nfdm9xqv199c0000gn/T/le3eb-player-center-VZTIiZ`.
- No production storage, real payments, email delivery, uploads, scheduled settlement or deployment was used.

## Acceptance Matrix

| Requirement | Evidence | Result |
| --- | --- | --- |
| A1, A5 | Four-step wizard submits supported fields; pending survives reload; session stays USER; no public profile/list exposure | PASS |
| A2, A5 | Failed submit retains draft and key; retry uses the same key | PASS |
| A3, A5 | Required rejection reason, failed review preserves input, real review persists REJECTED | PASS |
| A3, A5 | Changed intro survives failed resubmission and full-page reload; editing recovery keeps the same request ID; resubmission preserves companion ID | PASS |
| A3, A5 | Confirmed approval, polling status recovery, authoritative PLAYER session and Player Center | PASS |
| A1, A4 | New provider remains OFFLINE; old provider fields/services and 39 historical orders unchanged | PASS |
| A5 | Pending GET failure preserves read-only state with visible error/Refresh; retry clears error | PASS |
| A5 | EN/AR pending/rejected states at 375px/1440px; AR approved state and Player Center; no horizontal overflow | PASS |
| A5 | Desktop table/mobile card review controls; root portal, Tab/Shift+Tab, Escape/cancel, no dialog after saved decisions | PASS |
| A5 | Unavailable screenshot, recording, cover and promotions cannot simulate success; placeholder heights bounded | PASS |

## Final Verification

- Full single-worker Vitest: **295 tests across 45 files passed**, exit 0, 15.79 seconds.
- Guarded Playwright application suite: **4 tests passed**, exit 0, 1.2 minutes, including the final recovery scenarios.
- Client and server TypeScript checks: exit 0.
- Vite production build: exit 0, 3.97 seconds.
- Whitespace check: exit 0.
- Independent read-only review: no remaining explicit P1/P2 findings after fixes below. The parent separately ran all tests and browser verification.

The final persisted fixture has one new APPROVED/OFFLINE companion, one configured `Patient ranked duo` service at 8 Coins/hr, and exactly two review audit actions (REJECT, APPROVE). The revised intro is saved. The original provider remains APPROVED/ONLINE with its original 25-Coin match service; 39 historical orders, 39 reviews, its 1900 diamond balance and the applicant's 500 coins remain unchanged.

## Findings Closed

- Pending/rejected applicants could use the old availability endpoint: require APPROVED and validate its enum.
- Legacy failed writes left newly introduced metadata/services behind: restore both values and the original property set while retaining entity/collection references.
- Legacy rejected or orphaned PLAYER roles: successful submission atomically restores USER qualification; failed save restores the previous role. Me requires both a confirmed approved application and server PLAYER role.
- Transient GET failure cleared confirmed status: retain it and show a separate error/retry banner.
- Rejected edit recovery overwrote dirty drafts and request IDs: restore the current owner's retained draft/attempt.
- Missing administration Tailwind sources: explicitly include `../admin`.
- Dialog inside a filtered table section was blocked by later content: render the entire overlay through a document-root portal.
- Unsupported promotion/media copy and English pending fallback in Arabic: correct the touched copy and state translations; bound disabled media placeholders.

Initial full-browser failures exposed obsolete test selectors (Me status labels and the separate administrator login) plus the real style/overlay defects above. A focused height regression observed the original 783px disabled placeholder before the cap. Portal and recovery regressions were observed failing before implementation; final runs above supersede the initial partial QA report.

## Local Evidence

Screenshots are under the ignored `test-results/companion-applications-dis-9903a-keeps-identity-and-old-data/` directory: `wizard-step2-*`, `wizard-step3-*`, `pending-*`, `rejected-*`, `review-dialog-mobile-en.png`, `review-dialog-desktop-en.png`, `approved-mobile-ar.png`, `approved-desktop-ar.png`, and `approved-player-center-desktop-ar.png`. The parent visually inspected representative applicant and administrator screenshots. Do not publish fixture storage or screenshots to GitHub.

## Limits

Recording, game/cover uploads, promotions and review-notification delivery are not integrated. Arabic coverage here concerns the touched application states and layout, not a full-platform translation audit; existing wizard/admin copy still contains fallback English/Chinese. The existing large-bundle build warning and deprecated React test-renderer notices remain. Local JSON failure rollback is not production transaction certification. Direct development-branch pushes do not trigger the current main/master/PR-only CI or any production deployment.
