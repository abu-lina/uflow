---
ID: 170
Origin: 170
UUID: a3f7c2b2-0000-0000-0000-000000000000
Status: Active
---

# Analysis: Hardcoded Provider Count in Wo (Where) Section

## Summary

The city-level provider counts in the "Wo" (Where) accordion on the search page are **not filtered by section**. Every city displays its total provider count across all sections (food + store + ummah) regardless of which section tab the user is browsing. The category counts in the "Was" (What) accordion do not have this problem.

## Root Cause

### Primary: `fetchPopularCities()` ignores section context

**File:** `src/services/providers.ts:781-821`

```typescript
const { data, error } = await supabase
  .from('providers')
  .select('address_city')          // ← NO listing_type filter
  .returns<{ address_city: string | null }[]>();
```

The function fetches `address_city` for **all** providers and counts by city. It never filters by `listing_type`. Contrast with `searchFoodCategories` (SQL at `supabase/migrations/001_baseline.sql:816-817`):

```sql
LEFT JOIN public.providers p
  ON p.category_id = mc.category_id
 AND p.listing_type = 'food'        -- ← filters by section
 AND p.review_status = 'approved'
```

The "Was" section's category counts are correct because the RPC joins against providers with `listing_type = 'food'`. The "Wo" section's city counts are wrong because `fetchPopularCities` is a plain `select()` with no section filter.

### Secondary: City counts never refetch on section change

**File:** `src/app/(public)/search/page.tsx:173-191`

```typescript
useEffect(() => {
  async function loadPopularCities() { ... }
  void loadPopularCities();
}, []);  // ← empty array: runs ONCE on mount, never re-fetches
```

When the user switches sections via the tabs, the `handleSectionChange` (line 416-424) calls `router.replace()` which updates `urlSection`, which triggers an effect (line 406-410) to update `selectedSection`. This triggers "Was" data refetches (line 293 depends on `selectedSection`), but **never** refetches `cityCounts`. The old city counts from mount persist across section changes.

### Tertiary: `WoCityResults.tsx` builds `countByCity` from only top 3 cities

**File:** `src/features/search/components/WoCityResults.tsx:105,134`

```typescript
// line 105 — inside query.length < 2 block
const countByCity = new Map(popularCities.map((entry) => [entry.city, entry.provider_count]));

// line 134 — selectedCity lookup
providerCount={countByCity.get(selectedCity) ?? 0}   // ← only searches top 3 cities
```

The `popularCities` prop is `cityCounts.slice(0, 3)` (page.tsx line 527). So `countByCity` only contains the **top 3 cities**. If the user's `selectedCity` (restored from localStorage/sessionStorage) is not among the top 3, it shows **"0 Anbieter"** via the `?? 0` fallback.

Similarly, recent search cities (line 189) also use `countByCity.get(recent.city) ?? 0` — they'll show 0 for any city not in the top 3.

## Affected Components

### Directly affected

| Component | File | Lines | Impact |
|-----------|------|-------|--------|
| `fetchPopularCities()` | `src/services/providers.ts` | 781-821 | No `listing_type` filter; no section parameter |
| `loadPopularCities` useEffect | `src/app/(public)/search/page.tsx` | 173-191 | Empty `[]` dependency — never refetches on section change |
| `WoCityResults` countByCity | `src/features/search/components/WoCityResults.tsx` | 105, 134, 189 | Map built from only top 3 cities; selected city and recent searches outside top 3 show 0 |
| `handleSectionChange` | `src/app/(public)/search/page.tsx` | 416-424 | Updates URL and `selectedSection` but doesn't trigger city count refetch |
| `fetchProviderCities()` | `src/services/providers.ts` | 734-771 | Also doesn't filter by section (comment at line 732 says "includes all listing_types") |

### Contrast: Correctly behaving

| Component | File | Why it works |
|-----------|------|-------------|
| `searchFoodCategories` RPC | `supabase/migrations/001_baseline.sql:806-817` | SQL JOIN with `p.listing_type = 'food' AND p.review_status = 'approved'` |
| `searchFoodConcepts` RPC | `supabase/migrations/001_baseline.sql:915-918` | Same — `p.listing_type = 'food'` in JOIN |
| `searchFoodMenuItems` RPC | `supabase/migrations/001_baseline.sql:970-973` | Same — `p.listing_type = 'food'` in JOIN |
| `searchProviders()` | `src/services/providers.ts:522-524` | Applies `.eq('listing_type', listingType)` when called with section context |

## Data Flow Trace

```
URL param section=food
    │
    ▼
selectedSection = 'food'
    │
    ├─ Was section: searchFoodCategories({ search_query })
    │      │
    │      ▼
    │   SQL RPC: JOIN providers ON category_id AND listing_type = 'food' ✅
    │      │
    │      ▼
    │   category.provider_count = correct food-only count
    │
    └─ Wo section: fetchPopularCities(500)  [ONLY ON MOUNT]
           │
           ▼
        supabase.from('providers').select('address_city') -- NO listing_type filter ❌
           │
           ▼
        cityCounts = [{city: "Berlin", provider_count: 281}, ...]
           │
           ▼
        popularCities = cityCounts.slice(0, 3)  // only top 3
           │
           ▼
        WoCityResults creates countByCity Map from popularCities (3 entries)
           │
           ├─ selectedCity lookup: countByCity.get(selectedCity) ?? 0
           │     If selected city is Berlin (top 3) → 281 (all sections)
           │     If selected city is Köln (not top 3) → 0
           │
           ├─ recent city lookup: countByCity.get(recent.city) ?? 0
           │     Same issue — only top 3 countByCity
           │
           └─ popular city rows: entry.provider_count directly
                 Shows correct (but all-sections) count for each of top 3
```

## Why "281" Appears Hardcoded

The number 281 is the **real count from the database for a specific city across all sections**. It appears "hardcoded" because:

1. It doesn't change when the user switches sections (e.g., from food to ummah), since data is loaded once
2. The same city displays the same number across all sections, even though the actual food-only count would be lower
3. The user's expectation is that `section=food` should show counts for food providers only

## What Needs to Change

1. **`fetchPopularCities()` in `src/services/providers.ts`**: Add an optional `section` parameter. When provided, filter by `listing_type`. Consider using a database RPC for efficiency (similar to `searchFoodCategories`) rather than client-side counting.

2. **`loadPopularCities` useEffect in `src/app/(public)/search/page.tsx`**: Add `selectedSection` to the dependency array so city counts refetch when the section tab changes.

3. **`WoCityResults.tsx`**: Pass the full `cityCounts` (or build `countByCity` from the full data) instead of only top 3 cities. The `countByCity` map on line 105 should have all cities, not just `popularCities.slice(0, 3)`.

4. **`fetchProviderCities()` in `src/services/providers.ts`**: Should also optionally filter by section so the autocomplete city list matches the current section context.

5. **Consider a dedicated RPC**: Add a `search_provider_cities(section text)` RPC that counts providers by city with `listing_type` and `review_status` filters, for efficiency.

## Confidence Levels

| Finding | Confidence | Rationale |
|---------|-----------|-----------|
| `fetchPopularCities` missing `listing_type` filter | High (95%) | Code clearly shows no filter; RPCs like `searchFoodCategories` do have it |
| City counts never refetch on section change | High (95%) | Empty dep array `[]` on line 191; contrast with Was effects that depend on `selectedSection` |
| `WoCityResults` countByCity limited to top 3 | High (90%) | Map built from `popularCities` prop which is `cityCounts.slice(0, 3)` |
| Recent searches show 0 for non-top-3 cities | Medium (80%) | Logical consequence of the countByCity issue; worth verifying with actual data |
| Number 281 = all-sections count for a specific city | High (95%) | Confirmed 281 is not in source code; must come from DB; `fetchPopularCities` returns unfiltered totals |

## Related Files

- `src/services/providers.ts` — `fetchPopularCities()` (no section filter)
- `src/services/offers.ts` — `searchFoodCategories()` (uses RPC with section filter — correct)
- `src/app/(public)/search/page.tsx` — `loadPopularCities` effect, `countByCity` computation
- `src/features/search/components/WoCityResults.tsx` — `countByCity` from top-3 only
- `src/features/search/components/WasCategoryResults.tsx` — uses `selectedWas.providerCount` from category data (correct)
- `supabase/migrations/001_baseline.sql:720-828` — `search_food_categories` RPC (correct, filters by `listing_type`)
- `supabase/migrations/archive/029_add_get_provider_count_by_city_function.sql` — existing `get_provider_count_by_city` RPC (not currently used by search page, no `listing_type` filter either)
- `src/components/ui/RowItem.tsx` — renders the subtitle with class `truncate font-inter text-sm text-text-muted`
