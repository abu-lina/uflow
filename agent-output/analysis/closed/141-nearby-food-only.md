# Analysis: "In der Nähe" (Nearby) Section — Food-Only Rework

## 1. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-06-04 | opencode (analysis) | Initial analysis for Plan 141 — nearby food-only proximity rework |

## 2. Value Statement

The "In der Nähe" section currently shows up to 5 providers in the same city regardless of type (food, store, ummah). This dilutes relevance: a user viewing a halal restaurant sees mosques and community centers mixed in, with no way to find nearby food options. Restricting to `listing_type = 'food'` and improving the proximity signal (beyond bare city-name match) will make this section a genuine discovery tool for restaurant-goers.

## 3. Current Behavior Analysis

### 3.1 Source location
`src/features/providers/components/ProviderDetailSections.tsx:148-174`

### 3.2 Query logic (lines 152-174)

```typescript
queryKey: ['provider-nearby-city', provider.provider_id, provider.address_city],
queryFn: async () => {
  if (!provider.address_city) return [];
  const { data, error } = await supabase
    .from('providers')
    .select('provider_id, provider_name')
    .eq('address_city', provider.address_city)
    .eq('review_status', 'approved')
    .neq('provider_id', provider.provider_id)
    .limit(5);
  if (error) return [];
  return data ?? [];
},
staleTime: 5 * 60 * 1000,
```

### 3.3 Problems identified

| # | Problem | Severity |
|---|---|---|
| 1 | **No `listing_type` filter** — all provider types returned. A restaurant detail page shows mosques and stores in "Nearby". | High (user-facing) |
| 2 | **City-name exact match only** — `address_city = 'Berlin'` misses providers in `'Berlin Mitte'`, `'Berlin-Kreuzberg'`, or adjacent postal codes. | Medium |
| 3 | **No geo-distance** — `location_latitude`/`location_longitude` exist on every row but are never used. | Missed opportunity |
| 4 | **Error silently swallowed** — `if (error) return []` masks Supabase errors during debugging. | Low (dev UX) |
| 5 | **No sorting** — results use default table order, not distance or relevance. | Medium |
| 6 | **No link/navigation** — `nearby.provider_name` is plain text, not a clickable link to the provider detail. | Medium (UX) |

### 3.4 Render logic (lines 229-245)

The section renders inside an `ExpandSection` with three states:
- Loading: "Loading providers..." (loading + isFetching)
- Empty: "No nearby providers found."
- List: `<DetailListItem>` rows with `MapPin` icon

**Confidence level for findings: 1 (Proven)** — verified by direct source inspection.

## 4. Data Model Capabilities

### 4.1 Relevant columns on `public.providers`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `listing_type` | `listing_type_enum` (`'food'`, `'store'`, `'ummah'`) | NOT NULL (since M-5a) | Direct filter for food-only |
| `address_city` | `text` | Yes | Current proximity key; free-text, no normalization |
| `address_zip` | `text` | Yes | German 5-digit postal code available |
| `location_latitude` | `numeric(10,8)` | Yes | Present on most rows (populated by JoinHalal import/enrichment) |
| `location_longitude` | `numeric(11,8)` | Yes | Same |
| `address_country` | `text` | Yes | Default `'DE'` |
| `review_status` | `review_status` enum | Yes | Must be `'approved'` to show publicly |
| `provider_id` | `uuid` | NOT NULL (from `providers` PK) | — |
| `provider_name` | `text` | Yes | — |

### 4.2 Existing index
An archive migration (078, phase0_schema_hygiene) conditionally created:
```sql
CREATE INDEX IF NOT EXISTS idx_providers_city_listing_type
  ON public.providers (address_city, listing_type);
```
This index supports Option A queries directly.

### 4.3 Extension availability
- **PostGIS**: NOT enabled. No `CREATE EXTENSION postgis` found in any migration.
- **earthdistance / cube**: NOT enabled.
- **pg_trgm**: Not relevant here (full-text search, not geo).

### 4.4 RPC function pattern
The project has an established pattern for `supabase.rpc()` calls (e.g., `search_providers`, `search_food_menu_items`, `search_provider_ids_by_name`). A new `rpc` for nearby geo would follow the same pattern.

## 5. Proximity Approach Comparison

### Option A: Enhanced City/Zip Match

**Mechanism**: Add `.eq('listing_type', 'food')` to the existing query. Optionally add `.eq('address_zip', provider.address_zip)` for tighter proximity, falling back to city.

**Changes required**:
1. Add `.eq('listing_type', 'food')` to the query (1 line)
2. Optionally add `.eq('address_zip', provider.address_zip)` with `.or()` fallback to city
3. Add `address_city` and optionally `address_zip` to `.select()` for display context
4. Update tests to assert food-only filtering

**Pros**:
- Zero migrations, zero new RPCs — works immediately in 5 minutes
- Uses existing `idx_providers_city_listing_type` index — performant
- Predictable, debuggable, no new failure modes
- Zip code match is meaningful in Germany (5-digit PLZ maps to ~10-30km² areas)

**Cons**:
- Not true distance-based — city or zip boundaries are administrative, not radial
- A provider at the edge of one zip code misses the restaurant across the street in the next zip
- Cities like "Berlin" are too large — a restaurant in Spandau shows one in Köpenick (~30km apart) as "nearby"
- No sort order — results aren't ordered by proximity

**Confidence: 1 (Proven)** — code change is mechanical, index confirmed.

---

### Option B: Haversine Formula via Postgres RPC

**Mechanism**: Create a new SQL RPC function (e.g., `find_nearby_food_providers`) that takes `lat`, `lon`, `provider_id`, `radius_km` and returns food providers within that radius using the Haversine formula.

**Example SQL** (embedded in migration):
```sql
CREATE OR REPLACE FUNCTION public.find_nearby_food_providers(
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_exclude_id UUID,
  p_radius_km NUMERIC DEFAULT 10,
  p_limit INT DEFAULT 5
) RETURNS TABLE(provider_id UUID, provider_name TEXT, distance_km NUMERIC) 
LANGUAGE sql STABLE
AS $$
  SELECT
    p.provider_id,
    p.provider_name,
    (6371 * acos(
      cos(radians(p_lat)) * cos(radians(p.location_latitude)) *
      cos(radians(p.location_longitude) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians(p.location_latitude))
    ))::numeric AS distance_km
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
```

**Changes required**:
1. New migration file in `supabase/migrations/`
2. Replace inline query in `ProviderDetailSections.tsx` with `supabase.rpc('find_nearby_food_providers', { ... })`
3. Update tests to mock RPC call instead of inline query
4. Return `distance_km` in select (optional for display)

**Pros**:
- True great-circle distance — accurate within ~0.5% over 1000km
- Configurable radius — can show "within 5km" vs "within 10km"
- Sorted by nearest first — best UX
- No PostGIS dependency, pure SQL
- Follows existing RPC pattern (matching `search_providers`, `search_food_menu_items`, etc.)
- Works for any provider with lat/lng (enriched via JoinHalal import)

**Cons**:
- Requires `location_latitude` and `location_longitude` on the provider row — some providers may lack these (fallback needed)
- Haversine in SQL must compute `acos(cos(...))` which has floating-point edge cases at antipodal points (negligible for German geo at ~49-55°N)
- Indexing for distance queries: without PostGIS GIST index, this does a full table scan filtered by listing_type + review_status (acceptable for `food` subset, likely <10K rows in Germany)
- Migration + deployment required

**Performance note**: With `listing_type = 'food'` + `review_status = 'approved'` + `location_latitude IS NOT NULL`, the filtered set should be small enough that sequential scan with Haversine is acceptable (<500 rows). If needed, partial index on `(listing_type, review_status)` would narrow the scan.

**Confidence: 2 (Observed)** — Haversine is mathematically proven; performance estimation requires production row counts.

---

### Option C: PostGIS Extension

**Mechanism**: Enable `postgis` extension, add a `GEOGRAPHY(Point)` computed column, create GIST index, query with `ST_DWithin`.

**Changes required**:
1. `CREATE EXTENSION postgis` migration (requires Supabase project-level permission)
2. Add computed column or trigger-maintained `geography` column
3. Create GIST index
4. New RPC using `ST_DWithin(geog, ST_MakePoint(p_lon, p_lat), radius_meters)`
5. Update frontend query

**Pros**:
- Gold standard — industry standard for production geo queries
- GIST index makes distance queries O(log n) instead of O(n)
- `ST_Distance` returns accurate spheroid distances
- Rich API for complex spatial queries (buffer, contains, intersects)

**Cons**:
- Requires Supabase project-level PostGIS extension enablement — not always available or may need support ticket
- Adds ~2MB+ to database size
- Migration is non-trivial (computed column + index + RPC)
- Overkill for a simple "show 5 nearby restaurants" feature
- PostGIS GIST indexes have higher maintenance overhead

**Confidence: 1 (Proven)** for technical feasibility; **3 (Inferred)** for Supabase project compatibility — we have not confirmed PostGIS is allowed in this Supabase project.

---

### Comparison Matrix

| Criterion | Option A (City/Zip) | Option B (Haversine RPC) | Option C (PostGIS) |
|---|---|---|---|
| **True distance** | No — administrative boundaries | Yes — great-circle | Yes — spheroid |
| **Migrations needed** | 0 | 1 | 2+ (extension + column + index) |
| **Deploy time** | Minutes | Hours (review + test + migrate) | Days (extension approval) |
| **Data completeness risk** | Low (city always filled) | Medium (lat/lng may be null) | Medium (same as B) |
| **Performance** | Excellent (indexed) | Good (seq scan on filtered set) | Excellent (GIST index) |
| **Sorting** | None (table order) | By distance | By distance |
| **Configurable radius** | No | Yes | Yes |
| **Operational overhead** | None | Low | Medium |
| **Supabase dependency** | None | None | Extension enablement |
| **Test complexity** | Low | Medium | Medium |

## 6. Recommended Approach

**Option B (Haversine RPC)** with an Option A fallback for providers without lat/lng.

### Rationale

1. **User value**: Distance-sorted results with configurable radius is the feature users actually want. "Nearby" should mean "geographically near," not "same municipality."

2. **Architecture fit**: The RPC pattern is already well-established (6+ RPCs in the codebase). A `find_nearby_food_providers` RPC follows the same conventions as `search_providers`, `search_food_menu_items`, etc.

3. **No external dependency**: Unlike PostGIS, Haversine is pure SQL. Zero extension enablement, zero approval process.

4. **Acceptable performance**: The `food` listing type subset (likely <5K rows in Germany) with `review_status = 'approved'` filter makes sequential scan viable. If performance degrades, a partial index on `(listing_type, review_status)` WHERE listing_type = 'food' narrows the scan trivially.

5. **Future-proof**: The RPC signature can be extended later to accept `listing_type_filter` as parameter (for nearby stores or ummah services).

### Fallback strategy

When `location_latitude` IS NULL for the current provider (or no results returned by Haversine), fall back to Option A (city + listing_type match). The query should attempt Haversine first, then city-based as a fallback.

### Radius default

Start with **10km** — appropriate for urban German contexts where "nearby" restaurants means walkable or short transit.

## 7. Test Coverage Analysis

### Existing test coverage

| Test | File:Line | What it covers |
|---|---|---|
| `[post-review fix] shows loading state instead of empty-state while nearby query is loading` | `ProviderDetailSections.test.tsx:34-57` | Only loading/empty state — does NOT test actual query logic |
| `[post-fix PASSES] does not render noAlcohol and noPork...` | `:59-82` | Unrelated (values & amenities) |
| `[post-review fix] renders values and menu as icon + text rows` | `:84-118` | Unrelated |
| `[figma alignment] renders opening-hours rows...` | `:120-160` | Unrelated |
| Remaining tests | `:162-277` | Unrelated (halal check / trust badges) |

**Coverage gap**: The nearby query itself has ZERO logic tests. The test mocks `useQuery` entirely, so the actual Supabase query (filtering, listing_type, error handling) is never exercised.

### Tests needed for implementation

| Test type | What to assert | Priority |
|---|---|---|
| **Unit: query building** | With `listing_type = 'food'`, RPC returns nearby providers sorted by distance | Critical |
| **Unit: fallback** | When lat/lng is null, falls back to city-based query | High |
| **Unit: empty state** | RPC returns empty array → shows "No nearby restaurants found" | High |
| **Unit: loading state** | RPC is pending → shows loading message | Medium (already exists) |
| **Unit: error state** | RPC returns error → shows empty state (or error message) | Medium |
| **Regression: all types** | Without `listing_type` filter, old query should not run (food-only assertion) | Medium |
| **Integration (optional)** | Full component render with mocked RPC returning data | Low |

### Specific test changes needed

1. The test at line 34 mocks `useQuery` with `{ data: [], isLoading: true }`. After refactor, `queryKey` changes from `['provider-nearby-city', ...]` to `['provider-nearby-food', ...]`. The mock must be updated for the new key.

2. A new test should assert that the mock query is called with the correct RPC parameters. Since `useQuery` is mocked, we can inspect the `queryFn` argument.

3. The German empty-state text should be verified if changed (e.g., "Keine Restaurants in der Nähe gefunden" instead of "Keine nahegelegenen Anbieter gefunden").

## 8. Confidence Levels

| Finding | Level | Evidence |
|---|---|---|
| Current query has no `listing_type` filter | 1 (Proven) | Direct source inspection, lines 159-165 |
| `location_latitude`/`location_longitude` exist on `providers` table | 1 (Proven) | Schema in migration 001_baseline.sql:1968-1969 |
| `listing_type_enum` has values `'food'`, `'store'`, `'ummah'` | 1 (Proven) | Migration 0061_phase4_semantic_constraints.sql + 083_m5a |
| No PostGIS extension in any migration | 1 (Proven) | Grep across all migrations: zero matches |
| Archive migration 078 created `idx_providers_city_listing_type` | 2 (Observed) | Archive file exists; unclear if it was applied. Likely yes since it used conditional `IF EXISTS` guards. |
| Existing Nearby test covers only loading state, not query logic | 1 (Proven) | Direct test file inspection, lines 34-57 |
| Haversine RPC follows established project pattern | 1 (Proven) | 6+ existing RPCs with identical call pattern |
| Error in current query silently returns `[]` | 1 (Proven) | Line 168: `if (error) return []` |
| PostGIS is available/enabled in Supabase project | 3 (Inferred) | Not checked against the actual Supabase dashboard. Supabase generally allows PostGIS but requires explicit enable. |

## 9. Gap Tracking

| # | Unknown | Blocker | Required Action | Owner |
|---|---|---|---|---|
| 1 | How many `food` providers have non-null `location_latitude`? | No production DB access | Run `SELECT listing_type, COUNT(*) FILTER (WHERE location_latitude IS NOT NULL) / COUNT(*)::float AS pct FROM providers GROUP BY listing_type;` in Supabase SQL editor | Implementer |
| 2 | Is `idx_providers_city_listing_type` present on production? | No production DB access | Run `SELECT indexname FROM pg_indexes WHERE tablename = 'providers';` | Implementer |
| 3 | What is the approximate row count for `food + approved` providers? | No production DB access | Run approximate count on production | Implementer |
| 4 | Is PostGIS extension allowed in this Supabase plan? | No Supabase admin access | Check Supabase dashboard → Database → Extensions, or run `SELECT * FROM pg_available_extensions WHERE name = 'postgis';` | Implementer |
| 5 | Should nearby results link to the provider detail page? | Not specified in requirements | Confirm with stakeholder. Current impl is plain text. | Product owner |
| 6 | Should German empty-state text change from "Anbieter" to "Restaurants"? | i18n decision | Confirm preferred wording for food-only context. | Product owner |

## 10. Actionable Implementation Recommendations

### Phase 1: Minimal viable (estimated effort: 1-2h)

1. **Add `listing_type = 'food'` filter** to the existing inline query (Option A baseline)
   - Change: add `.eq('listing_type', 'food')` to query chain
   - Update queryKey to `['provider-nearby-food', ...]` to avoid stale cache
   - Deployable independently, immediate UX improvement

### Phase 2: Haversine RPC (estimated effort: 4-6h)

2. **Create migration `093_plan_141_nearby_food_haversine.sql`** with:
   - `find_nearby_food_providers(lat, lon, exclude_id, radius_km DEFAULT 10, limit_count DEFAULT 5)` RPC
   - Partial index: `CREATE INDEX IF NOT EXISTS idx_providers_food_location ON public.providers (listing_type, review_status) WHERE listing_type = 'food' AND review_status = 'approved' AND location_latitude IS NOT NULL;`
   - Return columns: `provider_id`, `provider_name`, `distance_km`

3. **Refactor `ProviderDetailSections.tsx`**:
   - Replace inline query with RPC call
   - Add fallback: if current provider lacks lat/lng, use city-based Option A
   - Add `distance_km` to display (e.g., "1.2 km entfernt")
   - Make providers clickable (link to provider detail page)

4. **Update translations**:
   - Change `noNearby` to food-specific wording (e.g., `"noNearbyRestaurants"`)
   - Add distance format key if showing km

5. **Add tests**:
   - Mock RPC return with 3 nearby restaurants sorted by distance
   - Test fallback when lat/lng is null
   - Test error handling
   - Test empty state

### Phase 3: Polish (optional)

6. Show distance in UI ("0.8 km" badge on each nearby item)
7. Add clickable navigation (link to provider detail page)
8. Consider increasing limit from 5 to 8-10 for richer display
9. Add loading skeletons instead of text

### Migration file naming

The next migration number should be determined from `supabase/migrations/` — highest current number is `092`. New migration: `093_plan_141_nearby_food_haversine.sql`.

### Key files to modify

| File | Change |
|---|---|
| `src/features/providers/components/ProviderDetailSections.tsx` | Replace inline query with RPC + fallback |
| `src/services/providers.ts` | Optionally add a `findNearbyFoodProviders` service function |
| `supabase/migrations/093_plan_141_nearby_food_haversine.sql` | New: Haversine RPC + index |
| `src/__tests__/features/providers/ProviderDetailSections.test.tsx` | Update mocks, add query logic tests |
| `src/translations/en.ts` + de/ar/tr/ur/ps.ts | Update empty/loading strings |

### Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Missing lat/lng on many food providers | Medium | Fallback to city-based Option A |
| Haversine performance degrades at scale | Low (food subset is small) | Add partial index; re-evaluate at 10K+ food providers |
| PostGIS request blocked if explored later | N/A | Not needed — Haversine is sufficient |
| Tests fail after RPC refactor | Medium | Update mocks before refactoring code |
