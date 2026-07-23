---
ID: 196
Origin: 196
UUID: f2a6c9d4
Status: Active
---

# Implementation 196 — "Near Me + Open Now" Restaurant Search (Mobile-First)

| Field | Value |
| --- | --- |
| Plan Reference | [196-near-me-open-restaurants-search-plan.md](../planning/196-near-me-open-restaurants-search-plan.md) |
| Analysis Reference | [196-near-me-open-restaurants-search-analysis.md](../analysis/196-near-me-open-restaurants-search-analysis.md) |
| Critique Reference | [196-near-me-open-restaurants-search-critique.md](../critiques/196-near-me-open-restaurants-search-critique.md) — APPROVED WITH CONDITIONS (all folded in) |
| Architecture Reference | [196-near-me-open-restaurants-architecture-findings.md](../architecture/196-near-me-open-restaurants-architecture-findings.md) — APPROVED |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/282 |
| Execution Mode | Local (user-selected) |
| Memory | NO-MEMORY MODE (Flowbaby daemon reported no workspace folder throughout this chain) |

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-07-21 | Planner → Analyst → Critic → Architect → Implementer | Implement Plan 196 | All milestones (M2–M7) implemented with TDD; M6 baseline explicitly deferred (no DB credentials in this environment) |
| 2026-07-23 | User (product owner) → Implementer | "The chip should only appear on the search results page and not on the filter page." | Deviation: moved the "Near me" + "Open now" quick-filter chip row from `/search` (filter-building page) to `/providers` (results page). See Deviations section below. |

---

## Deviations from Plan (tracked, user-directed)

**Deviation 1 — Chip row placement moved from filter page to results page.**

- **Plan 196's M4 design decision** (as approved by the product owner during the design-review conversation) stated: *"'Near me' and 'Open now' are placed as a quick-filter chip row below the sticky `SectionSelector` tabs and above the accordion body"* on `/search` (the filter-building page).
- **Correction**: after seeing the prototype, the product owner determined the chips are result-refinement controls (like Google Maps / Uber Eats "Open now" filters) and should live on the **results page** (`/providers`), not the filter page. This is a direct, in-session correction from the user, not a Planner/Critic change — per Implementer constraints, the Plan 196 document's content was **not** modified (only Status-field edits are permitted); this deviation is tracked here instead.
- **Rationale accepted**: chips are a *refine-what-you're-looking-at* control, semantically distinct from the filter-building accordions (Wo/Was/Wer/Filter) that define *what to search for*. Placing them on the results page also matches the reference UX patterns (Google Maps, Uber Eats, Lieferando).
- **Risk/impact**: Low. No RPC, service, or open-status logic changed — only the ownership of the chip UI state moved from `search/page.tsx` to `ProvidersContent.tsx`, and the URL-building mechanism changed from "build params once at submit" to "sync params in-place via `router.replace`" (no navigation/reload). All previously-tested units (`NearMeOpenNowFilters`, `useGeolocation`, `useNearMeSearch`, `searchFoodNearMe`, `formatDistance`) were reused unchanged.
- **New unit introduced**: `useNearMeToggle` — owns chip on/off state + geolocation lifecycle on the results page and syncs `near_lat`/`near_lon`/`near_radius`/`open_now` into the URL via `router.replace`, always preserving existing params (`section`, `q`, etc.) and hydrating initial state from the URL on mount. Full TDD cycle applied (see TDD Compliance table).
- **Escalation level**: Minor (self-corrected with tests; no plan-level flaw, no QA/UAT impact beyond confirming the new placement).

---

## Implementation Summary

Delivered a "near me + open now" restaurant search on the public `/search` → `/providers` flow:

- **Backend**: new additive Postgres RPC `search_food_near_me` (migration 120) — nearest-location-per-provider haversine search against `locations`, server-side radius clamp (≤25 km) and hard result cap (≤100), coordinate range validation, `SECURITY INVOKER`. Existing `find_nearby_food_providers` (detail-page "related nearby" feature) is untouched.
- **Client primitives**: `useGeolocation` hook (idle/prompting/granted/denied/unavailable/timeout), `formatDistance` util, `searchFoodNearMe` service function.
- **UI**: a sticky "Near me" + "Open now" quick-filter chip row on **`/providers` (the search results page)** — corrected placement per direct product-owner feedback during implementation (see Deviations section); originally built on `/search`, moved after review. Radius pills (2/5/10 km) appear inline when "Near me" is active, plus a permission-denied fallback message. Chip state syncs into the URL via `router.replace` (no navigation), preserving all other existing query params.
- **Results consumption**: `useNearMeSearch` hook parses `near_lat`/`near_lon`/`near_radius`/`open_now` URL params on `/providers` (ProvidersContent) and renders distance-sorted, optionally open-now-filtered results via a new `NearMeResultsGrid`, reusing `ProviderCard` (extended with an optional `distanceKm` prop) so open/closed status always renders regardless of the toggle (Critic F5).
- **i18n**: new `suchen.nearMe.*` / `suchen.openNow.*` keys added to all 6 locales (en, de, ar, tr, ur, ps).

This delivers the plan's value statement: a mobile user in the evening can now tap "Near me" + "Open now" on `/search` and see distance-sorted, currently-open restaurants without manually checking each listing.

---

## Milestones Completed

- [x] M2 — Backend: `search_food_near_me` RPC + partial index (migration 120)
- [x] M3 — Client: `useGeolocation`, `formatDistance`, `searchFoodNearMe` service
- [x] M4 — Search UI integration: quick-filter chip row, radius pills, results wiring, distance labels, loading/empty/error states
- [x] M5 — Mobile permission UX + fallback (denied/unavailable/timeout → city search remains usable; ARIA `status`/`aria-pressed`/`aria-live`; verified via unit tests, not a live-device pass — see Outstanding Items)
- [~] M6 — Baseline & Measurements: **deferred** (no DB credentials/local stack in this environment — same gap flagged in Analysis 196 item #1)
- [x] M7 — Version & release artifacts: `package.json` → `0.15.0` (preliminary), `package-lock.json` realigned, `CHANGELOG.md` updated

---

## Files Modified

| Path | Changes | Lines |
| --- | --- | --- |
| `src/services/providers.ts` | Added `NearMeFoodResult` type + `searchFoodNearMe()` | +49 |
| `src/components/providers/ProviderCard.tsx` | Added optional `distanceKm` prop, rendered next to open-status label | +12 |
| `src/app/(public)/search/page.tsx` | **Net zero** — chip row + geolocation state added then removed after placement correction (see Deviations) |  |
| `src/app/(public)/providers/ProvidersContent.tsx` | Wired `useNearMeSearch` + `useNearMeToggle` + chip row (`NearMeOpenNowFilters`) + `NearMeResultsGrid` branch; disabled paginated query while near-me active | +40 |
| `src/translations/{en,de,ar,tr,ur,ps}.ts` | Added `suchen.nearMe.*` / `suchen.openNow.*` keys | +12 each |
| `package.json` | Version `0.14.0` → `0.15.0` | 1 |
| `package-lock.json` | Realigned to `0.15.0` | 2 |
| `CHANGELOG.md` | Added Plan 196 entry under `[Unreleased]` | +1 |
| `src/app/(public)/search/page.test.tsx` | Exposed `router.push`/`replace` as inspectable mocks (kept, harmless); removed the 4 obsolete near-me tests; added 1 regression-guard test asserting the chip row does NOT render on `/search` | net +5 |

## Files Created

| Path | Purpose |
| --- | --- |
| `supabase/migrations/120_plan_196_search_food_near_me.sql` | Additive RPC + partial index for near-me search |
| `src/__tests__/migrations/120-search-food-near-me-tdd.test.ts` | TDD SQL-content test for the migration |
| `src/utils/distance.ts` | `formatDistance()` km/m label formatting |
| `src/__tests__/utils/distance.test.ts` | Unit tests for `formatDistance` |
| `src/hooks/useGeolocation.ts` | Browser Geolocation API wrapper hook |
| `src/__tests__/hooks/useGeolocation.test.ts` | Unit tests for `useGeolocation` |
| `src/__tests__/services/providers-near-me.test.ts` | Unit tests for `searchFoodNearMe` service function |
| `src/features/search/components/NearMeOpenNowFilters.tsx` | Quick-filter chip row (near me + open now + radius pills) |
| `src/features/search/components/NearMeOpenNowFilters.test.tsx` | Unit tests for the chip row |
| `src/features/search/components/NearMeResultsGrid.tsx` | Renders near-me results (loading/empty/error/grid) |
| `src/features/search/components/NearMeResultsGrid.test.tsx` | Unit tests for the results grid |
| `src/features/search/hooks/useNearMeSearch.ts` | Consumes URL params, runs the RPC query, applies open-now filter |
| `src/__tests__/hooks/useNearMeSearch.test.tsx` | Unit tests for `useNearMeSearch` |
| `src/features/search/hooks/useNearMeToggle.ts` | Owns chip on/off state + geolocation lifecycle on the results page; syncs URL via `router.replace`, preserving existing params |
| `src/__tests__/hooks/useNearMeToggle.test.tsx` | Unit tests for `useNearMeToggle` (hydration, param preservation, toggle on/off, radius sync) |
| `src/__tests__/components/ProviderCard-distance.test.tsx` | Unit tests for the new `distanceKm` prop on `ProviderCard` |
| `docs/design/196-near-me-open-now-prototype.html` | Owner-approved HTML/CSS design prototype (mobile + desktop) |

---

## Regression Found & Fixed During Implementation

Adding `Clock` (lucide-react) to `NearMeOpenNowFilters` broke 3 pre-existing test files that hard-mock `lucide-react` with a fixed export list and don't include `Clock`. Root cause: those mocks enumerate every icon the `SearchPage` tree needs; adding a new icon anywhere in that tree requires updating them. Fixed by adding `Clock: NullIcon` (or equivalent) to each mock. Confirmed via `git stash` that these 3 files pass cleanly on `main` before this change and now pass again after the fix — no coincidental behavior change, purely a mock-completeness gap.

## Pre-Existing Failure (Not Introduced by This Plan)

`src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts` — 4 failing tests, confirmed via `git stash` to fail identically on unmodified `main` (unrelated to admin/menu/alcohol-check code, which this plan does not touch). Not fixed here — out of scope per `implementationDiscipline` (don't fix unrelated pre-existing issues without a plan mandate). Flagged for QA/Roadmap awareness.

---

## Code Quality Validation

- [x] TypeScript compiles: `npm run type-check` → 0 errors
- [x] Lint (full-repo): `npm run lint` → 0 errors in any Plan 196 file; 1 new warning introduced then fixed (unused eslint-disable directive in `useNearMeToggle.ts`); remaining warnings are pre-existing project-wide, unrelated to this plan
- [x] Tests: `npx vitest run` → 1842 passed, 24 skipped, 4 failed (pre-existing, unrelated — see above)
- [x] Build: `npm run build` → succeeds; `/search` (15 kB) and `/providers` routes compile cleanly

---

## Value Statement Validation

**Original**: *As a mobile user out in the evening looking for somewhere to eat, I want to search for restaurants that are near my current location and open right now, so that I can quickly decide where to go without manually checking each listing's address and opening hours.*

**Delivered**: The `/search` page (filter-building) remains focused on Wo/Was/Wer/Filter. The **`/providers` results page** now surfaces a "Near me" chip (requests device location, shows radius pills) and an "Open now" chip (client-side filter reusing the app's single tested open-status source of truth), both toggled in-place without navigation. Toggling syncs `near_lat`/`near_lon`/`near_radius`/`open_now` into the URL via `router.replace`, which `useNearMeSearch` consumes to render distance-sorted, optionally open-only results with per-card distance labels and always-visible open/closed status. Geolocation denial/unavailability/timeout falls back gracefully (chip shows a helper message; the rest of the results page remains usable).

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `search_food_near_me` (migration 120 SQL) | `120-search-food-near-me-tdd.test.ts` | ✅ Yes | ✅ Yes | `Migration 120 file not found.` | ✅ Yes |
| `formatDistance()` | `distance.test.ts` | ✅ Yes | ✅ Yes | Vite import-analysis: module not found | ✅ Yes |
| `useGeolocation()` | `useGeolocation.test.ts` | ✅ Yes | ✅ Yes | Vite import-analysis: module not found | ✅ Yes |
| `searchFoodNearMe()` | `providers-near-me.test.ts` | ✅ Yes | ✅ Yes | `TypeError: searchFoodNearMe is not a function` | ✅ Yes |
| `NearMeOpenNowFilters` | `NearMeOpenNowFilters.test.tsx` | ✅ Yes | ✅ Yes | Vite import-analysis: module not found | ✅ Yes |
| `ProviderCard` `distanceKm` prop | `ProviderCard-distance.test.tsx` | ✅ Yes | ✅ Yes | `getByText('400 m')` not found (2/3 red) | ✅ Yes |
| `NearMeResultsGrid` | `NearMeResultsGrid.test.tsx` | ✅ Yes | ✅ Yes | Vite import-analysis: module not found | ✅ Yes |
| `useNearMeSearch()` | `useNearMeSearch.test.tsx` | ✅ Yes | ✅ Yes | Vite import-analysis: module not found | ✅ Yes |
| `useNearMeToggle()` (deviation — results-page placement) | `useNearMeToggle.test.tsx` | ✅ Yes | ✅ Yes | Vite import-analysis: module not found | ✅ Yes |

All new functions/classes for this plan follow strict Red→Green TDD, including the one introduced by the mid-implementation deviation. No exceptions taken.

---

## Test Coverage

**Unit:**
- Migration SQL content (13 assertions covering transaction wrapping, signature, radius clamp, coordinate validation, nearest-location semantics, approved-food filter, distance ordering, index, grants, SECURITY INVOKER)
- `formatDistance` (5 tests: meters, km with/without decimal, null/negative handling)
- `useGeolocation` (6 tests: idle, granted, denied, timeout, unavailable, reset)
- `searchFoodNearMe` service (4 tests: RPC call shape, success, null-data, error propagation)
- `NearMeOpenNowFilters` (8 tests: rendering, toggling, aria-pressed, radius pills visibility/selection, permission-denied message)
- `NearMeResultsGrid` (4 tests: rendering, loading, empty, error+retry)
- `useNearMeSearch` (5 tests: mode gating by section+params, RPC call args, open-now filtering)
- `useNearMeToggle` (6 tests: default state, request-location-then-sync, param preservation, toggle-off removes params, open-now sync, radius sync)
- `ProviderCard` distance label (3 tests: km, meters, absent)

**Integration:**
- `/search` page: 1 regression-guard test confirming the chip row does NOT render there (post-correction); full existing suite (9 tests) still passing, confirming no regression to Wo/Was/Wer/Filter accordions
- `/providers` (`ProvidersContent`): near-me wiring verified indirectly through `useNearMeSearch`/`useNearMeToggle` unit tests (no dedicated `ProvidersContent` test file exists in this codebase — it has ~15 mocked dependencies; adding one was judged out of proportion to this change, per `implementationDiscipline`)

**Search/Filter Client-Interaction Trace (mandatory check — updated for the deviation):**
- URL lifecycle: `near_lat`/`near_lon`/`near_radius`/`open_now` are now set via `useNearMeToggle`'s `router.replace`, built from `new URLSearchParams(searchParams.toString())` (never an empty instance) — confirmed by `useNearMeToggle.test.tsx` asserting `section`/`q` survive a toggle. Consumption side (`useNearMeSearch`) unchanged and still tested.
- Inline action entity-type guard: N/A — read-only discovery surface, no per-row admin actions in the near-me results path.

---

## Test Execution Results

```
npx vitest run
Test Files  1 failed | 224 passed | 2 skipped (227)
     Tests  4 failed | 1839 passed | 24 skipped (1867)
```
The 4 failures are the pre-existing, unrelated `alcohol-conflict.test.ts` (confirmed via `git stash` to fail identically on `main`).

```
npm run type-check
(no output — 0 errors)

npm run lint
(0 errors in any Plan 196 file; pre-existing project-wide warnings/errors unrelated to this plan remain)

npm run build
(succeeds; /search 15 kB, /providers routes compiled)
```

---

## Outstanding Items

1. **M6 Baseline & Measurements — DEFERRED.** No local Supabase stack or DB credentials are available in this environment (`supabase status` empty, port 54322 refused, only `NEXT_PUBLIC_SUPABASE_URL` present). The exact coverage query is documented in Analysis 196 (queries A–D). **Owner: QA/UAT** — run the queries in a credentialed environment and record: (a) % of approved food providers with usable coordinates + opening hours, (b) RPC p95 latency on representative data, (c) multi-location prevalence. **Trigger:** before UAT sign-off, per plan's explicit allowed-deferral clause.
2. **Local device/browser verification not performed** — this is a mobile geolocation permission flow; unit tests mock `navigator.geolocation` exhaustively (granted/denied/unavailable/timeout), but a real-device permission-prompt pass has not been done in this session (no `npm run dev` browser pass was run). **Recommend**: QA/UAT perform a manual mobile pass at 320px width per M5 acceptance criteria.
3. **`find_nearby_food_providers` regression check** is by construction (new, separate RPC; existing function file untouched) — not re-run against a live DB in this session since no DB is available. Confirmed via source-code diff only.
4. Radius default in the UI (5 km) differs slightly from the original prototype's 2 km default — chosen as a reasonable middle ground per M5 "persist a sensible default radius"; not a blocking discrepancy, flagged for UAT feedback.
5. **No dedicated `ProvidersContent` test file exists** in this codebase (pre-existing gap, not introduced by this plan). The near-me wiring inside it (`useNearMeSearch` + `useNearMeToggle` + `NearMeOpenNowFilters` + `NearMeResultsGrid`) is fully unit-tested in isolation, but there is no end-to-end render test of `ProvidersContent` itself exercising the near-me branch together with its ~15 other dependencies (auth, admin, bookmarks, etc.). Recommend QA add a targeted integration test if `ProvidersContent` gains a test harness in the future.

## Next Steps

1. Code Reviewer / QA reviews this implementation doc + diff.
2. QA executes the concrete test plan in `agent-output/qa/196-*` (to be created by QA), including the deferred M6 baseline queries.
3. UAT performs the real-device mobile geolocation pass (outstanding item #2).
4. DevOps Stage 1 confirms the final semver (this doc's `0.15.0` bump is preliminary) and CHANGELOG date.
