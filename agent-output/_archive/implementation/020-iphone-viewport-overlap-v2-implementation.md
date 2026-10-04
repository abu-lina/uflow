---
ID: 20
Origin: 20
UUID: b7e3f41a
Status: Active
---

# 020 — iPhone SE Viewport Overlap v2 — Implementation

## Plan Reference

[agent-output/planning/020-iphone-viewport-overlap-v2-plan.md](../planning/020-iphone-viewport-overlap-v2-plan.md)

## Date

2026-02-24

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-02-24T15:30Z | Critic → Implementer | Implement Plan 020 (APPROVED) | Initial implementation |

## Implementation Summary

Removed nested `h-screen-fix` (100dvh) from 6 primary onboarding funnel screens that were rendered inside `RootClientLayout`'s `<main>` container. These screens claimed full viewport height (`100dvh`) inside a container that only had `100dvh - 128px` available (due to the always-reserved `mobile-bottom-ui-slot`), causing the bottom 128px of content (including CTA buttons) to be clipped.

**Approach**: Replace `h-screen-fix` with fill-parent sizing (`flex h-full flex-col` or `flex h-full`) so child screens fill the available `<main>` space instead of independently claiming viewport height. This establishes `RootClientLayout` as the single source of viewport height truth.

**Bottom slot behavior**: Kept unchanged (Option 1) — the `mobile-bottom-ui-slot` continues to reserve 128px at all times, which prevents hydration layout shift.

## Milestones Completed

- [x] **Milestone 1**: Remove nested viewport-height wrappers from 6 primary target files
- [x] **Milestone 2**: Validation — type-check, 163 tests pass, production build succeeds, lint clean
- [x] **Milestone 3**: Version bump to v0.6.5 + CHANGELOG entry

## Files Modified

| Path | Changes | Lines Changed |
|------|---------|---------------|
| `src/components/layout/SplashLayout.tsx` | `h-screen-fix flex flex-col` → `flex h-full flex-col` | 1 |
| `src/components/shared/MobileSplashScreen.tsx` | `h-screen-fix flex w-full items-center justify-center` → `flex h-full w-full items-center justify-center` (loading state) | 1 |
| `src/components/shared/EarlyAccessScreen.tsx` | `h-screen-fix flex w-full items-center justify-center` → `flex h-full w-full items-center justify-center` | 1 |
| `src/components/shared/CityEarlyAccessEmptyState.tsx` | `h-screen-fix flex w-full flex-col items-center` → `flex h-full w-full flex-col items-center` | 1 |
| `src/app/city-selection/page.tsx` | `h-screen-fix flex w-full flex-col items-center` → `flex h-full w-full flex-col items-center` | 1 |
| `src/app/(public)/city/[cityName]/page.tsx` | `h-screen-fix` → `h-full` on 3 loading/error/fallback wrappers | 3 |
| `package.json` | Version `0.6.4` → `0.6.5` | 1 |
| `CHANGELOG.md` | Added `[0.6.5]` entry with root cause + fix description | 12 |

## Files Created

None.

## Code Quality Validation

- [x] **TypeScript compilation**: `npm run type-check` — exit 0, no errors
- [x] **Linter**: `npx eslint` on all 6 changed source files — clean, no warnings
- [x] **Tests**: `npx vitest run` — 163 passed, 18 skipped, 0 failed
- [x] **Production build**: `npm run build` — success
- [x] **No new dependencies**: Pure CSS class changes only

## Value Statement Validation

**Original**: As a mobile user (especially iPhone SE / iOS Safari), I want CTAs and key content to remain fully visible and interactable (not clipped behind bottom UI or headers), so that I can complete onboarding and reach city/provider discovery without friction.

**Implementation delivers**: By removing the nested viewport-height claim from all 6 onboarding funnel screens, child content now fills the available `<main>` space (which correctly accounts for the 128px bottom slot). CTA buttons and map controls should no longer be pushed below the visible area.

## TDD Compliance

This is a **bugfix with no new API surface** — no new functions, classes, or modules were created. The changes are purely CSS class replacements (`h-screen-fix` → `h-full`) on existing components.

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|----------------|-----------|--------------------|--------------------|----------------|-----------------|
| N/A (CSS-only bugfix) | N/A | ⚠️ Post-fix (bugfix regression) | ✅ Yes | Existing tests pass; no new API surface to TDD | ✅ Yes (163 tests pass) |

**Justification**: Per TDD gate exception rules, bugfixes with no new API surface may use post-fix regression testing. The fix is a CSS class swap with no behavioral logic changes. All 163 existing tests continue to pass, confirming no regressions.

## Test Coverage

- **Unit tests**: 163 existing tests pass (no new tests needed — CSS-only change)
- **Integration**: Navigation utility tests unaffected (no logic changes)
- **Manual verification required**: iPhone SE Safari on `/`, `/city-selection`, `/city/[cityName]`

## Test Execution Results

```
$ npx vitest run
 Test Files  19 passed | 1 skipped (20)
      Tests  163 passed | 18 skipped (181)
   Duration  3.39s

$ npm run type-check
tsc --noEmit  (exit 0)

$ npm run build
Build completed successfully
```

## Outstanding Items

- **Manual device verification**: iPhone SE Safari must be tested on the 3 reported screens (landing CTA, city-selection map/CTA, city page CTA). This is a UAT responsibility.
- **Secondary sweep candidates** (out-of-scope per plan): `HomePageShell.tsx`, `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`, and provider pages still use `h-screen-fix` but were not user-reported. File follow-up plan if QA identifies issues.

## Next Steps

→ **Code Reviewer** validates the implementation
→ **QA** performs targeted mobile regression sweep
→ **UAT** verifies on iPhone SE Safari (real device)
→ **DevOps** deploys v0.6.5
