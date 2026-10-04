---
ID: 20
Origin: 20
UUID: b7e3f41a
Status: QA Complete
---

# QA Report: 020 — iPhone SE Viewport Overlap v2

**Plan Reference**: `agent-output/planning/020-iphone-viewport-overlap-v2-plan.md`
**Implementation Reference**: `agent-output/implementation/020-iphone-viewport-overlap-v2-implementation.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date       | Agent Handoff      | Request                          | Summary                                                         |
| ---------- | ------------------ | -------------------------------- | --------------------------------------------------------------- |
| 2026-02-24 | Code Reviewer → QA | Execute QA for Plan 020 (v0.6.5) | Ran automated gates + documented targeted mobile regression risks |

## Timeline

- **Test Strategy Started**: 2026-02-24T08:50Z
- **Test Strategy Completed**: 2026-02-24T08:55Z
- **Implementation Received**: 2026-02-24T15:30Z (per implementation doc)
- **Testing Started**: 2026-02-24T08:55Z
- **Testing Completed**: 2026-02-24T08:58Z
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

### Scope and Risk Focus (User-Visible)

This change targets an iOS Safari viewport overlap bug where CTA/buttons or map controls become obscured by fixed UI (header/footer). The primary risk is **layout + scroll container behavior** on small mobile viewports (iPhone SE), especially where nested `100dvh` containers previously clipped content.

**Critical user workflows to protect**:
- Landing (`/`): CTA “Muslimische Anbieter entdecken” visible + tappable.
- City selection (`/city-selection`): map area, header, and CTA visible; no clipped map controls.
- City page (`/city/[cityName]`): empty state / loading / fallback CTA visible.

**Key regression risks**:
- Double-scroll containers (inner `overflow-y-auto` competing with outer scroll).
- “Hidden behind footer” persists due to remaining nested viewport-height containers in funnel screens.
- iOS Safari dynamic viewport chrome changes (address bar) interacting with `dvh`/safe-area.

### Testing Infrastructure Requirements

**Test Frameworks Needed**:
- None (existing Vitest + Next build are sufficient for automated gates)

**Testing Libraries Needed**:
- None

**Configuration Files Needed**:
- None

**Build Tooling Changes Needed**:
- None

⚠️ **Limitations**: This is effectively a CSS/layout fix. JSDOM unit tests are not reliable for validating iOS Safari viewport/safe-area overlap. Automated gates are used for regression safety; device validation is deferred to UAT.

### Required Automated Checks

- Type-check: ensure no TS regressions.
- Unit tests: ensure no behavioral regressions.
- Production build: ensure Next build succeeds.
- Delta lint: ensure touched files remain lint-clean.

### Acceptance Criteria

- Automated gates pass (type-check, tests, build, lint).
- No new runtime errors introduced.
- Remaining verification (real iPhone SE Safari): CTA/map not obscured on the 3 reported screens.

## Implementation Review (Post-Implementation)

### TDD Compliance Gate (MANDATORY)

Reviewed `TDD Compliance` section in the implementation report.
- Change classified as **CSS-only bugfix with no new API surface**.
- Exception documented as `⚠️ Post-fix (bugfix regression)` with passing suite evidence.

Result: **PASS**.

### Code Changes Summary

- Removed nested `h-screen-fix` (`100dvh`) from 6 primary funnel screens rendered under `RootClientLayout`’s `<main>`.
- Replaced with fill-parent sizing (`h-full` + flex) to avoid clipping against the always-reserved `mobile-bottom-ui-slot` (128px).

## Test Coverage Analysis

### New/Modified Code

| File | Function/Class | Test File | Coverage Status |
| ---- | -------------- | --------- | --------------- |
| Layout class changes only (6 components/pages) | N/A | Existing suite | COVERED (regression gates) |

### Coverage Gaps

- Device-specific viewport overlap cannot be meaningfully unit-tested in JSDOM.
- Manual iPhone SE Safari verification remains required (UAT).

## Test Execution Results

### TypeScript Type-Check

- **Command**: `npm run type-check`
- **Status**: PASS
- **Evidence (tail)**:
  - `> ummah-flow@0.6.5 type-check`
  - `> tsc --noEmit`

### Unit Tests (Vitest)

- **Command**: `npx vitest run`
- **Status**: PASS
- **Evidence (tail)**:
  - `Test Files  19 passed | 1 skipped (20)`
  - `Tests  163 passed | 18 skipped (181)`

### Production Build

- **Command**: `npm run build`
- **Status**: PASS
- **Evidence**: Build completes and prints route size table.
- **Notes**: Build output contains repeated `Dynamic server usage` logs for some routes (`cookies`/`headers`). These appear as diagnostic logs but did not fail the build in this run.

### Lint (Delta)

- **Command**: `npx eslint src/components/layout/SplashLayout.tsx src/components/shared/MobileSplashScreen.tsx src/components/shared/EarlyAccessScreen.tsx src/components/shared/CityEarlyAccessEmptyState.tsx src/app/city-selection/page.tsx "src/app/(public)/city/[cityName]/page.tsx"`
- **Status**: PASS
- **Evidence**: Exit 0 (`ESLINT_OK` marker).

## Manual Validation

- **Status**: Deferred to UAT (required)
- **Owner**: uat agent / real device tester
- **Rationale**: iOS Safari viewport/safe-area overlap is device/browser-behavior dependent; automated tests cannot validate.
- **Required URLs**:
  - `/`
  - `/city-selection`
  - `/city/[cityName]`

---

Handing off to uat agent for value delivery validation.
