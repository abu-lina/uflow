---
ID: 033
Origin: 033
UUID: c4d9e1f0
Status: Active
---

# 033 - UFlow Performance Optimization: Architecture Audit Findings

**Date**: 2026-03-07
**Trigger**: Work chain #033 — Refactor pipeline for performance optimization
**Scope**: Next.js 15 (App Router) rendering + caching, Supabase/Postgres query patterns, bundle/hydration costs, image pipeline, Core Web Vitals targets + measurement architecture.

---

## Outcome Summary

UFlow already contains multiple high-impact performance improvements that align well with a Postgres-first, App Router-centric architecture:

- Providers discovery is **server-first** for initial content, with **API-backed pagination** (Plan 010 P1a applied).
- Search query fanout was reduced by fixing **N+1** patterns via **batch fetches** for offers/needs/badges.
- Create-flow offers selection no longer fetches the full offers table; it uses **incremental pagination**.
- Nginx + Next.js already set strong caching headers for immutable static assets and PWA correctness (`/sw.js` no-cache).
- There is evidence of sustained performance discipline: bundle-splitting regression from Swagger was identified and reversed in Next config.

The remaining architectural work is primarily about **making performance “observable and enforceable”** (budgets + telemetry + repeatable baselines) and **aligning caching semantics across layers** (Next config headers vs route handler Cache-Control).

---

## System Context (Observed)

### Rendering & App Router boundary

- Root layout is dynamic due to language detection and session check, but **global `force-dynamic` has been removed** so child segments can cache independently.
- Providers discovery uses a Server Component for the first page and a Client Component (React Query) only for interactivity/infinite scroll.

### Caching layers (already present)

- **Browser + Service Worker**: Next-PWA runtime caching for images and static resources (explicitly avoids caching Supabase).
- **Cloudflare**: CDN edge in front of Nginx (assumed per system-architecture).
- **Nginx**: long-lived caching for static assets; special handling for `/sw.js` and MIME correctness.
- **Next.js**: explicit Cache-Control headers for `/api/manifest`, and static asset cache headers.

---

## Findings

### F1 (HIGH): Cache-Control policy conflict between `next.config.js` and cacheable API endpoints

**Evidence**:

- `next.config.js` sets `Cache-Control: no-store, max-age=0` for `/api/:path*`.
- `GET /api/providers/search` intentionally sets `Cache-Control` to cache default browse (no query) responses.

**Why this matters**:

- If the global header rule wins, the system will silently run in “no-cache” mode for API reads, causing higher origin load (Next + Supabase) and worse tail latency.
- If the route handler wins, the system behaves correctly but the current architecture lacks an explicit rule for header precedence, increasing regression risk.

**Required architecture decision**:

- Establish “single-writer” semantics for Cache-Control:
  - Either remove the global `/api/:path*` rule and set caching per route handler,
  - Or add explicit, ordered exceptions in Next config for cacheable GET endpoints.

---

### F2 (MEDIUM): Search query fanout is improved, but still multi-step and difficult to cache

**Current behavior** (simplified):

- Search requests can trigger multiple DB queries: offer search + need search + provider name search RPC + providers query + batch hydration (offers/needs/badges).

**Why it matters**:

- Performance is acceptable while data is small, but the architecture will see increasing latency under growth due to multi-step querying and serialization.
- Caching is complicated because the request becomes a composite of several sources.

**Architectural direction (Postgres-first)**:

- Move towards a DB-side read model for discovery search (view/materialized view + FTS vector), returning:
  - Provider/community_service IDs, name, city, category, image references
  - Pre-aggregated offers/needs labels (or limited facets)
  - Trust/badges summary (aggregates)

This reduces roundtrips and makes results cacheable with bounded keys.

---

### F3 (MEDIUM): Bundle size risk remains due to heavyweight UI libs, but mitigations exist

**Observed mitigations**:

- `experimental.optimizePackageImports` is enabled for large packages (MUI, icons, motion, etc.).
- Bundle analyzer exists and is gated (`ANALYZE=true`).
- Dynamic import is used for at least one modal; Next config explicitly avoids splitChunks settings that pulled Swagger into shared bundle.

**Remaining architectural requirement**:

- Define and enforce performance budgets (First Load JS, route chunk limits) in CI, using bundle-analyzer output and Lighthouse CI on a small route set.

---

### F4 (MEDIUM): Image pipeline is capable, but LCP depends on consistent usage patterns

**Observed**:

- Next Image config enables AVIF/WebP, sets cache TTL, and allows Supabase storage domains.
- Past work optimized provider modals with skeletons + priority images.

**Architectural requirement**:

- Standardize LCP-image rules for top routes:
  - Use `next/image` with explicit `width/height` or `fill` + `sizes`.
  - Only one `priority` image per route segment.
  - Avoid “CSS background image” for LCP elements when possible.

---

### F5 (MEDIUM): Performance telemetry is not yet treated as a first-class architecture boundary

Current docs define “Normal vs Debug” telemetry for trust workflows, but performance optimization requires a similar split for:

- Route-level latency (TTFB, server render time, client hydration time)
- Cache hit/miss for key route handlers
- Supabase query timing at boundary points (by operation name)

**Architecture requirement**:

- Adopt a minimal always-on performance telemetry set (see below) and keep debug verbose tracing behind explicit flags.

---

## Core Web Vitals: Target Baselines (Architecture SLOs)

These are targets, not a measured baseline (measurement MUST be performed in UAT/production-like builds):

- **LCP (p75)**: $\le 2.5\,s$
- **CLS (p75)**: $\le 0.10$
- **INP (p75)**: $\le 200\,ms$
- **TTFB (p75)**: $\le 600\,ms$ (for HTML responses)

**Supporting budgets** (recommended):

- First Load JS (key public routes): keep under a fixed budget (route-specific), with CI regression detection.

---

## Caching Strategy (Recommended Architecture)

### Principle

- Cache **public, unauthenticated GET reads** aggressively (bounded keys), but never cache user-specific reads.
- Prefer **CDN/HTTP caching** and **Postgres read models** before introducing an external cache (Postgres-first).

### Practical rules

- **Static assets**: `public, max-age=31536000, immutable` (already configured at Nginx + Next).
- **Service worker** (`/sw.js`): `no-store` (already configured).
- **Public listing APIs** (e.g., providers browse without `q`): `public, s-maxage=60, stale-while-revalidate=30`.
- **Free-text search** (`q` present): `no-store` (unbounded cache keys, mitigates cache poisoning/pressure).

---

## Observability (Architecture Requirement)

### Normal (always-on, low volume)

- Correlation IDs propagated for requests handled by Next route handlers.
- For key read endpoints and workflows:
  - `request.start` / `request.success` / `request.fail`
  - `dependency.supabase` (operation name, duration_ms, result category)
  - `cache.policy` and `cache.result` (hit/miss/bypass)

**Privacy**: No PII; do not log query text by default.

### Debug (opt-in)

- High-cardinality fields allowed only under an explicit debug flag:
  - sanitized query text (optional)
  - expanded error chains
  - sampled SQL explain output (never in production logs by default)

---

## Recommended Work Items (Planner Inputs)

**P0 — Correctness / Architecture consistency**

- Resolve Cache-Control precedence for `/api/*` so route handlers can intentionally opt into caching.

**P1 — Measure + enforce**

- Define a “performance budget” contract for a small set of critical routes and enforce via CI (Lighthouse CI + bundle analyzer).
- Establish a production-like baseline workflow (UAT) using existing k6 performance test harness.

**P2 — Reduce origin work**

- Move discovery/search towards a DB read model to reduce query fanout and make caching feasible.

---

## Alternatives Considered

1. **Add Redis for caching**
   - Rejected (for now): violates Postgres-first philosophy unless DAU and latency evidence justify.

2. **Cache all search queries at CDN**
   - Rejected: unbounded cache keys and user-parameter variability.

---

## Verdict

**APPROVED_WITH_CHANGES**

No architectural blockers to planning. The Planner MUST include F1 (Cache-Control precedence) and the telemetry/budget work as first-class items; otherwise optimizations will not be measurable nor durable.
