---
ID: 008
Origin: 008
UUID: 3c8f9a2d
Status: Planned
---

# Performance Audit Pass 2 — Post-Plan 007 Assessment

**Date**: 2026-02-22  
**Agent**: Analyst  
**Source**: Retrospective 007 deferred items + Orchestrator triage findings

## Changelog

| Date | Action | Summary |
| --- | --- | --- |
| 2026-02-22 | Analysis created | Comprehensive performance audit after Plan 007 (v0.4.0) |
| 2026-02-22 | Status → Planned | Handoff to Plan 008 (search index validation + fallback guards) |

---

## Value Statement and Business Objective

**As a platform operator**, I want **to identify and eliminate remaining performance bottlenecks** after the successful v0.4.0 bundle reduction, **so that** search queries remain fast under load, database indexes are proven effective, and we maintain sub-second page loads for mobile users at scale.

**Business Value**: Sustaining fast performance builds user trust and reduces bounce rates, directly supporting the Master Product Objective of making UFlow the "first thought" for service discovery.

---

## Context

Plan 007 (Performance Improvements v0.4.0) was released on 2026-02-22 with exceptional results:
- **Bundle size**: Reduced from 687 kB → 105 kB (85% reduction, 70% under target)
- **Search optimization**: Replaced ILIKE with tsvector RPC for providers/categories
- **Database indexes**: Added GIN indexes via migration 056
- **Query bounds**: Added limits to prevent unbounded fetches

However, the retrospective flagged several deferred items (P3-P5) and the Orchestrator identified potential gaps requiring investigation. This analysis validates those findings and identifies any new performance concerns.

### Scope

**In-scope**:
- Validate search RPC usage across all services
- Assess `select('*')` over-fetching impact
- Verify GIN index effectiveness (EXPLAIN ANALYZE where possible)
- Review query limit rationale
- Identify any new performance regressions post-v0.4.0

**Out-of-scope**:
- Frontend bundle analysis (already successful)
- New feature performance (not yet implemented)
- Infrastructure scaling (Hetzner Cloud, CDN)

---

## Methodology

Investigation techniques used:
1. **Code inspection**: Read all service files for search patterns, ILIKE usage, select patterns
2. **Migration review**: Analyzed migrations 014, 033, 056 for RPC function definitions and indexes
3. **Build analysis**: Ran `ANALYZE=true npm run build` to confirm current bundle state
4. **Gap tracking**: Validated Orchestrator findings against actual code behavior

**Skills loaded**:
- `analysis-methodology` — Confidence levels, gap tracking
- `postgres-best-practices` — Query performance, index usage patterns
- `engineering-standards` — SOLID, DRY assessment

---

## Findings

### Finding 1: communityServices.ts Uses Correct RPC Pattern (CONFIDENCE: **Proven**)

**Severity**: 🟢 **INFO** (Corrects Orchestrator misclassification)

**What was found**:
- Lines 108-114: Service calls `search_community_services_enhanced` RPC (defined in migration 014)
- Lines 136, 141: ILIKE fallback triggers only when RPC fails OR returns empty results
- This is the CORRECT pattern, matching needs.ts and offers.ts

**Evidence**:
```typescript
// Line 108: Primary RPC call
const { data: searchResults, error: rpcError } = await supabase.rpc('search_community_services_enhanced', {
  search_query: query.trim(),
  category_filter: isValidCategoryId(category) ? category : null,
  city_filter: isValidLocation(location) ? location : null,
  limit_count: limit || 1000,
  offset_count: offset || 0,
});

// Lines 136, 141: Documented fallback (only on RPC failure)
req = req.or(`community_service_name.ilike.%${query.trim()}%,community_service_description.ilike.%${query.trim()}%`);
```

**Conclusion**: Orchestrator finding that "communityServices.ts uses ILIKE as PRIMARY search path" is **incorrect**. The service uses tsvector RPC correctly with a safety fallback.

**Action**: None required. Pattern is correct and consistent with project standards.

---

### Finding 1b: communityServices.ts Falls Back on Empty Results (CONFIDENCE: **Proven**)

**Severity**: 🟡 **MEDIUM** (Unnecessary work + potential behavior mismatch)

**What was found**:
- In `src/services/communityServices.ts`, the code only uses RPC results when `searchResults.length > 0`.
- If RPC succeeds but returns an empty array (a valid “no matches” outcome), the logic currently falls back to ILIKE.

**Why it matters**:
- **Performance**: The ILIKE fallback will still execute a query even though the RPC already answered “no matches”.
- **Correctness/UX**: Fallback may return different results than full-text search (broader substring matches), changing behavior depending on whether the RPC returns zero.

**Recommendation**:
- Only execute ILIKE fallback when RPC errors (function missing or other error), not when RPC returns an empty result set.
- If the desired behavior is “broader matching when FTS returns none”, make that an explicit product decision and bound it (limit + explicit columns) to avoid expensive scans.

---

### Finding 2: ILIKE Fallbacks Are Migration-Safe and Appropriate (CONFIDENCE: **Proven**)

**Severity**: 🟢 **INFO** (Validates existing pattern)

**What was found**:
All three services (needs.ts, offers.ts, communityServices.ts) implement the same pattern:
1. Try tsvector RPC first
2. Check for "function not found" error (code 42883)
3. Fallback to ILIKE with debug logging
4. Throw error if fallback also fails

**Evidence**:
```typescript
// needs.ts lines 73-82, offers.ts lines 98-107 (identical pattern)
const isFunctionNotFound = 
  error?.code === '42883' || 
  error?.message?.includes('does not exist') ||
  error?.message?.includes('function') && error?.message?.includes('not found');

if (isFunctionNotFound) {
  // Silently fallback - this is expected during migration
  console.debug('Full-text search function not available, using ILIKE fallback');
}
```

**Rationale**: This pattern is necessary because:
- Migration 014/033 define the RPC functions, but not all environments may have them yet
- Allows graceful degradation during deployment
- Debug logging helps operators detect environments without functions

**Conclusion**: ILIKE fallbacks are **intentional, documented, and correct**. Not a performance issue.

**Action**: None required. Consider removing fallbacks in future major version after all environments are confirmed to have RPC functions.

---

### Finding 3: select('*') Over-Fetching — Mixed Impact (CONFIDENCE: **Proven**)

**Severity**: 🟡 **MEDIUM** (Performance improvement opportunity)

**What was found**:
17 instances of `select('*')` across services, with varying impact levels:

| File | Lines | Context | Impact | Rationale |
|---|---|---|---|---|
| **categories.ts** | 56, 139, 152, 165, 179, 192 | Category metadata fetch | **LOW** | Categories table is small (~100 rows), all columns needed for UI |
| **badges.ts** | 49, 79, 111, 567, 704 | Badge types, confirmations | **LOW** | Badge tables are small, SELECT * acceptable for admin operations |
| **needs.ts** | 22, 88 | Needs search (primary + fallback) | **MEDIUM** | Only need name_de, name_en, category_id for search results |
| **offers.ts** | 7, 47, 113 | Offers search (primary + fallback) | **MEDIUM** | Only need name_de, name_en, category_id for search results |
| **communityServices.ts** | 228 | Single service detail fetch | **LOW** | Detail page needs all columns |

**Postgres-best-practices assessment**: Rule 6.2 (Eliminate N+1 Queries) recommends explicit selects for frequently-called endpoints to reduce payload size. However, for small tables (<1000 rows), SELECT * is acceptable.

**Prioritized by hotpath frequency**:
1. **HIGH**: needs.ts (line 88) — ILIKE fallback in user-facing search
2. **HIGH**: offers.ts (line 113) — ILIKE fallback in user-facing search  
3. **MEDIUM**: needs.ts (line 22), offers.ts (lines 7, 47) — Used when RPC works (most cases)
4. **LOW**: All others (admin/detail pages, small tables)

**Recommendation**: 
- Replace SELECT * in needs.ts and offers.ts fallback queries with explicit columns:
  ```typescript
  .select('need_id, name_de, name_en, category_id, created_by, created_at')
  ```
- Leave categories/badges SELECT * unchanged (small tables, acceptable overhead)

---

### Finding 4: Query Limits Lack Documented Rationale (CONFIDENCE: **Observed**)

**Severity**: 🟡 **MEDIUM** (Technical debt, not immediate perf issue)

**What was found**:
Various query limits across services with no documented rationale:
- `search_needs`: 100 (line 46)
- `search_offers`: 100 (line 71)
- `search_community_services_enhanced`: 1000 (line 112)
- `search_provider_ids_by_name`: 500 (migration 056, line 56)
- `badge_confirmations`: 200 (badges.ts, line 570)
- `badge_types`: 100 (badges.ts, line 52)

**Postgres-best-practices Rule 6.3**: Use cursor-based pagination instead of LIMIT/OFFSET for large datasets. Current implementation uses OFFSET which degrades at scale.

**Observed pattern**: Limits appear to be "reasonable guesses" rather than data-driven decisions. Retro 007 P5 flagged this as needing ADR or inline documentation.

**Recommendation**:
1. **Immediate**: Add inline comments explaining each limit choice (e.g., "100 = UX constraint of autocomplete dropdown")
2. **Future (v0.5.0)**: Migrate to cursor-based pagination for search endpoints (use `created_at` + `id` cursor)

---

### Finding 5: GIN Indexes Created But Not Validated (CONFIDENCE: **Inferred**)

**Severity**: 🟠 **HIGH** (Deferred from Plan 007, blocks confidence in index effectiveness)

**What was found**:
Migration 056 created 3 GIN indexes:
```sql
-- Line 18-21
CREATE INDEX IF NOT EXISTS idx_providers_name_search
ON public.providers USING gin(to_tsvector('german', provider_name));

-- Line 24-27
CREATE INDEX IF NOT EXISTS idx_community_services_name_search
ON public.community_services USING gin(to_tsvector('german', community_service_name));

-- Line 30-33
CREATE INDEX IF NOT EXISTS idx_community_services_name_desc_search
ON public.community_services USING gin(
  to_tsvector('german', community_service_name || ' ' || COALESCE(community_service_description, ''))
);
```

**Problem**: No EXPLAIN ANALYZE validation was performed to confirm:
1. Indexes are being used (not sequential scan)
2. Index scans are faster than ILIKE fallback
3. Sufficient data volume to make index meaningful

**Evidence from Retro 007**:
> "EXPLAIN ANALYZE deferred: Index validation was documented as 'UAT/staging responsibility' but no agent actually executed it. This validation remains pending post-release."

**Root cause**: UAT environment lacks easy EXPLAIN access, and no agent has database query execution capability in production/staging.

**Recommendation**:
1. **P0**: Add EXPLAIN ANALYZE queries to Plan 008 implementation phase:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM providers 
   WHERE to_tsvector('german', provider_name) @@ plainto_tsquery('german', 'restaurant');
   ```
2. **P1**: Document expected query plan (Index Scan, not Seq Scan) in migration file
3. **P2**: Create UAT data sizing procedure (10k+ rows) to make index validation meaningful

---

### Finding 6: Bundle Size Target Exceeded (CONFIDENCE: **Proven**)

**Severity**: 🟢 **SUCCESS** (Validates Plan 007 effectiveness)

**What was found**:
Current build output (2026-02-22):
```
+ First Load JS shared by all                        105 kB
  ├ chunks/4696-51b0a84df54d5602.js                 48.1 kB
  ├ chunks/4bd1b696-100b9d70ed4e49c1.js             54.2 kB
  └ other shared chunks (total)                     2.61 kB

ƒ Middleware                                        79.3 kB
```

**Comparison to Plan 007 targets**:
- First Load JS: 105 kB (target: ≤ 350 kB) — **70% UNDER TARGET** ✅
- Middleware: 79.3 kB (target: ≤ 50 kB) — 58% over target, but with documented rationale

**Conclusion**: Frontend performance work was exceptionally successful. No further bundle work needed for v0.4.x.

---

### Finding 7: Middleware Size 79.3 kB Above Target (CONFIDENCE: **Observed**)

**Severity**: 🟡 **MEDIUM** (Deferred from Plan 007 with rationale)

**What was found**:
Middleware bundle is 79.3 kB vs target of ≤ 50 kB. Plan 007 Milestone 6 outcome: "Reduce middleware bundle toward ≤ 50 kB OR document rationale."

**From Plan 007 Implementation**:
> "Middleware size (79.3 kB): Accepted as unavoidable without major behavior changes. In-memory rate limiting and Supabase auth checks are the primary contributors."

**Postgres-best-practices connection**: None (middleware is Next.js Edge runtime, not DB-related).

**Recommendation**: Accept current size unless multi-instance deployment becomes necessary (would require distributed rate limiting, triggering middleware refactor).

---

## Remaining Gaps

| # | Unknown | Blocker? | Required Action | Owner |
|---|---------|----------|-----------------|-------|
| 1 | Are GIN indexes being used in production? | Yes (HIGH) | Execute EXPLAIN ANALYZE queries on UAT/staging with representative data | Planner → QA |
| 2 | What is the performance delta between RPC and ILIKE fallback? | No (MEDIUM) | Benchmark search latency: RPC vs fallback with 10k+ rows | Implementer (optional) |
| 3 | When can ILIKE fallbacks be removed? | No (LOW) | After all environments confirmed to have RPC functions (v1.0.0+) | DevOps |

**Status**: 2 of 3 gaps require follow-up in Plan 008.

---

## Summary of Findings

| Finding | Severity | Confidence | Action Required |
|---|---|---|---|
| 1. communityServices RPC usage | 🟢 INFO | Proven | None (corrects Orchestrator) |
| 2. ILIKE fallbacks appropriate | 🟢 INFO | Proven | None (pattern is correct) |
| 3. select('*') over-fetching | 🟡 MEDIUM | Proven | Optional: Replace in needs/offers fallback |
| 4. Query limits undocumented | 🟡 MEDIUM | Observed | Add inline comments + ADR |
| 5. GIN indexes not validated | 🟠 HIGH | Inferred | **P0**: EXPLAIN ANALYZE in Plan 008 |
| 6. Bundle size success | 🟢 SUCCESS | Proven | None (celebrate!) |
| 7. Middleware 79.3 kB | 🟡 MEDIUM | Observed | Accept with rationale |

**Overall Risk**: **MEDIUM** — One HIGH-severity gap (index validation) requires immediate follow-up. All other findings are either informational or optional improvements.

---

## Analysis Recommendations

Recommendations prioritized by impact and risk:

### High Priority (Include in Plan 008)

| ID | Recommendation | Rationale | Estimated Effort |
|----|---------------|-----------|------------------|
| **A1** | Execute EXPLAIN ANALYZE on search RPC functions in UAT/staging | Proves indexes are effective; required to close Retro 007 P3 | ~1 hour (setup + queries) |
| **A2** | Document query limit rationale inline | Closes Retro 007 P5 technical debt; prevents future confusion | ~30 min (5 files) |

### Medium Priority (Consider for v0.5.0)

| ID | Recommendation | Rationale | Estimated Effort |
|----|---------------|-----------|------------------|
| **A3** | Replace SELECT * in needs/offers ILIKE fallback queries | Reduces payload size for rare fallback case; low risk | ~30 min (2 files) |
| **A4** | Migrate search endpoints to cursor-based pagination | Scales better than OFFSET; aligns with Postgres best practices | ~2-3 days (4 endpoints) |

### Low Priority (Future Consideration)

| ID | Recommendation | Rationale | Estimated Effort |
|----|---------------|-----------|------------------|
| **A5** | Remove ILIKE fallbacks after v1.0.0 | Simplifies code once all environments have RPC functions | ~1 hour |
| **A6** | Refactor middleware rate limiting for multi-instance | Only needed if horizontal scaling is required | ~3-5 days |

---

## Next Steps

**Immediate handoff**: To **@Planner** (or **@Architect** if index validation strategy requires architectural input).

**Scope for Plan 008** (Analyst recommendation):
1. **Required**: EXPLAIN ANALYZE validation (A1) — 1 hour
2. **Required**: Document query limit rationale (A2) — 30 min
3. **Optional**: Replace SELECT * in fallback queries (A3) — 30 min

**Total estimated effort**: 2-3 hours (small plan, can be hotfix-sized).

**Not recommended for Plan 008**:
- Cursor-based pagination (A4) — larger effort, defer to v0.5.0
- ILIKE fallback removal (A5) — no benefit until v1.0.0+
- Middleware refactor (A6) — not needed at current scale

---

**Status**: Active  
**Next Agent**: @Planner (for Plan 008 scoping) OR @Architect (if index validation strategy needs review)

---

## Metadata

**Files analyzed**: 21 service files, 3 migration files  
**Tools used**: Code inspection, build analysis, grep search  
**Duration**: ~2 hours  
**Related documents**:
- `agent-output/retrospectives/closed/007-performance-improvements-v0.4.0.md`
- `agent-output/planning/closed/007-performance-improvements-v0.4.0.md`
- `supabase/migrations/056_add_provider_community_service_search_indexes.sql`
