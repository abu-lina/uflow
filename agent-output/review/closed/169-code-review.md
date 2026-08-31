---
ID: 169
Origin: 169
Status: Committed
---

# Code Review: Plan 169 — "Alle Restaurants" Entry

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-06-13 | DevOps | Document closed | Status: Committed |

**Verdict: APPROVED** — with minor non-blocking observations below.

---

## 1. Correctness — matches plan (all 6 steps)

| Step | Status | Notes |
|------|--------|-------|
| **1. Translation keys** | ✅ | `allRestaurants: "Alle Restaurants"` (de.ts:202), `allRestaurants: "All Restaurants"` (en.ts:202) |
| **2. `'all-restaurants'` type + `toFoodRecentSearches`** | ✅ | `WasSelection.type` union updated (line 13). `toFoodRecentSearches` extracted to `search-params.ts:18-21` with `'all-restaurants'` in filter. Page imports and uses it (lines 79, 141) |
| **3. Decoupled rendering** | ✅ | `shouldShowAllRestaurants` independent of `shouldShowPopular` (line 113). Early return guard updated (line 115). Row renders before POPULAR block (lines 208-229). Selection icon handled (lines 178-181) |
| **4. `buildSearchParams` utility** | ✅ | New `src/lib/search-params.ts` with pure function. Imported by `handleSearch` (page.tsx:22, 463) |
| **5. Component tests (5 cases)** | ✅ | All 5 present in `WasCategoryResults.test.tsx:219-337` |
| **6. Regression tests (5 cases)** | ✅ | All 5 present in `plan169-alle-restaurants-regression.test.ts` |

## 2. Type safety

No issues. No `any`, no implicit anys. All function signatures properly typed:
- `buildSearchParams(selectedWas: WasSelection | null, selectedSection: string): URLSearchParams`
- `toFoodRecentSearches(entries: WasSelection[]): WasSelection[]`
- `shouldShowAllRestaurants` typed as `boolean` via `const`

The `as unknown as WasSelection` cast in the regression "filters unknown types" test is acceptable — it tests behavior with runtime data that deviates from the type.

## 3. Edge cases — all correct

| Case | Behavior | Correct? |
|------|----------|----------|
| Empty `items` (zero providers) | `shouldShowAllRestaurants` doesn't depend on `items.length` — row renders | ✅ |
| Recent searches exist | `shouldShowAllRestaurants` checks `!shouldShowRecent` — row hidden | ✅ |
| Already selected `all-restaurants` | `selectedWas?.type !== 'all-restaurants'` — row hidden | ✅ |
| Subtitle for `all-restaurants` type | Falls through to `: null` in ternary (line 189 vs 193) — no subtitle rendered | ✅ |
| Non-food section | `WasCategoryResults` only rendered for food in `page.tsx:630-640` — no cross-section leakage | ✅ |

## 4. Test coverage

All 10 TDD compliance entries present and accounted for — no gaps.

### WasCategoryResults.test.tsx

| Test name | Line | Present |
|-----------|------|---------|
| renders "Alle Restaurants" as first item | 224 | ✅ |
| calls onSelect with all-restaurants type when clicked | 248 | ✅ |
| does not render "Alle Restaurants" when recent searches exist | 274 | ✅ |
| renders "Alle Restaurants" selection with LayoutGrid icon | 298 | ✅ |
| renders "Alle Restaurants" even when items list is empty | 318 | ✅ |

### plan169-alle-restaurants-regression.test.ts

| Test name | Line | Present |
|-----------|------|---------|
| all-restaurants sets no category or q param | 6 | ✅ |
| category with categoryId sets category param | 17 | ✅ |
| dish type sets q param with label | 28 | ✅ |
| keeps all-restaurants entries in recent searches | 40 | ✅ |
| filters unknown types | 51 | ✅ |

## 5. Regression risk — LOW

Existing flows preserved:

- **Category selection**: `buildSearchParams` `type: 'category' && categoryId` branch unchanged (`page.tsx` previously had the same logic inline)
- **Dish/service-type selection**: Falls through to `params.set('q', ...)` — unchanged
- **`null` selectedWas**: Guarded at `handleSearch` line 462 before `buildSearchParams` is called
- **`section` param**: Was set inline before, now inside `buildSearchParams` — same result
- **`toFoodRecentSearches` filter**: Previously `category || dish`, now `category || dish || all-restaurants` — superset of old behavior, no removal
- **Recent row rendering**: `recent.type === 'category' ? <IconSlot /> : null` at line 264 — `'all-restaurants'` recent rows get no icon in recent section, which is acceptable (they show `LayoutGrid` only in the POPULAR/selection row)

## 6. Code quality — GOOD

- Clean extraction of `buildSearchParams` and `toFoodRecentSearches` into pure utility module — no side effects, testable without mocking
- `shouldShowAllRestaurants` properly decoupled from `shouldShowPopular`
- No dead code
- No performance concerns (tiny arrays, one-time filters)

## 7. Imports — all correct

| File | Import | Status |
|------|--------|--------|
| `WasCategoryResults.tsx` | `LayoutGrid` from `lucide-react` | ✅ Used (lines 180, 217) |
| `page.tsx` | `buildSearchParams` from `@/lib/search-params` | ✅ Used (line 463) |
| `page.tsx` | `toFoodRecentSearches` from `@/lib/search-params` | ✅ Used (lines 79, 141) |
| `search-params.ts` | `WasSelection` from `@/features/search/components/WasCategoryResults` | ✅ Used |
| Test files | All imported modules | ✅ Used |

No unused imports found.

---

## Non-blocking observations

1. **Test name mismatch**: `renders "Alle Restaurants" as first item in POPULAR section` (line 224) — "Alle Restaurants" is not actually in the POPULAR section; it's rendered decoupled before it. The test assertions are correct, but the name could mislead future readers. Consider renaming to e.g., `renders "Alle Restaurants" row before POPULAR section`.

2. **`service-type` in `toFoodRecentSearches`**: The `toFoodRecentSearches` function filters `entry.type === 'category' || entry.type === 'dish' || entry.type === 'all-restaurants'`. `'service-type'` entries are silently dropped. This is correct behavior (food-only recent searches), but worth noting since the function name doesn't make the exclusion explicit. If there's ever a plan to show service-types in food recent searches, this filter would need updating.

Both observations are minor and non-blocking.
