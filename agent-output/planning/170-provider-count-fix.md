---
ID: 170
Origin: 170
UUID: b8d4e6f1
Status: Active
---

# Plan 170: Fix Hardcoded Provider Counts in Wo (Where) Section

## Value Statement

City-level provider counts in the "Wo" accordion currently display totals across all sections (food + store + ummah) regardless of which tab is active. Cities outside the top 3 always show "0". Fixing this ensures users see accurate, section-filtered provider counts when browsing by location.

## Implementation Steps

### Milestone 1: Backend — `fetchPopularCities()` section filter

**Effort**: Small | **Risk**: Low | **Test**: New test for section filtering

**Step 1.1: Add section parameter to `fetchPopularCities()`**

File: `src/services/providers.ts:781-821`

Add optional `section?: Section` parameter. When provided, add `.eq('listing_type', listingType)` to the Supabase query. The `Section` type (`'food' | 'ummah' | 'store'`) maps directly to `listing_type` values — no mapping function needed.

```typescript
export async function fetchPopularCities(limit = 5, section?: Section): Promise<PopularCity[]> {
  // ... existing guard for limit <= 0 ...

  try {
    let query = supabase.from('providers').select('address_city');

    if (section) {
      query = query.eq('listing_type', section);
    }

    const { data, error } = await query.returns<{ address_city: string | null }[]>();
    // ... rest unchanged ...
```

**Key detail**: `Section` type is imported from `@/config/sectionFilters` (re-exported via `@/providers/search-provider`). Use the same import path as page.tsx uses: `import type { Section } from '@/config/sectionFilters';` or from `@/providers/search-provider`. Check existing imports in providers.ts first.

**Backward compatibility**: No `section` arg = current behavior (counts all sections).

**Step 1.2 (optional optimization)**: Consider whether `review_status: 'approved'` should also be filtered. The current function doesn't filter by review_status; adding it would change baseline counts. Leave as-is — out of scope.

---

### Milestone 2: Frontend — Refetch on section change

**Effort**: Small | **Risk**: Low | **Test**: Verify selectedSection triggers refetch

**Step 2.1: Add `selectedSection` to loadPopularCities effect**

File: `src/app/(public)/search/page.tsx:173-191`

```typescript
// Before:
useEffect(() => {
  async function loadPopularCities() {
    // ... fetchPopularCities(500);
  }
  void loadPopularCities();
}, []);

// After:
useEffect(() => {
  async function loadPopularCities() {
    // ... fetchPopularCities(500, selectedSection);
  }
  void loadPopularCities();
}, [selectedSection]);  // ← was []
```

**Step 2.2: Pass full `cityCounts` to WoCityResults**

File: `src/app/(public)/search/page.tsx:527,589`

Change the `popularCities` prop to pass `cityCounts` (the full dataset) instead of just top 3:

```typescript
// Before:
const popularCities = cityCounts.slice(0, 3);
// ...
<WoCityResults popularCities={popularCities} ... />

// After:
// Remove the const popularCities = cityCounts.slice(0, 3); line
// Or change the prop usage:
<WoCityResults popularCities={cityCounts} ... />
```

**Caveat**: Check if `popularCities` (the local variable) is used anywhere else in the render function. If it is, keep the variable but pass `cityCounts` as the prop instead. If not, remove the variable entirely.

---

### Milestone 3: WoCityResults — Use full data for counts

**Effort**: Trivial | **Risk**: Low | **Test**: Existing tests pass with larger data

**No code changes needed** — the component already slices internally:

- `popularCities.slice(0, 3)` at lines 108-109 limits displayed rows
- `countByCity` map at line 105 builds from `popularCities` (which will now be the full `cityCounts`)
- Selected city lookup (line 134) and recent search lookup (line 189) will find any city

**But**: Verify the cleanup path. If the `isShowAllPreviewEnabled` flag is off, `visiblePopularCities` is always `.slice(0, 3)` — so passing a full array doesn't change visual behavior. If the flag is on and `showAllPopularCities` is toggled, all cities render, which is the intended behavior of the "Show all" feature.

---

### Milestone 4: Tests

**Effort**: Medium | **Risk**: Low | **Test**: Vitest

**Step 4.1: Update `fetchPopularCities` tests in providers test file**

Check if `providers.ts` has existing tests. If so, add:

1. `fetchPopularCities with section filter returns only section-specific cities` — mock Supabase, verify `.eq('listing_type', section)` was called
2. `fetchPopularCities without section returns all cities` — verify no `.eq()` filter applied
3. `fetchPopularCities with unknown section returns empty` — verify graceful handling (if applicable)

**Step 4.2: Update WoCityResults tests**

File: `src/features/search/components/WoCityResults.test.tsx`

Existing tests use small `popularCities` arrays. The component logic for `countByCity` works the same with larger arrays (Map from all entries). No test changes required for correctness — but add a regression test:

1. `[regression] selected city outside top 3 shows correct provider count`:
   - Pass `popularCities` with 5 cities (e.g. Berlin:12, Hamburg:8, Koeln:7, Bonn:3, Leipzig:5)
   - Set `selectedCity="Leipzig"`
   - Assert `providerCount` is 5 (not 0)

2. `[regression] recent search city outside top 3 shows correct provider count`:
   - Same setup with `recentSearches={[{ city: 'Leipzig' }]}`
   - Assert Leipzig shows with count 5

**Step 4.3: Add regression test for section change refetch**

File: `src/__tests__/regression/plan170-provider-count-regression.test.ts` (new)

1. Simulate `loadPopularCities` effect with mocked `fetchPopularCities`
2. Render page component with `selectedSection='food'`
3. Change section to `'ummah'`
4. Assert `fetchPopularCities` was called with `'ummah'`

**Migration note**: If `fetchPopularCities` is called from other places (e.g., provider detail pages), add a test verifying backward compatibility — those calls don't pass `section` so they get all-sections counts as before.

---

## File-by-File Breakdown

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `src/services/providers.ts` | Add optional `section?: Section` param to `fetchPopularCities()`; add `.eq('listing_type', section)` when provided | Low — backward compatible, no default behavior change |
| 2 | `src/app/(public)/search/page.tsx` | Add `selectedSection` to useEffect deps; pass to `fetchPopularCities(500, selectedSection)`; pass `cityCounts` as `popularCities` prop | Low — straightforward dep array change |
| 3 | `src/app/(public)/search/page.tsx` | Change `<WoCityResults popularCities={popularCities}>` to `<WoCityResults popularCities={cityCounts}>` | Low — component already slices internally |
| 4 | `src/features/search/components/WoCityResults.test.tsx` | Add 2 regression tests for selected city and recent search outside top 3 | Low — no component logic changes needed |
| 5 | `src/__tests__/regression/plan170-provider-count-regression.test.ts` | NEW — regression test for section change refetch | Low — new file, no existing code affected |

## Testing Strategy

### Unit Tests

| Test | File | What it covers |
|------|------|----------------|
| `fetchPopularCities with section filter` | `providers.test.ts` | Milestone 1 — Supabase query includes `.eq()` |
| `fetchPopularCities without section` | `providers.test.ts` | Milestone 1 — backward compat |
| `selected city outside top 3 shows correct count` | `WoCityResults.test.tsx` | Milestone 3 — countByCity from full data |
| `recent search outside top 3 shows correct count` | `WoCityResults.test.tsx` | Milestone 3 — countByCity from full data |

### Regression Tests

| Test | File | What it covers |
|------|------|----------------|
| `loadPopularCities refetches on section change` | `plan170-regression.test.ts` | Milestone 2 — effect dependency array |
| `top 3 popular cities still display correctly` | `WoCityResults.test.tsx` (existing) | Milestone 3 — display slicing preserved |
| `no regression for callers without section` | `providers.test.ts` | Milestone 1 — backward compat |

### Manual Verification

```bash
# 1. Open /search?section=food
# 2. Check city counts in "Wo" — should be food-only counts (lower than before)
# 3. Switch to "Ummah" tab — counts should change to ummah-only
# 4. Switch to "Stores" tab — counts should change to store-only
# 5. Select a city from the "Beliebt" (top 3) rows — count should match the row
# 6. Type a city name not in top 3 (e.g., "Köln" if it's 4th+) — check it shows correct count
# 7. Check recent searches — all cities show correct counts
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `fetchPopularCities` called from other code without section param breaks | Low | Medium | Backward compatible — no param = current all-sections behavior |
| Section change triggers unnecessary refetch on mount | Medium | Low | First render always needs data; the refetch on initial `selectedSection` (which equals `urlSection`) is redundant but harmless. Could add a ref to skip first run if needed |
| Larger `cityCounts` array impacts render performance | Low | Low | `countByCity` is a Map built from the full array (~50-100 entries max at 500 limit); O(n) is negligible. Display is always sliced to 3 unless "Show all" is toggled |
| Race condition: section changes while fetch is in progress | Low | Medium | Effect cleanup function should abort stale requests. Use an `AbortController` or ignore stale responses with a mounted flag. Current code doesn't use either — pre-existing issue |
| Section='ummah' has no providers in some cities (community_services table) | Medium | Low | If city has food providers but no ummah providers, count shows 0 for that city in ummah section. This is correct behavior |

## Edge Cases

1. **Section with zero providers in a city**: Shows 0 — correct. The user sees "0 Anbieter" and understands there are no ummah providers in that city.

2. **All-sections view**: There's no "all" section tab, but if `fetchPopularCities` is called without `section` (e.g., from other pages), it still returns all-sections counts. Backward compatible.

3. **Empty response from section-filtered query**: If no providers match the section, `cityCounts` is empty. The `countByCity` map is empty. `selectedCity` shows 0. `popularCities` is empty array. The component renders `null` at line 118-120 (if no recent searches and no selected city) — this is correct.

4. **`review_status` interaction**: The current code doesn't filter by `review_status`. If the search results page filters by `review_status = 'approved'`, there could be a mismatch between "Wo" counts (unfiltered) and actual search results. This is a pre-existing issue, not introduced by this fix. Document as follow-up.

5. **Race condition on rapid section switching**: If user rapidly switches between food/ummah/store, multiple fetches are in flight. The last one to resolve wins. With no abort mechanism, stale responses may briefly flash. Mitigate with `useEffect` cleanup + ignore flag if observed in testing.

6. **SSR/hydration**: `selectedSection` is initialized from URL params on the client side (`useState<Section>(urlSection)`), so there's no SSR concern. The effect runs after hydration.

7. **`fetchProviderCities()` (autocomplete) still unfiltered**: The city autocomplete dropdown (`fetchProviderCities`) doesn't filter by section. A user searching for "ummah" providers will see cities that only have food providers. Out of scope for this plan — document as follow-up.

## Follow-Up Items

| Item | Priority | Description |
|------|----------|-------------|
| `fetchProviderCities` section filter | Medium | City autocomplete should also filter by section to avoid showing cities with no providers in the current section |
| Add `AbortController` to loadPopularCities | Low | Prevent race conditions on rapid section switching |
| Consider `review_status` filter | Low | Align "Wo" counts with search result visibility |
| Consider dedicated RPC for city counts | Low | Replace client-side counting with a `search_provider_cities(section)` Postgres RPC for efficiency |

## Verification Steps

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Existing tests
npm test -- WoCityResults

# 4. New regression tests
npm test -- plan170-provider-count-regression

# 5. Full test suite
npm test
```

## Rollback

```bash
# If uncommitted:
git checkout -- \
  src/services/providers.ts \
  src/app/\(public\)/search/page.tsx

rm src/__tests__/regression/plan170-provider-count-regression.test.ts

# If committed:
git revert HEAD --no-edit
```
