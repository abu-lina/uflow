---
ID: 028
Origin: 028
UUID: c4a9d2f1
Status: QA Failed
---

# QA Report: Plan 028 — Landing Page Vertical Centering (Mobile)

**Plan Reference**: `agent-output/planning/028-landing-vertical-centering.md`
**QA Status**: QA Complete
**QA Specialist**: qa

> Flowbaby memory unavailable (another VS Code window owns the daemon). Operating in no-memory mode; all evidence captured inline.

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
| ---------- | ------------ | ------- | ------- |
| 2026-02-28 | Code Reviewer → QA | Execute QA gates for Plan 028 | Automated gates PASS (type-check, tests, lint w/ warnings only, build). Device validation deferred to UAT. |
| 2026-02-28T20:18Z | UAT/User → QA | Device validation indicates bug persists | iPhone Safari still shows splash content not vertically centered; root cause updated and requires implementation revision. |
| 2026-02-28 | Code Reviewer → QA | Re-run QA after corrective fix | Automated gates PASS; iPhone Safari retest confirms splash is vertically centered. |

## Timeline

- **Test Strategy Started**: 2026-02-28
- **Test Strategy Completed**: 2026-02-28
- **Implementation Received**: 2026-02-28 (per implementation doc)
- **Testing Started**: 2026-02-28
- **Testing Completed**: 2026-02-28 (device validation passed)
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

This is primarily a **CSS/layout** bugfix and is not meaningfully assertable in jsdom as a “true centering” test (no layout engine / real viewport). QA therefore emphasizes:

- Automated gates: type-check, unit tests, lint, build.
- Device validation: iPhone Safari (viewport height propagation + safe-area).
- Regression risk: ensure scrollability is preserved if content grows past viewport height.

### Testing Infrastructure Requirements

- None (use existing repo tooling).

### Acceptance Criteria

- Splash content is vertically centered on iPhone Safari when it has room.
- If content exceeds viewport height, layout remains scrollable (no clipped CTAs).
- Automated gates pass.

## Implementation Review (Post-Implementation)

### Code Changes Summary

- [src/components/layout/SplashLayout.tsx](src/components/layout/SplashLayout.tsx): outer container changed from `h-full` to `min-h-full`.

### TDD Compliance Gate (MANDATORY)

- Implementation doc present: `agent-output/implementation/028-landing-vertical-centering.md`
- TDD compliance table present: Yes
- Exception documented and valid: Yes (CSS/layout-only)

## Test Execution Results (Automated Gates)

- Type check: `npm run type-check` PASS
- Unit tests: `npm test -- --run` PASS
- Lint: `npm run lint` PASS (warnings only; unrelated)
- Build: `npm run build` PASS

## Manual Validation (Device)

- **Status**: EXECUTED (PASS)
- **Device/Browser**: iPhone Safari
- **Result**: Splash content is vertically centered.

## Findings

### Resolved: Vertical centering on iPhone Safari

**Evidence**: User confirmed iPhone Safari now shows the splash vertically centered.

**Updated root cause (code-level)**:

- `SplashLayout` centers its content using a `flex-1 items-center justify-center` inner region.
- In `MobileSplashScreen`, the `currentState === 'splash'` branch wraps `SplashLayout` in a `motion.div` that does **not** establish height or participate in the parent flex layout (no `flex-1`, no `h-full`).
- `PageTransition` uses `flex flex-1 flex-col`, so children must opt into `flex-1` to fill available height. Without that, the splash wrapper collapses to content height and there is no extra space to center within.

**Relevant files**:

- [src/components/shared/MobileSplashScreen.tsx](src/components/shared/MobileSplashScreen.tsx)
- [src/components/ui/PageTransition.tsx](src/components/ui/PageTransition.tsx)
- [src/components/layout/SplashLayout.tsx](src/components/layout/SplashLayout.tsx)

**Fix applied (implementation)**:

- Propagated `flex-1` through the mobile wrapper + splash wrappers so the centering container receives a full-height box.

## QA Status

**Status**: QA Complete

**Rationale**: Automated gates pass and iPhone Safari device validation confirms the user-facing centering issue is resolved.

---

Handing off to Implementer for corrective change
