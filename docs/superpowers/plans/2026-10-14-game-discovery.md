# Real Game Companion Discovery Implementation Plan

> **For agentic workers:** Use subagent-driven-development, test-driven-development and independent task/final reviews. Parent owns client integration, guarded browser acceptance and authorized GitHub delivery; the backend task has a disjoint write set.

**Goal:** Replace prototype game-detail people with real approved companion discovery, filters and checkout navigation.

**Architecture:** A focused shared game resolver/contract and public read endpoint supply live bounded pages. A guarded client hook drives the existing detail view, scoped filter dialog and opt-in card presentation. A disposable fixture verifies the complete flow without production writes.

**Tech Stack:** Existing TypeScript, React, Express, Zod, Vitest, Supertest and Playwright; no dependency changes.

## Global Constraints

Approved requirements are in `../specs/2026-10-14-game-discovery-design.md`. Stay on `codex/independent-auth`, publishing only to `sogeryou/laeeb`; do not touch/stage `backend/routes/auth 2.ts` or scratch files. Reuse the current checkout; tests run outside its macOS cloud placeholders in the exact-baseline snapshot `/private/tmp/laeeb-game-discovery-verify-20261014` with existing frozen dependencies. No external messages, production storage, real payments, deployment or main merge. No provider-service/price/review/auth/favorites/global-search changes. Endpoint defaults ALL status/gender, price 0..10000, DEFAULT sort, page 1, limit 20/max 50; nickname/avatar/bio must stay real and public privacy scoped. Game aliases are exact normalized names, not prefixes. Missing/unreliable metadata and recordings are never synthesized.

### Task 1: Backend Contract And Read Model

**Files:** create `shared/gameDiscovery.ts`, `backend/companions/discovery.ts`, `tests/unit/game-discovery-catalog.spec.ts`, `tests/integration/game-discovery.spec.ts`; modify only registration import/call in `backend/routes/business.ts`.

**Interfaces:** `getDiscoveryGame(id: string)` returns a catalog `{ id, name }` or null; `resolveDiscoveryGameId(name: string)` returns known ID or null. Export the following contract and `DEFAULT_GAME_DISCOVERY_QUERY`:

```ts
export type GameDiscoveryQuery = {
  status: 'ALL' | 'ONLINE'; gender: 'ALL' | 'M' | 'F' | 'U';
  minPrice: number; maxPrice: number; sort: 'DEFAULT' | 'ORDERS' | 'SCORE';
};
export type GameCompanion = EPal & {
  profileGender?: 'M' | 'F' | 'U'; reviewCount: number;
  completedOrders30d: number; bookable: boolean;
};
export type GameDiscoveryPage = {
  gameId: string; gameName: string; query: GameDiscoveryQuery;
  page: number; limit: number; total: number; onlineCount: number;
  items: GameCompanion[]; nextPage: number | null;
};
```

Existing `EPal.gender` has different legacy values; do not intersect it with M/F/U or change that shared legacy contract. `registerGameDiscoveryRoutes(app,ctx)` owns `GET /api/games/:gameId/companions` and is registered once by business routes.

- [x] Write catalog and HTTP failing tests before implementation. Cover aliases (including old display names), unrelated first-word/PC-game exclusions, stale details game ID, privacy, eligibility, query strictness/arrays/unknowns, >100 prices, correct primary service/price, status/gender, metrics/ties and pages. Test zero persistence/exposure writes and per-request live restrictions.
- [x] Run the new tests and record actual missing-contract/route failures, not a test typo.
- [x] Implement resolver/DTO and route using existing profile/pricing/public restrictions. Derive real settled 30-day counts and approved ratings; preserve primary service IDs. Return literal page metadata and no arbitrary private entity spread. Bookable means ONLINE and valid primary pricing under existing checkout rules, not a new pricing policy or viewer-specific permission.
- [x] Run focused new tests and existing companion/order regressions in an isolated validation copy. Self-review strict inputs, malformed legacy data, ordering and no mutation.
- [x] Hand off changed files and red/green results for independent spec/quality review; parent owns commits and publication.

```ts
expect((await request(app).get('/api/games/pubg/companions')).body.items.map((p: GameCompanion) => p.id)).toEqual(['mobile']);
expect((await request(app).get('/api/games/pubg/companions?minPrice=200&maxPrice=100')).status).toBe(400);
expect(ctx.persistState).not.toHaveBeenCalled();
expect(ctx.exposureLogs).toEqual(beforeExposure);
```

### Task 2: Guarded Client And Original Game Page

**Files:** modify `client/services/businessApi.ts`, `client/views/GameDetailView.tsx`, `client/components/cards/EPalCard.tsx`, `client/app/AppShell.tsx` and focused `client/app/useAppState.ts` only if needed. Create `client/hooks/useGameDiscovery.ts`, `client/components/game-discovery/model.ts`, `copy.ts`, `GameDiscoveryFilters.tsx`; tests `tests/unit/game-discovery-api.spec.ts`, `game-discovery-client.spec.ts`, `game-discovery-views.spec.ts`.

**Consumes:** exact Task 1 shared contract. **Produces:** `businessApi.getGameCompanions(gameId,query,page=1,limit=20):Promise<GameDiscoveryPage>` and `useGameDiscovery(gameId,query,active,token,ownerId)` with `{ items, total, onlineCount, loading, loadingMore, error, hasMore, refresh, loadMore }`. Pass current auth token/owner only for response/action lifecycle invalidation, not public endpoint authorization.

- [x] Write failing API serialization tests and hook tests for authoritative results, wrong game/query/page, malformed items, zero results, retry and locked duplicate load-more. Reproduce delayed game/filter/sort/logout/A-B-A/unmount results before fixing them.
- [x] Implement adapter, response validation and hook with synchronous generation/sequence invalidation, session-event guards, no obsolete-response restoration and duplicate-ID append. Refresh loads the retained pagination frontier for the same query; reset on game/query/session changes. On failed same-query refresh keep only confirmed results with visible error and disabled booking until freshness is restored.
- [x] Write failing view/card/dialog tests for prototype removal, real online/stat/price data, EN/AR, no simulated voice, unavailable metadata, ALL default 0..10000 bounds, busy/offline/self-order disablement and real primary service navigation.
- [x] Replace only game-detail rendering/state with the hook; keep existing hero/assets/layout. Replace the shell's game-filter overlay with a scoped focused dialog. Applied query changes only on Apply/Reset; invalid bounds cannot apply; cancel preserves the old query. Clear old filters and modal drafts on game/account changes. Use actual controls and localized text.
- [x] Add optional real-card props for locale/status/review-empty/price-unit/action eligibility and absent voice; legacy callers keep their existing behavior. Preserve 320px card dimensions and text fit. Use existing quote/order flow with the selected actual primary service ID; do not submit or charge from discovery itself.
- [x] Run focused client and existing profile/order/auth regressions, then independent task review.

```ts
const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).map(([k,v]) => [k,String(v)])), page: String(page), limit: String(limit) });
return request<GameDiscoveryPage>(`/api/games/${encodeURIComponent(gameId)}/companions?${query}`, 'GET');
```

### Task 3: Whole-Flow Acceptance And Delivery

**Files:** create guarded `tests/e2e/game-discovery.spec.ts`, disposable `scripts/game-discovery-preview.ts`, `docs/game-discovery-acceptance.md` and delivery receipt; update this plan checkboxes as tasks pass review.

- [x] Start a fresh sandbox-only JSON fixture on loopback 3020. Seed real synthetic primary-game companions across pages, statuses/genders/prices plus a pending/restricted/nonmatching provider; preserve original test order/review and wallet fixtures. Clear inherited production storage/mail credentials and disable cron, following the existing isolated preview pattern.
- [x] Require `E2E_GAME_DISCOVERY_FIXTURE=1` and exact loopback 3020/root in browser tests. Perform any business writes only through visible UI; inspect via GET. Verify catalog -> real game list -> filters/reset -> profile -> chat -> checkout quote; do not pay a real charge. Cover empty/error/retry and load-more de-duplication.
- [x] Capture stable EN/AR at 320/375/1440px after motion/repaint, check image pixels/load, text/labels/buttons and no horizontal overflow. Verify self/busy/offline order actions, unchanged historical orders/reviews/balances/roles/services and no false notifications.
- [x] Run full Vitest, both TypeScript checks, Vite build, whitespace and exact source/snapshot comparison. Complete independent final review, reproduce/fix/rerun concrete findings and record limitations honestly.
- [x] Commit only explicit approved files and deliver with expected remote HEAD / non-force update / exact tree match / native fetch confirmation. Add actual delivery SHA receipt; leave unrelated user files and old previews intact.

```sh
node_modules/.bin/vitest run --reporter=dot --maxWorkers=1 --minWorkers=1
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc -p tsconfig.server.json
node_modules/.bin/vite build
E2E_GAME_DISCOVERY_FIXTURE=1 E2E_BASE_URL=http://127.0.0.1:3020 node_modules/.bin/playwright test tests/e2e/game-discovery.spec.ts --workers=1 --reporter=line
git diff --check
```
