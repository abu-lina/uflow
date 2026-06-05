---
ID: 146
Origin: 146
UUID: d4c9b12f
Status: Active
---

# City Selection Performance Improvement - Implementation

## Changelog
| Date | Note |
|------|------|
| 2026-06-05 | Initial implementation |
| 2026-06-05 | Fix: Server wrapper created, CONCURRENTLY removed, console.log env-guarded (per code review) |

## Files Modified
| File | Change |
|------|--------|
| `supabase/migrations/096_plan_146_city_selection_indexes.sql` | New — expression indexes for LOWER(TRIM(...)) patterns in get_cities_with_counts() (CONCURRENTLY removed for Supabase CLI compatibility) |
| `src/app/api/cities/route.ts` | Added `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` header; guarded debug console.log behind `NODE_ENV !== 'production'` |
| `src/app/city-selection/page.tsx` | Rewritten as server component — fetches city data via `createSupabaseServerClient().rpc('get_cities_with_counts')` and passes to CitySelectionClient |
| `src/app/city-selection/CitySelectionClient.tsx` | NEW — extracted client component with all interactive UI; accepts `initialCities` prop for React Query `initialData` hydration |
| `src/app/city-selection/page.test.tsx` | Updated to import from `CitySelectionClient` |
| `src/app/api/cities/route.test.ts` | New — tests for Cache-Control header on 200, absent on 429/500 |

## TDD Compliance
| Requirement | Status |
|-------------|--------|
| Tests written first? | No (migration + post-implementation tests) |
| Tests exist for changes? | Yes |

## Verification
| Check | Result |
|-------|--------|
| tsc --noEmit | pass |
| Tests pass (7/7) | pass |

## Architecture
- Server component (`page.tsx`) fetches data and hydrates the client
- Client component (`CitySelectionClient.tsx`) handles all interactivity (localStorage, search, animations)
- React Query still handles background cache refresh after staleTime
- Cache-Control header reduces server hits for cached responses
