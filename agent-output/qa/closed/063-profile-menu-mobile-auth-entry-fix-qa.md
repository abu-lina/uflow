---
ID: 063
Origin: 063
UUID: a7e4f3b2
Status: Committed
---

# QA Report: 063 — Restore Mobile Profile Entry When Logged Out

**Plan Reference**: `agent-output/planning/063-profile-menu-mobile-auth-entry-fix-plan.md`
**Implementation Reference**: `agent-output/implementation/063-profile-menu-mobile-auth-entry-fix-impl.md`
**Code Review Reference**: `agent-output/code-review/063-profile-menu-mobile-auth-entry-fix-code-review.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date | Agent Handoff | Request | Summary |
| ---------- | ---------------- | -------------------- | ----------------------------------- |
| 2026-03-26T21:48Z | Code Reviewer | QA strategy and execution for Plan 063 | Created QA strategy, validated TDD evidence, executed focused regressions + full suite + type-check + delta lint, recorded production build as env-blocked, and documented real-device UAT remaining work |

## Timeline

- **Test Strategy Started**: 2026-03-26T21:48Z
- **Test Strategy Completed**: 2026-03-26T21:49Z
- **Implementation Received**: 2026-03-26T21:48Z
- **Testing Started**: 2026-03-26T21:49Z
- **Testing Completed**: 2026-03-26T21:52Z
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

The user-facing risk is not only whether the Profile icon exists, but whether the exact fresh-user path that previously resolved to `mobileUiMode='none'` now resolves to a visible, interactive bottom navbar without regressing Stage 3 behavior or onboarding-page exclusions.

This QA strategy therefore emphasized:

- focused logic tests for the exact fresh-user `/` bug path rather than only broad page smoke tests
- preservation checks for Stage 3 and other onboarding pages (`/about`, `/welcome`)
- verification that the interaction-layer chain still yields a tappable surface on mobile (`mobileUiMode='navbar'` -> visible slot/wrapper -> navbar)
- broad automated gates to ensure a small navigation-logic change did not destabilize unrelated routes or tests
- explicit separation of what automated evidence can prove vs what still requires UAT on a real iOS device

### Testing Infrastructure Requirements

**Test Frameworks Needed**:

- Vitest (existing repo setup)

**Testing Libraries Needed**:

- ESLint (existing repo setup)
- TypeScript compiler (`tsc --noEmit`) (existing repo setup)

**Configuration Files Needed**:

- `vitest.config.ts` (existing)
- `tsconfig.json` (existing)
- `eslint.config.mjs` (existing)

**Build Tooling Changes Needed**:

- None

**Dependencies to Install**:

```bash
none
```

**⚠️ TESTING INFRASTRUCTURE NEEDED**: none beyond the repo's existing Vitest/TypeScript/ESLint setup.

### Required Unit Tests

- Verify `shouldShowCityEarlyAccessNavbar('/', false, null, 'onboarding')` returns `true` for a fresh user with no storage
- Verify the same `/` outcome for `stage1`, `stage2`, and `loading`
- Verify Stage 3 remains excluded
- Verify `/about` and `/welcome` remain excluded for fresh users
- Verify `shouldShowMobileFooter('/', false, null, false, 'onboarding')` remains `false` so the navbar is the intended surface

### Required Integration Tests

- Confirm `RootClientLayout` selection logic still maps `showCityEarlyAccessNavbar=true` to `mobileUiMode='navbar'`
- Re-run full Vitest suite to catch unrelated navigation/layout regressions

### Acceptance Criteria

- Fresh logged-out mobile users on `/` resolve to a visible `CityEarlyAccessNavbar`
- Stage 3 behavior remains unchanged
- Other onboarding pages remain gated as planned
- Exact regression path is covered by focused tests written before implementation
- Any residual real-device risk is explicitly deferred to UAT with owner and closure evidence

## Implementation Review (Post-Implementation)

### Code Changes Summary

- `src/utils/navigationUtils.ts`
  - `shouldShowCityEarlyAccessNavbar()` now returns `true` immediately for `pathname === '/'` after the Stage 3 guard
  - `hasCompletedOnboarding()` is no longer consulted for `/`
  - `onboardingPages` no longer contains `/`; `/about` and `/welcome` remain gated
- `src/__tests__/utils/navigationUtils-063.test.ts`
  - Added 9 focused regression tests for fresh-user `/` behavior, Stage 3 preservation, onboarding-page exclusions, and footer/nav split

### TDD Compliance Gate

- **Implementation doc TDD table present**: Yes
- **Rows complete for new behavior**: Yes
- **Failure verified before implementation**: Yes
- **Failure reason valid**: Yes (`AssertionError: expected false to be true` on 4 fresh-user `/` cases)
- **Pass after implementation**: Yes

QA conclusion: TDD compliance is sufficient and directly exercises the actual bug path.

## Test Coverage Analysis

### New/Modified Code

| File | Function/Class | Test File | Test Case | Coverage Status |
| --------------- | -------------- | ------------ | ------------------ | ----------------- |
| src/utils/navigationUtils.ts | `shouldShowCityEarlyAccessNavbar` | src/__tests__/utils/navigationUtils-063.test.ts | fresh-user `/` across onboarding/stage1/stage2/loading | COVERED |
| src/utils/navigationUtils.ts | `shouldShowCityEarlyAccessNavbar` | src/__tests__/utils/navigationUtils-063.test.ts | Stage 3 remains excluded | COVERED |
| src/utils/navigationUtils.ts | `shouldShowCityEarlyAccessNavbar` | src/__tests__/utils/navigationUtils-063.test.ts | `/about` and `/welcome` remain excluded | COVERED |
| src/utils/navigationUtils.ts | `shouldShowMobileFooter` | src/__tests__/utils/navigationUtils-063.test.ts | fresh-user `/` footer remains false | COVERED |
| src/components/layout/RootClientLayout.tsx | `mobileUiMode` selection contract | existing RootClientLayout tests + logic trace | navbar path remains deterministic when `showCityEarlyAccessNavbar=true` | INDIRECTLY COVERED |

### Coverage Gaps

- No explicit unit test for `stage=undefined` on the fresh-user `/` path. Risk is low because the function's Stage 3 exclusion is a simple equality check and the new `/` early return applies when `stage` is omitted.
- No automated browser-level assertion of actual tap navigation on a real iOS device. That is a UAT concern, not a jsdom-verifiable unit concern.

### Comparison to Test Plan

- **Tests Planned**: 5 focused logic expectations + integration confirmation + automated gates
- **Tests Implemented**: 9 focused regression tests in `navigationUtils-063.test.ts`
- **Tests Missing**: explicit `stage=undefined` case (low risk), real-device tap validation (belongs to UAT)
- **Tests Added Beyond Plan**: rerun of existing Plan 062 logic regressions and full repo Vitest suite

## Test Execution Results

### Focused Unit Tests

- **Command**: `npx vitest run "src/__tests__/utils/navigationUtils-063.test.ts" "src/__tests__/utils/navigationUtils-062.test.ts"`
- **Status**: PASS
- **Output**: 2 files passed, 18 tests passed, 0 failed
- **Coverage Percentage**: Not reported by the command

### Full Automated Suite

- **Command**: `npx vitest run`
- **Status**: PASS
- **Output**: 68 files passed, 1 skipped; 699 tests passed, 18 skipped; no failures
- **Notes**: Existing repo warnings/log noise appeared in unrelated tests (`act(...)` warnings, expected auth hook error logs), but did not cause failures and were unrelated to Plan 063

### Type Check

- **Command**: `npm run type-check`
- **Status**: PASS
- **Output**: `tsc --noEmit` exited clean

### Delta Lint

- **Command**: `npx eslint "src/utils/navigationUtils.ts" "src/__tests__/utils/navigationUtils-063.test.ts"`
- **Status**: PASS
- **Output**: no errors, no warnings

### Production Build

- **Command**: `npm run build`
- **Status**: DEFERRED / ENV-BLOCKED
- **Output**:
  - Next.js compiled successfully
  - Type validation passed
  - Build failed during page-data collection for `/api/admin/badges/verify`
  - Failure reason: missing `NEXT_PUBLIC_SUPABASE_URL` environment variable
- **Assessment**: Not caused by Plan 063 changes. This worktree lacks the required local env configuration, so build verification is blocked for environment reasons rather than code reasons.

## Manual Validation Status

### Deferred Manual Checks

| Check | Status | Owner | Rationale | Severity | Fallback / Closure Evidence |
| --- | --- | --- | --- | --- | --- |
| Fresh logged-out iOS Safari tap on Profile icon at `/` | DEFERRED | UAT | jsdom/unit tests prove logic selection, not real browser hit-testing or route transition | Medium | Execute on UAT with cleared storage; capture `/ -> /login` transition and visible `CityEarlyAccessNavbar` |
| Returning logged-out iOS Safari tap on Profile icon | DEFERRED | UAT | Bug A CSS fix is already on main, but real-device confirmation still belongs to UAT | Medium | Execute on UAT with retained storage after logout; capture tappable navbar and `/login` transition |
| 320px narrow-screen layout verification | DEFERRED | UAT | Unit tests do not validate real hit-target spacing or safe-area ergonomics | Low | Screenshot/video at 320px or real small device showing bottom navbar with intact tap targets |

Residual risk is **MEDIUM**, not low, because the primary user-visible value still depends on real iOS runtime verification in UAT.

## Effectiveness Assessment

The automated evidence is strong for the specific defect class:

- The exact pre-fix failure path is now covered by direct boolean assertions on the production selection function.
- The fix is minimal and local, reducing regression surface.
- Existing Plan 062 tests still pass, showing the earlier stage/auth nav matrix behavior remains intact.
- Full repo tests passing reduces concern about unrelated fallout.

The remaining uncertainty is not whether the code chooses the right nav surface; it is whether a real iOS Safari session on UAT still behaves as expected with actual auth/storage state and runtime routing. That uncertainty is properly deferred to UAT, not ignored.

## Final Assessment

- **Plan ↔ implementation alignment**: Aligned
- **Automated regression adequacy**: Sufficient
- **User-facing residual risk**: Medium until real-device UAT verifies both fresh-user and returning logged-out tap paths
- **QA Verdict**: QA Complete

The implementation is acceptable to advance because the exact bug path is covered with focused tests, broader automated gates are green, and the remaining runtime uncertainty is explicitly documented with clear ownership and closure evidence.

Handing off to uat agent for value delivery validation.
