---
ID: 169
Origin: 169
UUID: b8d4e9f1
Status: Committed
---

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-06-13 | DevOps | Document closed | Status: Committed |

# Analysis: Add "Alle Restaurants" Entry to Search Filter

## 1. Current Behavior

### 1.1 WasCategoryResults Rendering

**File:** `src/features/search/components/WasCategoryResults.tsx`

The component receives `items: FoodCategory[]` (from `searchFoodCategories` RPC), `recentSearches: WasSelection[]`, and other props.

**Empty query state** (`query.length < 2`) — the default state when the search page first loads:

1. **Selection** (if `selectedWas` is set): Renders the active selection row with a remove (X) button.
2. **POPULAR / BELIEBT** section (if `!shouldShowRecent && items.length > 0`): Shows up to 3 `items` as `CategoryRow` components via `RowItem`. Headed by `t('suchen.was.popularLabel')` (German: `"BELIEBT"`).
3. **RECENT / ZULETZT GESUCHT** section (if `recentSearches.length > 0`): Shows up to 3 recent selections as `RowItem` components. Headed by `t('suchen.was.recentLabel')`.

**Search state** (`query.length >= 2`): Shows matched categories under `t('suchen.was.cuisineLabel')` ("KUECHE").

**Visibility rules:**

- `shouldShowRecent` = `recentSearches.length > 0`
- `shouldShowPopular` = `!shouldShowRecent && items.length > 0`
- The POPULAR and RECENT sections are **mutually exclusive** — when recent searches exist, the POPULAR section is hidden entirely.

**Data source for `items`:** `searchFoodCategories` is called with `limit_count: 3`. When the query is empty (< 2 chars), the RPC returns the top 3 categories by provider count (e.g., "Turkisch" with 13 restaurants, "Arabisch" with 9, "Amerikanisch" with 6).

### 1.2 The RowItem Component

**File:** `src/components/ui/RowItem.tsx`

```typescript
interface RowItemBaseProps {
  icon: ReactNode;       // Required
  title: string;         // Primary text (font-inter-tight, semibold)
  subtitle?: string;     // Secondary text (font-inter, text-muted)
  trailing?: ReactNode;
  ariaLabel?: string;
  selected?: boolean;
  multiSelect?: boolean;
  className?: string;
}

interface RowItemSelectableProps extends RowItemBaseProps {
  selectable: true;
  onSelect: () => void;
}
```

When `selectable` is true, renders as a `<button>` with full-width rounded styling. Icon is wrapped in `IconWrapper` that shows a check badge when selected.

### 1.3 handleWasSelect / handleSearch Flow

**File:** `src/app/(public)/search/page.tsx`

**`handleWasSelect` (lines 434-463):**

1. Sets `selectedWas` to the `WasSelection` object.
2. Clears the search query text (`setWasQuery('')`).
3. Closes the accordion (`setOpenAccordion(null)`).
4. Persists to localStorage recent searches (deduplicated by label, max 3).

**`handleSearch` (lines 465-486):**

```typescript
const handleSearch = () => {
  if (!selectedWas) return;
  const params = new URLSearchParams({ section: selectedSection });
  if (selectedWas.type === 'category' && selectedWas.categoryId) {
    params.set('category', selectedWas.categoryId);
  } else {
    params.set('q', selectedWas.label);
  }
  // ... adds filters, location, wer
  router.push(`${getResultsPathForSection(selectedSection)}?${params.toString()}`);
};
```

Key logic:
- `type === 'category'` **and** `categoryId` is truthy -> sets `?category=` param
- Anything else (dish, service-type, or category without ID) -> sets `?q=` param with the label

**Results page consumption** (`src/app/(public)/providers/ProvidersContent.tsx`, line 142):

```typescript
const category = (searchParams.get('category') || null) ?? selectedCategory;
```

When `category` is `null`, the API uses the `'both'` search strategy, showing all providers (no category filter).

### 1.4 WasSelection Type

**File:** `src/features/search/components/WasCategoryResults.tsx`

```typescript
export interface WasSelection {
  label: string;
  type: 'category' | 'dish' | 'service-type';
  categoryId?: string;
  categoryImages?: string | null;
  providerCount?: number;
  dishName?: string;
  serviceTypeId?: string;
}
```

### 1.5 Existing "Alle" / Sentinel Handling

**Location sentinel pattern (Plan 017):**
- `LOCATION_ALL = ''` (empty string) in `src/providers/search-provider.tsx`
- Used for "Everywhere" / "Uberall"

**Category sentinel (Plan 045):**
- `null` is the canonical "no category filter" value
- Validated by regression tests in `src/__tests__/regression/plan045-category-filter-regression.test.ts`
- `null` passed to API routes to `'both'` strategy

**No existing "Alle Restaurants" entry in category list.** The only "all" references are:
- `t('search.all')` — used in search context bar ("Alle"), not the search page accordion
- `t('suchen.was.showAllCuisines')` — "Show all cuisines" expand button
- `t('suchen.was.showAllDishes')` — "Show all dishes" expand button

### 1.6 Feature Flags

**File:** `src/config/feature-flags.ts`

Relevant flags:
- `enableSearchExpandShowAllPreview: false` — Controls "Show all cuisines/dishes" expand buttons
- Checked in `WasCategoryResults` (line 85) and `WasMealResults` (line 26)

No existing feature flag for an "Alle Restaurants" entry.

### 1.7 WasCategoryResults Test File

**File:** `src/features/search/components/WasCategoryResults.test.tsx`

Tests cover: active selection rendering, dish recent rows, category provider count subtitle, category images, show-all expand, recent-only vs popular-only sections. No test for "Alle Restaurants".

---

## 2. Required Change Description

### 2.1 Goal

Add an "Alle Restaurants" (German) / "All Restaurants" (English) entry as the **first item** in the BELIEBT (POPULAR) section of the "Was?" accordion. When clicked, navigates to search results showing all restaurants (no category filter).

### 2.2 Behavioral Details

1. "Alle Restaurants" appears as the **first row** in the POPULAR section, above dynamic categories.
2. It should use a distinct icon (e.g., `LayoutGrid` from `lucide-react`) instead of `UtensilsCrossed`.
3. Subtitle shows the total restaurant count (or omitted if unavailable).
4. When clicked:
   - Sets `selectedWas` so the selection row appears
   - The "Suchen" button navigates to results **without `?category=`** (no filter = all restaurants)
   - Does **NOT** set `?q=Alle Restaurants` — that would produce a text search
5. Persisted in recent searches.

### 2.3 Recommended Approach: New `WasSelection` Type

Add sentinel type `'all-restaurants'` to `WasSelection.type`. This provides a clean distinction without conflating with `category` or `dish` types.

**Alternative considered — reusing `category` with no ID:** The current `handleSearch` falls through to `params.set('q', selectedWas.label)`, which would incorrectly set `?q=Alle Restaurants`. A dedicated type is cleaner.

### 2.4 Visual Design

- **Icon:** `LayoutGrid` from `lucide-react` (differentiates from cuisine `UtensilsCrossed`)
- **Title:** `t('suchen.was.allRestaurants')` -> "Alle Restaurants" / "All Restaurants"
- **Subtitle:** Optional total restaurant count or omitted

---

## 3. All Files That Need Modification

### 3.1 Core Change Files

| # | File | Change |
|---|------|--------|
| 1 | `src/features/search/components/WasCategoryResults.tsx` | Add `'all-restaurants'` to `WasSelection.type` union; add "Alle Restaurants" row as first item in POPULAR section; pass `LayoutGrid` icon and appropriate `onSelect` handler |
| 2 | `src/app/(public)/search/page.tsx` | Modify `handleSearch` to handle `type: 'all-restaurants'` — navigate without `?category=` or `?q=` params |

### 3.2 Translation Files

| # | File | Keys to Add |
|---|------|-------------|
| 3 | `src/translations/de.ts` | `suchen.was.allRestaurants: "Alle Restaurants"` |
| 4 | `src/translations/en.ts` | `suchen.was.allRestaurants: "All Restaurants"` |

### 3.3 Test Files

| # | File | Change |
|---|------|--------|
| 5 | `src/features/search/components/WasCategoryResults.test.tsx` | Add tests: renders first in POPULAR, has correct aria label, fires `onSelect` with `type: 'all-restaurants'` |
| 6 | `src/__tests__/regression/plan045-category-filter-regression.test.ts` | (Optional) Add regression test verifying `type: 'all-restaurants'` results in no `category` param |

---

## 4. Translation Keys Needed

### de.ts
```typescript
"was": {
  // ... existing keys ...
  "allRestaurants": "Alle Restaurants",
}
```

### en.ts
```typescript
"was": {
  // ... existing keys ...
  "allRestaurants": "All Restaurants",
}
```

Placement: Under `suchen.was.*`, adjacent to `searchPlaceholder`, `categoryCount`, etc.

---

## 5. Edge Cases

### 5.1 Recent Searches Interaction

POPULAR section is hidden when `recentSearches.length > 0` (line 123: `shouldShowPopular = !shouldShowRecent && items.length > 0`). If "Alle Restaurants" is selected and persisted, it appears in RECENT on subsequent visits. This is correct behavior.

The "Alle Restaurants" entry is **manually prepended** to the rendered list (not from API), so it must be rendered explicitly regardless of the `items` array contents.

### 5.2 Feature Flag Gating

The `enableSearchExpandShowAllPreview` flag should **not** affect "Alle Restaurants". It is a static entry that must always appear at the top of the POPULAR list. Place it outside the `visiblePopularItems` slice.

### 5.3 Icon for "Alle Restaurants"

Since it's not a real category, it has no `category_images`. Use `LayoutGrid` from `lucide-react` instead of `UtensilsCrossed`. The `IconSlot` function may need extension to support a configurable icon.

### 5.4 Persistence in Recent Searches

When persisted to localStorage, the label is used for dedup:
```typescript
const deduped = [selection, ...prev.filter((r) => r.label !== selection.label)].slice(0, 3);
```

Since "Alle Restaurants" is a static non-localized concept, consider using a stable label that matches the translation or using the `type` field to identify it. The 3-item limit naturally caps any duplicates.

### 5.5 Backend Changes

None. The existing API already handles `null` category correctly (`'both'` strategy). No new RPCs or Supabase functions needed.

### 5.6 Mobile Layout

Uses the same `RowItem` component — already mobile-responsive. No additional layout concerns.

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Accidental `?q=` param leak | Medium | High | Use dedicated `type: 'all-restaurants'` sentinel; add explicit check in `handleSearch` that skips all param-setting |
| Translation label used for dedup in localStorage | Low | Low | Duplicates after language switch auto-cleaned by 3-item limit |
| Missing from POPULAR when recent searches exist | Low | Medium | If needed, restructure POPULAR to always show "Alle Restaurants" regardless of recent searches |
| Regression: existing category click flow | Low | High | Unit tests should verify both old (category, dish) and new (all-restaurants) selection types |
| Feature flag interaction | Low | Low | Static entry placed outside `visiblePopularItems` slice; not subject to feature flag |
| localStorage backward compat | Low | Low | Old `toFoodRecentSearches` filters unknown types gracefully |

### Key Implementation Notes

1. **In `WasCategoryResults.tsx`**, render "Alle Restaurants" **inside the `shouldShowPopular` block**, prepended before `visiblePopularItems.map(...)`. Not gated by feature flag or 3-item limit.

2. **In `page.tsx` `handleSearch`**, add:
   ```typescript
   if (selectedWas.type === 'all-restaurants') {
     // No category, no query — show all restaurants
   } else if (selectedWas.type === 'category' && selectedWas.categoryId) {
     params.set('category', selectedWas.categoryId);
   } else {
     params.set('q', selectedWas.label);
   }
   ```

3. **Icon:** Use `LayoutGrid` from `lucide-react` for the "Alle Restaurants" row. May need to add an optional `icon` prop to `IconSlot` or create a variant.

4. **Subtitle:** Either use the total restaurant count (if available via a new prop or derived from items) or omit the subtitle entirely.
