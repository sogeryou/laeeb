# Read-only Finance Reconciliation Implementation Plan

> **For agentic workers:** Use subagent-driven-development and test-driven-development. This is the technical implementation of the approved preserve-and-reconcile work, not authority to alter balances.

**Goal:** Generate a conservative review inventory from an explicitly supplied JSON snapshot without changing funds or exposing private profile/payment data.

**Architecture:** A pure analyzer consumes unknown raw JSON; a thin CLI reads an explicit regular file and prints the report. Never import server, loadState, sanitizePersistedState or saveState. Do not start the application, access a database or infer the production storage location.

**Tech Stack:** TypeScript, Node fs/crypto, existing Decimal.js if exact comparison needs it, Vitest, existing tsx runner. No new dependency.

## Global Constraints

- Existing records contain real funds: no writes, migration, truncation, deletion, repricing, refunds, or status transitions.
- Findings are review signals, never proof of chain payment, fraud or financial loss. Old APPROVED is not PAID.
- A clean inventory is not reconciliation approval; currency-mixed ledger and incomplete opening balances prevent a full balance proof.
- CLI has no default input path, no output-file/repair flag, no application or persistence loader imports. JSON report goes to stdout, safe generic errors to stderr.
- No emails, names, password hashes, sessions, addresses, free-text notes/descriptions or raw malformed values in output. Use collection/index locations for lookup rather than printing untrusted identifiers.
- Tests use temporary synthetic fixtures only. Do not scan or open real financial snapshots during development.

### Task 1: Conservative snapshot inventory

Files: create backend/finance/reconciliation.ts, scripts/audit-finance-snapshot.ts, tests/unit/finance-reconciliation.spec.ts, tests/integration/finance-reconciliation-cli.spec.ts, docs/mvp/finance-reconciliation-runbook.md. Existing runtime source untouched.

Interface: `analyzeFinanceSnapshot(input: unknown)` returns `{ reportVersion: 1, scope: 'legacy-finance-inventory', fullReconciliation: false, counts, findings, limitations }`. Findings contain stable code, severity (`REVIEW` or `ERROR`), and safe collection/index locators. No success/approved-to-migrate result. Avoid echoing arbitrary object keys; wallet locators use Object.entries ordinal only. Invalid root/missing or malformed required collections produce explicit ERROR findings, not silently empty success. Required relevant collections: wallets, diamondWallets (records); users, orders, withdrawalRequests, walletTransactions (arrays). Malformed rows must never crash or disappear silently.

- [x] Write failing pure tests with frozen synthetic input and expected findings: missing collections, malformed row, fractional/negative/unsafe coin or diamond balance, wallet owner mismatch, fractional historical order amount (review, not repricing), duplicate IDs (users/orders/withdrawals/transactions), orphan withdrawal owner, unknown withdrawal status, invalid withdrawal amount, multiple PENDING for one user.
- [x] Add ledger relationship tests: PENDING/REJECTED with same-owner WITHDRAW debit and exact referenceId needs review; APPROVED always needs payment confirmation review, even with one matching debit; APPROVED missing matching debit, duplicate matching debits, amount mismatch, cross-owner reference collision flagged separately. A generic WITHDRAW reference may be an admin operation and is not automatically called orphan or charged twice. Do not total mixed-currency ledger into an asserted wallet balance. Use only valid IDs for joins; ambiguous duplicate IDs get findings, not trusted conclusions.
- [x] Verify focused tests fail before adding analyzer. Implement minimal typed helpers with safe unknown handling, deterministic findings ordering and no input mutation. O(n) maps preferred for joins and duplicate checks. Findings never interpolate raw payload into messages.
- [x] Add CLI integration tests invoking actual tsx process against temp fixtures. Usage `tsx scripts/audit-finance-snapshot.ts --input /absolute/path/to/snapshot.json`; no omitted input or unknown flag accepted. Read explicit regular file read-only, reject directories/nonregular/symlink targets to avoid implicit traversal. Report includes input SHA256 and byte count, not full path. Exit0 means report generated without ERROR findings, exit2 means report generated with data ERROR findings, exit1 means usage/read/JSON failure. REVIEW still requires manual reconciliation and never indicates migration approval. Errors contain fixed codes only, not parser excerpts or file contents.
- [x] Test source byte hash and directory file list unchanged after successful and failed runs; unique secret sentinels absent from both stdout/stderr. Include malformed JSON, missing file, directory, symlink, missing required collections, positive clean minimal report, and suspicious legacy snapshot. No output files created by CLI.
- [x] Add operator runbook: run only on an authorized stable backup copy, restrict report access, index lookup against same hash, exit code interpretation, checks not covered (chain receipts/currency attribution/opening balances), no automatic repair. Actual source location and migration remain separate approval gates.
- [x] Run focused tests, full Vitest suite, application/server typechecks and independent review; fix actionable findings. Save exact commands/red-green evidence in .superpowers/mvp/finance-reconciliation-report.md. Controller owns commits and original-doc synchronization.

## Acceptance boundary

Delivering the tool does not mean actual records have been audited. User must identify/authorize the actual snapshot. No new withdrawal route or live finance writes are enabled by this task.
