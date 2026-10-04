---
ID: 028
Origin: 028
UUID: c4a9d2f1
Status: UAT Approved
---

# Plan 028 — Landing Page Vertical Centering (Mobile)

## Plan Header

- **Target Release**: v0.6.10 (patch)
- **Epic Alignment**: Landing / Onboarding entry experience (supports Master Product Objective by improving first impression and reducing friction)
- **Status**: UAT Approved
- **Related Issues**: None

### Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-02-28T21:05Z | code-reviewer | Status: Code Review Approved | Single-line CSS fix approved, ready for QA |
| 2026-02-28T21:15Z | qa | Status: QA Complete | Automated gates pass; ready for UAT device validation |
| 2026-02-28T20:18Z | qa | Status: QA Failed | iPhone Safari device validation reported splash still not vertically centered; root cause updated and requires implementation revision |
| 2026-02-28T21:25Z | implementer | Status: In Progress | Corrective fix: added flex-1 to motion.div wrappers + SplashLayout outer |
| 2026-02-28T20:35Z | implementer | Status: Code Review Requested | iPhone Safari retest confirmed vertical centering now works; ready for review + QA rerun |
| 2026-02-28T20:40Z | code-reviewer | Status: Code Review Approved | Corrective fix approved with minor comments; ready for QA rerun |
| 2026-02-28 | qa | Status: QA Complete | QA re-run passed; iPhone Safari retest confirms splash is vertically centered |
| 2026-02-28 | uat | Status: UAT Approved | Value statement delivered; APPROVED FOR RELEASE as v0.6.10 patch |
| 2026-02-28 | planner | Created plan | Fix mobile landing layout regression: content not vertically centered |

## Value Statement and Business Objective

As a **mobile visitor** arriving on the landing/onboarding entry,
I want the **primary splash/landing content to be vertically centered in the visible viewport**,
so that the page **feels balanced and intentional**, and users can **immediately understand the value proposition and proceed** without visual friction.

## Objective

Deliver a small, low-risk layout fix that restores vertical centering for the landing/onboarding splash content on mobile browsers (including iOS Safari), without affecting desktop layout or introducing viewport-height regressions.

## Context (Observed)

- UAT screenshot shows the splash/landing stack (Bismillah, logo, title, CTA) top-aligned rather than vertically centered.
- The splash content is rendered via the waitlist/onboarding flow (mobile) using the shared layout container.

## Root Cause (Proven)

- The splash content is centered via `flex-1 items-center justify-center`, which requires the splash container to have **extra vertical space** (i.e., fill the available height).
- In `MobileSplashScreen`, the `currentState === 'splash'` branch wraps `SplashLayout` in a `motion.div` that does **not** establish height or participate in the parent flex layout (missing `flex-1` / `h-full`).
- Because `PageTransition` is `flex flex-1 flex-col`, children must opt into `flex-1` to fill the viewport-height area. Without it, the wrapper collapses to content height and centering cannot occur.

**Primary locations**:

- `src/components/shared/MobileSplashScreen.tsx` (splash wrapper)
- `src/components/ui/PageTransition.tsx` (parent flex layout)
- `src/components/layout/SplashLayout.tsx` (centering implementation)

## Assumptions

- This centering bug is present in the waitlist/onboarding splash experience (root landing path on mobile).
- Fix should be limited to layout height semantics (no visual redesign, no content changes).

## Open Questions

- **OPEN QUESTION (Release Target)**: Roadmap currently shows **Current Working Release: none** while repo version is **0.6.9**. This plan assumes the next patch release is **v0.6.10** for bundling. If a different release train is intended, retarget before implementation.

## Release Strategy

Release Strategy: Standalone (no other known plans currently targeting v0.6.10 in `agent-output/planning/`).

## Plan

1. **Confirm affected rendering path**
   - Identify the exact mobile entry route/state that renders the splash content in UAT (root vs waitlist route).
   - Acceptance: Implementer can reproduce the mis-centering locally (or at least confirm via DOM/CSS inspection in responsive mode).

2. **Adjust splash layout height semantics (minimal change)**
   - Update the splash layout container to ensure its flex column has a reliable minimum height that matches its parent’s available height, so `flex-1` centering works consistently.
   - Keep changes localized to the shared splash layout to avoid impacting unrelated pages.
   - Acceptance:
     - Splash content is vertically centered on mobile.
     - No regression in scrollability when content exceeds viewport height.
     - Desktop layout remains unchanged.

3. **Regression sweep (targeted)**
   - Verify other screens using the same splash layout or shared layout primitives are not negatively affected (e.g., different languages, longer text).
   - Acceptance: No new clipping/overlap observed on key splash/onboarding screens.

4. **Validation (engineering checks)**
   - Run TypeScript + lint + unit tests as applicable.
   - Acceptance: `npm run type-check`, `npm run lint`, and `npm test` pass (or existing unrelated failures are documented and excluded from scope).

5. **Version and release artifacts (release-level task)**
   - Coordinate version bump and changelog entry for the release bundle that includes this plan.
   - Acceptance:
     - Release notes include the fix.
     - Version artifacts are consistent with the chosen Target Release.

## Validation Signals (Non-QA)

- Visual: On mobile viewport sizes, the splash content block is vertically centered (not hugging the top).
- Behavioral: CTA remains reachable; page still scrolls if content becomes taller than the viewport.

## Risks and Mitigations

- **Risk**: Height utility changes could reintroduce iOS viewport bugs.
  - Mitigation: Keep changes confined to minimum-height semantics and rely on existing `h-screen-fix` wrapper behavior.
- **Risk**: Some locales produce taller content that no longer fits.
  - Mitigation: Ensure overflow behavior remains intact; centering should degrade gracefully to top-aligned when scrolling is necessary.

## Duration Estimates (Rough)

- Analysis: 0.25–0.5h (reproduce + confirm DOM/CSS hierarchy)
- Planning: 0h (this doc)
- Implementation: 0.25–0.75h
- Verification (dev checks): 0.25–0.75h
- UAT coordination: 0.25–1.0h (mobile Safari quick check)
- DevOps: bundled with next release (timing depends on release cadence)

## Handoff Notes

- Prefer the smallest possible Tailwind class change in the splash layout container.
- Avoid introducing new global CSS utilities or design changes for this bugfix.
