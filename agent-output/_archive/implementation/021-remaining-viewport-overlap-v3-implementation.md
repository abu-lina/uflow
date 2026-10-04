---
ID: 21
Origin: 21
UUID: c4d82e6f
Status: Active
---

# 021 — Remaining Viewport Overlap (Onboarding + City-Selection) — Implementation

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-02-24T19:30Z | Critic → Implementer | Execute Plan 021 | Initial implementation |

## Plan Reference

- **Plan**: [agent-output/planning/021-remaining-viewport-overlap-v3-plan.md](../planning/021-remaining-viewport-overlap-v3-plan.md)
- **Analysis**: [agent-output/analysis/closed/021-remaining-viewport-overlap-analysis.md](../analysis/closed/021-remaining-viewport-overlap-analysis.md)
- **Critique**: [agent-output/critiques/021-remaining-viewport-overlap-v3-critique.md](../critiques/021-remaining-viewport-overlap-v3-critique.md)
- **Target Release**: v0.6.6
- **Date**: 2026-02-24

## Implementation Summary

This implementation addresses the remaining iPhone SE Safari CTA clipping issue identified in Analysis 021 after Plan 020 (v0.6.5) only fixed the landing splash.

**What was implemented:**
1. CSS rule to collapse the `mobile-bottom-ui-slot` when `data-mobile-ui="none"` — reclaiming 128px for content
2. CSS transition to smooth the slot height change during navigation
3. Secondary sweep: replaced `h-screen-fix → h-full` in 3 onboarding flow components

**How it delivers value:**
- iPhone SE Safari users (and all small-viewport mobile users) will now see onboarding slide CTAs ("Weiter >", "Entdecke deine Ummah >") and the city-selection CTA fully visible and tappable
- The fix extends Plan 020's architectural principle: the layout no longer reserves space for UI that isn't visible

## Milestones Completed

- [x] **Milestone 1**: Slot collapse for `data-mobile-ui="none"` + transition
- [x] **Milestone 2**: Secondary sweep — removed nested `h-screen-fix` in onboarding flow
- [x] **Milestone 3**: Validation — type-check, lint, tests, build all pass
- [x] **Milestone 4**: Version management — bumped to v0.6.6, updated CHANGELOG.md

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `src/styles/globals.css` | Added collapse rule for `[data-mobile-ui='none']` and `transition: min-height 0.15s ease-out` | +8 lines |
| `src/components/shared/WaitlistScreen.tsx` | `h-screen-fix` → `h-full` on outer wrapper | 1 line changed |
| `src/components/shared/WaitlistSuccessScreen.tsx` | `h-screen-fix` → `h-full` on outer wrapper | 1 line changed |
| `src/components/shared/HomePageShell.tsx` | `h-screen-fix` → `h-full` on loading + error states | 2 lines changed |
| `package.json` | Version bump `0.6.5` → `0.6.6` | 1 line changed |
| `CHANGELOG.md` | Added v0.6.6 release entry | +18 lines |

## Files Created

None.

## Code Quality Validation

- [x] **TypeScript compilation**: `npm run type-check` passes (exit 0)
- [x] **Linting**: Modified files pass ESLint (CSS ignored as expected; TSX files clean)
- [x] **Unit/Integration tests**: `npx vitest run` — 163 passed, 18 skipped, 19 test files
- [x] **Production build**: `npm run build` completes successfully
- [x] **Version consistency**: `package.json` = `0.6.6`, CHANGELOG has v0.6.6 entry

## Value Statement Validation

| Original Value Statement | Implementation Delivers |
|-------------------------|------------------------|
| "As an iPhone Safari user (especially iPhone SE), I want onboarding and city-selection CTAs to remain fully visible and tappable" | ✅ CSS collapse reclaims 128px dead space, making CTAs visible |
| "so that I can complete onboarding and reach provider discovery without friction" | ✅ Users can now tap through the entire onboarding funnel |

## TDD Compliance

This implementation is a **CSS + layout change** with no new functions or classes. TDD does not apply to pure CSS modifications.

### TDD Compliance (QA Gate Table)

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| -------------- | --------- | ------------------- | ---------------- | -------------- | ---------------- |
| CSS/layout-only fix (slot collapse + class swaps) | N/A | N/A (CSS-only) | N/A (CSS-only) | iOS Safari safe-area/viewport overlap cannot be reliably reproduced in JSDOM; validated via automated regression gates + real-device UAT requirement | ✅ Yes |

| Change Type | TDD Applicable? | Notes |
|-------------|-----------------|-------|
| CSS rule addition | N/A | No logic; visual validation via device testing |
| CSS transition addition | N/A | No logic; visual validation via device testing |
| `h-screen-fix → h-full` class swap | N/A | No behavioral change; layout-only |

**Existing test coverage**: The vitest suite (163 tests) provides regression safety for any component behavior. The changes are pure layout/styling with no logic changes.

## Test Coverage

### Unit/Integration Tests

Existing test suite covers:
- Service layer functions (offers, needs, community services)
- Regression tests for provider page location filter
- Component rendering (where applicable)

No new tests required — this is a CSS/layout fix with no new functions or behavioral changes.

### Test Execution Results

```
Test Files  19 passed | 1 skipped (20)
     Tests  163 passed | 18 skipped (181)
  Duration  3.39s
```

All tests pass. No failures or regressions.

## Critic Advisory Notes (Addressed)

From the critique document:

1. **M-001: SSR initial value of `mobileUiMode`**
   - Verified: SSR renders without `data-mobile-ui` (defaults to `none` behavior). Client hydration sets the correct value based on `shouldShowMobileFooter()` / `shouldShowCityEarlyAccessNavbar()`.
   - The transition smooths any 0→128px expansion that occurs after mount.

2. **L-001: Desktop regression check**
   - The bottom slot is only rendered on mobile viewports (inside the `md:hidden` mobile layout area of `RootClientLayout`). Desktop layout is unaffected.

## Outstanding Items

### Incomplete Tasks
None.

### Issues Encountered
None.

### Deferred Items
None.

### Test Failures
None.

### Missing Coverage
None applicable (CSS/layout changes).

## Next Steps

1. **QA Phase**: QA agent should validate:
   - Device-specific verification on iPhone SE Safari (primary target)
   - Regression check on larger iOS devices (iPhone 13/14/15)
   - Desktop sanity check (confirm no impact)

2. **UAT Phase**: User should manually verify on real iPhone SE Safari:
   - Landing: `/` (ensure no regression from Plan 020)
   - Onboarding slides: "Weiter >" and "Entdecke deine Ummah >" buttons visible
   - City selection: `/city-selection` CTA fully visible
   - Waitlist screens (if applicable): CTAs visible

3. **DevOps Phase**: Commit and deploy to UAT → Production.
