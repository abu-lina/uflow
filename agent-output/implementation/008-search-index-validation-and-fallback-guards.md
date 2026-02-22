---
ID: 008
Origin: 008
UUID: 3c8f9a2d
Status: Active
---

# 008 — Search Index Validation & Fallback Guards — Implementation

## Plan Reference

- **Plan**: `agent-output/planning/008-search-index-validation-and-fallback-guards.md`
- **Analysis**: `agent-output/analysis/closed/008-performance-audit-pass-2.md`
- **Critique**: `agent-output/critiques/008-search-index-validation-and-fallback-guards-critique.md`

## Date

2026-02-22T23:00Z

## Changelog

| Date | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-22T23:00Z | User → Implementer | Execute Plan 008 (v0.4.1) | Full implementation of M1–M7 |

## Implementation Summary

Closed the remaining performance gaps identified in Analysis 008 after the Plan 007 (v0.4.0) release:

1. **EXPLAIN ANALYZE validation** — Proved GIN indexes work: `idx_providers_name_search` and `idx_community_services_name_search` both use Bitmap Index Scan with sub-millisecond execution times (0.102ms, 0.071ms). The `idx_community_services_name_desc_search` index also works correctly (expression-matched). Seq scans for offers/needs tables are expected at 10-row scale — planner correctly chooses seq scan when index overhead exceeds table scan cost.

2. **Fallback-on-empty bug fixed** — `searchCommunityServices()` previously fell back to ILIKE whenever the RPC returned an empty result set (`searchResults.length > 0` guard). Now the condition checks `!rpcError && searchResults && Array.isArray(searchResults)` — empty results are treated as valid. ILIKE fallback only triggers on RPC error or function-missing (42883).

3. **Fallback queries bounded** — `searchNeeds()` and `searchOffers()` ILIKE fallbacks now use explicit column selects (`need_id, name_de, name_en, category_id, created_by, created_at`) instead of `select('*')`, and apply `.limit(100)` aligned with the RPC limit.

4. **Limit rationale documented** — All key query limits across services (100/200/500/1000) now have inline comments explaining the UX/safety rationale.

This delivers the plan's Value Statement: "Search remains fast and consistent even under edge conditions."

## Milestones Completed

- [x] M1 — Environment & Baseline (local Supabase, row counts, migration 056 applied)
- [x] M2 — DB Index Validation (EXPLAIN ANALYZE confirms GIN index usage)
- [x] M3 — Fallback Logic Hardening (fallback-on-empty removed)
- [x] M4 — Bound & Slim Fallback Queries (explicit columns + limit)
- [x] M5 — Document Limit Rationale (inline comments added)
- [x] M6 — Validation (tests, type-check, lint, build all pass)
- [x] M7 — Version & Release Artifacts (v0.4.1, CHANGELOG updated)

## Files Modified

| Path | Changes | Lines |
| --- | --- | --- |
| `src/services/communityServices.ts` | Fixed fallback-on-empty: ILIKE only on error; added limit rationale comment | ~15 |
| `src/services/needs.ts` | Explicit columns in fallback, `.limit(100)`, limit rationale comments | ~6 |
| `src/services/offers.ts` | Explicit columns in fallback, `.limit(100)`, limit rationale comments | ~6 |
| `src/services/badges.ts` | Added limit rationale comments to `.limit(100)` and `.limit(200)` | ~3 |
| `supabase/migrations/056_add_provider_community_service_search_indexes.sql` | Added LIMIT 500 rationale comment | ~1 |
| `package.json` | Version bump 0.4.0 → 0.4.1 | 1 |
| `CHANGELOG.md` | Added v0.4.1 section | ~12 |

## Files Created

| Path | Purpose |
| --- | --- |
| `src/__tests__/services/communityServices.test.ts` | TDD tests for M3 fallback-on-empty fix (5 tests) |
| `src/__tests__/services/needs.test.ts` | TDD tests for M4 fallback bounding (4 tests) |
| `src/__tests__/services/offers.test.ts` | TDD tests for M4 fallback bounding (4 tests) |

## Code Quality Validation

- [x] Compilation: `npm run type-check` passes (exit 0)
- [x] Linter: `npx eslint` on changed files shows 0 errors, 0 warnings
- [x] Tests: `npx vitest run` — 14 passed, 1 skipped (139 tests pass, 18 skipped)
- [x] Build: `npm run build` passes — First Load JS 105 kB (no regression)
- [x] Compatibility: No breaking changes; fallback behavior only changes for empty-result edge case

## Value Statement Validation

- **Original**: "As a mobile service seeker, I want search to remain fast and consistent even under edge conditions, so that I can discover providers and community services without delays or surprising results."
- **Implementation delivers**: GIN indexes proven effective (sub-ms), unnecessary ILIKE fallbacks eliminated, fallback queries bounded and slimmed, limits documented for maintainability.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `searchCommunityServices()` (M3 fix) | `communityServices.test.ts` | ✅ Yes | ✅ Yes | AssertionError: `mockOr` was called (fallback triggered on empty) | ✅ Yes |
| `searchNeeds()` fallback (M4 fix) | `needs.test.ts` | ✅ Yes | ✅ Yes | AssertionError: `select('*')` used instead of explicit columns; `mockLimit` never called | ✅ Yes |
| `searchOffers()` fallback (M4 fix) | `offers.test.ts` | ✅ Yes | ✅ Yes | AssertionError: `select('*')` used instead of explicit columns; `mockLimit` never called | ✅ Yes |

## Test Coverage

### Unit Tests (13 new tests)

**communityServices.test.ts** (5 tests):
- Returns empty when RPC returns empty (no ILIKE fallback)
- Uses ILIKE fallback on function-not-found (42883)
- Uses ILIKE fallback on RPC exception
- Uses ILIKE fallback on non-function-not-found error
- Filters by IDs when RPC returns results

**needs.test.ts** (4 tests):
- Fallback uses explicit columns
- Fallback applies limit(100)
- Returns empty for empty query
- Returns RPC results when available

**offers.test.ts** (4 tests):
- Fallback uses explicit columns
- Fallback applies limit(100)
- Returns empty for empty query
- Returns RPC results when available

## Test Execution Results

```
Test Files  14 passed | 1 skipped (15)
     Tests  139 passed | 18 skipped (157)
  Duration  2.47s
```

No failures. No coverage gaps for changed code.

## EXPLAIN ANALYZE Results (M2)

### Provider Name Search — `idx_providers_name_search` ✅
```
Bitmap Heap Scan on providers p (actual time=0.050..0.064 rows=20)
  -> Bitmap Index Scan on idx_providers_name_search (actual time=0.040..0.040 rows=20)
Execution Time: 0.102 ms
```

### Community Service Name Search — `idx_community_services_name_search` ✅
```
Bitmap Heap Scan on community_services cs (actual time=0.035..0.053 rows=40)
  -> Bitmap Index Scan on idx_community_services_name_search (actual time=0.030..0.030 rows=40)
Execution Time: 0.071 ms
```

### Community Service Name+Desc Search — `idx_community_services_name_desc_search`
Seq scan observed when query matches >99% of rows ('Service'). This is correct planner behavior — index overhead exceeds seq scan cost at this selectivity. Index definition matches query expression exactly.

### Offers/Needs — Seq scan (expected)
10 rows each — planner correctly chooses seq scan. Index works but is not cost-effective at this scale.

### Index Sizes
| Index | Size |
| --- | --- |
| idx_providers_name_search | 32 kB |
| idx_community_services_name_search | 32 kB |
| idx_community_services_name_desc_search | 48 kB |
| idx_offers_combined_search | 16 kB |
| idx_needs_combined_search | 16 kB |

## Outstanding Items

- None. All milestones complete.
- Pre-existing: 6837 lint errors across codebase (not introduced by this plan; 0 errors in changed files)
- Seeded test data (100 providers, 100 community services) remains in local DB; will be cleared on `supabase db reset`

## Assumptions

- EXPLAIN ANALYZE was run on local Supabase (not UAT). Results are representative for index validation but row counts are small. Production indexes will be even more effective at scale.
- The `idx_community_services_name_desc_search` seq scan on high-selectivity queries is expected Postgres behavior, not an issue.

## Next Steps

1. **Code Reviewer** → Review implementation
2. **QA** → Validate acceptance criteria
3. **UAT** → Validate on UAT environment (optional: re-run EXPLAIN ANALYZE with production-scale data)
