---
Plan: 169
Title: "Alle Restaurants" Entry in Search Filter
Reviewer: Architectural Review
Date: 2026-06-13
Status: APPROVED (Rev 2)
---

# Architecture Critique: Plan 169 — "Alle Restaurants" Entry

## Review Scope

Evaluated against 7 criteria: architectural coherence, type safety, data flow, component design, extensibility, performance, testability.

## Summary

The plan is well-structured and follows the right patterns (sentinel type, `handleSearch` branching, localized changes). However, it contains **one blocking concern** that makes the entry invisible on fresh databases (zero categories) and **several medium concerns** around test strategy and edge case coverage.

---

## Findings

### [HIGH] Architectural Coherence — "Alle Restaurants" invisible when `items.length === 0`

**Location**: `src/features/search/components/WasCategoryResults.tsx:112-114`, `:123`

**Issue**: The "Alle Restaurants" entry is placed inside the `shouldShowPopular` block, which only renders when `!shouldShowRecent && items.length > 0`. Two failure modes:

1. **Early return** (line 112-114): When `items.length === 0`, `recentSearches.length === 0`, and `selectedWas` is null, the component returns `null` — the entire accordion content is blank.
2. **`shouldShowPopular` condition** (line 123): Even without the early return, `shouldShowPopular` is `false` when `items.length === 0`.

On a fresh database with no providers, `searchFoodCategories` returns an empty array. "Alle Restaurants" would be the only valid entry, but it never renders.

**Recommendation**: Decouple the "Alle Restaurants" entry from `shouldShowPopular`. Either:

- Add a separate condition like `shouldShowAllRestaurants = true` (no feature flag gating) that renders the entry independently, or
- Change `shouldShowPopular` to `!shouldShowRecent && (items.length > 0 || true)` — simplest fix, but semantically inaccurate.
- Add an additional early-return guard: `if (items.length === 0 && recentSearches.length === 0 && !selectedWas) return null` → must also check for the "all-restaurants" static entry.

The cleanest approach: render "Alle Restaurants" unconditionally in the empty-query branch, before the `shouldShowPopular` check. It should only be hidden when `shouldShowRecent` is true (recent searches take priority) or when it's already selected.

---

### [MEDIUM] Test Strategy — Regression test uses mirrored logic, not extracted function

**Location**: Step 6 of plan, `plan169-alle-restaurants-regression.test.ts`

**Issue**: The plan proposes testing "a pure function mirroring `handleSearch`" rather than extracting the actual URL-param logic from `handleSearch`. This creates a maintenance hazard:

- The mirror function lives in the test file and must be kept in sync with `handleSearch` manually.
- If `handleSearch` changes (e.g., a new param type is added), the mirror can drift silently.
- Tests pass even when the source logic is wrong.

**Recommendation**: Either:
- **Extract** the param-building logic into a pure utility (e.g., `buildSearchParams(selectedWas, selectedSection, ...)`) in a separate module, import it in both `handleSearch` and the regression test. This is the more robust approach.
- Or **integration-test** `handleSearch` directly by mocking `router.push` and asserting the URL string. Simpler but requires router mock setup.

---

### [MEDIUM] Test Coverage — Missing `toFoodRecentSearches` filter regression test

**Location**: `src/app/(public)/search/page.tsx:27-31`

**Issue**: The plan correctly adds `'all-restaurants'` to the `toFoodRecentSearches` filter, but no regression test verifies that `type: 'all-restaurants'` passes through the filter. Without this test, a future refactor could inadvertently drop `'all-restaurants'` from the filter, causing "Alle Restaurants" to disappear from recent searches on page reload.

**Recommendation**: Add a test case in the regression file:
- `toFoodRecentSearches keeps all-restaurants entries` — input with mixed types, assert `type: 'all-restaurants'` entries are retained.

---

### [MEDIUM] Component Design — No test for `items.length === 0` edge case

**Location**: Step 5 of plan

**Issue**: The plan adds 4 test cases for `WasCategoryResults`, but none cover the empty-items edge case. This would not catch the HIGH finding above.

**Recommendation**: Add a 5th test case: `renders "Alle Restaurants" even when items list is empty` — render with `items={[]}`, `recentSearches={[]}`, `selectedWas={null}`, assert "Alle Restaurants" row is visible.

---

### [LOW] Data Flow — Language-switch dedup edge case

**Location**: `src/app/(public)/search/page.tsx:442`

**Issue**: The recent-search dedup uses `r.label !== selection.label`. The label is the translated string (e.g., "Alle Restaurants" or "All Restaurants"). If a user selects "Alle Restaurants" in German, switches to English, and selects "All Restaurants," two separate entries appear in recent searches. The 3-item limit will eventually auto-clean duplicates, and the analysis acknowledges this. Acceptable for now.

---

### [LOW] Data Flow — Post-deployment localStorage flicker

**Location**: `src/app/(public)/search/page.tsx:138-154`

**Issue**: The cleanup effect runs once on mount. If a user has a persisted `all-restaurants` recent search before the deployment, the initial `toFoodRecentSearches` call (line 84) will filter it out (old code), and then the cleanup effect (line 148) will persist the filtered array. On next page load, the entry reappears (new code). This causes a one-time flicker where "Alle Restaurants" disappears from recent searches and reappears after one page reload. Negligible impact.

---

### [LOW] Type Safety — Catch-all `else` in `handleSearch`

**Location**: `src/app/(public)/search/page.tsx:470-471`

**Issue**: The final `else` in `handleSearch` catches `dish`, `service-type`, and `category` without ID. It's functionally correct but not type-exhaustive. A future type addition to `WasSelection.type` could silently fall through to `params.set('q', ...)` instead of causing a compile error. Minor — the current pattern is pragmatic.

---

### [INFO] Extensibility — Pattern scales cleanly

**Positive**: The sentinel type pattern (`'all-restaurants'`) extends naturally to future "all" entries:
- `WasServiceTypeResults` would get a similar sentinel (e.g., `'all-services'`)
- `handleSearch` branching continues with `else if` blocks
- The `selectedWas?.type !== 'all-restaurants'` guard pattern repeats

Note that `WasServiceTypeResults` uses a static `SERVICE_TYPES` array (never empty), so it doesn't share the `items.length === 0` vulnerability.

---

### [INFO] Performance — No concerns

Adding a single static `RowItem` with `LayoutGrid` icon. No new API calls, no database queries. The icon import adds ~0.5KB gzipped.

---

## Positive Observations

1. **Sentinel type choice** (`'all-restaurants'`): Correct decision. Reusing `category` with no ID would cause `?q=` param leaks via the fallthrough `else` branch. A dedicated type is clean and prevents this class of bug.

2. **Localized surface area**: Only 4 source files + 2 translation files + 2 test files. Minimal risk of unintended side effects.

3. **`selectedWas?.type !== 'all-restaurants'` guard**: Correctly avoids rendering a duplicate row when the entry is already selected. Follows the same pattern as the selection row / popular items separation.

4. **No backend changes**: The existing `'both'` search strategy already handles `null` category correctly. Good application of YAGNI.

---

## Verdict (Re-review of Revision 2)

**APPROVED** — all 4 findings from the original review are confirmed resolved in Revision 2 (2026-06-13).

| # | Finding | Status | Evidence in Rev 2 |
|---|---------|--------|-------------------|
| 1 | [HIGH] `items.length === 0` invisibility | RESOLVED | `shouldShowAllRestaurants` defined independently (no `items.length` dependency); row renders before `shouldShowPopular` block; early return guard includes `!shouldShowAllRestaurants` |
| 2 | [MEDIUM] Regression test mirrors logic | RESOLVED | `buildSearchParams` extracted to `src/lib/search-params.ts`; imported by both `handleSearch` and regression test |
| 3 | [MEDIUM] Missing `toFoodRecentSearches` test | RESOLVED | Test suite 2 in regression file: "keeps all-restaurants entries" + "filters unknown types" |
| 4 | [MEDIUM] No empty-items test case | RESOLVED | Test case 5: `items={[]}`, `recentSearches={[]}`, `selectedWas={null}`, asserts row visible + no crash |

### Recommended (non-blocking, carried over)

- Consider an explicit type-exhaustive switch in `handleSearch` so future type additions cause compile errors instead of silent `?q=` fallthrough.
- Document the language-switch dedup limitation in a code comment.
