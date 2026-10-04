---
ID: 217
Origin: 217
UUID: 6a2f9d4b
Status: Active
---

# Critique — Plan 217: Fix "Near me" on the Home List View

| Field | Value |
| --- | --- |
| Review target | [217-near-me-list-fix-plan.md](../planning/217-near-me-list-fix-plan.md) |
| Analysis reference | [217-near-me-bug-analysis.md](../analysis/217-near-me-bug-analysis.md) |
| Reviewer | Architect (pre-implementation gate) |
| Verdict | **APPROVED** |

## Changelog

| Date (UTC) | Agent | Action |
| --- | --- | --- |
| 2026-08-17 | Architect | Opened critique. Reviewed plan + analysis + source (RootPageContent, HomeListView, NearMeResultsGrid, ProviderCard, providers.ts, filterOpenNow.ts, distance.ts, useNearMeSearch, useNearMeToggle, migrations 120/122, plan212 test). Verdict APPROVED, 6 non-blocking findings. |

---

## Verdict

**APPROVED — no blocking concerns.** The plan is bugfix-scoped, architecturally sound, and
correctly resolves every open question carried forward from Analysis 217. All decisions are
`[RESOLVED]` or properly `[DEFERRED]` with a downstream owner + target. Duration estimates are
present. The value statement is concrete and measurable. Findings below are non-blocking
(MEDIUM/LOW) and do not require routing back to the Planner before implementation; the two MEDIUM
items should be recorded/acknowledged, not necessarily re-planned.

### Mandatory checks

| Check | Result |
| --- | --- |
| Value statement present, measurable | PASS ("reorder nearest-first + radius-filter ≤25 km + distance label") |
| Decision record — no `[OPEN]` decisions | PASS (D1–D6, D8 RESOLVED; D7 DEFERRED with owner/target) |
| Unresolved `OPEN QUESTION` markers | NONE (analysis open questions #1–#3 resolved by D1/D5/D7) |
| Duration estimates section | PASS (~2–2.75 days, M1–M5) |
| Architectural fit | PASS — reuses the proven `search_food_near_me` RPC + `filterOpenNow` + `ProviderCard distanceKm`; no new service, no schema change, no URL-state invention |

---

## Findings

### F-217-1 (MEDIUM, non-blocking) — Open-now status uses a different data source than the map/normal list

- **Location**: `useHomeNearMe` (open-now filter input) vs `RootPageContent.tsx:124` (pins filter input)
- **Description**: The near-me list derives open status from `locations.opening_hours` (the RPC
  returns `l.opening_hours` — migration 120/122, `FROM public.locations l ... l.opening_hours`),
  whereas the non-near-me `pins` and the map derive open status from `providers.opening_hours`
  (`RootPageContent.tsx:133`, `providers!inner(... opening_hours ...)`). These are two distinct
  JSONB columns (multi-location, migration 101). For a provider with per-location hours, "Open now"
  could report differently between the near-me list and the map/normal list on the same home
  surface.
- **Impact**: A user toggling map↔list (or open-now) with a multi-location provider could see a
  provider filtered "open" in one view and "closed" in the other. This is not new — the search page's
  near-me results already use `locations.opening_hours` — but the home page is the first surface
  where the two sources render side-by-side and are toggleable.
- **Recommendation**: Add one sentence to the plan acknowledging the data-source difference
  (`locations.opening_hours` for near-me vs `providers.opening_hours` for pins), and add a QA check
  for a known multi-location provider. No code change required; this is semantically defensible
  (near-me shows the *nearest location's* availability).

### F-217-2 (MEDIUM, non-blocking) — ProviderCard grid-mapping is now triplicated (design debt)

- **Location**: `HomeListView.tsx:58-98`, `NearMeResultsGrid.tsx:72-120`, and the new
  `HomeNearMeList` (planned)
- **Description**: Three near-identical "grid + wrap `ProviderCard` in a role=button clickable +
  map data → ProviderCard props" adapters now coexist, differing only in input shape (`MapPin` vs
  `NearMeFoodResult`) and whether bookmarks render. D4's rejection of `NearMeResultsGrid` reuse is
  **correct** (bookmark coupling would leak a non-existent affordance onto the home list), so the
  duplication is acceptable *for this bugfix* — but it is real and is now the third occurrence of
  the same card-mapping pattern.
- **Impact**: Future card changes (props, badges, a11y) must be replicated in three places, which
  is the classic DRY failure mode.
- **Recommendation**: Do **not** refactor in this plan (would be scope creep + regression risk).
  Register a design-debt entry for a shared `ProviderCardGrid`/card-adapter extraction (accepting
  either `MapPin` or `NearMeFoodResult`, with an optional bookmark slot) to be tackled opportunistically.

### F-217-3 (LOW) — Radius mismatch vs the search page (25 km vs 5 km default)

- **Location**: D2 (fixed 25 km) vs `useNearMeSearch.ts:44` (`radiusKm = 5` default)
- **Description**: Home "near me" uses a fixed 25 km radius; the search page's "near me" defaults to
  5 km (with a radius-pill selector). A user switching between the two surfaces will see a far larger
  result set on the home list.
- **Impact**: Surprise/UX inconsistency, not a defect. The RPC clamps at 25 km (migration 120/122,
  `LEAST(p_radius_km, 25)`), so the plan's "≤25 km" claim is accurate.
- **Recommendation**: Flag for QA/UAT awareness; confirm the 25 km product decision is intentional
  for the home surface (it is recorded as a confirmed product decision, so no re-plan needed).

### F-217-4 (LOW) — Empty-state i18n wording imprecise when open-now is off

- **Location**: `suchen.nearMe.emptyTitle` ("No **open** restaurants nearby") used for the near-me
  empty state regardless of the open-now chip
- **Description**: Already flagged in the plan's Behavior Specification note. Near-me active + open-now
  off + zero results within 25 km still reads "open restaurants".
- **Impact**: Cosmetic; matches the search page's existing behavior.
- **Recommendation**: Accept for this bugfix (as the plan proposes); track a follow-up i18n string if
  desired. No action required for approval.

### F-217-5 (LOW) — `[pre-fix FAILS / post-fix PASSES]` regression expression is conceptual, not runnable

- **Location**: `src/__tests__/regression/plan217-near-me-list.test.tsx` (planned, M3)
- **Description**: The core regression test mocks `useHomeNearMe` + `HomeNearMeList`, neither of which
  exists pre-fix. Unlike plan212 (whose mocks all existed pre-fix and which asserted a genuinely
  absent behavior), this test cannot literally run red against pre-fix code — it fails pre-fix only
  by module absence. The behavioral claim is still sound: pre-fix, granting near-me in list view
  rendered `HomeListView` unchanged; post-fix it switches to the near-me consumer.
- **Impact**: The regression proof is weaker than the repo's strictest convention, but the wiring
  assertion (near-me granted → `HomeNearMeList` renders instead of `HomeListView`) is the actual fix
  surface and is adequately layered with the M1 hook tests and M2 component tests.
- **Recommendation**: State in the test doc-comment that pre-fix failure is by module absence, and
  keep the behavioral assertion (assert `data-testid` of the mocked `HomeNearMeList` present when
  `isActive: true`) as the primary post-fix proof. No re-plan needed.

### F-217-6 (LOW) — Hook refetches on every map↔list re-entry, not "once per session"

- **Location**: `useHomeNearMe` effect keyed on `isActive` (`enabled && coords !== null`)
- **Description**: D3's rationale says "once-per-granted-session", but because `enabled = viewMode ===
  'list'`, toggling map→list→map→list flips `isActive` and re-fires the RPC each time. This is fine
  (cheap RPC, ≤100 rows, no stale-time need) but the plan's wording overstates the caching behavior.
- **Impact**: Minor redundant fetches on toggle; no correctness issue (cleanup flag guards stale
  responses).
- **Recommendation**: No change; the Implementer should ensure the effect-cleanup "cancelled" flag
  prevents a stale in-flight response from overwriting a newer one.

---

## Focus-area assessments (summary)

1. **`useHomeNearMe` effect hook vs React Query (D3)** — Correct call. The search hooks are
   URL-param-driven and section-scoped; the home page has no such URL state and must not add one.
   `RootPageContent` already loads `allRows` via a plain `useEffect`, and its standalone tests
   (plan212, layout-regression) render without a `QueryClientProvider` (confirmed: provider lives only
   in `ClientProviders.tsx`/`test-utils.tsx`). React Query would break those tests and add a caching
   layer with no need. YAGNI/KISS favor the small adapter. **Sound.**
2. **`HomeNearMeList` vs `NearMeResultsGrid` (D4)** — Rejection is correct (bookmark coupling). The
   resulting triplication is real but acceptable for a bugfix; register as design debt (F-217-2).
3. **Conditional-render ternary in `RootPageContent`** — The nested `isActive ? HomeNearMeList :
   HomeListView` is the minimal-diff, lowest-risk option. Extracting a "list-render adapter" for a
   single call site would be speculative indirection. The component is already branchy; if that grows
   further, a broader `HomeDiscoveryView` extraction belongs in a separate refactor plan, not here.
4. **State consistency** — `filterOpenNow` is the single tested source of truth on both paths
   (consistent). The one real drift is the open-now *data source* (`locations.opening_hours` vs
   `providers.opening_hours`), F-217-1 — pre-existing, non-blocking, needs a documentation sentence +
   QA check. Radius and empty-state wording are recorded as accepted product decisions.
5. **Test plan** — Adequate and correctly layered (hook unit / component / wiring regression). The
   plan212 mock additions are safe and additive (plan212 renders in map view, so `useHomeNearMe` is
   inactive regardless; the mocks keep it isolated). The layout-regression test should pass as-is
   (no new transitive deps beyond `ProviderCard`, already in the graph via `HomeListView`).
6. **Blocking gaps** — None identified. No schema change, no new service, no URL-state invention, no
   removal surface, and the RPC the plan reuses is verified live (Analysis F5) and clamped/ordered
   server-side (migrations 120/122).

## Design-debt registry note (for `system-architecture.md`)

- **DD (new)** — `ProviderCard` grid+card mapping duplicated across `HomeListView`,
  `NearMeResultsGrid`, and `HomeNearMeList` (post-217). Optimal: shared `ProviderCardGrid` adapter
  accepting `MapPin | NearMeFoodResult` with optional bookmark slot. Priority: Medium (address when
  touching provider card/search list code). Discovered 2026-08-17.
