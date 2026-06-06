---
ID: 151
Origin: 151
UUID: c4f7e2b1
Status: Active
---

# Architectural Critique 151: Multi-Location Support

## Verdict

APPROVED_WITH_CHANGES — the plan is structurally sound and follows the right approach (Option A from the analysis), but has several critical gaps and inconsistencies that must be resolved before implementation begins.

## Findings

### Finding 1: Missing Partial Unique Constraint for `is_primary`

- **Severity**: Critical
- **Description**: The `locations` table schema has no constraint preventing multiple rows with `is_primary = TRUE` for the same `provider_id`. Without this, a data bug or concurrent write could silently create two primary locations per provider. The denormalized `providers.address_city` sync (whatever mechanism chosen) would then pick an arbitrary primary, and city-based search results would be undefined.
- **Recommendation**: Add a partial unique index:
  ```sql
  CREATE UNIQUE INDEX idx_locations_unique_primary
    ON public.locations (provider_id)
    WHERE is_primary = TRUE;
  ```
  This is standard Postgres practice and matches the existing partial index patterns already in the codebase (e.g., `idx_providers_store_muslim_owned`).

### Finding 2: Haversine RPC (`find_nearby_food_providers`) Is Unaccounted For

- **Severity**: Critical
- **Description**: The `find_nearby_food_providers` RPC (migration `093_plan_141_nearby_food_haversine.sql`) reads `p.location_latitude` and `p.location_longitude` directly from `providers`. Neither the analysis nor the plan mentions this RPC. While Phase 1 keeps these denormalized columns on `providers`, this RPC will forever read the *primary* location's coords, which is probably correct for MVP. But if this is intentional, it should be stated explicitly. If not, it must be added to the Phase 2 rewrite list.
- **Recommendation**: Add an explicit callout in the Phase 1 plan: "`find_nearby_food_providers` is unaffected in Phase 1 because it reads denormalized coords from `providers`. It must be rewritten to `JOIN locations` in Phase 2 when per-location coords are supported."

### Finding 3: No Sync Mechanism Specified for Denormalized `providers.address_city`

- **Severity**: High
- **Description**: The plan says "Add trigger or app-level sync to keep `providers.address_city` in sync with primary location's city" but doesn't commit to which. This is a critical design decision:
  - **Trigger**: Atomic, can't be missed. But it adds hidden side effects to location writes, and the migration must be careful about `updated_at` recursion on the trigger.
  - **App-level sync**: Explicit, testable. But every code path that changes locations (creation, admin edit, future manage-locations dashboard) must remember to sync. Forgetting leads to silent data drift.
  - The existing admin RPC pattern (`admin_update_provider`) already does multi-table writes atomically, so adding location sync to the RPC is natural there. For the client-side creation path, a `syncPrimaryCity()` helper is needed.
- **Recommendation**: Use a **hybrid approach**: a Postgres trigger on `locations` for consistency (catches all writes), plus explicit sync in the admin RPC for transactional atomicity. Document that the trigger is the safety net. This must be spec'd in the migration SQL, not left open.

### Finding 4: City Queries Plan Self-Contradiction (Locations vs. Denormalized Column)

- **Severity**: High
- **Description**: The plan contradicts itself on city queries. It says:
  - "Keep `providers.address_city` as denormalized cache for RPC compatibility (Phase 1)"
  - But Milestone 3 says: `fetchProviderCities()` should query FROM locations, `fetchPopularCities()` same, `fetchFilteredCities()` same.

  If the denormalized column is the single source of truth for city-level search (as the analysis's Option A recommends), then `fetchProviderCities()` should continue reading from `providers.address_city`, not from `locations`. Querying from `locations` would mean a provider with 5 branches in 5 cities would appear in all 5 city filters — violating the "one result per provider" search model that the analysis explicitly chose.

- **Recommendation**: Keep `fetchProviderCities()`, `fetchPopularCities()`, and `fetchFilteredCities()` reading from the denormalized `providers.address_city` in Phase 1. Phase 2 can decide whether to:
  - Continue using the denormalized column (simpler, matches "one provider per city" model)
  - Query from `locations` with a filter for `is_primary = TRUE` (cleaner but requires JOIN)

### Finding 5: Admin RPC Delete-and-Reinsert for Locations Is Unsafe

- **Severity**: High
- **Description**: The plan says: "If `locations` array present: DELETE all existing locations, INSERT new ones." This is the pattern used for menu items and delivery links in the existing `admin_update_provider` RPC, but it is unsafe for locations because:
  - If the INSERT fails midway (partial write), **all locations for that provider are gone**.
  - It destroys and recreates `location_id` values, breaking any future references (bookmarks, per-location offers, analytics).
  - Menu items and delivery links don't have external FK references — locations will. Starting with the wrong pattern now builds in technical debt for Phase 2.
- **Recommendation**: Use an **upsert** pattern instead. Parse each location's `location_id`; if present, UPDATE it; if absent (new), INSERT it; locations in the DB but not in the payload get DELETEd. This preserves IDs for existing locations and is idempotent. The existing `food_menu` delete-and-reinsert is already a precedent you should not follow here.

### Finding 6: No URL-Param-Based Location Selection

- **Severity**: High
- **Description**: The plan stores the selected location only in React state (`[selectedLocationId, setSelectedLocationId]`). The analysis document (Section 9, Q3) explicitly recommends `?location={locationId}` in the URL for deep-linking and shareability. Without this:
  - Refreshing the page resets to primary location
  - Sharing a link to a specific branch is impossible
  - The browser back button doesn't work intuitively with location switches
- **Recommendation**: Use URL search params for the selected location. `useSearchParams` from Next.js is the canonical approach. The `ProviderDetailPage` should read `?location=` on mount and default to primary when absent. This is a small addition that prevents a significant UX debt.

### Finding 7: N+1 in `getProviderById` (Both Client and Server)

- **Severity**: Medium
- **Description**: The plan says `getProviderById()` will do a separate `supabase.from('locations').select('*').eq('provider_id', id)` after the provider query. This should instead be a single query with a `select(*, locations(*))` JOIN, or at minimum run in parallel with the existing `Promise.all` (which already fires 5+ parallel queries). An extra sequential round-trip on the most-called provider detail function will measurably increase page load time.
- **Recommendation**: Use:
  ```typescript
  const { data } = await supabase
    .from('providers')
    .select('*, category:categories(...), locations(*)')
    .eq('provider_id', id)
    .maybeSingle();
  ```
  This adds the JOIN in the same query. Supabase's PostgREST handles this efficiently. No extra round trips.

### Finding 8: Backfill Not Idempotent

- **Severity**: Medium
- **Description**: The backfill INSERT is described as a simple `INSERT INTO locations ... SELECT ... FROM providers`. If the migration is re-run, this will create duplicate locations. With ~1,323 providers, this likely won't hit constraint violations since there's no unique constraint on `provider_id` alone (which is fine — providers can have multiple locations).
- **Recommendation**: Add `ON CONFLICT DO NOTHING` to the backfill, or better, use a `WHERE NOT EXISTS` subquery. The migration should also be wrapped in a transaction (`BEGIN; ... COMMIT;`) to ensure atomicity.

### Finding 9: Missing Phase 2 RPC Audit List

- **Severity**: Medium
- **Description**: The plan mentions "RPC rewrites to use locations table directly" for Phase 2 but doesn't enumerate the affected RPCs. There are at least 6:
  1. `search_providers` — `p.address_city` → `l.address_city` join
  2. `search_providers_enhanced` — same
  3. `get_filtered_cities_by_search` — `p.address_city` → locations
  4. `get_cities_with_counts` — providers subquery → locations subquery
  5. `get_provider_count_by_city` — `providers.address_city` → locations
  6. `find_nearby_food_providers` — `p.location_latitude`/`longitude` → locations
- **Recommendation**: Add the full RPC list to the plan so Phase 2 scope is clear and no RPCs are missed during migration.

### Finding 10: `OpeningHours` Import Path Not Validated

- **Severity**: Low
- **Description**: The plan's `Location` interface references `OpeningHours | null` without showing the import. The existing codebase uses `import type { OpeningHours } from '@/types/openingHours'`. This should work, but the plan should confirm the type is compatible with the JSONB storage format.
- **Recommendation**: Verify `OpeningHours` type allows the same shape stored in `locations.opening_hours` JSONB. This is likely fine but worth a quick check before implementation.

## Design Review Summary

The plan correctly chooses Option A (separate `locations` table with denormalized `address_city` cache), which aligns with the existing extension table pattern from migration 083. The phased approach (RPC rewrites deferred to Phase 2) is pragmatic and reduces regression risk.

The critical issues are: (1) missing partial unique constraint for primary location, (2) unspecified sync mechanism for the denormalized column, (3) self-contradictory city query strategy, and (4) the Haversine RPC blind spot. None of these are fundamental design flaws — they are specification gaps that must be closed.

Secondary issues around the admin RPC delete-and-reinsert, URL-based location state, and N+1 queries represent UX and data integrity risks that are worth fixing now rather than accumulating technical debt.

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Dual primary locations break city search | Low (with constraint) | High | Add partial unique index (Finding 1) |
| 2 | Denormalized column drifts from locations table | Medium | Medium | Use trigger + explicit sync (Finding 3) |
| 3 | Admin edit deletes all locations on partial failure | Low | Critical | Use upsert pattern (Finding 5) |
| 4 | City filters show wrong providers because querying locations instead of denormalized column | Medium (if city queries are changed as planned) | High | Keep city queries on denormalized column (Finding 4) |
| 5 | Location state lost on page refresh | High | Low-Medium | Add `?location=` URL param (Finding 6) |
| 6 | Backfill creates duplicate locations if migration re-run | Medium | Medium | Add `ON CONFLICT DO NOTHING` (Finding 8) |

## Recommendations

1. **Before implementation**: Resolve Findings 1-4 — these are blockers. The partial unique index, sync mechanism, city query strategy, and Haversine RPC audit must be specified in the plan before any code is written.

2. **During implementation**: Fix Findings 5-8 — the admin upsert pattern, URL-param location state, N+1 query optimization, and backfill idempotency. These are lower-effort but prevent significant future pain.

3. **Documentation**: Add the Phase 2 RPC audit list (Finding 9) so the full migration scope is visible.

4. **Test coverage note**: The plan's test strategy is solid. Add a specific test for the `is_primary` uniqueness constraint violation, and a regression test that `fetchProviderCities()` returns the correct cities (matching primary location, not all locations).

5. **Release sequencing**: The schema migration (M1) can run independently and early. Allowing it to bake in staging for a day before deploying code changes would catch any migration timing issues.
