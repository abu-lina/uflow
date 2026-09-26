# AI / workflow learnings

Short log of learnings from plan → build → review → test loops. Append one entry per learning. Use `@capture-learning.md` to generate entries.

## Entry format

```markdown
### YYYY-MM-DD — [short context]

- **Context**: [1 sentence]
- **Learning**: [what we learned]
- **Change to prevent repeat**: [1–3 bullets: rule/command/acceptance criteria]
- **Task/PR**: [Notion link or PR number if applicable]
```

## Entries

(Add new entries below.)

### 2026-09-06 — Shared hooks that manage UI state should sync to URL params (Plan 226)

- **Context**: The `useMapDiscovery` hook managed map/list view toggle as pure React state. Three surfaces (homepage, results pages, search) all used it, but none reflected the view in the URL. Users couldn't share, deep-link, or use back/forward to preserve view state.
- **Learning**: When a shared hook manages UI state that's meaningful to the user (view mode, tab selection, filter state), make URL sync an opt-in capability on the hook itself, not a per-consumer concern. The pattern: add an optional `urlSync` config with `searchParams`, `pathname`, and `replace`. Read the param on mount, write on change. Strip the param when the value matches the default to keep URLs clean. This avoids duplicating URL logic in every consumer and keeps the hook backward-compatible (no urlSync = pure state).
- **Change to prevent repeat**: When adding a new shared hook that manages a user-visible toggle/filter, include an optional `urlSync` param from the start. Check: can a user reasonably want to share this state via URL? If yes, sync it.
- **Task/PR**: Plan 226, cr/226-mobile-url-routing

### 2026-09-07 — Orchestrator must fetch main before worktree creation

- **Context**: The orchestrator created worktrees from local `main` without fetching from origin first. When local `main` was stale, worktrees started from outdated commits, causing avoidable merge conflicts.
- **Learning**: Two issues in the orchestrator skill: (1) No `git fetch origin main` before `git worktree add`, so branches could start days behind remote. (2) The bug/hotfix flows had the orchestrator doing read-only investigation (grep, read files, build hypotheses) itself instead of dispatching a subagent, blurring the orchestrator/worker boundary.
- **Change to prevent repeat**:
  - Added `git fetch origin main && git branch -f main origin/main` as a required step before every worktree creation (Phase 0, session isolation, multi-ticket)
  - Added Rule 2 "Fetch before branching" to the Rules section
  - Moved bug diagnosis and hotfix reproduction into subagent dispatches
  - Added explicit "What the orchestrator DOES do directly" section to clarify the boundary
- **Task/PR**: Orchestrator skill refinement

### 2026-09-07 — Orchestrator is pure router: skill docs define the work, not the orchestrator

- **Context**: The orchestrator SKILL.md had grown to 438 lines, re-describing what each skill does internally (grilling rounds, diagnosis phases 1-6, TDD loops, code-review axes). This duplicated the skill definitions, created maintenance burden, and confused the orchestrator's actual role.
- **Learning**: The orchestrator's job is three things: setup (ID, fetch main, worktree, tracking file), classify (feature/bug/refactor/CR/hotfix/exploration), and dispatch (which subagent, which skills, in what order). Each flow is a table: phase, subagent type, skills, one-line description. The skills themselves define what happens inside each phase. When the orchestrator re-describes skill internals, it creates drift and bloat.
- **Change to prevent repeat**:
  - Rewrote the orchestrator from 438 lines to ~240 lines
  - Each flow is a pipeline diagram + dispatch table, not a prose description of skill phases
  - Orchestrator never invokes skills directly, never does investigation, never runs grilling
  - Skills define their own internals; the orchestrator just names them
- **Task/PR**: Orchestrator skill refinement

### 2026-09-19 — Import scripts must create child table rows, not just parent

- **Context**: `discover-wolt.ts` imported providers with address/coordinate data on the `providers` table but never created a `locations` row. Post multi-location migration, the UI reads from `locations`, so Wolt-imported providers appeared completely empty (no address, no map, no hours). The Wolt enrichment pipeline couldn't fix them because it fuzzy-matches by name + city, and these providers had empty `address_city`. A backfill ran against 1265 providers and fixed 0 locations because there was no data to copy from providers to locations (the root problem was missing location rows, not missing data on the providers table).
- **Learning**: When a migration moves data from a parent table to a child table (e.g., `providers.address_*` to `locations.address_*`), all import scripts that write to the parent must also write to the child table. The migration backfills existing rows once, but post-migration imports silently produce incomplete records. Verify all write paths, not just the read path. Also: when a provider already has a known source identifier (e.g., Wolt slug in `import_source_id`), the enrichment pipeline should use it directly instead of fuzzy-matching by name. The direct path is more reliable and avoids the city-dependency.
- **Change to prevent repeat**: (1) After any migration that moves columns to a child table, audit all INSERT scripts for the parent table. (2) When building a backfill, verify the data actually exists where you expect it (the backfill assumed data on `providers` needed copying to `locations`, but the data didn't exist on either table). (3) For providers with known source identifiers, prefer direct API lookup over fuzzy matching.
- **Task/PR**: PR #393 (fix/240-wolt-direct-slug-enrichment), Issue #392

### 2026-09-26 — Slot-prop mocks break "render the child" tests; capture element props instead

- **Context**: `ProvidersContent` tests mock `DiscoveryHeader` to null, so mocking `DiscoveryFilterBar` to capture props never fires — the bar is passed as the `filterBarSlot` element and never rendered. First test run failed with `props is null` on every chip assertion.
- **Learning**: When a component passes children via a slot prop (`filterBarSlot`) to a mocked wrapper, assert on the _element's props_ (`filterBarSlot.props`) captured inside the wrapper mock, not on the child component's own mock. Element props are readable without rendering.
- **Change to prevent repeat**: In `providers-content-location-chip.test.tsx` the `DiscoveryHeader` mock stores `filterBarSlot.props`; the same pattern applies to any `*Slot` prop in this codebase.
- **Task/PR**: cr/256-mobile-location-chip (Request 256)

### 2026-09-26 — Check whether the platform twin already enforces the rule, not just displays it

- **Context**: Request 256 proposed making mobile Near Me "visually supersede" the city "the way the desktop chip merges the two states". Desktop doesn't merge them visually at all: `SearchBar.syncUrl` enforces exclusivity structurally by routing to the section root and stripping the city (`SearchBar.tsx:219-241`).
- **Learning**: Before scoping a mobile/desktop parity change, verify whether the other platform _enforces_ the rule or merely _displays_ it. Verifying reframed this from "invent a cross-platform rule" into "close a mobile-only gap by extracting the rule desktop already had", which turned new logic into a shared-helper extraction (`buildNearMeUrl`). Corollary: when a request reverses a recorded decision (here plan 220 D7, "no need to display selected city label"), record the reversal as its own decision with rationale instead of letting it land silently.
- **Change to prevent repeat**: When a request describes the other platform's behaviour, read that platform's code before writing the spec. Cite it in the analysis doc.
- **Task/PR**: PR #417 (cr/256-mobile-location-chip), Request 256

### 2026-09-26 — Defer the URL write, not just the state write, when an action depends on an async permission outcome (Request 257)

- **Context**: Request 256 shipped a Near Me toggle that called `requestLocation()` and `router.push()` in the same tick, so the city was stripped from the path before the browser permission prompt resolved. Denying the prompt left the user on `/food` with their city gone and nothing gained. The fix defers the navigation to an effect watching `geolocation.status`.
- **Learning**: Three things worth carrying forward. (1) A status-watcher effect alone is not enough when the same status transition can be reached from a different entry path: `ProvidersContent` already auto-requests geolocation when `?near_me=1` arrives via URL from the desktop chip, so an unguarded "navigate on granted" effect fires there too and pushes the URL the user is already on — a duplicate history entry that breaks Back, not merely a wasted render. The deferred action needs a ref armed only by a real user gesture. (2) Deferring a state write turns any display gate reading the raw intent flag into a lie: keeping `nearMeActive` true on denial (so the permission-denied hint still renders) made the desktop chip read "Near me" while the URL and results were still Stuttgart. The honest flag already existed, `nearMeChipActive` = intent AND effective status; the gates had to move to it. When you defer, audit every consumer of the intent flag. (3) You cannot defer on an outcome you never request: `SearchBar` read `geolocation.status` and called `reset()` but never `requestLocation()`, so its status was permanently `idle` and its denied branch was dead code. A hook whose status you render but never drive is a signal that the surface is relying on some other component to do the asking.
- **Change to prevent repeat**: `src/features/search/hooks/useNearMeToggle.ts:91-129` had already solved the same problem for `/search` (request on toggle, write the URL from an effect once granted). It was not reused because it owns its own near-me/open-now/radius state and syncs via `router.replace`, but its shape is the pattern to copy. Grep for existing hooks before designing a deferred-permission flow.
- **Task/PR**: fix/257-near-me-denied-keeps-city, Request 257

### 2026-09-26 — `visibility: hidden` is not lazy: hidden React trees still hydrate, fetch, and burn the main thread

- **Context**: `/food/[city]` could not be scrolled for seconds on an iPhone SE PWA because `SearchMap` plus one ~8 KB `innerHTML` Leaflet marker per nationwide location mounted eagerly inside a `visibility: hidden` wrapper.
- **Learning**: Hiding pixels does not defer work. To make lazy loading safe for a shared hook, add an opt-in flag (`deferPinsUntilMapOpened`) rather than changing default behaviour — `RootPageContent` needs pins in list view, `ProvidersContent` does not. For heavy repeated SVG artwork, render it once as a `<symbol>` sprite and reference it with `<use>` from a shared `L.divIcon`; substring edits on the existing markup kept the geometry pixel-identical without re-deriving paths.
- **Change to prevent repeat**: When a page mounts a subtree that is only needed for a secondary view, gate mount on "was it ever shown" (`hasOpenedMap`) instead of toggling visibility, and scope `-webkit-overflow-scrolling` off universal selectors.
- **Task/PR**: fix/261-food-city-scroll-block (Plan 261)

### 2026-09-26 — Size a suspected cost against real row counts before calling it the root cause

- **Context**: Plan 261 was explained as "one ~8 KB marker per nationwide food location saturates the main thread". Querying UAT afterwards showed only **6** approved food locations with coordinates (774 food locations exist, but 801 are pending and 110 rejected), so the marker loop was ~6 iterations there, not hundreds. The real UAT costs were the Leaflet chunk, `L.map()` init with tile requests, and the universal `-webkit-overflow-scrolling` compositing rule.
- **Learning**: A code path that provably executes is not yet a sized cost. Reading the code tells you the loop runs; only the row count tells you whether it runs 6 times or 6000. Get the count before attributing magnitude, because the fix you prioritise depends on it.
- **Change to prevent repeat**: In the Analyst/Diagnose phase, when a hypothesis is "this is expensive because it happens per row", query the actual count for the reported environment and cite it. State per-item cost and item count separately.
- **Task/PR**: PR #420 (fix/261-food-city-scroll-block), Request 261

### 2026-09-26 — PostgREST streams every matching row unless you pass an explicit `.limit()`

- **Context**: `getMapLocations` selected every approved food location joined with providers and categories, with no limit and no ordering. Nothing in the call path bounded it; the map just rendered whatever came back.
- **Learning**: Supabase/PostgREST query builders have no implicit page size, so an unbounded `.select()` is a latent full-table read that grows silently with the data. Pair the cap with an `.order()` so truncation is deterministic, otherwise the returned subset shuffles between loads once the cap is hit.
- **Change to prevent repeat**: Any service function that returns a collection for rendering needs an explicit `.limit()` plus an `.order()`. Export the cap as a named constant (`MAP_LOCATIONS_LIMIT`) so tests can assert it and callers can see the ceiling.
- **Task/PR**: PR #420 (fix/261-food-city-scroll-block), Request 261

## Archive

Older entries live in:

- [2026-Q3](learnings-archive/2026-Q3.md)
- [2026-Q2](learnings-archive/2026-Q2.md)

## Archive

Older entries live in:

- [2026-Q3](learnings-archive/2026-Q3.md)
