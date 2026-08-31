---
ID: 146
Origin: 146
UUID: b4f7e21a
Status: Active
---

# City Selection Performance Improvement Plan

## Changelog
| Date | Note |
|------|------|
| 2026-06-05 | Initial plan |

## Objectives
- Reduce first-visit city list load time (from JS hydrate + fetch round-trip to server-rendered data)
- Reduce API response time for `/api/cities` via database index improvements
- Reduce origin server load via HTTP caching

## Scope

### In Scope
1. **Database expression indexes** — Add `LOWER(TRIM(...))` indexes matching the RPC query patterns
2. **HTTP caching** — Add `Cache-Control` header to `/api/cities`
3. **SSR evaluation** — Assess feasibility and recommend approach for server-side data fetching

### Out of Scope
- Rate limiter migration (in-memory `Map` → Redis/DB-backed) — low-impact correctness concern, not a performance bottleneck. HTTP caching in Step 2 already reduces server load.
- Nominatim search performance (external API, not in our control)
- Full conversion to server component (page heavily depends on browser APIs — see Step 3 evaluation)

## Implementation Steps

### Step 1: Expression Indexes Migration — File: `supabase/migrations/096_plan_146_city_selection_indexes.sql` — Risk: low
- **Description**: The `get_cities_with_counts()` RPC (defined in `001_baseline.sql:328-361`) uses `LOWER(TRIM(address_city))` in the providers subquery GROUP BY and JOIN condition, but existing indexes are on plain columns. Postgres cannot use them with expression wrappers. Add two indexes:

  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_city_lower_trim_approved
  ON providers(LOWER(TRIM(address_city)))
  WHERE review_status = 'approved' AND address_city IS NOT NULL;

  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_name_lower_trim
  ON cities(LOWER(TRIM(city_name)));
  ```

  **Waitlist check**: The waitlist subquery in the same RPC uses `selected_city` directly (no expression wrapper), and an existing partial index `idx_waitlist_selected_city` already covers it (`001_baseline.sql:3253`). No additional index needed.
- **Files to modify**: Create `supabase/migrations/096_plan_146_city_selection_indexes.sql`
- **Tests**: N/A (migration). After deployment, verify via `EXPLAIN ANALYZE` on UAT that the query plan uses index scans instead of sequential scans.

### Step 2: HTTP Caching on `/api/cities` — File: `src/app/api/cities/route.ts` — Risk: low
- **Description**: Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` header to the successful response. This lets Cloudflare (or any CDN) cache the response for 5 minutes, with stale-while-revalidate allowing background refresh for up to 10 more minutes. On cache-hit the origin server is never hit — bypassing rate limiter, Supabase client init, and RPC execution entirely.
- **Files to modify**: `src/app/api/cities/route.ts` (lines 67-73)
- **Tests**: Integration test that verifies `Cache-Control` header is present on 200 response and absent on 429/500 responses.

### Step 3: SSR Evaluation — Risk: med
- **Description**: The page is `'use client'` and heavily depends on browser APIs: `localStorage`, `sessionStorage`, `window.dispatchEvent`, `window.matchMedia`, Framer Motion (`motion`), `useState`, `useEffect`, `useRef`, `useRouter`. A full server component conversion is **not practical** — these APIs have no server equivalent.

  **Recommended approach: Server fetch + React Query hydration**:
  - Create a thin server component wrapper (e.g., `src/app/city-selection/page.tsx` becomes a server component that re-exports the client component)
  - Fetch city data in the server component using `createSupabaseServerClient`
  - Pass the initial data as a prop to the client component
  - In the client component, use `React Query`'s `initialData` option to hydrate from server data:

  ```typescript
  export default function CitySelectionPage({ initialCities }: { initialCities: CityData[] }) {
    const { data: allCitiesData } = useQuery({
      queryKey: ['cities'],
      queryFn: async (): Promise<CityData[]> => { /* same fetch */ },
      initialData: initialCities,  // <-- skip fetch on first render
      staleTime: 5 * 60 * 1000,
      // ...
    });
  }
  ```

  This eliminates the waterfall (JS load → hydrate → fetch → render) while preserving all client interactivity.
- **Files to modify**: `src/app/city-selection/page.tsx` (add prop, `initialData`), add server wrapper if needed
- **Tests**: Test that initial data renders correctly (no fetch needed on first render), test that stale data refresh still works after `staleTime` elapses.

## Test Plan
| Step | Test Type | What to Verify |
|------|-----------|----------------|
| 1 | Manual / `EXPLAIN ANALYZE` | Query plan shows index scan on `idx_providers_city_lower_trim_approved` and `idx_cities_name_lower_trim` |
| 2 | Integration | 200 response has `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`; 429/500 do not |
| 3 | Integration | Client renders city list without fetch on first mount when `initialData` is provided; refetch still works after `staleTime` |

## Rollback Plan
- **Step 1**: Run `DROP INDEX CONCURRENTLY IF EXISTS idx_providers_city_lower_trim_approved; DROP INDEX CONCURRENTLY IF EXISTS idx_cities_name_lower_trim;`
- **Step 2**: Revert the `Cache-Control` header addition
- **Step 3**: Remove `initialData` prop and server fetch wrapper, revert to pure client-side fetch

## Success Criteria
- `/api/cities` response includes `Cache-Control` header — verified via curl/integration test
- First-visit city list load time reduced by at least 1 client round-trip (~100-300ms depending on region)
- City data renders immediately on JS hydrate instead of waiting for fetch to complete
- Migration applies without errors, indexes visible in `\di`

## Timeline
| Step | Estimated Effort |
|------|-----------------|
| 1 — Expression indexes | 15 min (write SQL) |
| 2 — HTTP caching | 10 min (edit route + test) |
| 3 — SSR fetch hydration | 45 min (server wrapper + client prop plumbing + test) |

Total: ~1-2 hours for all three steps.
