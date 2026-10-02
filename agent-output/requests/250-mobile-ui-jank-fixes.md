---
ID: 250
Origin: 249
UUID: 250-mobile-ui-jank-fixes
Status: Done
Type: bug
Branch: fix/250-mobile-ui-jank-fixes
Worktree: ../uflow-wt/250-mobile-ui-jank-fixes
Created: 2026-09-24
---

# Request 250: Fix remaining mobile UI jank (audit findings from #249)

## Original request

> Fix all mobile UI jank findings from audit #249.

## Classification

- **Type:** bug
- **Route:** Bug flow (skip diagnose, findings from #249)
- **Confidence:** high

## Phases

| #   | Phase                 | Status | Outcome                                            |
| --- | --------------------- | ------ | -------------------------------------------------- |
| 0   | Tracking file created | Done   | This file                                          |
| 1   | Fix (all findings)    | Done   | 30 files, 64 new tests, build green                |
| 2   | Code Review           | Done   | REVISE: ProfileProviderDetailButtons portal escape |
| 3   | Done                  | Done   | PR #410                                            |

## Implementation notes

- Branch: `fix/250-mobile-ui-jank-fixes`
- Commit: `fb692ed2`
- Tests added: 64 regression tests in `plan250-mobile-ui-jank-fixes.test.tsx`
- Build: green, 0 type errors, 0 lint errors
- Files changed: 30 (16 create pages, 3 detail pages, 3 legal pages, 2 quick-create, 1 profile, 1 search, 2 deleted, 2 test files)

### Findings addressed

1. CommunityServiceDetailPageClient: CSS toggle + matchMedia gate
2. ProviderDetailPage internal branch: SKIPPED (used standalone in profile route)
3. ProfileContent: sm:hidden / hidden sm:block
4. ProfileProviderDetailPage: md:hidden / hidden md:block
5. Create/* pages (16): ScrollablePageLayout everywhere, responsive Tailwind classes
6. ProfileProviderDetailButtons: CSS toggle
7. DiscoveryResultsGrid: CSS override for paddingTop
8. MobileSplashScreen: SKIPPED (no useIsMobile usage found)
   9-11. SKIPPED (low priority)
9. Dead code deleted: MobileLayoutWrapper.tsx + DesktopCreateLayout.tsx

## Review findings

_Filled during code review._

### Standards axis

### Spec axis

## Follow-up requests

_New work discovered during this request._

## Learnings

_Captured after review and test._
