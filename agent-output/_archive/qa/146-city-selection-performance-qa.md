---
ID: 146
Origin: 146
UUID: f9a3d842
Status: Active
---

# QA Report: City Selection Performance Improvements

## Changelog
| Date | Note |
|------|------|
| 2026-06-05 | Initial QA |

## Test Execution
| Test Suite | Result |
|------------|--------|
| API route tests (`route.test.ts`) | pass (4/4) |
| City selection tests (`page.test.tsx`) | pass (3/3) |
| TypeScript compilation (`tsc --noEmit`) | pass |

All 7 tests pass. TypeScript compiles with zero errors.

## Verification Results

### Acceptance Criteria
| Criterion | Status | Evidence |
|-----------|--------|----------|
| `/api/cities` response includes `Cache-Control` header | ✅ | `route.ts:77` — `'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'`. Test at `route.test.ts:42` verifies header is present on 200, absent on 429/500 |
| First-visit list load time reduced via server data hydration | ✅ | `page.tsx` is now a server component (no `'use client'`). It calls `get_cities_with_counts()` via `createSupabaseServerClient()` and passes data as `initialCities` prop. React Query in `CitySelectionClient.tsx:107` uses `initialData` to hydrate on first render, eliminating the fetch-on-hydrate waterfall |
| City data renders immediately on JS hydrate | ✅ | Server fetches during SSR, client component renders with `initialData` populated. No skeleton flash for data that was available server-side |
| Migration is valid SQL | ✅ | `096_plan_146_city_selection_indexes.sql` — expression indexes match the exact `LOWER(TRIM(...))` patterns in `get_cities_with_counts()` RPC (`001_baseline.sql:344,349-350`). Names follow `idx_<table>_<expression>_<qualifier>` convention. `CONCURRENTLY` omitted per code review finding (Supabase CLI runs migrations in transactions); documented in header comment |

### Architecture Checks
| Check | Status | Evidence |
|-------|--------|----------|
| `page.tsx` is a server component | ✅ | No `'use client'`, uses `async`, imports `createSupabaseServerClient` from `server-only` path |
| Client component has `'use client'` | ✅ | `CitySelectionClient.tsx:1` |
| Server component fetches data | ✅ | `page.tsx:25-26` calls `supabase.rpc('get_cities_with_counts')` |
| Client component accepts `initialCities` prop | ✅ | `CitySelectionClient.tsx:60` — `{ initialCities?: CityData[] }` |
| React Query uses `initialData` for hydration | ✅ | `CitySelectionClient.tsx:107` — `initialData: initialCities` |
| Error handling in server component | ⚠️ | Try/catch present but `fetchError` variable (lines 22,30,36) is **dead code** — never passed to client component. On RPC error, `initialCities` is `[]` and client won't retry until `staleTime` expires (5 min) |

### Edge Case Analysis
| Scenario | Behavior | Assessment |
|----------|----------|------------|
| RPC returns empty array (no cities) | Server passes `[]`, client renders placeholders for Berlin/Frankfurt/Stuttgart | ✅ Works correctly |
| RPC errors | Server passes `initialCities = []`, error logged but not communicated to client. React Query treats `[]` as valid `initialData` and won't refetch for 5 min | ⚠️ Minor: user would see empty city list on server RPC failure for up to 5 min before client-side fetch retries |
| First visit (no React Query cache) | Server data hydrates React Query cache, no client fetch needed | ✅ Design target met |
| Repeat visit within `staleTime` (5 min) | React Query returns cached data, no network request | ✅ Correct |
| Repeat visit after `gcTime` (10 min) | React Query evicts cache, fires new fetch | ✅ Correct |
| Rate limited API request | Returns 429 with no `Cache-Control` header | ✅ Tested |
| RPC error in API route | Returns 500 with no `Cache-Control` header | ✅ Tested |

## Findings

### New
1. **[LOW] Dead code**: `fetchError` variable in `page.tsx:22` is assigned on error (lines 30, 36) but never passed to the client component or rendered. Remove it or pass it to `CitySelectionClient` for user-facing error display.
2. **[INFO] Test coverage gap**: The `useQuery` mock in `page.test.tsx:32-63` returns hardcoded data regardless of the `initialCities` prop value. The test at line 121-127 ("renders cities when initialCities prop is provided") doesn't verify `initialData` behavior — it passes because the mock ignores the prop entirely. The SSR hydration path is not explicitly tested.

### Resolved from Code Review
| Finding | Resolution |
|---------|------------|
| SSR hydration incomplete (server wrapper missing) | **Resolved**: `page.tsx` rewritten as server component that calls RPC and passes `initialCities` to client |
| `CONCURRENTLY` may fail with Supabase CLI | **Resolved**: `CONCURRENTLY` removed from migration, deployment paths documented in header comment |
| Debug `console.log` emits in production | **Resolved**: Log guarded behind `process.env.NODE_ENV !== 'production'` (`route.ts:62`) |
| TDD compliance | **Resolved**: Tests exist (7 passing). TDD table marks "No" for test-first compliance |

## Verdict
**Status**: PASS_WITH_NOTES

**Rationale**: All acceptance criteria are met, all tests pass, TypeScript compiles cleanly, and the architecture follows the plan. Two minor items noted (dead code in error handler, test mock doesn't exercise the `initialData` path), but neither blocks the core performance improvements — the server component now hydrates city data on first render, the migration creates the correct expression indexes, and HTTP caching is properly configured.

## Release Readiness
Ready for deployment. The three performance improvements (indexes, HTTP caching, server-side data hydration) are all implemented and verified. The minor findings can be addressed in a follow-up. Recommended to deploy and then verify index usage via `EXPLAIN ANALYZE` on UAT.
