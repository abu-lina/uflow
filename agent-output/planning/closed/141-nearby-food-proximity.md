# Plan 141: "In der Nähe" — Nearby Food-Only Proximity Rework

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-06-04 | opencode (planner) | Initial implementation plan |

## Files Affected

| File | Action | Priority |
|------|--------|----------|
| `supabase/migrations/093_plan_141_nearby_food_haversine.sql` | **Create** — new migration with Haversine RPC + index | P0 |
| `src/features/providers/components/ProviderDetailSections.tsx` | **Edit** — replace inline query with RPC + fallback | P0 |
| `src/__tests__/features/providers/ProviderDetailSections.test.tsx` | **Edit** — update mocks, add food-only + fallback tests | P0 |
| `src/translations/en.ts` | **Edit** — update empty-state string | P1 |
| `src/translations/de.ts` | **Edit** — update empty-state string | P1 |
| `src/services/providers.ts` | **No change** (inline query stays in component, not extracted) | — |

---

## 1. Migration: `supabase/migrations/093_plan_141_nearby_food_haversine.sql`

### 1.1 RPC: `find_nearby_food_providers`

Uses Haversine formula (pure SQL, no PostGIS). Returns food providers within `p_radius_km` of the given coordinates, sorted by distance ascending.

```sql
BEGIN;

-- Plan 141: Nearby food providers via Haversine distance
DROP FUNCTION IF EXISTS public.find_nearby_food_providers;

CREATE OR REPLACE FUNCTION public.find_nearby_food_providers(
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_exclude_id UUID,
  p_radius_km NUMERIC DEFAULT 10,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(provider_id UUID, provider_name TEXT, distance_km NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    p.provider_id,
    p.provider_name,
    (6371 * acos(
      cos(radians(p_lat)) * cos(radians(p.location_latitude)) *
      cos(radians(p.location_longitude) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians(p.location_latitude))
    ))::NUMERIC AS distance_km
  FROM public.providers p
  WHERE p.listing_type = 'food'::listing_type_enum
    AND p.review_status = 'approved'
    AND p.provider_id <> p_exclude_id
    AND p.location_latitude IS NOT NULL
    AND p.location_longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(p_lat)) * cos(radians(p.location_latitude)) *
      cos(radians(p.location_longitude) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians(p.location_latitude))
    )) <= p_radius_km
  ORDER BY distance_km
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.find_nearby_food_providers IS
  'Returns up to p_limit food providers within p_radius_km of (p_lat, p_lon), excluding p_exclude_id, sorted by distance.';

REVOKE ALL ON FUNCTION public.find_nearby_food_providers FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_food_providers TO anon;
GRANT EXECUTE ON FUNCTION public.find_nearby_food_providers TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearby_food_providers TO service_role;

COMMIT;
```

### 1.2 Partial index

After the RPC, add a partial BTREE index on `(listing_type, review_status)` filtered to rows where both columns match the WHERE clause and lat/lng are non-null. This narrows the sequential scan to only relevant rows.

```sql
-- Run outside transaction for concurrent safety
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_food_approved_location
  ON public.providers (listing_type, review_status)
  WHERE listing_type = 'food'
    AND review_status = 'approved'
    AND location_latitude IS NOT NULL
    AND location_longitude IS NOT NULL;
```

**Note**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. The migration must either:
- Split into two migrations (one for RPC in BEGIN/COMMIT, one for index), or
- Run the index creation **after** `COMMIT` in the same file (Supabase dashboard SQL editor style), or
- Use a `DO $$` block with `EXECUTE` to conditionally create.

**Recommendation**: Keep it simple — use `CREATE INDEX IF NOT EXISTS` (non-concurrent) inside the same BEGIN/COMMIT block. For a table with <10K food rows, the lock window is negligible. Use CONCURRENTLY only if the table has high write volume in production.

---

## 2. Frontend: `ProviderDetailSections.tsx`

### 2.1 New query logic (replace lines 148-174)

Replace the inline `supabase.from('providers')` query with a two-path strategy:

1. **Primary path** (Haversine RPC): If `provider.location_latitude` and `provider.location_longitude` are both non-null, call `supabase.rpc('find_nearby_food_providers', ...)`.
2. **Fallback path** (city-based): If lat/lng is null, fall back to city-based food-only query — same as current but with `.eq('listing_type', 'food')` added and reduced limit to 5.

**Pseudo-code**:

```typescript
queryKey: ['provider-nearby-food', provider.provider_id, provider.location_latitude, provider.location_longitude, provider.address_city],

queryFn: async () => {
  type NearbyResult = { provider_id: string; provider_name: string };

  // Primary: Haversine RPC when lat/lng available
  if (provider.location_latitude != null && provider.location_longitude != null) {
    const { data, error } = await supabase.rpc('find_nearby_food_providers', {
      p_lat: provider.location_latitude,
      p_lon: provider.location_longitude,
      p_exclude_id: provider.provider_id,
      p_radius_km: 10,
      p_limit: 5,
    });

    if (error) {
      console.error('[find_nearby_food_providers] RPC error:', error);
      // Fall through to city-based fallback
    } else if (data && data.length > 0) {
      return data as NearbyResult[];
    }
    // RPC returned empty — fall through
  }

  // Fallback: city-based food-only query
  if (!provider.address_city) return [];

  const { data, error } = await supabase
    .from('providers')
    .select('provider_id, provider_name')
    .eq('address_city', provider.address_city)
    .eq('listing_type', 'food')
    .eq('review_status', 'approved')
    .neq('provider_id', provider.provider_id)
    .limit(5);

  if (error) {
    console.error('[find_nearby_food_providers] Fallback error:', error);
    return [];
  }

  return data ?? [];
},
```

### 2.2 Change queryKey

`['provider-nearby-city', ...]` → `['provider-nearby-food', ...]`

Include `location_latitude` and `location_longitude` in the key so the query auto-refetches if the provider coordinates change.

### 2.3 Update empty-state text

Change the render block to use food-specific wording (see Section 4). The component already reads `t('providerDetail.empty.noNearby')` — we'll replace the key with a food-specific one.

### 2.4 Clickable nearby providers (optional — Phase 3)

Not required for this plan. The analysis mentions it but we ship the distance + filter improvement first.

### 2.5 Keep existing states

- **Loading**: `t('providerDetail.loading.nearby')` — unchanged UX
- **Empty**: updated text (see Section 4)
- **Error**: returns `[]` which triggers empty state (same pattern)
- **List**: `<DetailListItem>` with `MapPin` icon — same as current

---

## 3. Tests: `ProviderDetailSections.test.tsx`

### 3.1 Test strategy

The test file already uses a globally mocked `useQuery` via `useQueryMock`. **The mock completely replaces the queryFn**, so the actual Supabase RPC call is never invoked in tests. This means:

- **No need to mock `supabase.rpc`** in test-utils.tsx
- **Tests assert behavior of the component** given controlled `useQuery` return values
- **We verify the queryKey changed** by inspecting `useQueryMock` call args

### 3.2 Existing test update

**Test**: `[post-review fix] shows loading state instead of empty-state while nearby query is loading` (line 34)

- No change needed in assertion logic (still checks loading text vs empty text)
- The mock returns `{ data: [], isLoading: true, isFetching: true }` — this works unchanged
- Optionally add a snapshot assertion against `useQueryMock.mock.calls` to verify `queryKey[0] === 'provider-nearby-food'`

### 3.3 New test: food-only filter (queryKey assertion)

```typescript
it('[plan-141] uses food-specific queryKey for nearby section', () => {
  useQueryMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });

  render(
    <ProviderDetailSections
      badges={[]}
      isLoadingBadges={false}
      provider={{ ...mockProviders[0], offers: [], needs: [] }}
    />,
  );

  const callArgs = useQueryMock.mock.calls.find(
    (args: unknown[]) => (args[0] as Record<string, unknown>).queryKey?.[0] === 'provider-nearby-food',
  );
  expect(callArgs).toBeDefined();
});
```

### 3.4 New test: fallback path when lat/lng is null

```typescript
it('[plan-141] renders nearby section with fallback city query when provider has no coordinates', () => {
  useQueryMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });

  render(
    <ProviderDetailSections
      badges={[]}
      isLoadingBadges={false}
      provider={{
        ...mockProviders[0],
        location_latitude: null,
        location_longitude: null,
        address_city: 'Berlin',
        offers: [],
        needs: [],
      }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
  expect(screen.getByText('No nearby providers found.')).toBeInTheDocument();
});
```

### 3.5 New test: nearby query returns data (smoke test)

```typescript
it('[plan-141] renders nearby provider names from query data', () => {
  useQueryMock.mockReturnValue({
    data: [
      { provider_id: 'nearby-1', provider_name: 'Restaurant A' },
      { provider_id: 'nearby-2', provider_name: 'Restaurant B' },
    ],
    isLoading: false,
    isFetching: false,
  });

  render(
    <ProviderDetailSections
      badges={[]}
      isLoadingBadges={false}
      provider={{ ...mockProviders[0], offers: [], needs: [] }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));
  expect(screen.getByText('Restaurant A')).toBeInTheDocument();
  expect(screen.getByText('Restaurant B')).toBeInTheDocument();
});
```

### 3.6 Verify existing tests still pass

All existing tests mock `useQueryMock` with `{ data: [], isLoading: ..., isFetching: ... }`. The component change:
- Changes queryKey (invisible to existing tests — they don't inspect the key)
- Changes queryFn (invisible — mocked away)
- Adds `listing_type` to fallback query (invisible — mocked away)
- Uses RPC as primary (invisible — mocked away)

**Risk**: The test at line 34 uses `mockProviders[0]` which has `location_latitude: 52.5200` and `location_longitude: 13.4050` (non-null). The new code will attempt RPC first. Since `useQuery` is mocked, the queryFn never executes — the test is unaffected.

---

## 4. Translations

### 4.1 Current values

| Key | EN | DE |
|-----|----|----|
| `providerDetail.empty.noNearby` | `"No nearby providers found."` | `"Keine Anbieter in deiner Nähe gefunden."` |
| `providerDetail.loading.nearby` | `"Loading providers..."` | `"Anbieter werden geladen..."` |

### 4.2 Proposed changes (food-specific wording)

Change `noNearby` value — keep the same key path to minimize translation file diffs:

| Key | EN | DE |
|-----|----|----|
| `providerDetail.empty.noNearby` | `"No nearby restaurants found."` | `"Keine Restaurants in der Nähe gefunden."` |
| `providerDetail.loading.nearby` | `"Loading nearby restaurants..."` | `"Restaurants in der Nähe werden geladen..."` |

**Rationale**: The section is now food-only, so "providers" → "restaurants" is accurate. Using the same keys avoids adding new translation strings across all 5 locale files (en, de, ar, tr, ps).

---

## 5. Implementation Order

| Step | File | Description | Depends On |
|------|------|-------------|------------|
| 1 | `supabase/migrations/093_plan_141_nearby_food_haversine.sql` | Create migration and run against UAT/prod | — |
| 2 | `src/features/providers/components/ProviderDetailSections.tsx` | Replace inline query with RPC + fallback | Step 1 (RPC must exist) |
| 3 | `src/__tests__/features/providers/ProviderDetailSections.test.tsx` | Update mocks, add new tests | Step 2 |
| 4 | `src/translations/en.ts` + `de.ts` | Update empty/loading strings | Step 2 |
| 5 | Run `npm run type-check && npm run lint` | Verify no type/lint regressions | Steps 2-4 |
| 6 | Run `npm test` | Verify all tests pass | Steps 3-4 |

---

## 6. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `acos(NaN)` from floating-point edge case in Haversine | Low (German latitudes 47-55°N) | Medium — query could silently fail | Add `GREATEST(-1, LEAST(1, ...))` wrap around acos argument if production data shows errors |
| Missing lat/lng on >50% of food providers | Medium | Low — falls back to city-based query transparently | No action needed; fallback handles this |
| Sequential scan too slow for food table | Low (<5K rows) | Low — acceptable for 5-row limit query | Add partial index as specified in Section 1.2 |
| Tests pass but RPC call fails in production | Low | Medium — empty state shown instead of data | Error logged to console; no user-facing crash |

---

## 7. Future Considerations

- **Radius customization**: The RPC accepts `p_radius_km` — future work could show a "within 5/10/25 km" toggle
- **Listing-type parameterization**: Adding `p_listing_type TEXT DEFAULT 'food'` to the RPC makes it reusable for "nearby stores" and "nearby ummah"
- **Distance display**: Show "1.2 km entfernt" on each nearby row — requires adding `distance_km` to the `DetailListItem` component
- **Clickable links**: Navigate to nearby provider detail page — requires adding `Link` wrapping around the item
- **Loading skeletons**: Replace text "Loading..." with skeleton placeholders for visual polish
