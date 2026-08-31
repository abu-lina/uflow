---
ID: 172
Origin: 172
UUID: a8f3c2b1
Status: Active
---

# Implementation: Search Location Filter Persistence Bugfix

## Change Summary

### Fix A — `src/app/(public)/providers/ProvidersContent.tsx:128-136`

**Problem**: The location resolution chain fell through to stale `SearchContext` state when the URL had no `location` param. `normalizedUrlLocation` returned `null` when `rawLocationParam` was `null`, causing the `??` chain to fall through to `selectedLocation` (a stale context value from a previous search).

**Fix**:
- Imported `LOCATION_ALL` from `@/providers/search-provider` (the canonical empty-string sentinel)
- Changed `normalizedUrlLocation` to return `LOCATION_ALL` (`''`) when URL param is `null` (instead of `null`)
- Removed `selectedLocation` from the fallback chain entirely — URL is now the sole source of truth
- Changed fallback chain from `defaultLocation ?? normalizedUrlLocation ?? selectedLocation ?? ''` to `defaultLocation ?? normalizedUrlLocation`

### Fix B — `src/app/(public)/search/page.tsx:351-362`

**Problem**: The hydration effect ran on every mount and re-populated `selectedWoCity` from `localStorage`/`sessionStorage` even after the user had explicitly cleared it.

**Fix**: Added a session guard. Before reading stored city, check for `sessionStorage.getItem('uflow:wo-cleared-this-session')`. If present, skip hydration. The session flag is ephemeral — resets when the tab is closed — so onboarding data survives page refreshes in new sessions.

### Fix C — `src/app/(public)/search/page.tsx:504-507, 736-748`

**Problem**: Neither `handleWoClearSelection` nor the "Clear all" onclick handler cleared persistent storage. The stored city survived the clear action and was re-hydrated on the next mount.

**Fix**: Added the following three lines to both handlers:
- `localStorage.removeItem('selectedCity')`
- `sessionStorage.removeItem('selectedCity')`
- `sessionStorage.setItem('uflow:wo-cleared-this-session', 'true')`

## Files Changed

| File | Change |
|------|--------|
| `src/app/(public)/providers/ProvidersContent.tsx` | Fix A — location resolution |
| `src/app/(public)/search/page.tsx` | Fix B — hydration effect session guard |
| `src/app/(public)/search/page.tsx` | Fix C — storage cleanup in clear handlers |

## Files Created

| File | Purpose |
|------|---------|
| `src/__tests__/app/providers-content-location-resolution.test.tsx` | Tests for Fix A |
| `src/__tests__/app/search-page-storage.test.tsx` | Tests for Fix C |
| `src/__tests__/regression/plan172-location-persistence.test.tsx` | Regression test for full bug path |

## TDD Compliance Table

| Test | File | Status | Notes |
|------|------|--------|-------|
| URL location=Berlin → Berlin | `providers-content-location-resolution.test.tsx` | ✅ Pass | Correct resolution |
| URL location=Everywhere → LOCATION_ALL | `providers-content-location-resolution.test.tsx` | ✅ Pass | Legacy label normalized |
| URL location=Überall → LOCATION_ALL | `providers-content-location-resolution.test.tsx` | ✅ Pass | Legacy label normalized |
| URL location= (empty) → LOCATION_ALL | `providers-content-location-resolution.test.tsx` | ✅ Pass | Empty param preserved |
| No URL location + stale context → LOCATION_ALL | `providers-content-location-resolution.test.tsx` | ✅ Pass | **Regression test — was the bug** |
| No URL location + empty context → LOCATION_ALL | `providers-content-location-resolution.test.tsx` | ✅ Pass | Baseline |
| Wo clear → storage cleared + flag set | `search-page-storage.test.tsx` | ✅ Pass | Fix C verified |
| Clear all → storage cleared + flag set | `search-page-storage.test.tsx` | ✅ Pass | Fix C verified |
| No clear → storage preserved | `search-page-storage.test.tsx` | ✅ Pass | Baseline |
| Hydrate from localStorage | `plan172-location-persistence.test.tsx` | ✅ Pass | Fix B hydration |
| Remount with session flag → no re-hydrate | `plan172-location-persistence.test.tsx` | ✅ Pass | **Regression test — was the bug** |
| Fresh session → re-hydrates | `plan172-location-persistence.test.tsx` | ✅ Pass | Fix B new-session behavior |

## Test Evidence

```
✓ src/__tests__/app/providers-content-location-resolution.test.tsx (6 tests) 30ms
✓ src/__tests__/app/search-page-storage.test.tsx (3 tests) 76ms
✓ src/__tests__/regression/plan172-location-persistence.test.tsx (3 tests) 69ms
✓ src/__tests__/app/providers-content.layout-regression.test.tsx (1 test) 65ms
✓ src/__tests__/app/providers-page-location.test.tsx (5 tests) 5ms

Test Files  5 passed (5)
     Tests  18 passed (18)

TypeScript: npx tsc --noEmit → clean (no output)
```

## Risk Assessment

- **Header SearchBar** and **FigmaSearchBar** read `selectedLocation` from context for display — will now get `''` (rendered as "Everywhere") when no URL param, which is correct.
- **Results page sync** at line 358 writes the resolved `location` back to context — still works correctly since Fix A changes the source value but the sync logic is unchanged.
- **Saved page** reads `selectedLocation` as a client-side filter — getting `''` when the user last navigated without a location shows all saved items (correct behavior).
- **Categories service** receives the already-resolved `location` from `ProvidersContent`, not context directly — unaffected.
- **defaultLocation** prop (Stage 2 city filter on root URL) sits first in the `??` chain — unaffected.
