---
ID: 141
Origin: 141
UUID: 0c5a1e7b
Status: Active
---

# Implementation — Plan 141: Nearby Food Proximity (Haversine)

## Plan Reference

`agent-output/planning/141-nearby-food-proximity-plan.md`

## Changes Made

### 1. Migration: `supabase/migrations/093_plan_141_nearby_food_haversine.sql`

- Created `find_nearby_food_providers` RPC using Haversine distance formula
- Accepts `p_lat`, `p_lon`, `p_exclude_id`, `p_radius_km` (default 10), `p_limit` (default 5)
- Only returns approved food providers (`listing_type = 'food'`, `review_status = 'approved'`)
- acos argument clamped with `GREATEST(-1, LEAST(1, ...))` to prevent NaN from floating-point edge cases
- Uses `LANGUAGE sql SECURITY INVOKER` (per architect review: no STABLE)
- Grants to anon, authenticated, service_role
- Added partial index `idx_providers_food_approved_location` on `(listing_type, review_status)` filtered to food + approved + both coordinates non-null

### 2. Component: `src/features/providers/components/ProviderDetailSections.tsx`

- Replaced old city-only query with two-path strategy:
  - **Primary**: `supabase.rpc('find_nearby_food_providers', ...)` using lat/lng for Haversine proximity
  - **Fallback**: city-based `providers` table query with `listing_type = 'food'` filter when lat/lng unavailable or RPC returns empty/error
- Query key changed from `provider-nearby-city` to `provider-nearby-food` (includes lat/lng + city)

### 3. Tests: `src/__tests__/features/providers/ProviderDetailSections.test.tsx`

- Added `[plan-141] uses food-specific queryKey for nearby section` — verifies queryKey[0] is `provider-nearby-food`
- Added `[plan-141] renders nearby provider names from query data` — verifies Restaurant A and B appear in the Nearby section

### 4. Translations

- EN: `"No nearby providers found."` → `"No nearby restaurants found."`
- DE: `"Keine Anbieter in deiner Nähe gefunden."` → `"Keine Restaurants in der Nähe gefunden."`

## TDD Compliance

| Step | Action | Status |
|------|--------|--------|
| 1 | Write tests first (test file update) | ✅ |
| 2 | Modify component | ✅ |
| 3 | Create migration | ✅ |
| 4 | Update translations | ✅ |
| 5 | Run `npm run type-check` | ✅ 0 errors |
| 6 | Run `npm test -- --run` | ✅ 1302 passed, 22 skipped |

## Verification Results

- **type-check**: 0 errors
- **test**: 164 files passed, 1302 tests passed (22 skipped)
- **New tests**: Both Plan 141 tests pass — queryKey assertion and nearby data rendering
- **Existing tests**: All intact (no regressions from translation key changes — the old `"No nearby providers found."` string does not appear in loading-empty states)

## Fulfilled Architect Requirements

- ✅ `GREATEST(-1, LEAST(1, ...))` clamp around acos argument in both SELECT and WHERE
- ✅ `LANGUAGE sql SECURITY INVOKER` (no STABLE)
