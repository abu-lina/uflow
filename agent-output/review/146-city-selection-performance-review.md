---
ID: 146
Origin: 146
UUID: e7f3a2c4
Status: Active
---

# Code Review: City Selection Performance Improvements

**Plan Reference**: `agent-output/planning/146-city-selection-performance-plan.md`
**Implementation Reference**: `agent-output/implementation/146-city-selection-performance-impl.md`
**Date**: 2026-06-05

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-06-05 | Code Reviewer | Plan 146 code review | Review of migration, API route, page component, and tests |

## Architecture Alignment

**Alignment Status**: MINOR_DEVIATIONS

The implementation follows the plan's general direction but Step 3 (SSR hydration) is only partially done — the client prop exists but no server wrapper was created to populate it. The architecture pattern (expression indexes, HTTP caching) is correct. The migration file sequence number (096) follows project conventions.

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: No
**Concerns**:

- Table says `N/A (migration)` for "Tests written first?" — this conflates migration (no tests needed) with API route and page changes (should have tests). The API route and page changes should have been tested first. Tests exist, but they weren't written first.
- The `useQuery` mock in `page.test.tsx` returns hard-coded data regardless of the `initialCities` prop value, so the `initialData` behavior is never actually tested.

## Findings

### Critical

None

### High

None

### Medium

**[MEDIUM] Performance**: SSR hydration (Step 3) incomplete — `initialCities` prop is dead code without a server wrapper

- **Location**: `src/app/city-selection/page.tsx:60`, `src/app/city-selection/page.tsx:107`
- **Issue**: The `initialCities` prop was added to the client component and wired to React Query's `initialData`, but no server component wrapper was created to populate this prop. The App Router renders `page.tsx` directly — it only passes `params` and `searchParams`, not `initialCities`. Without a server wrapper (e.g., a thin `page.tsx` server component that calls `get_cities_with_counts` and passes data to a client child), `initialCities` is always `undefined` in production. The plan explicitly recommended creating this wrapper.
- **Impact**: The main performance benefit of Step 3 — eliminating the client fetch waterfall via SSR data hydration — is not realized. The page still requires JS bundle download → hydrate → fetch → render before showing city data. The `initialCities` prop and `initialData` plumbing exist but are inert.
- **Recommendation**: Create a server component wrapper at `src/app/city-selection/page.tsx` (convert back to server component) that:
  1. Uses `createSupabaseServerClient` to call `get_cities_with_counts` RPC
  2. Passes the data as `initialCities` to a client child component
  3. Move the current client logic to `src/app/city-selection/CitySelectionClient.tsx`
  
  Alternatively, document in the implementation doc that Step 3 is deferred and remove the dead code to avoid confusion.

**[MEDIUM] Operations**: `CREATE INDEX CONCURRENTLY` may fail with Supabase CLI v2.92+

- **Location**: `supabase/migrations/096_plan_146_city_selection_indexes.sql:19-25`
- **Issue**: The migration contains two `CREATE INDEX CONCURRENTLY` statements. Supabase CLI v2.92+ wraps each migration file in a pipeline (transaction), and `CREATE INDEX CONCURRENTLY` cannot run inside a transaction (`SQLSTATE 25001`). Even in standalone migration files, multiple `CONCURRENTLY` statements in one file are known to fail with recent CLI versions.
- **Impact**: If applied via `supabase db push` with a recent CLI version, the migration will fail and the indexes will not be created. This blocks the primary database-level performance improvement (Finding 1 in the analysis).
- **Recommendation**: Apply these indexes via a non-transactional path (production CI script using `psql` directly, or Supabase Dashboard SQL editor). If using the CLI, either:
  - Split into two migration files (one index per file)
  - Drop `CONCURRENTLY` (acceptable if provider/cities tables are small; locks writes but works in-transaction)
  - Run `supabase db push --no-tx` if available, or use a custom script

### Low/Info

**[LOW] Observability**: Debug `console.log` emits city data on every API call

- **Location**: `src/app/api/cities/route.ts:62-64`
- **Issue**: Every successful response logs city names and provider counts. In production with thousands of requests, this generates noise in logs.
- **Recommendation**: Either remove the log, guard it behind `process.env.NODE_ENV !== 'production'`, or reduce frequency (sample rate).

**[LOW] TDD Compliance**: Tests were not written first for non-migration changes

- **Location**: `agent-output/implementation/146-city-selection-performance-impl.md:27`
- **Issue**: The TDD table marks "N/A" for "Tests written first?" but the API route and page changes are non-migration code that should have tests written before implementation.
- **Recommendation**: Either correct the TDD table to "No" or, ideally, ensure future non-migration work follows test-first practice.

**[INFO] Test**: `initialCities` tests don't exercise the actual feature path

- **Location**: `src/app/city-selection/page.test.tsx:121-135`
- **Issue**: The `useQuery` mock (lines 32-63) returns hard-coded city data regardless of `initialCities` prop value. Test 2 ("renders cities when initialCities prop is provided") passes only because the mock ignores the prop — it doesn't verify that `initialData` actually provides the initial state.
- **Recommendation**: If the SSR hydration step is completed (server wrapper added), write a test that verifies `initialCities` data renders without a fetch. If deferred, these tests provide basic backward-compatibility coverage which is still valuable.

## Positive Observations

- **Migration documentation is excellent**: The header comment clearly explains WHY the indexes are needed, references the RPC function definition, and describes each index's purpose. This sets a high bar for migration documentation.
- **Cache-Control edge cases tested**: The API route tests verify the header is present on 200 and absent on 429 and 500 responses — exactly the right coverage.
- **Backward compatibility**: The `initialCities` prop is optional, so existing usage (without the prop) continues to work.
- **Rate limiting preserved**: The rate limit check remains in place before any processing occurs.
- **No injection vectors**: The migration uses parameterized DDL, the API route passes no user input to the RPC, and error messages are generic — all good security practices.
- **Test naming convention**: The `[post-fix PASSES]` prefix on regression tests matches the project convention from existing tests.

## Verdict

**Status**: APPROVED_WITH_COMMENTS
**Rationale**: No CRITICAL or HIGH findings. The code is correct, secure, and backward-compatible. Two MEDIUM issues should be addressed in the current cycle:

1. Complete the SSR hydration (server wrapper) to realize Step 3's performance benefit, or remove the dead `initialCities` prop and document the deferral.
2. Verify the deployment path for `CREATE INDEX CONCURRENTLY` — the migration SQL is correct, but the deployment tooling needs attention.

## Required Actions

1. Address the incomplete SSR hydration — create a server component wrapper or remove dead code. This is a gap between the plan and implementation that needs resolution.
2. Verify the `CREATE INDEX CONCURRENTLY` migration can be applied via your deployment pipeline. If using `supabase db push`, test against the target CLI version or prepare an alternative application path.
3. (Optional) Guard the `console.log` on lines 62-64 with an environment check.

## Next Steps

1. Implement server component wrapper for city-selection page (if the SSR hydration improvement is desired)
2. Verify migration deployment mechanism for CONCURRENTLY indexes
3. Run `EXPLAIN ANALYZE` on UAT after indexes are applied to confirm the query plan changed from sequential scan to index scan
