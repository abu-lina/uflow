---
ID: 20
Origin: 20
UUID: b7e3f41a
Status: UAT Complete
---

# UAT Report: 020 — iPhone SE Viewport Overlap v2

**Plan Reference**: `agent-output/planning/020-iphone-viewport-overlap-v2-plan.md`
**Date**: 2026-02-24
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date       | Agent Handoff | Request                                | Summary                                                                  |
| ---------- | ------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| 2026-02-24 | QA → UAT      | All tests passing, ready for value validation | UAT Complete — implementation delivers stated value; deferred real device validation documented |

## Value Statement Under Test

**From Plan 020:**

> As a mobile user (especially iPhone SE / iOS Safari), I want CTAs and key content to remain fully visible and interactable (not clipped behind bottom UI or headers), so that I can complete onboarding and reach city/provider discovery without friction.
>
> This is conversion-critical: the landing CTA and city-selection CTAs are part of the primary funnel.

## UAT Scenarios

### Scenario 1: Landing Page CTA Visibility

- **Given**: User visits `/` on mobile viewport (320px - 768px)
- **When**: Page loads and displays landing splash screen with CTA "Muslimische Anbieter entdecken"
- **Then**: CTA button is fully visible, not clipped behind bottom UI, and tappable
- **Result**: ✅ PASS (document-based)
- **Evidence**: 
  - Implementation removed `h-screen-fix` from `SplashLayout.tsx` (line: `h-screen-fix flex flex-col` → `flex h-full flex-col`)
  - Implementation removed `h-screen-fix` from `MobileSplashScreen.tsx` loading state
  - Code review verified: "Clean — minimal CSS change" for both files
  - QA confirmed: Production build succeeds, no layout regressions in automated tests

**Residual Risk**: Real iOS Safari viewport chrome behavior (address bar show/hide) cannot be validated in automated tests. **Manual iPhone SE Safari validation deferred to post-UAT device testing** (see Risk Register below).

### Scenario 2: City Selection Map and CTA Visibility

- **Given**: User navigates to `/city-selection` on mobile viewport
- **When**: Map loads with city markers and early access CTA
- **Then**: Map area, header navigation, and bottom CTA are all visible and interactable; map controls are not clipped
- **Result**: ✅ PASS (document-based)
- **Evidence**: 
  - Implementation removed `h-screen-fix` from `city-selection/page.tsx` (line: `h-screen-fix flex w-full flex-col items-center` → `flex h-full w-full flex-col items-center`)
  - Implementation removed `h-screen-fix` from `CityEarlyAccessEmptyState.tsx`
  - Code review verified: "Clean — minimal CSS change" for both files
  - QA confirmed: 163 unit tests pass, no map rendering regressions detected

**Residual Risk**: Real iOS Safari viewport chrome behavior and touch interaction zones cannot be validated in automated tests. **Manual iPhone SE Safari validation deferred to post-UAT device testing** (see Risk Register below).

### Scenario 3: City Page CTA Visibility (Loading/Error/Fallback States)

- **Given**: User navigates to `/city/[cityName]` (e.g., `/city/berlin`)
- **When**: Page displays loading state, error state, or fallback empty state
- **Then**: CTA buttons and key content remain visible, not obscured by bottom navbar
- **Result**: ✅ PASS (document-based)
- **Evidence**: 
  - Implementation removed `h-screen-fix` from 3 wrappers in `city/[cityName]/page.tsx` (loading, error, fallback)
  - Code review verified: "Clean — minimal CSS change (3 instances)"
  - QA confirmed: Type-check, build, and lint all pass; no runtime errors introduced

**Residual Risk**: Real iOS Safari viewport chrome behavior cannot be validated in automated tests. **Manual iPhone SE Safari validation deferred to post-UAT device testing** (see Risk Register below).

### Scenario 4: Architectural Principle — Single Source of Viewport Height

- **Given**: Implementation establishes `RootClientLayout` as the only viewport-height owner
- **When**: Child screens fill available parent space using `h-full` instead of claiming their own `100dvh`
- **Then**: Layout system respects the 128px reserved bottom slot without clipping child content
- **Result**: ✅ PASS (document-based)
- **Evidence**: 
  - Plan explicitly required: "Single source of viewport height truth"
  - Implementation doc confirms: "Establishes `RootClientLayout` as the single source of viewport height truth"
  - Code review verified: "Implementation correctly establishes `RootClientLayout` as the only component that sets `h-screen-fix`"
  - CHANGELOG entry documents architectural principle: "Only the root layout should control viewport height; children fill available space"

## Value Delivery Assessment

### Does Implementation Deliver the Value Statement?

**YES — with conditional approval pending real device validation.**

**Evidence of Value Delivery**:

1. **Root cause addressed**: The plan identified nested `100dvh` containers inside a parent with `100dvh - 128px` available space. Implementation removed all 6 nested `h-screen-fix` instances from the primary onboarding funnel.

2. **Architectural alignment**: The fix establishes a clear architectural principle (single viewport height owner) that prevents future recurrence of this class of bug.

3. **Technical quality gates passed**:
   - TypeScript type-check: PASS
   - Unit tests: 163 passed, 0 failed
   - Production build: SUCCESS
   - ESLint delta: CLEAN
   - Code review: APPROVED (zero critical/high findings)

4. **Conversion funnel protected**: All 3 user-reported screens (landing CTA, city-selection map/CTA, city page CTA) received the fix.

5. **No regressions introduced**: Automated test suite confirms existing behavior preserved.

**Limitation**:

This is a **CSS/layout-only bugfix**. Automated tests (JSDOM-based Vitest) cannot meaningfully validate:
- iOS Safari dynamic viewport unit (`dvh`) behavior
- Mobile viewport chrome interactions (address bar show/hide)
- Real touch interaction zones and pointer events
- Safe area inset handling on notched devices

Per UAT mode instructions, this qualifies for **design-review UAT** (CSS/layout-only change with automated gate evidence + defensive implementation). The implementation includes:
- QA status: **QA Complete** ✅
- Code Review verdict: **APPROVED** ✅
- Defensive fallbacks: `h-full` is safe and progressive; fill-parent sizing is a standard responsive pattern
- Documented residual risk: Real device validation required

**Conditional Approval Rationale**: The implementation demonstrably delivers the technical fix that should resolve the value statement. However, the value statement explicitly references user experience on "iPhone SE / iOS Safari," which cannot be automated-tested. The fix is architecturally sound, technically clean, and passed all available quality gates.

### Is Core Value Deferred?

**NO — but residual validation is deferred.**

The core technical fix (remove nested viewport-height claims) is **delivered and committed** in this release. Real device validation is a **verification step**, not a deferred core feature.

## QA Integration

**QA Report Reference**: `agent-output/qa/020-iphone-viewport-overlap-v2-qa.md`
**QA Status**: QA Complete ✅
**QA Findings Alignment**: QA correctly identified the limitation: "Device-specific viewport overlap cannot be meaningfully unit-tested in JSDOM. Manual iPhone SE Safari verification remains required (UAT)."

QA executed all available automated gates and documented the regression risks. QA report is thorough and accurate.

## Technical Compliance

**Plan deliverables**:
- [x] Single source of viewport height truth (RootClientLayout) — DELIVERED
- [x] Remove nested `h-screen-fix` from 6 primary target files — DELIVERED
- [x] Fix loading/error/fallback states — DELIVERED
- [x] Version bump to v0.6.5 + CHANGELOG — DELIVERED

**Test coverage**: 163 unit tests pass, 0 failures (per QA report)

**Known limitations**: 
- Secondary sweep candidates (`HomePageShell.tsx`, `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`, provider pages) intentionally out-of-scope per plan. Documented for future follow-up if needed.
- Real iOS Safari viewport behavior validation deferred to post-UAT device testing.

## Objective Alignment Assessment

**Does code meet original plan objective?**: **YES**

**Evidence**:
- **Plan objective**: "Eliminate iOS 'content hidden behind footer/header' on landing, city-selection, and city pages"
- **Implementation approach**: Removed the root cause (nested viewport-height containers) from all 3 reported screens
- **Code Review verdict**: "Architecturally correct: Establishes single source of viewport height truth"
- **CHANGELOG entry**: Documents both the root cause and the architectural principle, demonstrating understanding of the problem domain

**Drift Detected**: NONE

Implementation exactly matches the approved plan:
- Used Option 1 (keep bottom slot behavior unchanged) as decided
- Targeted only the 6 primary files specified in plan
- Left secondary candidates out-of-scope as documented
- Applied the exact fix pattern described (replace `h-screen-fix` with `h-full`)

## UAT Status

**Status**: ✅ UAT Complete

**Rationale**:

This is a **CSS/layout-only bugfix** that qualifies for **conditional approval** under the design-review UAT criteria:

1. ✅ QA status is **QA Complete** with automated gate evidence (type-check, tests, build, lint all pass)
2. ✅ Code Review verdict is **APPROVED** with zero critical/high findings
3. ✅ The change is defensive and includes safe fallbacks (`h-full` is a standard responsive pattern; no speculative features)
4. ✅ Residual risk explicitly documented in this UAT report (see Risk Register below)

The implementation delivers the technical fix that should resolve the value statement. All available quality gates passed. Real device validation cannot be automated but is a verification step, not core value deferral.

**UAT Complete does NOT mean "no device testing needed."** It means: the implementation demonstrably delivers the plan's objective based on available evidence, and residual risk is documented and accepted.

## Release Decision

**Final Status**: ✅ **APPROVED FOR RELEASE** (conditional — see Risk Register)

**Rationale**:

1. **Value delivery**: Implementation addresses the root cause (nested viewport-height) and establishes a clear architectural principle (single viewport height owner) that prevents future recurrence.

2. **Quality gates**: All automated gates pass (type-check, 163 tests, build, lint). Code review approved with zero blocking findings.

3. **Risk mitigation**: Fix is minimal (8 lines changed), defensive (uses standard responsive pattern), and reversible (CSS-only change).

4. **Conversion funnel impact**: This bugfix unblocks the primary onboarding funnel (landing → city-selection → city page), which is conversion-critical per the value statement.

5. **Documented residual risk**: Real iOS Safari viewport behavior cannot be automated-tested. Post-release device validation plan documented below.

**Recommendation**: Proceed with release v0.6.5 and execute post-release device validation on iPhone SE Safari within 48 hours.

## Recommended Version

**Version**: v0.6.5 (already set in implementation)
**Bump Justification**: Patch version for bugfix (0.6.4 → 0.6.5 per semver)

## Key Changes for Changelog

(Already documented in implementation; included here for release notes reference)

**v0.6.5 — 2026-02-24**

**Fixed**:
- iPhone SE Safari viewport overlap: CTAs and map controls no longer hidden behind bottom UI
  - Root cause: Nested `100dvh` child containers inside `<main>` that only had `100dvh - 128px` available (due to always-reserved bottom slot)
  - Fix: Removed nested viewport-height claims from 6 primary onboarding funnel screens; children now fill parent space with `h-full`
  - Architectural principle: Only the root layout (`RootClientLayout`) should control viewport height; children fill available space

**Files Changed**:
- `src/components/layout/SplashLayout.tsx`
- `src/components/shared/MobileSplashScreen.tsx`
- `src/components/shared/EarlyAccessScreen.tsx`
- `src/components/shared/CityEarlyAccessEmptyState.tsx`
- `src/app/city-selection/page.tsx`
- `src/app/(public)/city/[cityName]/page.tsx`

## Risk Register

### Residual Risk: Real Device Validation Deferred

**Risk**: iOS Safari viewport behavior (address bar chrome, safe area insets, touch zones) cannot be validated in automated tests.

**Severity**: MEDIUM (conversion funnel impact if fix fails on real device)

**Mitigation Strategy**:

1. **Post-release device validation** (within 48 hours of v0.6.5 deployment):
   - Test on iPhone SE (iOS 15+) with Safari
   - Test on iPhone 14 Pro (notched device) with Safari
   - Test on at least one Android device (sanity check)
   
2. **Validation URLs**:
   - `https://ummahflow.com/` (or UAT: `https://uat.ummahflow.com/`)
   - `https://ummahflow.com/city-selection`
   - `https://ummahflow.com/city/berlin` (or any active city)

3. **Validation checklist**:
   - [ ] Landing CTA "Muslimische Anbieter entdecken" is fully visible and tappable (no mystery scroll needed)
   - [ ] City-selection map area is visible; map controls are not clipped; early access CTA is tappable
   - [ ] City page CTA is visible and tappable with bottom navbar present
   - [ ] No double-scroll containers (single scroll on `<main>`)
   - [ ] Address bar show/hide does not cause layout shift or clipping
   - [ ] Safe area insets (notched devices) handled correctly

4. **Rollback trigger**: If any of the 3 critical URLs show CTAs still hidden behind UI on iPhone SE Safari, execute immediate rollback to v0.6.4 and file escalation (IMMEDIATE severity per terminology).

**Owner**: DevOps / UAT validator with access to real devices

**Fallback Execution Path**: If manual device validation is not executed within 48 hours of release, treat as SAME-DAY escalation and halt further releases until validation complete.

### Secondary Risk: Out-of-Scope Screens May Exhibit Same Issue

**Risk**: `HomePageShell.tsx`, `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`, and provider pages still use `h-screen-fix` and may exhibit the same overlap.

**Severity**: LOW (not part of primary onboarding funnel; no user reports for these screens)

**Mitigation Strategy**: Monitor user feedback post-release. If similar issues reported on secondary screens, file follow-up plan referencing Plan 020's architectural principle.

**Owner**: Product Owner / Support

## Next Actions

1. ✅ **DevOps**: Proceed with v0.6.5 deployment
2. ⏳ **DevOps / UAT validator**: Execute post-release device validation within 48 hours (see Risk Register checklist)
3. ⏳ **Product Owner**: Monitor user feedback for similar issues on secondary screens (follow-up plan if needed)

---

**UAT Status**: ✅ UAT Complete  
**Release Decision**: ✅ APPROVED FOR RELEASE  
**Handoff**: Handing off to devops agent for release execution
