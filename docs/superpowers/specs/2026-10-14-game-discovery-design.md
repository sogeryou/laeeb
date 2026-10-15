# Real Game Companion Discovery Design

Date: 2026-10-14. Approved scope: real game-detail companion lists and filters.
Baseline: `34b67fcef5da74658273c1c076180d91f74b4dba` on `sogeryou/laeeb` / `codex/independent-auth`.

## Goal And Boundaries

Keep the existing game-detail hero, list/card composition and path into public profile, chat and checkout. Replace its prototype `EPALS` with authoritative public discovery. Add EN/AR states, retry, actual filters and bounded pagination. Do not change provider prices/services, application/review decisions, payment rules, home exposure caps, favorites, global search, authentication or personal-profile writes. No production deployment, external messages or real payments.

## Game Identity

Use a shared, explicit game-ID/alias resolver for the existing nine catalog entries. Stable IDs remain `lol`, `val`, `pubg`, `genshin`, `apex`, `dota`, `csgo`, `minecraft`, `chat`. Recognize their exact existing display names and explicit canonical aliases: League Pro / League of Legends, Tactical Duo / Valorant, Battle Royale / PUBG Mobile, Open World / Genshin Impact, Apex Legends, Dota 2, CS:GO / Counter-Strike: Global Offensive, Minecraft and Just Chatting. Normalize whitespace and case, not arbitrary prefixes or fuzzy substring matches. PUBG Mobile does not implicitly match PUBG PC/BATTLEGROUNDS or any unrelated battle royale.

The provider's current primary `gameName` is authoritative. An old application `details.gameId` must not override a later primary-game edit. Unknown custom primary games are not silently assigned to a catalog ID. Do not classify an extra service's free-form name as an additional supported game. Keep global catalog layout/assets intact; the touched detail heading may show the resolved canonical name.

## Public Read Contract

Add a focused read-only `GET /api/games/:gameId/companions` endpoint. Set `Cache-Control: no-store`, validate known game ID and strict query fields, and do not persist state or consume home-exposure allowances. Query: `status=ALL|ONLINE`, `gender=ALL|M|F|U`, `minPrice`, `maxPrice`, `sort=DEFAULT|ORDERS|SCORE`, `page`, `limit`. Defaults: ALL status/gender, 0..10000 price, DEFAULT, page 1 and limit 20; maximum limit 50. Page/limit must be positive safe integers, bounds finite nonnegative with at most two decimals and min <= max. Invalid inputs return a standard 400 error; unsupported game IDs return 404. No client-supplied owner or privilege fields.

Only include current APPROVED companions with an existing provider who passes the existing public-profile account/order/accept-order restrictions. Exclude pending, rejected, missing-user, suspended, frozen, risk-held and order-restricted providers. Availability is read from stored ONLINE/BUSY/OFFLINE; ALL can show busy/offline, but these are not offered as immediately bookable.

Response: resolved game ID, canonical game name, echoed normalized query, `items`, filtered `total`, actual game-level `onlineCount`, current page/limit and `nextPage` or null. Online count is all eligible ONLINE primary-game companions, independent of gender/price/page filters; do not reuse the static catalog's online number. Return explicit public identity/service fields only, never email, credentials, application/private review data, permissions, wallet or revenue.

Reuse existing `companionProfile` and actual primary service ID/price/unit. Price filtering uses the displayed primary hourly price, not the cheapest extra service. Keep services stable for existing quote/checkout. Stats align with the existing public-profile definition: completed and settled orders with `completedAt` in the last 30 days, not future timestamps; rating is the mean of approved valid 1..5 reviews. No orders/reviews yields 0 counts and no invented rating. Sort numerically, never parse abbreviated prototype counts. DEFAULT puts ONLINE first, then BUSY and OFFLINE, with stable companion ID tie-breaks. ORDERS and SCORE sort descending by their real metric with companion ID tie-breaks.

Pagination is a live bounded catalog, not a frozen ranking snapshot. Clients deduplicate appended IDs; refresh/filter/game changes restart page 1. Changes to eligibility, identity, services or metrics can alter later pages. Do not promise historical completeness across changing catalog pages. Re-check current eligibility on every request; checkout remains authoritative if a provider changes after discovery.

## Client And Interaction

A focused hook/adaptor owns discovery query, results, loading, error, refresh and load-more. Validate game/query/page and public item acknowledgements; never accept a response for another game/query/page. Guard request generations, unmounts, game/filter/sort transitions and account/session events. Old results cannot replace a newer query, reappear after an account switch or enable stale checkout. Public reads do not need a user token, but current-account UI actions and self-order protection still depend on current authentication. Reset list and pagination on game/query changes; keep confirmed results with a visible retry error only for same-query refresh/load-more failures.

Keep the existing sort choices and filter entry point, using real controls and a focused dialog integrated in the current shell. Use select/radio controls for options and numeric price bounds without a silent 100-coin cutoff. Gender comes only from actual provider profile fields; missing gender does not match a selected gender. Server/platform/rank application fields may be stale after primary-service edits, so this release does not treat them as authoritative filters: preserve their labels as unavailable where needed and never filter on invented playlinks or badges.

Busy/offline providers remain inspectable/chat-capable but their card's immediate order action is disabled with a localized status. Self-order action is disabled; other actions use the existing profile/chat/quote flow. Card primary price retains its actual hourly unit; no fake voice playback or synthesized five-second wave animation on this screen. Shared card changes must be opt-in/scoped so unrelated screens retain current behavior. Do not manufacture recordings, ranks, badges or service images.

Show EN/AR loading, true empty list, retryable failure, reset filters, result count, actual online count and pagination state. Show no fake success. Preserve the original dark design and existing assets; verify RTL, label/control fit and no horizontal overflow at 320px, 375px and 1440px. Do not redesign the catalog, add marketing copy or modify unrelated global layout.

## Acceptance

1. API tests cover exact alias matching and nonmatching games, current-name versus stale application ID, public eligibility and privacy, real price/status/gender filters, numeric sorting/ties, valid statistics, strict query validation and pagination; reads do not mutate storage/exposure logs.
2. Client tests reproduce stale game/query/page/account/unmount responses, duplicate append, retry, invalid acknowledgements, busy/offline/self-order prevention and no default 100-price cap.
3. View tests prove no `EPALS` example results/static online counts or simulated audio; localized real states, functioning controls, navigation and selected primary service IDs remain correct.
4. Guarded browser acceptance uses a fresh disposable loopback fixture, visible UI for business writes and authenticated GET inspection. Open a catalog game -> find its real approved provider -> apply/reset filters -> public profile -> chat -> real existing checkout quote, without charging real money. Verify load failures and pagination/retry where applicable.
5. Inspect EN/AR screenshots and geometry at 320/375/1440px; verify referenced avatar/hero images render and labels/actions do not overlap.
6. Full tests, both TypeScript checks, Vite build, whitespace, byte-identical tested source and independent review must pass before authorized publication. Existing profile/authentication/order/application/notification tests must remain green.
7. Existing historical orders/reviews, balances, approved status, roles and provider prices/services remain unchanged except explicit disposable test actions. Exclude unrelated `backend/routes/auth 2.ts`, scratch reports, dependencies, media and synthetic storage from commits.
8. Publish to the original authorized GitHub branch with expected-head protection and exact tree verification, then record actual delivery IDs; no force update, unrelated `origin` push, main merge or deployment.
