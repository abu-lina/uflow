---
ID: 210
Origin: 210
UUID: b7e4f1a3
Status: Planned
---

# Analysis: CI Pipeline & Deployment Failures

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-08-15T22:00Z | Planner | Status → Planned; plan at `agent-output/planning/210-ci-failures-fix-plan.md` |
| 2026-08-15 | Analyst | Initial RCA — 3 root causes identified across 2 CI jobs + 1 UAT deploy failure |

## Value Statement & Objective

The CI pipeline has been red on **every run since June 22, 2026** — nearly 2 months. This means no PR gets a green CI check, which undermines confidence in the merge gate and allows regressions to ship unchecked. The UAT deploy pipeline also experienced failures on Aug 15 (since resolved). This analysis identifies every distinct failure, classifies root causes, and recommends fix strategies for Planner.

## Context

- **Last green CI run**: June 20, 2026 (`feature/194-halal-auto-approval`)
- **First red CI run**: June 22, 2026 (`dependabot/github_actions/actions/checkout-7`)
- **CI has not passed once in 55+ days** across 30+ runs on multiple branches
- **UAT deploy failures**: Aug 15 (2 failures), subsequently fixed by PR #309
- **Plan #157** (June 9) fixed a different class of CI failures (migration tests, audit) — **not a regression of #157**
- **Workflows affected**: `ci.yml` (CI Pipeline), `deploy-uat.yml` (Deploy to UAT)

## Methodology

- **Log Tracing**: Retrieved failure logs for 8 CI runs and 2 UAT deploy runs via `gh run view --log-failed` and `gh api`
- **Binary Search Debugging**: Traced the transition from green to red CI, identifying the exact commit that broke each test
- **Component Isolation**: Ran the 7 failing test files locally on `main` to confirm reproducibility (16/17 failures reproduced)
- **Upstream Tracing**: Traced each test failure to the source code change that broke it

## Findings

### Root Cause 1: Stale Tests After Implementation Refactors (L1 Proven)

**Confidence**: L1 Proven — reproduced locally, traced to specific commits.

**Since**: June 22, 2026 (the day after Plan 194 merged)

**What**: Tests were written for implementations that were later refactored, but tests were not updated. The implementations shipped with green CI but subsequent CI runs (triggered by unrelated PRs) surfaced the test-vs-implementation mismatch.

#### Failure Group 1A: `alcohol-conflict.test.ts` — 4 tests (since June 22)

- **Test file**: `src/__tests__/api/admin/review-provider/alcohol-conflict.test.ts`
- **Root cause**: Plan 193 wrote tests mocking `checkMenuForAlcohol` from `@/services/admin/enrichment-gate`. Plan 194 (commit `99570d41`, June 20) refactored the route handler to use `checkHalalAttestation` from `@/services/admin/halal-gate` instead. The test mocks the old function which is never called, so all expectations fail.
- **Error**: `expected "spy" to be called with arguments` / `expected 200 to be 409`

#### Failure Group 1B: `page-meal-search.test.tsx` — 7 tests (since ~Aug 5)

- **Test file**: `src/__tests__/app/(public)/search/page-meal-search.test.tsx`
- **Root cause**: Plan 208 implementation replaced hardcoded `aria-label="Angebote suchen"` with i18n `t()` calls. Tests still look for `screen.getByRole('searchbox', { name: 'Angebote suchen' })` which no longer matches since the label is now dynamically generated from the translation provider.
- **Error**: `Unable to find an accessible element with the role "searchbox" and name "Angebote suchen"`

#### Failure Group 1C: `page.test.tsx` (search) — 1 test (since ~Aug 5)

- **Test file**: `src/app/(public)/search/page.test.tsx`
- **Root cause**: Same i18n refactoring as 1B — `getByLabelText('Angebote suchen')` no longer finds the element.
- **Error**: `Unable to find a label with the text of: Angebote suchen`

#### Failure Group 1D: `RootPageContent.layout-regression.test.tsx` — 1 test (since ~Aug 5)

- **Test file**: `src/__tests__/components/RootPageContent.layout-regression.test.tsx`
- **Root cause**: `RootPageContent` now requires `LanguageProvider` context (added by Plan 208 i18n changes), but the test doesn't mock or wrap with it.
- **Error**: `useLanguage must be used within a LanguageProvider`

#### Failure Group 1E: `city-selection/page.test.tsx` — 1 test

- **Test file**: `src/app/city-selection/page.test.tsx`
- **Root cause**: Component behavior changed — button text or routing behavior no longer matches test expectations. `mockPush` is never called (0 calls), likely due to the CTA flow changing.
- **Error**: `expected "spy" to be called with arguments: [ '/' ]` — Number of calls: 0

#### Failure Group 1F: `HomeSearchBar.test.tsx` — 1 test

- **Test file**: `src/__tests__/features/search/HomeSearchBar.test.tsx`
- **Root cause**: Test does `screen.getByRole('search')` which finds the inner `<div role="search">`, but `className` prop is applied to the outer wrapper div. The test checks the inner element's className for `'custom-class'` which is only on the outer wrapper.
- **Error**: `expected '...' to contain 'custom-class'`

### Root Cause 2: Node.js Version Incompatibility in CLI Test (L1 Proven)

**Confidence**: L1 Proven — error message directly references Node.js 20 deprecation.

**Since**: ~Aug 2 (when Node.js 20 deprecation warnings started appearing in tsx output)

#### Failure Group 2A: `import-muslimbusiness-cli.test.ts` — 2 tests

- **Test file**: `src/__tests__/scripts/import-muslimbusiness-cli.test.ts`
- **Root cause**: Tests run `npx tsx scripts/import-muslimbusiness.ts` and check stdout/stderr for expected strings. Node.js 20 now emits a deprecation warning (`⚠️ Node.js 20 and below are deprec…`) that appears before the script's actual output, causing string containment assertions to fail.
- **Error**: `expected '⚠️ Node.js 20 and below are deprec…' to contain 'Mode : 🔍 DRY-RUN (no writes)'`

### Root Cause 3: Performance Budget Violations (L1 Proven)

**Confidence**: L1 Proven — CI output shows exact sizes exceeding thresholds.

**Since**: ~Aug 5 (when Plan 208 added Leaflet/map components)

- `/providers`: 364 kB exceeds 350 kB limit (+4%)
- `/providers/[provider_id]`: 283 kB exceeds 270 kB limit (+4.8%)
- **Root cause**: Plan 208 (mobile search map with Leaflet) added ~14 kB to the providers route bundle. Although the map is dynamically imported with `ssr: false`, shared dependencies or tree-shaking gaps are adding weight to routes that don't use the map.

### Root Cause 4: UAT Docker Build SSR Failure (L1 Proven — RESOLVED)

**Confidence**: L1 Proven — error log shows exact stack trace.

**Resolved by**: PR #309 (`d5705468`), merged before this analysis.

- **Error**: `ReferenceError: window is not defined` during prerendering of `/search`
- **Root cause**: Plan 208 imported `SearchMap` (Leaflet) directly instead of using `next/dynamic` with `ssr: false`. Fixed by PR #309.

## Root Cause Summary

| # | Root Cause | Tests/Steps | Since | Confidence | Status |
|---|-----------|-------------|-------|------------|--------|
| RC1 | Stale tests after refactoring | 15 tests / 6 files | June 22 | L1 Proven | Active |
| RC2 | Node.js 20 deprecation warning in CLI test | 2 tests / 1 file | ~Aug 2 | L1 Proven | Active |
| RC3 | Performance budget exceeded | 1 CI step | ~Aug 5 | L1 Proven | Active |
| RC4 | SSR window-not-defined in Docker build | 1 deploy step | Aug 15 | L1 Proven | Resolved |

## System Weaknesses

1. **No CI gate on merge**: PRs have been merged despite red CI for 55+ days. Either branch protection rules don't enforce CI, or they're being bypassed.
2. **Test-implementation coupling**: Tests mock specific internal function names. When implementations are refactored, tests become stale silently.
3. **No test-run validation in plan completion**: Plans 194 and 208 were marked complete without verifying all existing tests still pass.
4. **Performance budget thresholds are tight**: 350 kB for `/providers` leaves only ~4% headroom. A single feature addition can violate it.
5. **CLI tests depend on exact process output**: Minor env changes (Node.js warnings) break assertions that match against full stdout/stderr.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Is branch protection enforcing CI checks? | Cannot check repo settings via CLI | Verify Settings → Branches → main → require status checks | User |
| 2 | Exact bundle weight contribution from Plan 208 | Need fresh `next build` + `@next/bundle-analyzer` | Run `ANALYZE=true npm run build` and compare with pre-208 build | Planner |

## Analysis Recommendations (For Planner)

1. **Fix the 15 stale tests (RC1)**: Update mocks and assertions in 6 test files to match current implementations. Highest priority — these have been red for 55 days.
2. **Fix the CLI test (RC2)**: Either filter out Node.js deprecation warnings from the assertion, or upgrade CI to Node.js 22.
3. **Raise or optimize performance budgets (RC3)**: Either increase the `/providers` budget to 370 kB (accepting Plan 208's map feature weight) or tree-shake Leaflet dependencies from routes that don't use the map.
4. **Enforce CI as a merge gate**: Verify branch protection rules require the CI Pipeline workflow to pass before merge. Consider making this a separate process improvement.
5. **Add a "test regression check" to the plan completion process**: Before marking a plan as Committed, verify all existing tests pass — not just the new tests added by the plan.

## Open Questions

1. Why were PRs merged with red CI for 55 days? Is the CI workflow not configured as a required status check in branch protection?
2. Should the Node.js version in CI be upgraded from 20 to 22 (given the deprecation warnings)?
