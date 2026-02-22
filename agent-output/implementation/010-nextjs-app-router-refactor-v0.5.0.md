---
ID: 010
Origin: 010
UUID: 6c0d9f2a
Status: Active
---

# 010 — Next.js App Router Refactor (Best Practices) — Implementation

**Plan Reference**: `agent-output/planning/010-nextjs-app-router-refactor-v0.5.0.md`
**Date**: 2026-02-23
**Target Release**: v0.5.0

## Changelog

| Date | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-23T00:15Z | Planner → Implementer | Execute Plan 010 (P0+P1) | Initial implementation of all milestones |

---

## Implementation Summary

Implemented all four milestones of Plan 010 to deliver "faster and more reliable discovery pages with fewer client-side failures":

1. **P0 Safety** — Removed all 4 localhost ingest debug calls from splash components (1 in `SplashContent.tsx`, 3 in `MobileSplashScreen.tsx`). These were production-risk `fetch('http://127.0.0.1:7243/ingest/...')` calls that would fail silently on user devices. Added regression test to prevent reintroduction.

2. **P1a Server-first Providers** — Converted the `/providers` page from a thin client wrapper to a server component that fetches and renders the initial page of results server-side. Created a route handler (`GET /api/providers/search`) as the canonical server boundary for pagination. Client component now receives server-rendered initial data and calls the API route for subsequent pages instead of importing the search service directly.

3. **P1b Force-dynamic reduction** — Removed explicit `force-dynamic` exports from root layout and root page. Routes remain dynamic via inherent API usage (`headers()`, `cookies()`, `searchParams`) but no longer explicitly force all child routes to be dynamic. Documented the actual reason for dynamic rendering in comments.

4. **Version management** — Bumped `package.json` to v0.5.0, added CHANGELOG entry.

---

## Milestones Completed

- [x] P0: Remove/gate localhost ingest calls
- [x] P1a: Server-first Providers discovery (server component + route handler + client pagination)
- [x] P1b: Reduce `force-dynamic` blast radius
- [x] Version management (v0.5.0)

---

## Files Modified

| Path | Changes | Lines Changed |
| --- | --- | --- |
| `src/components/shared/SplashContent.tsx` | Removed 1 `#region agent log` block with localhost ingest fetch | -3 |
| `src/components/shared/MobileSplashScreen.tsx` | Removed 3 `#region agent log` blocks with localhost ingest fetches + unused variables | -30 |
| `src/app/(public)/providers/page.tsx` | Converted to async server component; fetches initial results; removed `force-dynamic` | ~50 (rewritten) |
| `src/app/(public)/providers/ProvidersContent.tsx` | Added `initialData` prop; replaced direct service import with `fetchProvidersFromAPI` helper; added `SearchResult` type import | ~40 |
| `src/app/layout.tsx` | Removed `force-dynamic` export; added explanatory comment | -1, +4 |
| `src/app/page.tsx` | Removed `force-dynamic` export; added explanatory comment | -1, +3 |
| `package.json` | Version `0.4.1` → `0.5.0` | 1 |
| `CHANGELOG.md` | Added v0.5.0 entry for Plan 010 | +14 |

## Files Created

| Path | Purpose |
| --- | --- |
| `src/app/api/providers/search/route.ts` | Server boundary for providers search pagination with caching headers |
| `src/__tests__/safety/no-localhost-ingest.test.ts` | Regression test: no localhost ingest calls in production code |
| `src/__tests__/api/providers-search.test.ts` | Unit tests for the search route handler (6 tests) |

---

## Code Quality Validation

- [x] `npm run type-check` — exits 0
- [x] `npm run lint:check` — not run separately (covered by build)
- [x] `npm test` — 147 passed, 18 skipped, 0 failed (16 files)
- [x] `npm run build` — exits 0, all routes compile correctly

---

## Value Statement Validation

**Original**: "As a UFlow service seeker, I want faster and more reliable discovery pages (especially Providers search) with fewer client-side failures, so that I can find halal services quickly and trust the app to work consistently across devices and network conditions."

**Implementation delivers**:
- **Faster**: Server-rendered initial results mean users see content without waiting for client JS to load and fetch data
- **More reliable**: Removed localhost ingest calls that would fail on user devices; server-rendered fallback means content is visible even if client hydration is slow
- **Fewer client-side failures**: Search pagination now uses a server route handler instead of direct browser Supabase calls
- **Consistent across devices**: Server rendering is device-independent; regression test prevents future localhost debug calls

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| P0 safety (removal verification) | `no-localhost-ingest.test.ts` | ✅ Yes | ✅ Yes | AssertionError: violations found in SplashContent.tsx and MobileSplashScreen.tsx | ✅ Yes |
| `GET /api/providers/search` | `providers-search.test.ts` | ✅ Yes | ✅ Yes | Module not found (`@/app/api/providers/search/route`) | ✅ Yes |

---

## Test Coverage

### Unit Tests
- `src/__tests__/safety/no-localhost-ingest.test.ts` — 2 tests verifying no localhost ingest calls or agent log regions in src/
- `src/__tests__/api/providers-search.test.ts` — 6 tests covering JSON structure, caching headers (no-store vs 60s TTL), default params, category/location pass-through, and error handling

### Integration Tests
- `src/__tests__/integration/SearchAndViewProvider.test.tsx` — 18 existing tests (skipped, pre-existing state). These mock `searchProvidersAndCommunityServices` which is no longer directly called by `ProvidersContent`. Tests remain skipped as they were before.

---

## Test Execution Results

**Command**: `npx vitest run`
**Results**: 147 passed | 18 skipped | 0 failed (16 files passed, 1 skipped)
**Coverage**: Not measured (no coverage threshold specified in plan)
**Issues**: None

---

## Outstanding Items

### Observations (not blockers)

1. **All routes remain dynamic after `force-dynamic` removal**: The root layout inherently uses `headers()` and `cookies()` (for language detection and session), which makes all child routes dynamic regardless of the export. To truly enable static/cached child routes, language detection and session handling would need to move to middleware or per-route concerns. This is a larger architectural change beyond P1 scope.

2. **`ProvidersContent` backward compatibility**: The `initialData` prop is optional. When `ProvidersContent` is used from `Stage2Content.tsx` or `HomePageShell.tsx` (without `initialData`), it falls back to client-side fetching via React Query — preserving existing behavior.

3. **Existing integration tests are skipped**: `SearchAndViewProvider.test.tsx` has `describe.skip` (pre-existing). These tests mock the direct service import which `ProvidersContent` no longer uses. They should be updated when re-enabled to mock the API endpoint instead.

### Deferred to future work

- F4 (MEDIUM): Remove `'use client'` from presentational primitives like `Card.tsx` (P2 scope)
- F5 (MEDIUM): Replace client-side service imports in hooks with route handlers (P2 scope)
- F6 (MEDIUM): Introduce Server Actions for form submissions (P3 scope)
- Global 404: Add `src/app/not-found.tsx` (P3 scope)

---

## Assumptions

| # | Description | Risk | Validation |
| --- | --- | --- | --- |
| 1 | `searchProvidersAndCommunityServices` from `providers.ts` is isomorphic (works on both server and client with anon key) | Low | Build succeeds; function uses `createClient` which is environment-agnostic |
| 2 | Removing `force-dynamic` from layout has no side effects when layout itself uses dynamic APIs | Low | Build output confirms all routes remain dynamic via inherent API usage |
| 3 | Existing consumers of `ProvidersContent` (Stage2Content, HomePageShell) continue working without `initialData` | Low | React Query falls back to client fetch when `initialData` is not provided |

---

## Next Steps

1. ➡️ **Code Reviewer** — Review implementation against plan and best practices
2. ➡️ **QA** — Validate search behavior, pagination, bookmarks, auth/language, and caching semantics
3. ➡️ **UAT** — Manual validation on staging environment
