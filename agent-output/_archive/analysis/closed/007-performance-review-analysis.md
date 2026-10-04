---
ID: 007
Origin: 007
UUID: e7f4a31c
Status: Planned
---

# 007 — UFlow Comprehensive Performance Review

## Changelog

| Date | Change |
|------|--------|
| 2026-02-22 | Initial analysis: frontend, database, infrastructure |
| 2026-02-22 | Planner: Plan 007 created; analysis closed as Planned |

## Value Statement and Business Objective

Identify performance bottlenecks in UFlow (ummahflow.com) that degrade user experience, SEO ranking, and scalability. Prioritize findings by user impact to inform targeted optimization work.

## Objective

Conduct a full-stack performance audit covering frontend bundle size, database query patterns, and infrastructure — producing actionable findings with severity ratings and quick-win identification.

## Context

- **Stack**: Next.js 15 (App Router), Supabase (PostgreSQL), Docker standalone, Hetzner + Cloudflare CDN, PWA
- **Scale**: Pre-launch, <5,000 DAU target
- **Philosophy**: Postgres-first (tsvector, GIN indexes, materialized views before external services)
- **Existing tooling**: Bundle analyzer, perf test scripts, migration-managed indexes

## Methodology

1. **Bundle analysis**: `ANALYZE=true npm run build` — measured First Load JS and per-route sizes
2. **Client component audit**: Grep-based scan of all `'use client'` files, dependency mapping
3. **Database query analysis**: Full scan of Supabase RPC calls, `.from()` queries, migration review
4. **Infrastructure review**: Dockerfile, middleware, PWA config examination

---

## Findings

### FINDING 1: First Load JS — 687 kB (CRITICAL)

**Status**: Verified
**Impact**: Every page loads 687 kB of shared JavaScript before any route-specific code. Next.js recommends <200 kB. This directly impacts LCP, FID, and Time to Interactive on mobile.

**Build output** (2026-02-22):
```
+ First Load JS shared by all                        687 kB
  ├ chunks/vendors-d3fc6682-*.js                      111 kB  ← largest vendor chunk
  ├ chunks/vendors-ff30e0d3-*.js                       54.2 kB
  ├ chunks/vendors-69b64d54-*.js                       43.2 kB
  ├ other shared chunks (total)                       148 kB
  └ 18 additional vendor chunks                       ~330 kB
```

**Root causes identified**:
- **70 files** import `@iconify/react` — loads icons via network at runtime
- **42 files** import `motion/react` — animation library in core layout (MobileNavbar, MobileHeader, MobileFooterBar, LoadingSpinner, SkeletonCard)
- **28 files** import `lucide-react` — tree-shakeable but adds up
- Only **4 dynamic imports** across 218 client components

**Heaviest components** (import BOTH `@iconify/react` AND `motion/react`):
- `MobileFooterBar.tsx`, `MobileNavbar.tsx`, `MobileHeader.tsx` — render on every page
- `ProviderCard.tsx` — renders in lists
- `CitySearchModal.tsx`, `CitySelectionModal.tsx` — modal components not lazy-loaded

### FINDING 2: 42% of Files Are Client Components (HIGH)

**Status**: Verified
**Impact**: 218 of ~520 .ts/.tsx files use `'use client'`. Some may not need it.

**Potentially unnecessary `'use client'` candidates**:
- `SkeletonCard` — if it uses no hooks, can be server-rendered
- `BottomSpacer`, `HeaderSpacer` — pure layout, likely no interactivity
- `ContentSection`, `BadgeLabel` — display-only components

**Recommendation**: Audit each for hook/state/event usage. Remove directive where not needed to reduce client JS.

### FINDING 3: ILIKE Violations in Production Code (HIGH)

**Status**: Verified — violates project rules ("NEVER use ILIKE for search")

| File | Pattern | Severity |
|------|---------|----------|
| `categories.ts` L85 | `.ilike('provider_name', ...)` — **direct, no tsvector fallback** | **HIGH** |
| `providers.ts` L609-610 | `.ilike('provider_name', ...)` and `.ilike('community_service_name', ...)` in `fetchFilteredCities()` — **direct, no tsvector** | **HIGH** |
| `providers.ts` L452 | `provider_name.ilike.%${query}%` in `.or()` — comment says "ILIKE is acceptable" | **MEDIUM** |
| `offers.ts` L114 | ILIKE fallback after RPC fails | LOW (graceful degradation) |
| `needs.ts` L88 | ILIKE fallback after RPC fails | LOW (graceful degradation) |
| `communityServices.ts` L140 | ILIKE fallback after RPC fails | LOW (graceful degradation) |

### FINDING 4: Missing GIN Indexes on Provider/Community Service Names (HIGH)

**Status**: Verified via migration review

GIN tsvector indexes exist for:
- ✅ `offers.name_de`, `offers.name_en` (migration 014)
- ✅ `needs.name_de`, `needs.name_en` (migration 014)

**Missing indexes**:
- ❌ `providers.provider_name` — no GIN tsvector index. RPC `search_providers_enhanced` computes `to_tsvector()` at query time → sequential scan
- ❌ `community_services.community_service_name` — no GIN tsvector index. Same runtime computation issue

### FINDING 5: Unbounded Queries (MEDIUM)

**Status**: Verified

| Query | Location | Risk |
|-------|----------|------|
| `getNeeds()` | `needs.ts` L5 | Returns ALL rows, no `.limit()` |
| 6 category queries | `categories.ts` | All unbounded |
| `getBookmarks()` | `bookmarks.ts` L13 | No limit |
| 5 badge queries | `badges.ts` | All unbounded `select('*')` |

Safe at current scale (<1,000 rows per table) but will degrade as data grows.

### FINDING 6: All Pagination is OFFSET-Based (MEDIUM)

**Status**: Verified — 5 call sites use `.range()` (OFFSET), 0 use cursor-based pagination

| Location | Pattern |
|----------|---------|
| `offers.ts` L15 | `.range(offset, offset + (limit || 1000) - 1)` |
| `providers.ts` L429 | `.range(offset, offset + (limit || 1000) - 1)` |
| `communityServices.ts` L163 | `.range(offset, offset + limit - 1)` |
| `admin/providers.ts` L68 | `.range(pagination.offset, ...)` |
| `create/basics/offers/page.tsx` L134 | `.range(offers.length, ...)` |

Default limit of `1000` when unspecified is also concerning.

### FINDING 7: 20+ `select('*')` Over-Fetching (MEDIUM)

**Status**: Verified

Concentrated in: `needs.ts` (3), `offers.ts` (4), `badges.ts` (5), `categories.ts` (6), `bookmarks.ts` (1), form components (2).

Low impact on small tables, but `badges.ts` with 5 unbounded `select('*')` calls should be narrowed.

### FINDING 8: Middleware Bundle 79.3 kB (MEDIUM)

**Status**: Verified

Next.js recommends <50 kB for Edge middleware. Current middleware (337 lines) includes:
- In-memory rate limiting (`Map`) — won't work across multiple server instances
- JWT pre-validation + Supabase token refresh
- Waitlist redirect logic

### FINDING 9: Only 4 Dynamic Imports (MEDIUM)

**Status**: Verified

Across 218 client components, only 4 use `next/dynamic`:
- `swagger-ui-react` (correct — heavy lib)
- `AdminProvidersPageContent`
- `ProviderDetailPageClient`
- `CommunityServiceDetailPageClient`

**Top candidates for dynamic import**:
- All `*Modal.tsx` components (CitySearchModal, CitySelectionModal, etc.)
- Provider edit forms
- Create flow pages
- `lottie-react` animation component

### FINDING 10: Infrastructure — Well-Configured (LOW Risk)

**Status**: Verified

- ✅ Dockerfile: Proper multi-stage build with Alpine, non-root user, standalone output
- ✅ `.dockerignore`: Comprehensive exclusions
- ✅ PWA: Correctly does NOT cache Supabase responses
- ✅ Image optimization: `next/image` used consistently (23 files), only 1 raw `<img>` in tests
- ✅ No barrel exports in components/ or features/
- ✅ No devtools imports in production code
- ⚠️ `NODE_TLS_REJECT_UNAUTHORIZED=0` in builder stage (for Google Fonts during build — acceptable but document)
- ✅ Materialized view `provider_stats` ready for future dashboard optimization (migration 055)

---

## Prioritized Recommendations (Analysis-Scoped)

### Quick Wins (High Impact, Low Effort)

| # | Action | Expected Impact |
|---|--------|-----------------|
| QW-1 | Add GIN tsvector indexes on `providers.provider_name` and `community_services.community_service_name` | Eliminate sequential scans in search RPCs |
| QW-2 | Replace ILIKE in `categories.ts` L85 and `providers.ts` L609-610 with tsvector RPC calls | Enforce project rules, improve search perf |
| QW-3 | Add `.limit()` to `getNeeds()`, category queries, bookmark/badge queries | Prevent unbounded data growth degradation |
| QW-4 | Dynamic import all `*Modal.tsx` components | Reduce initial bundle — modals load on interaction |

### Medium Effort, High Impact

| # | Action | Expected Impact |
|---|--------|-----------------|
| ME-1 | Audit `@iconify/react` usage (70 files) — consider switching to static SVG or `lucide-react` (already used in 28 files) to eliminate runtime network calls | Major bundle reduction |
| ME-2 | Remove `motion/react` from core layout components (MobileNavbar, MobileHeader, MobileFooterBar) or lazy-load the animation library | Remove motion from every-page bundle |
| ME-3 | Audit 218 `'use client'` files — remove directive from display-only components | Reduce client JS |
| ME-4 | Narrow `select('*')` to specific columns in `badges.ts` and form components | Reduce data transfer |

### Larger Refactors (Future)

| # | Action | Expected Impact |
|---|--------|-----------------|
| LR-1 | Migrate from OFFSET to cursor-based pagination | Better performance at scale |
| LR-2 | Extract middleware rate limiting to a proper solution (Redis or Cloudflare) for multi-instance support | Required for horizontal scaling |
| LR-3 | Reduce middleware bundle below 50 kB — extract JWT validation, simplify rate limiting | Faster Edge execution |

---

## Open Questions

1. **What is the actual icon usage pattern?** — Are all 70 `@iconify/react` imports using unique icons, or could many be consolidated into a shared icon set?
2. **Which `motion/react` animations in layout components are business-critical?** — User needs to decide which animations are essential vs. decorative
3. **What is the current tsvector query latency?** — Need `EXPLAIN ANALYZE` on live Supabase to measure actual search performance with missing indexes
4. **Is multi-instance deployment planned?** — If yes, in-memory rate limiting in middleware needs immediate attention

---

## System Weaknesses Identified

| Category | Weakness | Risk Mechanism |
|----------|----------|----------------|
| Architecture | No enforcement of tsvector rule | ILIKE queries can be added without CI/lint catching it |
| Code | `motion/react` in layout shell | Every page pays animation tax even without animations |
| Code | Minimal dynamic imports | No code-splitting strategy for below-the-fold components |
| Database | Missing GIN indexes on 2 core tables | Search RPCs compute tsvector at runtime → sequential scans |
| Infrastructure | In-memory rate limiting | Resets on restart, doesn't work across instances |

---

## Instrumentation Gaps

### Normal (Always-On)

| What | Why | How |
|------|-----|-----|
| Page load timing per route | Identify slowest pages | Add Web Vitals reporting via `next/web-vitals` or `@vercel/speed-insights` |
| Bundle size tracking in CI | Detect regressions | Add `@next/bundle-analyzer` output comparison to CI pipeline |
| Supabase query duration logging | Track slow queries | Use Supabase dashboard query performance or add timing wrapper in services |

### Debug (Opt-In)

| What | Why | How |
|------|-----|-----|
| React re-render profiler | Identify wasted renders | React DevTools profiler or `why-did-you-render` |
| Component-level hydration timing | Find hydration bottlenecks | Custom Performance API marks in client components |
| `EXPLAIN ANALYZE` for all RPCs | Verify index usage | Run against staging/production Supabase |

---

## Analysis Recommendations (Next Steps)

1. **Test**: Run `EXPLAIN ANALYZE` on `search_providers_enhanced` and `search_community_services_enhanced` RPCs against live database to confirm sequential scan hypothesis
2. **Test**: Replace `@iconify/react` with `lucide-react` in one component, measure bundle delta
3. **Test**: Dynamic import `CitySearchModal` and measure route bundle reduction
4. **Trace**: Profile the `/providers` page load with React DevTools to identify render waterfall
5. **Validate**: Run Lighthouse CI on ummahflow.com to establish Core Web Vitals baseline

---

*Analysis conducted 2026-02-22. All findings verified through code inspection and build output analysis. No live database queries were executed — database findings are based on code and migration review.*
