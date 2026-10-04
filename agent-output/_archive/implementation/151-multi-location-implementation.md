# Implementation 151: Multi-Location Support — Milestones 6-10

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/102_plan_151_admin_location_upsert.sql` | Updates `admin_update_provider` RPC with location upsert pattern |
| `src/features/providers/components/LocationCard.tsx` | Reusable location card component |
| `src/features/providers/components/LocationBadge.tsx` | "N Standorte" pill badge |
| `src/__tests__/services/admin/providerEdit-locations.test.ts` | Admin edit locations payload tests (5 tests) |
| `src/features/providers/__tests__/LocationCard.test.tsx` | LocationCard component tests (7 tests) |
| `src/features/providers/__tests__/LocationBadge.test.tsx` | LocationBadge component tests (4 tests) |
| `src/features/providers/__tests__/OpenStatusLine.test.tsx` | OpenStatusLine location-aware tests (4 tests) |
| `src/__tests__/components/ProviderCard-multi-location.test.tsx` | ProviderCard multi-location regression tests (5 tests) |

## Files Modified

| File | Change |
|------|--------|
| `src/services/admin/providerEdit.ts` | Added `LocationEditData` interface, `buildLocationsPayload()`, extended `buildRpcPayload()` to include locations |
| `src/services/admin/providers.ts` | `getProviderForAdmin()` now left-joins `locations(*)` |
| `src/features/providers/components/OpenStatusLine.tsx` | Accepts optional `locationId` prop, resolves from `provider.locations` |
| `src/components/providers/ProviderCard.tsx` | Reads address from `locations[0]` (primary), shows "N Standorte" badge, falls back to legacy address fields |
| `src/components/providers/ProviderDetailPage.tsx` | Added locations section (mobile + desktop), `useSearchParams` for `?location=`, location switching via URL |
| `src/components/providers/ProviderDetailModal.tsx` | Added locations section in right panel, `useSearchParams` for `?location=`, address from selected location |
| `src/components/providers/MobileProviderDetail.tsx` | Added locations section, `useSearchParams` for `?location=` |

## Key Decisions

1. **Upsert pattern** for admin location edits: existing `location_id` values are preserved. Locations in DB but not in payload are deleted. New locations (no `location_id`) are inserted. This is the safe approach recommended by the architecture critique.

2. **URL search params** (`?location=`) for location state across all three detail views. Enables deep-linking, survives refresh, works with browser back/forward.

3. **Backward compat**: ProviderCard falls back to legacy address fields when `locations` array is absent. OpenStatusLine falls back to `provider.opening_hours` when no `locationId` or when the ID doesn't match.

4. **Migration 102**: Replaces the entire `admin_update_provider` RPC (rather than patching) because the locations block weaves into the middle of the existing logic. The RPC signature is unchanged (`UUID, JSONB` → `JSONB`).

## Test Results

```
Test Files  9 passed (9)
Tests       101 passed (101)
  25 new tests for multi-location features
  76 existing tests — zero regressions

TypeScript: npm run type-check — PASS (no errors)
```

## Verification Commands

- `npm run type-check` — PASS
- `npm test` — 1503 passed, 22 skipped, 1 failed (pre-existing migration test)
