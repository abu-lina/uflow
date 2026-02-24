---
ID: 019
Origin: 019
UUID: c4a1d9e2
Status: UAT Approved
---

# Plan 019 — iPhone SE viewport overlap bugfix

**Target Release**: v0.6.4  
**Epic Alignment**: Mobile UX reliability (PWA / iOS Safari viewport correctness)  
**Status**: In Progress  
**Related Issues**: None

## Release Strategy

Standalone (no other known active plans targeting v0.6.4 in `agent-output/planning/`).

## Changelog

| Date (UTC) | Agent | Change | Rationale |
| --- | --- | --- | --- |
| 2026-02-23 | planner | Created plan | Fix iPhone SE content hidden behind fixed UI |
| 2026-02-23 | planner | Scope locked: sweep | User selected broad `h-screen` → `h-screen-fix` replacement to prevent recurrence |
| 2026-02-24 | uat | UAT Approved | All quality gates pass; implementation delivers value statement; manual device validation deferred to UAT environment |

## Value Statement and Business Objective

As a **mobile visitor (iPhone SE / iOS Safari user)**, I want **all page content to remain visible and not be covered by fixed headers/footers**, so that **I can complete onboarding/landing flows without missing CTAs or reading text that’s partially hidden**.

## Context

On iPhone SE (iOS Safari, observed on UAT), some screens show content partially hidden behind top/bottom fixed UI. This is consistent with iOS viewport sizing issues when using `100vh` (`h-screen`) and/or when fixed header/footer elements are present.

Version note: the repository currently reports `0.6.3` in `package.json` / `CHANGELOG.md`, while the roadmap’s “Current Version” field may lag. This plan targets the next patch release (`v0.6.4`) as a bugfix; confirm final release assignment with the Roadmap/DevOps workflow before shipping.

The codebase already includes an iOS-aware viewport utility class `h-screen-fix` in [src/styles/globals.css](src/styles/globals.css) intended to avoid the classic Safari browser-chrome overlap.

## Scope

**In scope**
- **Sweep**: Replace `h-screen` (and any equivalent “100vh page wrapper” usage) with the project’s safe viewport height utility `h-screen-fix` across **all** mobile-relevant full-height page/screen wrappers.
- Ensure that fixed mobile bottom UI (e.g., `MobileFooterBar` / `CityEarlyAccessNavbar` / footer actions) does not cover important content on iPhone SE on any affected screens.
- Keep changes limited to viewport sizing utilities (no layout redesign).

**Out of scope**
- Visual redesign, new UI components, or layout refactors unrelated to the overlap.
- Changing feature-flag logic for whether mobile footer/nav renders.

## Assumptions

- The overlap is primarily caused by `h-screen` (100vh) on iOS Safari and not by incorrect z-index layering.
- The fix should be safe as a CSS-class swap (no behavior changes).
- A sweep is acceptable because `h-screen-fix` already includes cross-platform fallbacks and iOS-only gating.

## Plan

1. **Sweep: inventory all `h-screen` full-height wrappers**
   - Search the codebase for `h-screen` usage across mobile-facing routes/components.
   - Classify each usage as either:
     - **Full-height page/screen wrapper** (in scope), or
     - **Non-wrapper/intentional fixed-size element** (out of scope; do not change without strong justification).
   - Prioritize wrappers used in public/onboarding flows (e.g., [src/components/layout/SplashLayout.tsx](src/components/layout/SplashLayout.tsx)).

2. **Sweep: replace wrapper `h-screen` with `h-screen-fix`**
   - Apply replacements consistently so future screens don’t regress on iOS Safari.
   - Keep diffs minimal and avoid unrelated refactors.

3. **Validate fixed header/footer coexistence (iOS focus)**
   - Verify screens with fixed header and/or fixed bottom UI have fully visible content and CTAs.
   - Confirm behavior in Safari browser mode and PWA standalone mode (if applicable in UAT testing).

4. **Regression check (non-iOS)**
   - Verify that Android/desktop layouts do not regress (the existing `h-screen-fix` utility includes non-iOS fallbacks).

5. **Version and release artifacts**
   - Bump version to `0.6.4`.
   - Add a `CHANGELOG.md` entry under `0.6.4` describing the iPhone SE overlap fix.

## Acceptance Criteria

- On iPhone SE Safari, landing/onboarding screens no longer have content hidden beneath fixed headers or fixed bottom UI.
- Primary CTA buttons (e.g., “Weiter”, “Muslimische Anbieter entdecken”) remain fully visible without requiring awkward scroll.
- No regressions to existing viewport fixes on Android (notably MIUI/PWA) and no new “collapsed height” issues.

## Testing Strategy (High-Level)

- Run unit/integration suite as-is (`vitest`).
- Basic visual smoke on:
  - iPhone SE Safari (browser)
  - iPhone SE PWA standalone (if used)
  - One Android device/browser
  - Desktop responsive check

## Risks and Mitigations

- **Risk**: Some `h-screen` usages may be intentional for non-wrapper UI (e.g., fixed-size sections, inner panels).
   - **Mitigation**: Only change instances that function as the **page/screen viewport wrapper**; leave inner layout elements unchanged unless there is a demonstrated iOS overlap bug.

- **Risk**: iOS-only `-webkit-fill-available` behavior changes.
  - **Mitigation**: The project utility gates iOS-only behavior behind `@supports (-webkit-touch-callout: none)`; verify Android does not collapse.

- **Risk**: Broad sweep could introduce subtle layout differences on some routes.
   - **Mitigation**: Do the sweep in small, reviewable batches (per wrapper), and validate at least one representative screen per major layout shell.

## Duration Estimates

- Analysis: 0.5–1.0h (confirm affected routes/components)
- Planning: 0.5h (this plan)
- Implementation: 0.5–1.5h (class swaps + quick checks)
- QA: 0.5–1.5h (device smoke)
- UAT: 0.25–0.5h (confirm screenshots match expectation)
- DevOps: 0.25–0.5h (version bump + release notes)

Uncertainty drivers: exact route/component mapping for the reported screens; whether multiple fixed bottom elements overlap on the same route.

## Scope Lock

User decision: **Sweep** (`h-screen` → `h-screen-fix` for all mobile-relevant full-height page/screen wrappers).

## Notes

- Flowbaby memory was unavailable during planning (daemon offline), so this plan is intentionally explicit about scope, files, and risks.
