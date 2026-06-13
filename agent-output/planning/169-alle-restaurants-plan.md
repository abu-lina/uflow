---
ID: 169
Origin: 169
UUID: c7d5a3e9
Status: Active
Revision: 2
---

# Plan 169: "Alle Restaurants" Entry in Search Filter (Revised)

## Value Statement

Add an "Alle Restaurants" entry as the first item in the POPULAR section of the "Was?" accordion. When clicked, navigates to search results showing all restaurants (no category filter). Uses a dedicated `'all-restaurants'` sentinel type in `WasSelection` to distinguish from category/dish selections and avoid accidental `?q=` param leaks.

## Changes from Revision 1

| # | Change | Source |
|---|--------|--------|
| 1 | Decoupled "Alle Restaurants" from `shouldShowPopular` — renders independently with its own `shouldShowAllRestaurants` condition | Architecture critique [HIGH] |
| 2 | Replaced mirrored pure function in regression test with extracted `buildSearchParams` utility | Architecture critique [MEDIUM] |
| 3 | Added `toFoodRecentSearches` regression test for `'all-restaurants'` type | Architecture critique [MEDIUM] |
| 4 | Added empty-items test case (5th test) for `WasCategoryResults.test.tsx` | Architecture critique [MEDIUM] |

## Implementation Steps

### Step 1: Add translation keys (de + en)

**Files**: `src/translations/de.ts` (line 201), `src/translations/en.ts` (line 201)

**Change**: Add `allRestaurants: "Alle Restaurants"` to de.ts and `allRestaurants: "All Restaurants"` to en.ts under `suchen.was.*`, adjacent to `showAllDishes`.

**Rationale**: Static label needed before the UI references it.

**Dependencies**: None (independent).

---

### Step 2: Add `'all-restaurants'` type to `WasSelection` union + update `toFoodRecentSearches`

**File**: `src/features/search/components/WasCategoryResults.tsx` (line 13)

**Change**:
```
-  type: 'category' | 'dish' | 'service-type';
+  type: 'category' | 'dish' | 'service-type' | 'all-restaurants';
```

Also update `toFoodRecentSearches` in `src/app/(public)/search/page.tsx` (line 29) to include `'all-restaurants'` so it's not filtered out of recent searches:

```
-    .filter((entry) => entry.type === 'category' || entry.type === 'dish')
+    .filter((entry) => entry.type === 'category' || entry.type === 'dish' || entry.type === 'all-restaurants')
```

**Rationale**: The sentinel type prevents accidental `?q=` param setting in `handleSearch`. The `toFoodRecentSearches` filter must include the new type so "Alle Restaurants" persists in recent searches.

**Dependencies**: Step 1 (translation keys ready).

---

### Step 3: Import `LayoutGrid` and render "Alle Restaurants" decoupled from `shouldShowPopular`

**File**: `src/features/search/components/WasCategoryResults.tsx`

**Changes**:

1. Add `LayoutGrid` to imports (line 5):
```
- import { UtensilsCrossed, X } from 'lucide-react';
+ import { LayoutGrid, UtensilsCrossed, X } from 'lucide-react';
```

2. **Add `shouldShowAllRestaurants` condition** before the existing `shouldShowRecent` and `shouldShowPopular` definitions:
```typescript
const shouldShowRecent = recentSearches.length > 0;
const shouldShowAllRestaurants = !shouldShowRecent && selectedWas?.type !== 'all-restaurants';
const shouldShowPopular = !shouldShowRecent && items.length > 0;
```

3. **Replace the early return guard** (line 112-114, returns `null` when `items.length === 0 && recentSearches.length === 0 && !selectedWas`):

Old:
```tsx
if (items.length === 0 && recentSearches.length === 0 && !selectedWas) return null;
```

New:
```tsx
if (items.length === 0 && recentSearches.length === 0 && !selectedWas && !shouldShowAllRestaurants) return null;
```

This ensures the component doesn't early-return when "Alle Restaurants" is the only thing to render.

4. **Render "Alle Restaurants" row** in the empty-query branch, **before** the `shouldShowPopular` block (not inside it). Position it after the selection row:

```tsx
{/* "Alle Restaurants" — always shown unless recent searches exist or already selected */}
{shouldShowAllRestaurants && (
  <RowItem
    selectable
    ariaLabel={t('suchen.was.allRestaurants')}
    className="transition-colors hover:bg-neutral-muted"
    icon={
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
        <LayoutGrid aria-hidden="true" className="h-5 w-5" />
      </div>
    }
    title={t('suchen.was.allRestaurants')}
    onSelect={() =>
      onSelect({
        label: t('suchen.was.allRestaurants'),
        type: 'all-restaurants',
      })
    }
  />
)}
```

5. Add `'all-restaurants'` branch in the selection display. In the active selection row (line 167), extend the icon condition:
```tsx
                  {selectedWas.type === 'category' ? (
                    <IconSlot ... />
+                  ) : selectedWas.type === 'all-restaurants' ? (
+                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
+                      <LayoutGrid aria-hidden="true" className="h-5 w-5" />
+                    </div>
                  ) : null}
```

And in the subtitle area (line 181-187), add handling for `'all-restaurants'`:
```tsx
                    {selectedWas.type === 'dish' ? (
                      <p className="truncate font-inter text-sm text-text-muted">{t('suchen.was.dishLabel')}</p>
+                    ) : selectedWas.type === 'all-restaurants' ? null :
                    ) : selectedWas.type === 'category' && ...}
```

**Rationale**: Decoupling from `shouldShowPopular` ensures "Alle Restaurants" renders even when `items.length === 0` (fresh database with no providers). The `shouldShowAllRestaurants` guard independently controls visibility based on recent searches and selection state, not on API results.

**Dependencies**: Step 2 (type union updated).

---

### Step 4: Extract `buildSearchParams` utility and update `handleSearch`

**New file**: `src/lib/search-params.ts` (pure utility module)

**Create**:
```typescript
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

export function buildSearchParams(
  selectedWas: WasSelection | null,
  selectedSection: string = 'food'
): URLSearchParams {
  const params = new URLSearchParams({ section: selectedSection });
  if (selectedWas?.type === 'all-restaurants') {
    // No category, no query — show all restaurants
  } else if (selectedWas?.type === 'category' && selectedWas.categoryId) {
    params.set('category', selectedWas.categoryId);
  } else if (selectedWas) {
    params.set('q', selectedWas.label);
  }
  return params;
}
```

**File**: `src/app/(public)/search/page.tsx` (lines 465-486)

**Change** in `handleSearch`:
```tsx
import { buildSearchParams } from '@/lib/search-params';

const handleSearch = () => {
  if (!selectedWas) return;
  const params = buildSearchParams(selectedWas, selectedSection);
  // ... adds filters, location, wer (unchanged) ...
  router.push(`${getResultsPathForSection(selectedSection)}?${params.toString()}`);
};
```

**Rationale**: Extracting URL-param logic into a pure utility function makes it independently testable without mocking router or component state. Both `handleSearch` and the regression test import from the single source of truth — no mirrored copy to drift.

**Dependencies**: Step 2 (type union updated).

---

### Step 5: Add tests to `WasCategoryResults.test.tsx` (5 test cases)

**File**: `src/features/search/components/WasCategoryResults.test.tsx`

**Update `t` mock** to include `'suchen.was.allRestaurants': 'Alle Restaurants'`.

**New test cases**:

1. **`renders "Alle Restaurants" as first item`**
   - Render with `items` having 2 categories, no recent searches
   - Assert label text visible
   - Assert row renders before category names
   - Assert `LayoutGrid` icon renders

2. **`calls onSelect with all-restaurants type when clicked`**
   - Render with items, no recent
   - Click the "Alle Restaurants" row
   - Assert `onSelect` called with `{ label: 'Alle Restaurants', type: 'all-restaurants' }`

3. **`does not render "Alle Restaurants" when recent searches exist`**
   - Render with `recentSearches` (mutually exclusive with POPULAR)
   - Assert "Alle Restaurants" not visible, RECENT section visible

4. **`renders "Alle Restaurants" selection with LayoutGrid icon`**
   - Render with `selectedWas` of type `'all-restaurants'`
   - Assert selection row shows the label

5. **`renders "Alle Restaurants" even when items list is empty`** [NEW]
   - Render with `items={[]}`, `recentSearches={[]}`, `selectedWas={null}`
   - Assert "Alle Restaurants" row is visible (no POPULAR section)
   - Assert layout does not crash (no category images, no "BELIEBT" heading)
   - Assert `LayoutGrid` icon present

**Rationale**: Test case 5 specifically regression-tests the `items.length === 0` edge case identified in the architecture review. Without it, a future refactor could re-introduce the invisibility bug on fresh databases.

**Dependencies**: Step 3 (UI rendering).

---

### Step 6: Add regression tests for `buildSearchParams` + `toFoodRecentSearches`

**New file**: `src/__tests__/regression/plan169-alle-restaurants-regression.test.ts`

**Test suite 1 — `buildSearchParams` URL-param logic:**

Import `buildSearchParams` from `@/lib/search-params` (the actual utility, not a mirror):

```
describe('Plan 169 — buildSearchParams URL-param logic')
  - 'all-restaurants type sets no category or q param' [post-fix PASSES]
    → buildSearchParams({ type: 'all-restaurants', label: 'Alle Restaurants' })
    → .toString() does not contain 'category=' or 'q='
  - 'category with categoryId sets category param'   [post-fix PASSES]
    → buildSearchParams({ type: 'category', label: 'Turkisch', categoryId: '1' })
    → .get('category') === '1', .get('q') === null
  - 'dish type sets q param with label'               [post-fix PASSES]
    → buildSearchParams({ type: 'dish', label: 'Pizza' })
    → .get('q') === 'Pizza', .get('category') === null
```

**Test suite 2 — `toFoodRecentSearches` filter** [NEW]:

Import `toFoodRecentSearches` from the page module (if inline, either extract to a utility or export it):

```
describe('Plan 169 — toFoodRecentSearches all-restaurants filter')
  - 'keeps all-restaurants entries in recent searches'  [post-fix PASSES]
    → Input: [{ type: 'all-restaurants', label: 'Alle Restaurants' },
              { type: 'category', label: 'Turkisch' }]
    → Output contains the 'all-restaurants' entry
  - 'filters unknown types'                              [post-fix behavioral]
    → Input: [{ type: 'unknown-type', label: 'Bogus' }]
    → Output is empty array
```

If `toFoodRecentSearches` is defined inline in the page component and not exported, extract it to `src/lib/search-params.ts` alongside `buildSearchParams`.

**Rationale**: Testing `buildSearchParams` directly (imported, not mirrored) validates the real URL-param logic. The `toFoodRecentSearches` test prevents future refactors from silently dropping `'all-restaurants'` from the filter.

**Dependencies**: Step 4 (buildSearchParams utility), Step 2 (toFoodRecentSearches filter update).

---

## File-by-File Breakdown

| # | File | Change | Dependencies |
|---|------|--------|-------------|
| 1 | `src/translations/de.ts` | Add `allRestaurants: "Alle Restaurants"` under `suchen.was` | None |
| 2 | `src/translations/en.ts` | Add `allRestaurants: "All Restaurants"` under `suchen.was` | None |
| 3 | `src/features/search/components/WasCategoryResults.tsx` | Add `'all-restaurants'` to `WasSelection.type` union | 1, 2 |
| 4 | `src/features/search/components/WasCategoryResults.tsx` | Import `LayoutGrid` | 3 |
| 5 | `src/features/search/components/WasCategoryResults.tsx` | Add `shouldShowAllRestaurants` condition | 3 |
| 6 | `src/features/search/components/WasCategoryResults.tsx` | Update early return guard | 3, 5 |
| 7 | `src/features/search/components/WasCategoryResults.tsx` | Render "Alle Restaurants" RowItem before `shouldShowPopular` block | 3, 4, 5 |
| 8 | `src/features/search/components/WasCategoryResults.tsx` | Add `'all-restaurants'` icon/subtitle in selection row | 3 |
| 9 | `src/app/(public)/search/page.tsx` | Add `'all-restaurants'` to `toFoodRecentSearches` filter | 3 |
| 10 | `src/lib/search-params.ts` | NEW — extract `buildSearchParams` utility | 3 |
| 11 | `src/app/(public)/search/page.tsx` | Import `buildSearchParams`, simplify `handleSearch` | 10 |
| 12 | `src/features/search/components/WasCategoryResults.test.tsx` | Add 5 test cases | 1-8 |
| 13 | `src/__tests__/regression/plan169-alle-restaurants-regression.test.ts` | NEW — regression tests | 9, 10 |

## Test Strategy

### WasCategoryResults.test.tsx — 5 test cases

| # | Test Name | Setup | Assertions |
|---|-----------|-------|------------|
| 1 | `renders "Alle Restaurants" as first item` | items=[cat1, cat2], recent=[] | Text visible, LayoutGrid, renders before category names |
| 2 | `calls onSelect with all-restaurants type when clicked` | items=[cat1], recent=[] | onSelect({ label: 'Alle Restaurants', type: 'all-restaurants' }) |
| 3 | `does not render "Alle Restaurants" when recent searches exist` | items=[cat1], recent=[entry] | Row not visible, RECENT visible |
| 4 | `renders "Alle Restaurants" selection with LayoutGrid icon` | selectedWas={all-restaurants} | Selection row shows label |
| 5 | `renders "Alle Restaurants" even when items list is empty` | items=[], recent=[], selectedWas=null | Row visible, no crash, LayoutGrid present |

### Regression tests — 2 suites

**Suite 1: `buildSearchParams`** (imported from `@/lib/search-params`)

| Test | Input | Assertion |
|------|-------|-----------|
| all-restaurants sets no params | `{ type: 'all-restaurants', label: 'Alle Restaurants' }` | No `category=`, no `q=` |
| category sets category param | `{ type: 'category', label: 'Turkisch', categoryId: '1' }` | `category=1`, no `q=` |
| dish sets q param | `{ type: 'dish', label: 'Pizza' }` | `q=Pizza`, no `category=` |

**Suite 2: `toFoodRecentSearches`**

| Test | Input | Assertion |
|------|-------|-----------|
| Keeps all-restaurants entries | Mixed types including all-restaurants | all-restaurants entry retained |
| Filters unknown types | Unknown type entries | Empty array |

## TDD Compliance Table

| Implementation Step | Test File | Test Name |
|---|---|---|
| Step 3: Render "Alle Restaurants" decoupled | `WasCategoryResults.test.tsx` | Renders "Alle Restaurants" as first item |
| Step 3: onSelect fires correctly | `WasCategoryResults.test.tsx` | Calls onSelect with all-restaurants type when clicked |
| Step 3: Mutual exclusion with RECENT | `WasCategoryResults.test.tsx` | Does not render "Alle Restaurants" when recent searches exist |
| Step 3: Selection icon | `WasCategoryResults.test.tsx` | Renders "Alle Restaurants" selection with LayoutGrid icon |
| Step 3: Empty items edge case | `WasCategoryResults.test.tsx` | Renders "Alle Restaurants" even when items list is empty |
| Step 4: No URL params for all-restaurants | `plan169-regression.test.ts` | buildSearchParams: all-restaurants sets no category or q param |
| Step 4: Category sets ?category= | `plan169-regression.test.ts` | buildSearchParams: category with categoryId sets category param |
| Step 4: Dish sets ?q= | `plan169-regression.test.ts` | buildSearchParams: dish type sets q param with label |
| Step 2: toFoodRecentSearches keeps all-restaurants | `plan169-regression.test.ts` | toFoodRecentSearches: keeps all-restaurants entries |
| Step 2: toFoodRecentSearches filters unknown | `plan169-regression.test.ts` | toFoodRecentSearches: filters unknown types |

## Verification Steps

```bash
# 1. Run existing tests to confirm no regression
npm test -- WasCategoryResults

# 2. Run new tests
npm test -- WasCategoryResults.test.tsx plan169-alle-restaurants-regression.test.ts

# 3. Type checking
npm run type-check

# 4. Linting
npm run lint

# 5. Manual verification:
#    a. Open /search in browser
#    b. "Alle Restaurants" appears before the BELIEBT heading (or as its own block)
#    c. Click it → selection row appears with LayoutGrid icon
#    d. Click "Suchen" → navigates to /providers without ?category= or ?q=
#    e. Shows all restaurants (no category filter)
#    f. Verify on fresh DB (no providers): "Alle Restaurants" still renders
```

## Rollback Instructions

```bash
# If not yet committed, undo working changes:
git checkout -- \
  src/translations/de.ts \
  src/translations/en.ts \
  src/features/search/components/WasCategoryResults.tsx \
  src/features/search/components/WasCategoryResults.test.tsx \
  src/app/\(public\)/search/page.tsx

# Remove new files:
rm src/lib/search-params.ts
rm src/__tests__/regression/plan169-alle-restaurants-regression.test.ts

# If committed, revert the commit:
git revert HEAD --no-edit

# Verify rollback:
git diff --stat
```

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-06-13 | Planner | Revision 2: Decoupled "Alle Restaurants" from `shouldShowPopular`; extracted `buildSearchParams` utility; added `toFoodRecentSearches` regression test; added empty-items test case |
