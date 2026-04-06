---
ID: 82
Origin: 82
UUID: d7e3a1f9
Status: Committed
---

# 082 — Bugfix Plan: Saved Page Search Bar Disappears on Empty State

**Target Release**: Next available patch after current `origin/main` version (v0.10.8); confirm at DevOps Stage 1.  
**Epic Alignment**: UX stability — eliminate dead-end states on mobile.  
**Related Issues**: GitHub Issue #82 (session/82-saved-search-bar-disappears).  
**Analysis**: `agent-output/analysis/082-saved-search-bar-disappears.md`

## Changelog

| Date                 | Author  | Action                       |
|----------------------|---------|------------------------------|
| 2026-04-05T16:15Z    | Planner | Initial plan created         |
| 2026-04-05T16:20Z    | Planner | Revised per critique: resolved M1 skeleton contradiction, added M2 pre-fix/post-fix test guidance |
| 2026-04-05T16:23Z    | Implementer | Status set to In Progress; implementation started |
| 2026-04-05T16:45Z    | Code Reviewer | Code review completed: APPROVED_WITH_COMMENTS; status set to Code Review Approved |
| 2026-04-05T19:00Z    | QA | QA testing complete: all automated gates pass; regression test passes; status set to QA Complete |
| 2026-04-06T19:10Z    | UAT | UAT validation complete: value statement delivered; APPROVED FOR RELEASE with deferred manual QA validation; status set to UAT Approved |
| 2026-04-06T10:00Z    | DevOps | Stage 1 commit: version bumped to v0.10.12; CHANGELOG updated; lifecycle docs moved to closed/; status set to Committed |

## Value Statement and Business Objective

As a user browsing my saved providers, I want the search bar to remain visible and interactive even when my search returns no results, so that I can modify or clear my search term without navigating away from the page.

## Release Strategy

Standalone (no other known plans for this version).

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| 1 | Fix scope is limited to the `'no_results'` branch only — `queryError` and `no_saved_items` branches intentionally omit SearchBar (nothing to search in those states). | [RESOLVED] Matches analysis recommendation; no user-initiated search is possible in those states. |
| 2 | SearchBar should be lifted above the conditional content area rather than duplicated inside the `'no_results'` branch. | [RESOLVED] Follows the pattern used by `/providers` page (`ProvidersContent.tsx`), reduces duplication, prevents future regressions if new branches are added. |
| 3 | SearchBar should render whenever user is authenticated AND has saved items (i.e., `providers.length > 0`), regardless of filter results. | [RESOLVED] The SearchBar is only meaningful when there are items to filter. Showing it on `no_saved_items` or `queryError` would be misleading. |
| 4 | PageContent centering class (`flex items-center justify-center min-h-[60vh]`) must NOT apply to the SearchBar — only to the empty-state content below it. | [RESOLVED] SearchBar should stay at the top; centering applies to the EmptyState messaging area only. |

## Success Criteria

1. **Primary**: On `/saved`, after typing a search term that matches no saved providers, the SearchBar remains visible and interactive. The user can clear or modify their search.
2. **Layout**: The SearchBar stays pinned at the top of the content area; the EmptyState message is vertically centred below it.
3. **Regression**: All existing branches (skeleton, error, no-saved-items, has-results) continue to render correctly with no visual change.

## Assumptions

- The `SearchBar` component is stateless with respect to the parent — it reads from `useSearch()` context. No props changes needed.
- `customCities` prop should use `bookmarkedCities` (not empty array) when the user has saved items, so the location dropdown remains functional during the empty-results state.

## Plan

### Milestone 1: Restructure SearchBar out of conditional chain

**Objective**: Ensure the SearchBar is always rendered when the user has saved items, independent of the filter result count.

**What to change in** `src/app/(public)/saved/page.tsx`:

1. **Lift the SearchBar above the ternary chain** inside `<PageContent>`. Render a single `<SearchBar>` before the conditional content block. It should render whenever the user has saved items OR during skeleton loading (`!queryError && emptyStateType !== 'no_saved_items'`). Use a conditional prop for cities: `customCities={showSkeleton ? [] : bookmarkedCities}`. This ensures skeleton loading shows empty cities while all other SearchBar-visible states use the real bookmarked cities list.

2. **Remove the SearchBar instances from inside the ternary chain** — both the skeleton branch's SearchBar and the "has results" branch's SearchBar. After lifting, the SearchBar renders exactly once, before the conditional content. No duplication.

3. **Adjust the `PageContent` className** so the centering class (`flex items-center justify-center min-h-[60vh]`) only applies to branches that truly need full-area centering (`queryError`, `no_saved_items`). The `'no_results'` branch should NOT use centering because the SearchBar is now above the empty state. Alternatively, wrap only the EmptyState in a centering container rather than applying it to the entire `PageContent`.

**Acceptance criteria**:
- SearchBar is visible on the `'no_results'` state.
- SearchBar uses `bookmarkedCities` (not empty array) for the location dropdown when user has saved items.
- Skeleton loading state shows SearchBar with `customCities={[]}` (empty cities — existing behaviour preserved via conditional prop).
- EmptyState "Keine Ergebnisse" message is visually centred in the remaining content area below the SearchBar.
- "Has results" state still shows SearchBar + provider grid (existing behaviour preserved).
- `queryError` and `no_saved_items` states do NOT show a SearchBar (existing behaviour preserved).
- Only one `<SearchBar>` instance exists in the JSX — no duplication across branches.

### Milestone 2: Regression verification

**Objective**: Confirm no visual or functional regressions across all 6 branches.

**Acceptance criteria**:
- Implementer must verify each branch listed in the analysis Branch Coverage Matrix renders correctly after the change.
- TDD compliance: A regression test should assert the search input element is present in the DOM when `filteredProviders` is empty but `providers` is non-empty.

### Milestone 3: Version management

**Objective**: Update version artifacts for the patch release.

**Tasks**:
- Update `package.json` version to next patch (confirm exact number at DevOps Stage 1).
- Add CHANGELOG entry describing this bugfix.
- Commit message references Issue #82.

**Acceptance criteria**: Artifacts updated, CHANGELOG reflects the fix, version matches target.

## Testing Strategy

- **Unit/component test**: Assert that `SearchBar` (or its search input) is present in the rendered output when the `'no_results'` state is active. This is the primary regression test for this bug.
- **Pre-fix / post-fix regression pattern** (per project convention): The regression test should include focused assertions that mirror the exact pre-fix and post-fix conditional expressions. Name tests to make the bug visible, e.g. `[pre-fix FAILS] SearchBar absent when filteredProviders empty` and `[post-fix PASSES] SearchBar present when filteredProviders empty but providers exist`. This ensures the test captures the specific conditional logic that caused the bug, not just adjacent behaviour.
- **Branch coverage**: All 6 branches from the analysis should be exercised (login_required, skeleton, error, no_saved_items, no_results, has_results).
- **No E2E required**: This is a client-side conditional rendering fix; component-level tests are sufficient.
- Specific test cases are QA agent's responsibility.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Layout regression on other branches after restructuring `PageContent` className | Low | Medium | Milestone 2 requires visual verification of all branches |
| SearchBar location dropdown shows stale cities if bookmarkedCities query hasn't loaded | Very Low | Low | `bookmarkedCities` defaults to `[]`, SearchBar handles empty array gracefully |
| Skeleton branch shows bookmarkedCities instead of empty array during loading | Very Low | Low | Mitigated by conditional prop: `customCities={showSkeleton ? [] : bookmarkedCities}` |

## Duration Estimates

| Phase          | Estimate     | Uncertainty Driver |
|----------------|-------------|--------------------|
| Planning       | 30 min      | —                  |
| Implementation | 1–2 hours   | Single file, straightforward restructure |
| QA             | 30 min      | Component tests only |
| UAT            | 15 min      | Manual spot-check on mobile |
| DevOps         | 15 min      | Standard patch release |
| **Total**      | **~2–3 hrs** | Low uncertainty |

## Validation & Handoff

- **To Critic**: Plan ready for review. Single-file scope, clear root cause, minimal risk.
- **To Implementer**: After Critic approval — fix is isolated to `src/app/(public)/saved/page.tsx`, authenticated render block (lines 508–590). Follow the structural pattern from `ProvidersContent.tsx` where the search header is rendered independently above the content conditional.
- **Rollback**: Revert the single commit. No migration, no schema change, no side effects.

## State-Machine Coverage (MANDATORY)

All conditional branches in the authenticated render path:

| # | Branch              | SearchBar After Fix? | EmptyState? | Notes |
|---|---------------------|---------------------|-------------|-------|
| 1 | `login_required`    | N/A                 | Login form  | Separate layout, unchanged |
| 2 | `showSkeleton`      | ✅ Yes (empty cities) | No        | Existing behavior preserved |
| 3 | `queryError`        | ❌ No               | Yes         | Intentionally no search bar |
| 4 | `no_saved_items`    | ❌ No               | Yes         | Intentionally no search bar |
| 5 | `no_results`        | ✅ **Yes (FIXED)**  | Yes         | Bug fix — SearchBar now visible |
| 6 | Has results         | ✅ Yes              | No          | Existing behavior preserved |
