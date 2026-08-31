---
ID: 102
Origin: 102
UUID: 9a4b1e6f
Status: Committed
---

# Plan 102 — Wo City Results Redesign: Was-parity UI + Popular Cities

| Field          | Value |
|---|---|
| Plan ID        | 102 |
| Target Release | v0.10.26 (patch, preliminary); confirm at DevOps Stage 1 |
| Epic Alignment | Epic 3 — Discovery & Search UX |
| Related Issues | https://github.com/abu-lina/uflow/issues/162 |
| Classification | Feature |
| Pipeline       | Abbreviated (client-side only, single page, no migrations) |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/162 |
| Created        | 2026-04-24T21:30Z |

---

## Changelog

| Date | Agent | Action | Detail |
|---|---|---|---|
| 2026-04-24T21:30Z | Planner | Created | Plan 102 authored; value statement approved by user |
| 2026-04-24T19:52Z | Critic | Updated | APPROVED — addressed F-MED-1 (M1 aggregation guidance), F-LOW-1 (v0.10.26 semver), F-LOW-2 (recentWoSearches type note) |
| 2026-04-24T19:55Z | Implementer | Updated | Status set to In Progress; starting M1 with TDD gate |
| 2026-04-24T22:20Z | Code Reviewer | Updated | Verdict APPROVED_WITH_COMMENTS; Status set to Code Review Approved; handoff to QA |
| 2026-04-24T22:40Z | QA | Updated | Verdict QA COMPLETE; Status set to QA Complete; all gates passed (vitest, lint, type-check, build); TDD compliance approved; handoff to UAT |
| 2026-04-24T22:55Z | UAT | Updated | Verdict APPROVED FOR RELEASE; Status set to UAT Approved; value statement fully delivered; all 6 UAT scenarios pass; DF-1 browser validation deferred; handoff to DevOps |
| 2026-04-24T23:05Z | Code Reviewer | Updated | Delta review for selected-area height adjustment (88px -> 72px) approved; handoff to QA |
| 2026-04-24T23:30Z | DevOps | Updated | Stage 1 committed for v0.10.26 — docs moved to closed/ |

---

## Value Statement and Business Objective

> As a user searching for food services on `/search`, I want the "Where" (Wo) accordion to look and behave like the redesigned "What" (Was) section — showing the most popular cities by provider count when idle, displaying city results in rich card rows with a location icon and provider count, supporting controlled open/close behavior, closing after I tap a city, and showing my selection in the collapsed header — so that the search experience feels cohesive and the Wo section is as discoverable and frictionless as Was.

**North-star metric**: Increase in searches submitted *with* a location filter (Wo selection rate ↑).

---

## Context and Background

### Current Wo state (after Plan 101)

After Plan 101 (which is rebased onto v0.10.25 but not yet released), the Wo accordion:

- Pre-fills from `localStorage.selectedCity` / `sessionStorage.selectedCity` via `useEffect`
- Uses a two-state model: `woInputQuery` (typing) + `selectedWoCity` (committed selection)
- Shows a plain `<p>` prompt when input is empty ("Suche nach deiner Stadt")
- Shows plain `<button>` text rows filtered from a flat city list (`fetchProviderCities()`)
- Closes the dropdown on city tap (Plan 101 behaviour)
- Shows selected city in accordion title ("Wo · Berlin")
- Runs in uncontrolled mode (ExpandSection uses internal state)

### What the redesigned Was section provides as a pattern model

The Was accordion (Plans 096–100, v0.10.25):

- **Controlled accordion** (`isOpen` + `onToggle` props) — closes programmatically on selection
- **Idle state**: shows top 3 categories by provider count with image/icon + name + count label
- **Recent searches**: persists last 3 selections to `localStorage['uflow:recent-was-searches']`
- **Selection row**: when a selection is made, accordion shows a highlighted selection card with × clear
- **Search active**: debounced RPC returns ranked food concept results rendered in a scrollable list
- **5-state rendering**: loading / error / idle (popular) / results / empty
- **Dedicated component**: `WasCategoryResults.tsx` + `WasMealResults.tsx`

### Gap to close

| Dimension | Was (current) | Wo (current Plan 101) | Target (Plan 102) |
|---|---|---|---|
| Idle content | Top 3 categories by count | Plain text prompt | Top N popular cities by provider count |
| Result rows | Icon + name + count | Plain text button | MapPin icon + city name + "N Anbieter" count |
| Recent searches | ✅ Last 3, persisted | ❌ None | ✅ Last 3, persisted |
| Selection row | ✅ Highlighted card + × | ❌ None (clear button in input) | ✅ Selection card + × |
| Controlled accordion | ✅ | ❌ Uncontrolled | ✅ |
| Dedicated component | ✅ WasCategoryResults | ❌ Inline JSX | ✅ WoCityResults.tsx |
| Data with counts | ✅ RPC returns count | ❌ fetchProviderCities() = names only | ✅ New service function with city + count |

### Key source files

| File | Relevance |
|---|---|
| `src/app/(public)/search/page.tsx` | SearchPageContent — Wo section to refactor |
| `src/features/search/components/WasCategoryResults.tsx` | Pattern model for WoCityResults |
| `src/features/search/components/WasMealResults.tsx` | Pattern model for results list |
| `src/services/providers.ts` | `fetchProviderCities()` — replace with count-aware function |
| `src/translations/de.ts` (+ ar/en/ps/tr/ur) | i18n keys; Wo section is sparse, Was section is the model |

---

## Decision Record

| ID | Decision | Status |
|---|---|---|
| D1 | **Popular cities data source** — `fetchProviderCities()` returns names only (no counts). A new service function `fetchPopularCities(limit)` using GROUP BY `address_city` ORDER BY count DESC covers providers + community_services, matching the existing dual-source pattern in `fetchProviderCities`. No new migration required. | `[RESOLVED]` — New service function in `providers.ts`; no new table/RPC needed |
| D2 | **Component location** — New `WoCityResults.tsx` placed in `src/features/search/components/` following existing `WasCategoryResults.tsx` co-location | `[RESOLVED]` |
| D3 | **State retained from Plan 101** — `woInputQuery` + `selectedWoCity` two-state model is kept. Plan 102 adds `woOpen` controlled state, popular city data, and recent Wo searches. No naming changes. | `[RESOLVED]` |
| D4 | **Recent city searches** — Persist to `localStorage['uflow:recent-wo-searches']` (max 3, deduplicated by city name), mirroring `uflow:recent-was-searches` pattern | `[RESOLVED]` |
| D5 | **Provider count label** — Use existing `suchen.was.providerCount` key shape as model; add `suchen.wo.providerCount` i18n key. All 6 locales must be updated. | `[RESOLVED]` |
| D6 | **EmptyCityCard retained** — The existing `EmptyCityCard` (for valid cities with no providers) is preserved; WoCityResults renders it when city is recognised but has no listings | `[RESOLVED]` |

---

## Assumptions

1. The Supabase `providers` and `community_services` tables remain the source of truth for city-level provider counts (no new tables required).
2. Popular cities query returns at most 5 entries for idle display (configurable constant); implementer chooses limit.
3. `fetchPopularCities` is a client-side Supabase query (not a Postgres RPC), consistent with `fetchProviderCities`. If performance proves an issue at scale, an RPC migration can be added later.
4. All 6 locales (de, en, ar, ur, tr, ps) require i18n key additions — implementer mirrors the Was section key set.
5. No design system token changes; existing `bg-background-selection`, `text-text-muted`, `rounded-xl`, `shadow-sm` tokens are reused.
6. `checkCityExists` and `EmptyCityCard` are unchanged.

---

## Milestones

### M1 — `fetchPopularCities` service function

**Objective**: Add a new exported function to `src/services/providers.ts` that returns cities sorted by provider count descending (merged from providers + community_services).

**Return shape** (illustrative — ILLUSTRATIVE ONLY):
```
Array<{ city: string; provider_count: number }>
```

**Implementation guidance**: Aggregate city counts client-side after fetching `address_city` from both tables (matching the dual-source fetch pattern in `fetchProviderCities`). If a Postgres aggregate function is preferred for performance at scale, document the tradeoff in the implementation doc — but client-side aggregation is the expected default.

**Acceptance Criteria**:
- [ ] Function accepts an optional `limit` parameter (default 5)
- [ ] Returns `city` + `provider_count` merged from both `providers` and `community_services` (approved only)
- [ ] Sorted by `provider_count DESC`, then city name `ASC` as tiebreaker
- [ ] Handles network errors gracefully (returns empty array, logs error)
- [ ] Type-safe return type exported alongside function

**Dependencies**: None (extends existing providers.ts pattern)

---

### M2 — `WoCityResults` component

**Objective**: Extract the Wo city list into a dedicated component at `src/features/search/components/WoCityResults.tsx`, following the `WasCategoryResults` structure and rendering 5 states.

**States**:
1. **Loading** — spinner/text while cities or popular list loads
2. **Error** — error message if service call fails
3. **Idle / popular** (empty query) — shows selected city card (if any) + "ZULETZT GESUCHT" recent searches + "BELIEBT" popular cities
4. **Results** (query ≥ 2 chars) — filtered city rows from `woInputQuery` typed search
5. **Empty** — no matches found for typed query, with `EmptyCityCard` or not-recognised message

**Acceptance Criteria**:
- [ ] Component accepts: `popularCities`, `recentSearches`, `selectedCity`, `filteredCities`, `isLoading`, `isError`, `query`, `onSelect`, `onClearSelection`, `t`, `userEmail`
- [ ] Idle state: renders "BELIEBT" section with top N popular cities (MapPin icon + city name + provider count)
- [ ] Recent searches: renders "ZULETZT GESUCHT" section for last 3 city selections
- [ ] Selection row: highlights selected city with `bg-background-selection` + × clear button
- [ ] Results state: renders filtered city rows matching `woInputQuery`
- [ ] All rows use `MapPin` icon slot + city name + count label (mirroring Was category row structure)
- [ ] `userEmail` prop passed through to `EmptyCityCard` for "Notify me" flow
- [ ] Accessible: `aria-label` on all buttons, `role="status"` on error messages

---

### M3 — Controlled accordion + page integration

**Objective**: Refactor the Wo accordion in `SearchPageContent` to use controlled open/close mode (like Was), wire up `WoCityResults`, add popular cities state, and persist recent city selections.

**New state in SearchPageContent**:
- `woOpen: boolean` (initially `false`, set to `true` when user opens)
- `popularCities: Array<{ city: string; provider_count: number }>` (loaded on mount)
- `isLoadingPopularCities: boolean`
- `isErrorPopularCities: boolean`
- `recentWoSearches: Array<{ city: string }>` (read from localStorage on mount) — intentionally simpler than `WasSelection`; a city name string is sufficient, do not reuse `WasSelection` type

**Acceptance Criteria**:
- [ ] `fetchPopularCities()` called on mount (alongside existing `fetchProviderCities`)
- [ ] Wo `ExpandSection` uses `isOpen={woOpen}` + `onToggle={setWoOpen}` (controlled mode)
- [ ] On city selection: `selectedWoCity` set, `woInputQuery` set, `woOpen` set to `false`, recent searches updated in localStorage
- [ ] Recent searches persisted to `localStorage['uflow:recent-wo-searches']` (max 3, deduplicated)
- [ ] `WoCityResults` replaces the inline city list JSX in the Wo accordion body
- [ ] Accordion title remains dynamic: `"Wo · {city}"` when city selected, `"Wo: In meiner Nähe"` otherwise (existing Plan 101 behaviour)
- [ ] Clear-all resets: `woOpen → false`, `woInputQuery → ''`, `selectedWoCity → null` (existing behaviour extended)
- [ ] Onboarding hydration (Plan 101 `useEffect`) unchanged

---

### M4 — i18n keys (all 6 locales)

**Objective**: Add a `suchen.wo` key namespace to all 6 locale files, mirroring the `suchen.was` structure for Wo-specific strings.

**New keys required** (all 6 locales: de, en, ar, ur, tr, ps):
```
suchen.wo.loading
suchen.wo.searchError
suchen.wo.providerCount      ("{{count}} Anbieter" in DE)
suchen.wo.popularLabel       ("BELIEBT")
suchen.wo.recentLabel        ("ZULETZT GESUCHT")
suchen.wo.selectionLabel     ("AUSWAHL")
suchen.wo.selectedWhere      ("Wo: {{city}}")
suchen.wo.removeSelection    ("Auswahl entfernen")
suchen.wo.noResults          ("Keine Städte gefunden")
```

**Acceptance Criteria**:
- [ ] All 9 keys present in all 6 locale files
- [ ] German translations are idiomatic (not machine-translated); other locales may use reasonable equivalents
- [ ] Existing `suchen.citySearchPlaceholder`, `suchen.searchCityPrompt`, `suchen.cityNotRecognized`, `suchen.noCitiesFound` keys unchanged

---

### M5 — Tests

**Objective**: Add regression tests for new WoCityResults behaviour (popular cities idle state, recent searches display, selection close).

**Acceptance Criteria**:
- [ ] `WoCityResults.test.tsx` or additions to `page.test.tsx` covering:
  - Idle state: popular cities rendered when query is empty
  - Recent searches: rendered when available
  - Selection: city tap closes accordion, selection row appears
  - Clear selection: × button clears city and reverts header
- [ ] Full test suite remains green (no regressions)

---

### M6 — Version and release artifacts

**Objective**: Bump version to next available patch and update CHANGELOG.

**Acceptance Criteria**:
- [ ] `package.json` version updated to confirmed next patch
- [ ] `CHANGELOG.md` entry added describing Plan 102 deliverables
- [ ] README updated if needed

---

## Milestone Dependencies

```mermaid
graph LR
  M1[M1: fetchPopularCities service] --> M2[M2: WoCityResults component]
  M2 --> M3[M3: Controlled accordion + page wiring]
  M3 --> M4[M4: i18n keys — all locales]
  M3 --> M5[M5: Tests]
  M4 --> M5
  M5 --> M6[M6: Version + CHANGELOG]
```

**Sequencing rule**: M2 must not begin until M1 is stable (type is exported). M3 blocks on M2. M4 and M5 run in parallel after M3. M6 is final gate.

---

## Out of Scope

- Wer / Filter accordion (separate plan)
- Cross-surface `SearchBar.tsx` on `/providers` and `/saved` (tracked in open-actions F-LOW-3)
- Map/geolocation-based city detection
- Postgres RPC for popular cities (client-side GROUP BY is sufficient at current scale; tracked as future optimisation if DAU > 5,000)
- `SearchProvider` context persistence across pages
- Was section changes (complete)

---

## Testing Strategy

**Unit tests** (primary):
- `WoCityResults.tsx`: all 5 rendering states testable in isolation with mocked props
- `fetchPopularCities`: mock Supabase client; verify sort order and merge logic

**Regression tests** (secondary):
- Page-level: onboarding hydration still works (Plan 101 behaviour preserved)
- Page-level: clear-all still resets all Wo states
- Full test suite: no regressions in existing 1071 tests

**Manual browser checks** (UAT):
- Popular cities render on idle open of Wo accordion
- City tap closes accordion and updates header
- Recent searches appear on next open
- Mobile viewport: rows are tappable at 320px
- Clear × resets correctly on desktop and mobile

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `fetchPopularCities` GROUP BY is slow on large city set | Low (city count < 50 for now) | Low | Add count limit; can later migrate to RPC |
| i18n key additions miss a locale | Medium | Medium | Implementer must touch all 6 files; type-check will surface unused keys |
| Controlled accordion causes layout jump on auto-close | Low | Low | Use existing `ExpandSection` CSS transition; no change needed |
| Plan 101 hydration effect conflicts with new popular cities state | Low | Low | Both are independent `useEffect` hooks; no shared state |

---

## Shared Results Actionability

N/A — Wo city selection is a single entity type (city name string); no mixed-entity action surface.

---

## Duration Estimates

| Phase | Estimate | Uncertainty Drivers |
|---|---|---|
| Implementation (M1–M5) | 2–4 hours | WoCityResults complexity; i18n breadth (6 locales) |
| QA (automated + manual) | 1–2 hours | Test writing for 5-state component |
| UAT | 30 min | Browser-only verification |
| DevOps | 30 min | Standard patch release |

**Total**: ~4–7 hours. No analysis phase required (pattern is established in Was section).

---

## Release Strategy

**Standalone** — no other known active plans targeting this release version. Plan 101 (UAT Approved, pending DevOps) targets the same worktree session; DevOps may bundle both into a single release if committed together, or release sequentially. The Planner recommends bundling with Plan 101 since both are Wo-section improvements in the same file.

**Bundling note**: If Plan 101 and Plan 102 are bundled into a single release, the target version remains next available patch after v0.10.25 (one increment total, not two).

---

## Implementation Pointers

> The following are contextual pointers for the Implementer, not prescriptive code.

- **`fetchPopularCities`**: The dual-source merge pattern from `fetchProviderCities` is the exact model. Add a GROUP BY equivalent using Supabase's `.select('address_city')` and aggregate in JS, or use a raw query with `.rpc()` if a helper already exists. Deduplication and count merging should match the `fetchProviderCities` approach — merge both sources, then count by city.
- **`WoCityResults`**: The `WasCategoryResults.tsx` internal structure (CategoryRow sub-component, 3-section layout for idle, scrollable results for active query) is the direct pattern to follow. Replace category-specific props with city-specific ones.
- **Controlled Wo accordion**: `ExpandSection` already supports `isOpen` + `onToggle`. Mirroring the Was accordion's `wasOpen` + `setWasOpen` pattern exactly is the path of least resistance.
- **i18n**: Add a `wo:` sub-object under `suchen:` in all 6 locale files, mirroring the `was:` sub-object structure exactly. Keys are listed in M4.

---

## Validation Gates

Before handoff to Critic:
- [ ] Plan reviewed for WHAT/WHY clarity (no implementation code beyond illustrative pointers)
- [ ] All 6 decisions are `[RESOLVED]`
- [ ] No `OPEN QUESTION` items remain
- [ ] Duration estimate included
- [ ] Release strategy documented
- [ ] Milestone dependency graph present
