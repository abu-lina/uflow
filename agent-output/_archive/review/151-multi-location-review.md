---
ID: 151
Origin: 151
UUID: cd74c4fe
Status: Active
---

# Code Review 151: Multi-Location Support

## Verdict
APPROVED_WITH_CHANGES

## Summary

Solid implementation overall with thorough test coverage (25 new tests, 0 regressions). Clean separation between migration, service, and UI layers. Well-executed backward compatibility with graceful fallbacks. One critical bug in the RPC function where empty-string numeric/boolean casts can crash the entire provider update.

## Findings

### Finding 1: Empty-string numeric/boolean casts crash admin RPC
- **File**: `supabase/migrations/102_plan_151_admin_location_upsert.sql`
- **Severity**: Critical
- **Lines**: 196-197, 201, 203, 221-222, 224, 226
- **Description**: `COALESCE((v_location->>'location_latitude')::numeric, ...)` evaluates the cast before COALESCE can fall back. When the admin form submits an empty string for `location_latitude`, `location_longitude`, `show_address`, or `is_primary`, PostgreSQL raises `invalid input syntax for type numeric/boolean` and the entire RPC call fails. The UPDATE path (lines 196-197) also lacks `NULLIF` unlike the string fields (lines 191-195).
- **Impact**: Any admin edit that includes a location with empty lat/lng will crash the save, losing all other changes in the same payload.
- **Recommendation**: Wrap numeric casts with `NULLIF(<value>, '')` and boolean casts the same way. For UPDATE:
  ```sql
  location_latitude = COALESCE(NULLIF(v_location->>'location_latitude', '')::numeric, location_latitude),
  location_longitude = COALESCE(NULLIF(v_location->>'location_longitude', '')::numeric, location_longitude),
  show_address = COALESCE(NULLIF(v_location->>'show_address', '')::boolean, show_address),
  is_primary = COALESCE(NULLIF(v_location->>'is_primary', '')::boolean, is_primary),
  ```
  For INSERT (lines 220-226):
  ```sql
  NULLIF(v_location->>'location_latitude', '')::numeric,
  NULLIF(v_location->>'location_longitude', '')::numeric,
  COALESCE(NULLIF(v_location->>'show_address', '')::boolean, true),
  COALESCE(NULLIF(v_location->>'is_primary', '')::boolean, false),
  ```

### Finding 2: Search queries don't include locations
- **File**: `src/services/providers.ts:502`
- **Severity**: Medium
- **Lines**: 469-502
- **Description**: The `searchProviders` function selects `'*, category:categories(...)'` without `locations(*)`. This means provider cards rendered from search results won't have location data, so the "N Standorte" badge and location-based address display won't appear there — only on detail pages.
- **Impact**: Inconsistent UX between search-result cards and detail-page cards. The "N Standorte" badge described in the plan won't appear on search results.
- **Recommendation**: Either add `locations(*)` to the search select (consider performance implications — locations should be small) or document this limitation explicitly in the plan. If excluding for performance, ensure the ProviderCard's fallback path covers this case (it does — tested).

### Finding 3: ProviderCard inline badge duplicates LocationBadge
- **File**: `src/components/providers/ProviderCard.tsx:474-480`
- **Severity**: Low
- **Description**: ProviderCard renders an inline "N Standorte" badge with identical styling to the `LocationBadge` component. This duplicates the component contract.
- **Impact**: Maintenance burden — any badge styling changes must be made in two places.
- **Recommendation**: Replace the inline badge with `<LocationBadge count={locations.length} providerId={provider_id} />`. Note the inline version doesn't link to `#locations`, so the LocationBadge behavior would be an improvement. If the card shouldn't link, add a `variant` prop to LocationBadge.

### Finding 4: Sync trigger doesn't handle is_primary downgrade
- **File**: `supabase/migrations/101_plan_151_multi_location.sql:46-49`
- **Severity**: Low
- **Lines**: 34-57
- **Description**: The `sync_primary_location_city` trigger only updates `providers.address_city` when `NEW.is_primary = TRUE`. If a location's `is_primary` is set from TRUE to FALSE (e.g., admin changes which location is primary), the trigger doesn't look up the new primary location — it sets `address_city` to `NEW.address_city` of the now-non-primary location.
- **Impact**: `providers.address_city` could fall out of sync if an admin downgrades a primary location.
- **Recommendation**: In the UPDATE branch, when `OLD.is_primary = TRUE AND NEW.is_primary = FALSE`, query for the remaining primary location and use that city instead. Since the admin upsert RPC sends all locations in one batch, this race condition window is small but real.

### Finding 5: City search filter ignores location-level data
- **File**: `src/services/providers.ts:593-594`
- **Severity**: Medium
- **Description**: The location-based filter uses `req.eq('address_city', location)` on the `providers` table. This only matches the primary location's city (synced via trigger). Non-primary locations' cities are invisible to search.
- **Impact**: A provider with a secondary location in Berlin won't appear when searching for Berlin.
- **Recommendation**: This is a scope limitation acknowledged in the plan. If full multi-location search is needed, the filter would need to use a subquery or join on `locations`. Document as a known limitation.

### Finding 6: Provider creation location insert not transactional
- **File**: `src/services/providerService.ts:271-287`
- **Severity**: Low (pre-existing)
- **Description**: `createPrimaryLocation` runs in parallel with other syncs via `Promise.all`. If the location insert fails after the provider INSERT succeeds, the provider is orphaned.
- **Impact**: Rare edge case — network failure between provider INSERT and location INSERT.
- **Recommendation**: Wrap the provider creation and location creation in a Supabase RPC function for atomicity, or at minimum implement compensating cleanup on failure. Pre-existing issue — not a blocker.

## Positive Aspects

1. **Backward compatibility**: Every component gracefully handles missing `locations` arrays and falls back to legacy address fields. Explicit test coverage for this path.
2. **URL-based location state**: Using `useSearchParams` for `?location=` across all three detail views (page, modal, mobile) is the right approach — enables deep linking and survives refresh.
3. **Upsert pattern**: The admin RPC correctly preserves existing `location_id` values, prevents unnecessary DELETE/INSERT churn, and handles the full CRUD cycle (create new, update existing, delete removed).
4. **Test quality**: 25 new tests covering migration, payload building, component rendering, and fallback behavior. Includes explicit `[post-fix PASSES] [pre-fix FAILS]` test naming for the upsert pattern.
5. **Partial unique index**: `idx_locations_unique_primary` correctly enforces one-primary-per-provider at the database level.
6. **RLS policies**: Locations table has proper per-row policies for SELECT (public), INSERT/UPDATE/DELETE (owner only). Admin RPC correctly uses SECURITY DEFINER + service_role gating.
7. **Type definitions**: Clean `Location` interface, well-integrated into existing `Provider` and `AdminProviderWithExtensions` types.
8. **No regression**: All 76 existing tests pass, type-check passes.

## Checklist

- [x] Security: RLS policies correct, SECURITY DEFINER correctly scoped, no injection vectors found
- [x] Performance: No N+1 (locations loaded via join in all query paths), partial unique index avoids full-table scans
- [x] Maintainability: Clean separation of concerns, good naming, single-responsibility components
- [x] Correctness: Push unique index enforces constraint, sync trigger works for common cases, backfill is idempotent
- [x] Plan alignment: Matches Milestones 6-10 deliverables in the implementation plan
- [x] Architecture alignment: Follows existing patterns (RPC for admin writes, service-role for admin reads, server/client separation)
- [x] Backward compatibility: ProviderCard and OpenStatusLine both fall back to legacy fields when `locations` is absent
- [ ] **Requires fix**: Finding 1 (Critical) must be resolved before merge
