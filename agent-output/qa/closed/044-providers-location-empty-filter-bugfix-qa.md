---
ID: 44
Origin: 44
UUID: b7e3a921
Status: Committed
---

# QA Report: Plan 044 — Providers Location Empty-Filter Bugfix

**Plan Reference**: `agent-output/planning/044-providers-location-empty-filter-bugfix.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date | Agent Handoff | Request | Summary |
| ---------- | ---------------- | -------------------- | ----------------------------------- |
| 2026-03-18 | Code Reviewer | Execute QA for Plan 044 | Created QA strategy, added SSR page-level regression coverage, executed gates |
| 2026-03-18 | Implementer | Re-evaluate build blocker | Confirmed build failure is a pre-existing env limitation on unrelated badge routes; reclassified as non-blocking for Plan 044 |

## Timeline

- **Test Strategy Started**: 2026-03-18T15:45Z
- **Test Strategy Completed**: 2026-03-18T15:48Z
- **Implementation Received**: 2026-03-18T15:48Z
- **Testing Started**: 2026-03-18T15:48Z
- **Testing Completed**: 2026-03-18T16:58Z
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

Validate the fix from the user’s perspective: all-locations browsing must behave identically whether the user lands on `/providers`, `/providers?location=`, or a legacy all-locations bookmark, and real city filtering must remain intact. The highest-risk paths are the SSR default path (server component with no URL params), the API normalization path (missing/empty/legacy `location`), and the client follow-up fetch path that previously converted `''` into a translated city label.

Because this change touches URL param parsing and a canonical sentinel value in a Next.js Server Component flow, QA requires evidence for:

- SSR with **no URL params**
- SSR with **URL params present**
- Normal UI path with translated display text and canonical empty-string transport value
- Backward compatibility for legacy `Everywhere` / `Überall` links

### Testing Infrastructure Requirements

**Test Frameworks Needed**:

- Vitest (existing repo setup)

**Testing Libraries Needed**:

- React Testing Library (existing repo setup)

**Configuration Files Needed**:

- Existing `vitest.config.ts`
- Existing TypeScript config for alias resolution

**Build Tooling Changes Needed**:

- None for the fix itself

**Dependencies to Install**:

```bash
none
```

**⚠️ TESTING INFRASTRUCTURE NEEDED**:

- `agent-output/qa/README.md` is referenced by QA mode instructions but is missing in this workspace. This report used the mode checklist directly as fallback.

### Required Unit Tests

- API route: no `location` param normalizes to `''`
- API route: empty `location=` normalizes to `''`
- API route: legacy `Everywhere` and `Überall` normalize to `''`
- SSR page: no `location` param calls search service with `''`
- SSR page: explicit empty `location` param calls search service with `''`
- SSR page: real city names pass through unchanged

### Required Integration Tests

- Existing SearchBar/sentinel regression should prove translated display text stays separate from canonical transport value
- Manual or UAT browser validation should cover `/providers`, `/providers?location=`, `/providers?location=Everywhere`, `/providers?location=Überall`, and `/providers?location=<real-city>`

### Acceptance Criteria

- `/providers` and `/providers?location=` resolve to the same all-locations behavior at SSR and API boundaries
- Legacy `Everywhere`/`Überall` links behave as all-locations requests
- Real city filters remain intact
- Automated gates pass, or any blocker is explicitly identified with owner and fallback path

## Implementation Review (Post-Implementation)

### Code Changes Summary

- `src/app/(public)/providers/ProvidersContent.tsx`: nullish-coalescing normalization for client transport value; follow-up context sync now uses the already-resolved `location`
- `src/app/api/providers/search/route.ts`: missing, empty, and legacy all-locations values normalize to `''`
- `src/__tests__/api/providers-search.test.ts`: existing broken assertions corrected; regression tests added for missing, empty, and legacy locations
- `src/__tests__/app/providers-page-location.test.tsx`: QA-added SSR page-level regression test to validate the actual server component path
- `package.json` / `CHANGELOG.md`: version and release-note updates

## Test Coverage Analysis

### New/Modified Code

| File | Function/Class | Test File | Test Case | Coverage Status |
| --------------- | -------------- | ------------ | ------------------ | ----------------- |
| src/app/api/providers/search/route.ts | GET | src/__tests__/api/providers-search.test.ts | missing/empty/legacy location normalization | COVERED |
| src/app/(public)/providers/page.tsx | ProvidersPage | src/__tests__/app/providers-page-location.test.tsx | no-param SSR default, empty param, legacy, real city | COVERED |
| src/app/(public)/providers/ProvidersContent.tsx | location resolution + sync | static review + route/page tests | client transport normalization evidence indirect, not page-2 fetch explicit | MISSING |
| src/providers/search-provider.tsx / SearchBar flow | LOCATION_ALL display/transport split | src/__tests__/regression/plan017-i18n-location-sentinel.test.tsx | translated display with canonical sentinel | COVERED |

### Coverage Gaps

- No explicit automated test currently exercises the client-side follow-up fetch path (`fetchProvidersFromAPI` on page 2 / filter interaction) end-to-end through `ProvidersContent`. The API and SSR boundaries are covered, but the React Query pagination hop is still validated by static trace plus deferred browser/UAT execution.

### Comparison to Test Plan

- **Tests Planned**: 8
- **Tests Implemented**: 9
- **Tests Missing**: explicit client follow-up fetch / pagination request test under all-locations state
- **Tests Added Beyond Plan**: `src/__tests__/app/providers-page-location.test.tsx` for page-level SSR normalization

## Sentinel Refactor Checklist

- **Backward-compat mapping at every entry point**: verified for `page.tsx`, `ProvidersContent.tsx`, `route.ts`, and existing SearchBar URL-sync logic
- **Highest-risk regression test exists**: yes — QA added `src/__tests__/app/providers-page-location.test.tsx` covering the no-param SSR default path
- **Structured search performed**: yes — searched for `Everywhere|Überall|LOCATION_ALL|providers\?location=` across `src/**`; verified normalization sites and remaining legacy display uses

## SSR / Server-Defaults Check

Exact inputs validated:

- `/providers` via `ProvidersPage({ searchParams: Promise.resolve({}) })`
- `/providers?location=` via `ProvidersPage({ searchParams: Promise.resolve({ location: '' }) })`
- `/providers?location=Everywhere` via `ProvidersPage({ searchParams: Promise.resolve({ location: 'Everywhere' }) })`
- `/providers?location=Berlin&q=halal` via `ProvidersPage({ searchParams: Promise.resolve({ location: 'Berlin', q: 'halal' }) })`

Normal UI path evidence:

- Existing `src/__tests__/regression/plan017-i18n-location-sentinel.test.tsx` verifies translated display text still maps to canonical `LOCATION_ALL = ''`

Manual browser validation status:

- **DEFERRED** — owner: UAT
- **Rationale**: no UAT environment/browser session available inside QA workspace; manual value validation belongs to UAT
- **Severity**: Low for release value validation, because SSR/API automated evidence is strong; Medium for complete end-user pagination confidence, because page-2 client fetch is not directly automated
- **Fallback execution path**: run browser smoke validation against UAT for `/providers`, `/providers?location=`, `/providers?location=Everywhere`, `/providers?location=Überall`, `/providers?location=Berlin`

## Test Execution Results

### Unit Tests

- **Command**: `node_modules/.bin/vitest run "src/__tests__/app/providers-page-location.test.tsx" "src/__tests__/api/providers-search.test.ts" "src/__tests__/regression/plan017-i18n-location-sentinel.test.tsx" "src/__tests__/regression/hotfix-providers-page-location.test.tsx" --reporter=verbose`
- **Status**: PASS
- **Output**: 4 files passed, 24 tests passed

### Integration Tests

- **Command**: `node_modules/.bin/vitest run`
- **Status**: PASS
- **Output**: 31 files passed, 1 skipped; 256 passed, 18 skipped

### Type Check

- **Command**: `node_modules/.bin/tsc --noEmit`
- **Status**: PASS
- **Output**: `TSC_EXIT:0`

### Delta Lint

- **Command**: `node_modules/.bin/eslint "src/app/(public)/providers/ProvidersContent.tsx" "src/app/api/providers/search/route.ts" "src/__tests__/api/providers-search.test.ts" "src/__tests__/app/providers-page-location.test.tsx"`
- **Status**: PASS
- **Output**: `ESLINT_EXIT:0`

### Build

- **Command**: `npm run build`
- **Status**: PASS WITH ENVIRONMENT NOTE
- **Output**: `Compiled successfully`; remaining failure occurs only during page-data collection for unrelated badge/admin routes that require real Supabase credentials not present in this worktree. This is a pre-existing environment limitation, not a Plan 044 regression.

## Findings

### Low

- **Build validation for full page-data collection remains environment-dependent**
  - `npm run build` compiles successfully, but full page-data collection in this worktree requires Supabase credentials for unrelated badge/admin routes
  - Corrected implementer evidence shows this is pre-existing and outside Plan 044’s changed surface
  - Follow-up owner: DevOps / credentialed CI environment

- **Client follow-up fetch path still lacks direct automated coverage**
  - The bug originally manifested on client pagination/follow-up fetch
  - SSR and API boundaries are now well covered, and SearchBar sentinel behavior is covered, but no test currently drives `ProvidersContent` through a page-2 fetch with all-locations state

## Final Assessment

Behaviorally, the fix is ready for UAT: SSR defaults, API normalization, legacy-link compatibility, real-city preservation, delta lint, targeted regression suites, full tests, and type-check all pass. QA added a missing page-level SSR regression test to satisfy the mandatory server-defaults checklist.

The earlier QA failure was based on attributing a workspace-level credential problem to Plan 044. Re-evaluation shows the remaining build limitation is environmental and surfaces only when Next.js collects page data for unrelated badge/admin routes that require real Supabase credentials. That is not a regression introduced by this change.

Residual risk remains low-to-medium around the unautomated client page-2 fetch path, so UAT should explicitly execute the five URL variants in a browser and verify infinite scroll / follow-up fetch behavior.

Handing off to uat agent for value delivery validation.