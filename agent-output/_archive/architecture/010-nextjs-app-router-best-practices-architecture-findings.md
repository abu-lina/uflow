---
ID: 010
Origin: 010
UUID: f2c3a7b1
Status: Active
---

# 010 - Next.js App Router Best Practices: Architecture Audit Findings

**Date**: 2026-02-22
**Trigger**: Workflow Card #10 — Refactor request to apply Next.js App Router best practices
**Scope**: Next.js 15 App Router usage patterns (Server vs Client components, data fetching, routing conventions, caching, Server Actions)

---

## Outcome Summary

UFlow is structurally aligned with App Router (route groups, global `loading.tsx`/`error.tsx`, server-only Supabase helpers). However, several decisions currently push most user-facing runtime and data fetching into the client, limiting the main benefits of App Router (streaming SSR, route-level caching, smaller bundles). Two concrete issues are high-impact:

1. **Unconditional client-side “agent log” HTTP POSTs to `127.0.0.1`** (production-risk behavior)
2. **Client-side data fetching for core discovery/search** (providers) and app-wide `force-dynamic` that suppress caching

These findings are actionable and should be planned as a focused refactor (no UX changes required).

---

## Current State Assessment (Evidence)

### Routing & Structure (Good Baseline)

- Route groups are used: `src/app/(public)`, `src/app/(dashboard)`, `src/app/(debug)`.
- Global route conventions exist:
  - Global loading UI: `src/app/loading.tsx`
  - Global error boundary: `src/app/error.tsx`
- Segment-level `not-found.tsx` exists for some routes:
  - `src/app/(public)/providers/not-found.tsx`
  - `src/app/(public)/community-services/not-found.tsx`

### Server vs Client Boundary (Client-heavy at runtime)

- Root layout is a server component but wraps the app in client providers/layout:
  - Server: `src/app/layout.tsx`
  - Client wrapper: `src/components/layout/RootClientLayout.tsx`
- Primary discovery page uses a client component for search, pagination, and bookmarks:
  - `src/app/(public)/providers/ProvidersContent.tsx` (`'use client'`, React Query, direct Supabase client usage)

### Data Fetching (Client-driven for key pages)

- Discovery search uses React Query in the client:
  - `src/app/(public)/providers/ProvidersContent.tsx` uses `useInfiniteQuery` + `searchProvidersAndCommunityServices()`
- Bookmarks are fetched directly from Supabase in the browser:
  - `src/app/(public)/providers/ProvidersContent.tsx` uses `supabase.from('bookmarks')...`

### Caching & Rendering Mode (Dynamic by default)

- App-wide dynamic rendering enforced in the root layout:
  - `src/app/layout.tsx`: `export const dynamic = 'force-dynamic'`
- Additional `force-dynamic` used on key pages:
  - `src/app/page.tsx`
  - `src/app/(public)/providers/page.tsx`

### Server Actions (Not used for forms/mutations)

- No evidence of Server Actions usage (`'use server'`, `useFormState`, `useFormStatus`) in the app code paths.
- Forms are handled via client `onSubmit` and/or API route handlers.

---

## Anti-Patterns & Findings

### F1 (CRITICAL): Unconditional client fetch to localhost “agent log” endpoint

**Evidence**:

- `src/components/shared/SplashContent.tsx`: unguarded `fetch('http://127.0.0.1:7243/ingest/...')`
- `src/components/shared/MobileSplashScreen.tsx`: unguarded `fetch('http://127.0.0.1:7243/ingest/...')`

**Why this is a problem**:

- In production, user devices will attempt network calls to `127.0.0.1` (the user’s own device), which is both noisy and fragile.
- It is not aligned with the architecture’s “Normal vs Debug” observability guidance (always-on telemetry must be low-volume, safe-by-default, and never depend on localhost).

**Required change**:

- Remove these calls or hard-gate behind an explicit debug flag (e.g., env var) with safe defaults.

---

### F2 (HIGH): Core discovery/search runs primarily as client-side data fetching

**Evidence**:

- `src/app/(public)/providers/ProvidersContent.tsx` is a client component using React Query and a browser Supabase client.

**Why this is a problem (App Router perspective)**:

- Limits SSR streaming/partial rendering benefits (`loading.tsx` becomes mostly cosmetic when data fetch is client-driven).
- Larger client bundle (React Query, search logic, and data transforms ship to the browser).
- Caching strategy becomes ad-hoc (React Query staleTime) rather than route-level caching/revalidation.

**Recommended architecture**:

- Use a **Server Component** for initial query/render (first page of results + empty/error states).
- Keep a smaller client component for incremental pagination/infinite scroll, calling a route handler or server action.

---

### F3 (HIGH): App-wide `force-dynamic` suppresses caching across the entire site

**Evidence**:

- `src/app/layout.tsx` sets `export const dynamic = 'force-dynamic'`.

**Why this matters**:

- Forces dynamic rendering for all routes, preventing most static/ISR benefits.
- Increases request load on Supabase due to per-request session checks.

**Tradeoff clarity**:

- The current rationale is understandable (language detection + session check). But the cost is global.

**Recommended direction**:

- Isolate dynamic needs to the smallest segment(s) possible.
- Prefer moving some user/session-specific checks to client state sync (where acceptable) or via middleware-driven hints.

---

### F4 (MEDIUM): Presentational components marked `'use client'` without clear need

**Evidence**:

- `src/components/common/Card.tsx` is a purely presentational component but is a client component.

**Why this is a problem**:

- Pushes otherwise server-renderable UI into client bundles.
- Increases hydration work and bundle size.

**Recommended change**:

- Default these primitives to Server Components; create client-only wrappers only when needed.

---

### F5 (MEDIUM): Client hooks dynamically import service modules that are also used server-side

**Evidence**:

- `src/hooks/useBadges.ts` uses dynamic import of `@/services/badges` inside a client hook.

**Why this is a problem**:

- Makes client bundle boundaries less explicit.
- Encourages mixing “service layer” concerns between client/server.

**Recommended change**:

- Prefer calling a route handler (GET) for badge types and badge reads; keep the shared service on the server.

---

### F6 (MEDIUM): No Server Actions for form submissions (excess client + API boilerplate)

**Evidence**:

- Forms appear to be handled via `onSubmit` in client components, not via Server Actions.

**Recommended direction**:

- Introduce Server Actions for simple mutations (where it reduces client code and aligns with App Router), while keeping API routes for cases requiring non-React clients or complex auth boundaries.

---

## Routing Conventions: Gaps

- Missing app-wide `not-found.tsx` at `src/app/not-found.tsx` (only some segments define it).
- Global `error.tsx` exists; consider adding segment-specific error boundaries for high-value routes (providers, create flow) once server data fetching is adopted.

---

## Recommended Improvements (Prioritized)

### P0 — Must Fix (Production Safety)

1. Remove or hard-gate localhost ingest calls
   - Targets: `src/components/shared/SplashContent.tsx`, `src/components/shared/MobileSplashScreen.tsx`
   - Add a clear “Normal vs Debug” telemetry boundary:
     - Normal: structured console/error reporting only, no localhost calls
     - Debug: opt-in flag, can be disabled, safe fields

### P1 — High Value Refactors (Performance + App Router alignment)

2. Move providers discovery initial render to Server Components
   - Server renders first page of results
   - Client handles infinite scroll/pagination only
   - Use route handler/server action for pagination requests

3. Reduce the blast radius of `force-dynamic`
   - Keep dynamic only where required (language/session checks)
   - Evaluate whether full-app dynamic is still needed after refactors

### P2 — Bundle/Hydration Cleanup

4. Remove `'use client'` from presentational primitives (start with `src/components/common/Card.tsx`)

5. Stop importing DB/service modules directly from client hooks
   - Add route handlers for badge types/reads instead of dynamic service imports

### P3 — DX/Consistency

6. Add `src/app/not-found.tsx` for consistent 404 UX and predictable routing behavior

---

## Notes for Planner (Gate Criteria)

A refactor plan should:

- Treat **F1** as a release-blocker cleanup item.
- Define the target architecture for providers search (server-first render + client incremental loading).
- Specify acceptable caching semantics (what can be cached, for how long, and what must be dynamic).
- Avoid UX changes; focus purely on boundary rework and moving fetches.
