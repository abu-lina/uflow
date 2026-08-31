---
ID: 146
Origin: 146
UUID: a3f8c91e
Status: Active
---

# City Selection Performance Analysis

## Changelog
| Date | Note |
|------|------|
| 2026-06-05 | Initial investigation |

## Value Statement
The city-selection page is the onboarding entry point for all new users. Slow load times increase bounce rate and reduce waitlist conversion. Fixing the identified bottlenecks will directly improve first-visit experience.

## Methodology
Read all relevant source files (`page.tsx`, API route, rate limiter, Supabase client, SQL migrations, service functions), inspected existing database indexes and the RPC function definition, and cross-referenced query patterns with index coverage.

## Findings

### 1. Missing Expression Indexes for LOWER+TRIM — Impact: HIGH
- **Evidence**: The `get_cities_with_counts()` RPC function (`supabase/migrations/001_baseline.sql:328-361`) uses `LOWER(TRIM(address_city))` in the providers subquery GROUP BY (line 344-349) and in the JOIN condition (line 350). The existing `idx_providers_city` is on plain `address_city` (`001_baseline.sql:3133`) — Postgres cannot use it with the expression wrapper. Similarly, `idx_cities_name` is on plain `city_name` (`001_baseline.sql:2893`), but the JOIN uses `LOWER(TRIM(c.city_name))`. The providers subquery also filters `WHERE review_status = 'approved'` — the existing `idx_providers_review_status` (line 3189) helps filter rows but the GROUP BY still requires a full sort on the transformed expression. As providers grow, this query degrades linearly.
- **Confidence Level**: 1 (Proven — documented index mismatch)

### 2. No HTTP Cache-Control on API Response — Impact: MEDIUM
- **Evidence**: The `/api/cities` route (`src/app/api/cities/route.ts`) returns `NextResponse.json(...)` with no `Cache-Control` header (line 67-72). The React Query client has `staleTime: 5min` and `gcTime: 10min` (`page.tsx:107-108`), but first visits and cache-miss refreshes must hit the full chain: API route → rate limiter → Supabase client init → RPC execution → response. With a `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` header, Cloudflare could serve cached responses without hitting the server at all.
- **Confidence Level**: 1 (Proven — code inspection)

### 3. Client-Side Fetch Waterfall (No SSR) — Impact: MEDIUM
- **Evidence**: The page is `'use client'` (`page.tsx:1`) with `useQuery` fetching via `fetch('/api/cities')` (`page.tsx:97-99`). The critical path is: JS bundle download → hydrate → React Query fires fetch → API route → Supabase → DB. This adds a full network round-trip before the user sees city data. The skeleton loading state (lines 530-549) mitigates visual emptiness but does not reduce time-to-content. An SSR or server component approach could eliminate this round-trip entirely by fetching during server render.
- **Confidence Level**: 1 (Proven — code inspection)

### 4. In-Memory Rate Limiter Resets on Cold Start — Impact: LOW
- **Evidence**: The rate limiter (`src/lib/rate-limit.ts:15`) uses a global in-memory `Map`. In serverless environments, each cold start gets a fresh Map, resetting the 20-request/hour limit. On multi-instance Docker deployments, each instance has an independent counter. However, the check itself is O(1) synchronous (no I/O), so it does not contribute to latency. This is a correctness concern, not a performance bottleneck.
- **Confidence Level**: 1 (Proven — code inspection)

### 5. Client Rendering Well-Optimized — Impact: LOW
- **Evidence**: Animations use a `hasAnimated` flag (`page.tsx:77,150-162`) to prevent re-animation on re-renders. City buttons are memoized via `useMemo` (line 413) with proper deps. Nominatim search is debounced at 300ms (line 247). AbortController prevents stale search requests (line 167-169). No client-side performance issues found.
- **Confidence Level**: 1 (Proven — code inspection)

## Remaining Gaps
| # | Unknown | Blocker | Required Action |
|---|---------|---------|-----------------|
| 1 | Actual query execution time on UAT Postgres | No access to UAT DB | Run `EXPLAIN ANALYZE SELECT ...` on the `get_cities_with_counts()` query against UAT data |
| 2 | Row counts for providers, cities, waitlist on UAT | No access to UAT DB | Query `SELECT count(*) FROM providers/review_status/...` on UAT |
| 3 | Whether Cloudflare caching is configured on `/api/*` routes | Not in codebase | Check Cloudflare dashboard cache rules |
| 4 | Supabase connection pool saturation under load | No load test results | Run a load test against `/api/cities` on UAT |

## Recommendations
1. **Create expression indexes** — Add these in a new migration:
   ```sql
   -- Enables index-only scan for the providers subquery in get_cities_with_counts()
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_city_lower_trim_approved
   ON providers(LOWER(TRIM(address_city)))
   WHERE review_status = 'approved' AND address_city IS NOT NULL;

   -- Enables index for the cities side of the JOIN
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_name_lower_trim
   ON cities(LOWER(TRIM(city_name)));
   ```
2. **Add HTTP caching** to `/api/cities/route.ts`:
   ```typescript
   return NextResponse.json(
     { data: citiesWithCounts || [], error: null },
     {
       status: 200,
       headers: {
         'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
       },
     }
   );
   ```
3. **Consider SSR or incremental SSG** for the city-selection page to eliminate the client fetch waterfall. A server component could call the RPC directly, providing data at render time.
4. **Monitor query performance** — After deploying indexes, run `EXPLAIN ANALYZE` on UAT to verify the plan changed from sequential scan to index scan.
