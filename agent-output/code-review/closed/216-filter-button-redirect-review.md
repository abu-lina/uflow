---
ID: 216
Origin: 216
UUID: c91f3a2e
Status: Committed
---

# Code Review: Filter Button Redirects to Map Instead of Filter Page

**Plan Reference**: `agent-output/planning/216-filter-button-redirect-plan.md`
**Implementation Reference**: `agent-output/implementation/216-filter-button-redirect.md`
**Branch**: `fix/216-filter-button-redirect`
**Commit Reviewed**: `752469f1`
**Base Commit**: `e22a4aa7`
**Date**: 2026-08-17
**Reviewer**: Code Reviewer

## Scope

Review the implementation of Plan 216: make `/search` render filters by default on mobile Food and require an explicit `?view=map` opt-in for the full-screen map, while keeping the two filter-button entry points (`HomeSearchBar`, `SearchContextBar`) untouched.

## Branch State

- Current branch: `fix/216-filter-button-redirect`
- `git log --oneline main..752469f1` shows exactly one commit: `752469f1 fix(search): filter button lands on filters, map is opt-in via view=map`
- `git merge-base main 752469f1` = `e22a4aa7` (same as base commit provided)
- `git diff e22a4aa7..752469f1 --name-only` returns only the 3 intended files:
  - `src/__tests__/features/search/HomeSearchBar.test.tsx`
  - `src/__tests__/regression/plan208-mobile-search-map-switch.test.tsx`
  - `src/app/(public)/search/page.tsx`
- Working tree contains unrelated pre-existing uncommitted changes (chat widget, dashboard, agent docs, `.next-id`). None of these were staged or committed by `752469f1`.

## Architecture Alignment

**Alignment Status**: ALIGNED

The implementation follows the plan's single-source-of-truth decision: the render/fetch predicate lives only in `search/page.tsx`. The existing filter-button URLs remain unchanged, preserving DRY/KISS and avoiding redundant changes in `HomeSearchBar` or `SearchContextBar`.

## TDD Compliance Check

**TDD Table Present**: Yes  
**All Rows Complete**: Yes (6 rows, all required fields populated)  
**Red-Green Evidence**: Yes

- Pre-fix targeted run shows 3 expected failures, all caused by the map rendering when it should not.
- Post-fix targeted run shows all 26 tests passing.
- Full suite: 1910 passed, 24 skipped.

## Implementation vs. Plan Checklist

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Predicate change confined to `src/app/(public)/search/page.tsx`; no duplicate logic in buttons | PASS | `isMobileFoodMapMode` updated only at `page.tsx:592`; `HomeSearchBar.tsx` and `SearchContextBar.tsx` show no diff in commit |
| 2 | `urlView` read safely from `useSearchParams`; `view === 'map'` exact; non-map fails safe | PASS | `page.tsx:71`: `const urlView = searchParams.get('view')`; `page.tsx:592`: `urlView === 'map'`; all other values default to filters |
| 3 | Pin-fetch effect gated and dependency array updated | PASS | `page.tsx:442`: guard now includes `|| urlView !== 'map'`; `page.tsx:465`: deps are `[isMobile, selectedSection, urlView]` |
| 4 | Header/back button, bottom bar, ErrorBoundary still key off same predicate | PASS | `page.tsx:765` (header), `page.tsx:783` (ErrorBoundary/map branch), `page.tsx:793` (bottom bar) all use `isMobileFoodMapMode` |
| 5 | Test quality: real red-green, map-preservation green, no weakened assertions | PASS | Two pre-fix-failing tests added; existing map-positive tests now require `mockView = 'map'` (strengthened intent), pins test still green |
| 6 | Only 3 intended files changed; pre-existing uncommitted changes not committed | PASS | Commit diff lists exactly 3 files; `git status` unrelated changes remain unstaged/uncommitted |
| 7 | No new attack surface in URL param handling; no wasted Supabase queries | PASS | `urlView` used only for render branch and effect guard; pin fetch skipped when filters shown |
| 8 | `752469f1` is the only commit this branch adds over `main` | PASS | `git log main..752469f1` shows one commit |

## Static Gate Verification

| Gate | Result | Notes |
|------|--------|-------|
| `npm test` | PASS | 1910 passed, 24 skipped (per implementation doc) |
| `npm run type-check` | PASS | 0 errors (per implementation doc) |
| `npm run build` | PASS | 0 errors (per implementation doc) |
| `npx eslint <3 changed files>` | PASS with pre-existing warning | 0 errors; 1 pre-existing warning at `page.tsx:428` (missing `t` dependency), unrelated to Plan 216 |
| `npm run lint` (project-wide) | FAIL | Fails due to pre-existing uncommitted lint errors outside this plan's scope; acknowledged in implementation doc |

## Findings

### Critical
None.

### High
None.

### Medium
None.

### Low
None.

### Info

**[INFO-1] Pre-existing ESLint warning in `search/page.tsx`**
- **Location**: `src/app/(public)/search/page.tsx:428`
- **Severity**: INFO
- **Status**: PRE-EXISTING / NOT INTRODUCED
- **Description**: ESLint reports a missing `t` dependency in a `useEffect` hook. This warning is not caused by the Plan 216 changes (it is on a different effect from the one added in this plan).
- **Impact**: None for this review. The three changed files contain no new lint errors.
- **Recommendation**: Address separately if project-wide lint is cleaned up; do not block this bugfix.

## Verdict

**APPROVED**

The implementation matches the plan, fixes the regression without over-correcting, preserves the intentional map view via `?view=map`, gates the Supabase pin query correctly, and keeps the change surface to exactly the 3 intended files. Tests provide credible red-green evidence and cover the fail-safe paths. No security, architecture, or maintainability concerns were found.

## Next Steps

- Hand off to QA/UAT for browser validation.
- Carry forward analysis gaps G1/G2 (desktop repro) per plan decision D6.
- DevOps can proceed with PR creation/merge from `fix/216-filter-button-redirect`.

## Changelog

| Date | Agent | Action | Notes |
|------|-------|--------|-------|
| 2026-08-17 | Code Reviewer | Review completed | Verdict: APPROVED; no blocking findings |
| 2026-08-17 | DevOps | Document closed | Status: Committed |
