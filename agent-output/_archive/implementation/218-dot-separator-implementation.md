---
ID: 218
Origin: 218
UUID: 377700d3
Status: Active
---

# Implementation — Plan 218: Lucide "Dot" separator between open tag and distance on ProviderCard

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-08-17 | Implementer | Completed M1–M4. Added TDD tests, Dot icon, regression sweep, static gates, and handoff notes. |

## Plan Reference

- Plan: `agent-output/planning/218-dot-separator-plan.md`
- Analysis: `agent-output/analysis/218-dot-separator-analysis.md`
- Critique: `agent-output/critiques/218-plan-critique.md` (verdict APPROVED)
- Branch: `feature/218-near-me-list-dot-separator`

## Implementation Summary

Inserted a `lucide-react` `Dot` icon between the open/closed status label and the distance badge on the shared `ProviderCard`. The dot is conditionally rendered only when both fields are visible (`openStatus.visible && distanceLabel`), so it never appears as a dangling separator. Because the change lives in the shared card, both the home near-me list (`HomeNearMeList`) and the search-page near-me grid (`NearMeResultsGrid`) receive it automatically; `HomeListView` (which never passes `distanceKm`) is unaffected.

## Milestones Completed

- [x] M1 — TDD: added three failing dot-conditional tests
- [x] M2 — Implemented the guarded `Dot` in `ProviderCard.tsx`
- [x] M3 — Regression sweep + static gates passed
- [x] M4 — Version confirmed at `0.15.18`, no bump

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `src/components/providers/ProviderCard.tsx` | Added `import { Dot } from 'lucide-react';` and guarded `<Dot>` between open-status span and distance span | +7 |
| `src/__tests__/components/ProviderCard-distance.test.tsx` | Added `describe('dot separator (Plan 218)')` with 3 conditional-render tests | +57 |

## Files Created

| File | Purpose |
|------|---------|
| `agent-output/implementation/218-dot-separator-implementation.md` | This implementation artifact |

## Code Quality Validation

- [x] `npm run type-check` exits 0
- [x] `npx eslint src/components/providers/ProviderCard.tsx src/__tests__/components/ProviderCard-distance.test.tsx` exits 0 (no errors/warnings on changed files)
- [x] `npm run build` exits 0
- [x] No existing `@iconify/react` icons converted (mixed import acknowledged per plan Decision 2)
- [x] No files outside the two source files modified

## Value Statement Validation

The change delivers the stated value: users browsing near-me results now see a visual dot separator between the open/closed status and the distance badge, making the two fields read as distinct pieces of information rather than one run of text. The separator is decorative, subordinate (`text-text-muted`), and suppressed whenever either field is missing, so it never degrades readability.

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|---------------------|-------------------|----------------|------------------|
| `ProviderCard` dot separator | `src/__tests__/components/ProviderCard-distance.test.tsx` | ✅ Yes | ✅ Yes | `TestingLibraryElementError: Unable to find an element by: [data-testid="provider-distance-separator"]` | ✅ Yes |

All three test cases were written before the source change. The positive case failed as expected; the two negative cases passed immediately (because the separator did not yet exist in those scenarios either, which is the correct post-impl behavior).

## Test Coverage

### New Tests (3)

1. `renders the dot separator between open status and distance when both are present`
2. `does not render the dot separator when distanceKm is undefined`
3. `does not render the dot separator when open status is not visible`

### Regression Suites Run

- `src/__tests__/components/ProviderCard-distance.test.tsx` — 6 passed
- `src/__tests__/components/ProviderCard.test.tsx` — 44 passed
- `src/__tests__/features/search/HomeNearMeList.test.tsx` — 5 passed
- `src/features/search/components/NearMeResultsGrid.test.tsx` — 5 passed
- Full `npx vitest run` — 236 passed | 2 skipped (1953 tests total)

## Test Execution Results

```
npx vitest run src/__tests__/components/ProviderCard-distance.test.tsx
# Test Files  1 passed (1)
#      Tests  6 passed (6)

npx vitest run src/__tests__/components/ProviderCard-distance.test.tsx src/__tests__/components/ProviderCard.test.tsx
# Test Files  2 passed (2)
#      Tests  50 passed (50)

npx vitest run src/__tests__/features/search/HomeNearMeList.test.tsx
# Test Files  1 passed (1)
#      Tests  5 passed (5)

npx vitest run
# Test Files  236 passed | 2 skipped (238)
#      Tests  1929 passed | 24 skipped (1953)

npm run type-check
# exits 0

npx eslint src/components/providers/ProviderCard.tsx src/__tests__/components/ProviderCard-distance.test.tsx
# exits 0 (no output)

npm run build
# Build completed successfully
```

## Outstanding Items

None. All plan milestones are complete.

## Next Steps

- Hand off to Code Reviewer for quality review.
- DevOps will create the PR and stage the release.
