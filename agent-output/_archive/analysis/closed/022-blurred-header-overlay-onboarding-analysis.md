---
ID: 022
Origin: 022
UUID: c4a1f7d2
Status: Planned
---

## Change Log

| Date       | Agent  | Change                 | Rationale |
|------------|--------|------------------------|-----------|
| 2026-02-24 | analyst | Created analysis doc | Investigate root cause of blurred/frosted header overlay on onboarding slide 1 (iPhone Safari UAT). |
| 2026-02-24 | planner | Marked as Planned | Analysis incorporated into Plan 022 for implementation. |

# 022 — Blurred Header Overlay on Onboarding Slide 1 (Analysis)

## Value Statement and Business Objective

As a **new mobile user (iPhone Safari)**, I need the **onboarding slides to render without UI overlays hiding the hero/illustration**, so that **the first-run experience feels polished and trustworthy (conversion and retention)**.

## Objective

Determine the concrete code path responsible for the **frosted/blurred header area** covering the **map illustration** on onboarding slide 1, and identify what must be validated to confirm causality.

## Scope

- Focus: onboarding slide 1 in the pre-launch onboarding flow on mobile (UAT), where the screenshot shows a frosted header overlay.
- Out of scope: implementing the fix (Planner/Implementer), re-theming, redesigning onboarding.

## Methodology

- Static trace (App Router → layout → onboarding flow state machine → page components)
- Targeted code search for `backdrop-filter`, `backdrop-blur`, and header components
- Evidence captured as file-level pointers + render-logic analysis

## Findings

### F1 — The onboarding flow renders `AboutPageContent` for the “about” step (map slide)

- **Evidence**: `MobileSplashScreen` renders `AboutPageContent showSplashHeader={true}` when `currentState === 'about'`.
- **Files**: `src/components/shared/MobileSplashScreen.tsx`, `src/components/shared/AboutPageContent.tsx`
- **Impact**: The onboarding “About” screen is part of the initial funnel and is a likely match for “slide 1”.
- **Confidence**: **Inferred (High)** — deterministic render logic in code.

### F2 — Slide 1 contains a `MapIllustration` that can be visually obscured by any fixed top overlay

- **Evidence**: `AboutCard` renders `MapIllustration` when `cardIndex === 0`.
- **Files**: `src/components/shared/AboutCard.tsx`, `src/components/ui/MapIllustration` (component)
- **Impact**: Any fixed header layer with blur/background will overlap the top of the map, matching the screenshot symptom.
- **Confidence**: **Inferred (High)** — deterministic component tree.

### F3 — `AboutPageContent` always renders a fixed `PageHeader` + `HeaderSpacer`, even when `showSplashHeader` requests an “empty” header

- **Evidence**:
  - `AboutPageContent` unconditionally renders `PageHeader` and `HeaderSpacer`.
  - When `showSplashHeader === true`, it passes `title=""`, `variant="title-only"`, and `onBack={undefined}`.
  - In `PageHeader`, `variant="title-only"` means **no back button** and **no right icon**, so the header becomes a **fixed, mostly empty** top layer.
- **Files**: `src/components/shared/AboutPageContent.tsx`, `src/components/layout/PageHeader.tsx`, `src/components/layout/HeaderSpacer.tsx`
- **Impact**: This creates a persistent “header region” on the onboarding slide, even though it contains no meaningful UI.
- **Confidence**: **Inferred (High)** — direct read of render conditions.

### F4 — The “frosted/blurred” visual effect is controlled by `PageHeader`’s scroll detector (`isScrolled`) which enables `backdrop-filter`

- **Evidence**: `PageHeader`:
  - Detects scroll by reading `scrollTop` from (1) an explicit ref, else (2) `main.overflow-y-auto`, else (3) window.
  - When `isScrolled === true`, it sets:
    - `background: rgba(255,255,255,0.15)`
    - `backdropFilter: blur(20px) saturate(180%)` (and `-webkit-backdrop-filter`)
- **Files**: `src/components/layout/PageHeader.tsx`
- **Impact**: If the onboarding “About” page is even slightly scrolled (common on iPhone SE due to limited viewport), the fixed header becomes frosted and will blur content behind it (the map illustration), matching the report.
- **Confidence**: **Inferred (High)** — direct code path with explicit styles.

## Likely Root Cause (High-confidence inference)

The onboarding “About” slide (slide 1) renders `PageHeader` in an “empty” configuration (`title=""`, `variant="title-only"`). When the page is scrolled even slightly, `PageHeader` activates its glass effect (`backdrop-filter`), producing the **blurred header overlay** that sits above and visually obscures the `MapIllustration`.

This aligns with the Acceptance Criterion: **“No blurred header section on this page.”** The observed blur is not an iOS Safari rendering artifact; it is explicitly produced by `PageHeader`’s frosted-glass styling when `isScrolled` is true.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does the blur appear at initial load (no interaction), or only after any scroll? | No device reproduction in this analysis pass | Reproduce on iPhone Safari (UAT) and note whether the page starts scrolled and/or if the blur toggles after a small swipe. | QA/UAT |
| 2 | Which onboarding state does the user call “slide 1” (about vs splash)? | Screenshot context not machine-verifiable | Confirm URL/state when screenshot taken (e.g., “About step card 1/2/3”). | User/UAT |
| 3 | Is `main.overflow-y-auto` ever non-zero on mount due to scroll restoration on iOS? | No runtime telemetry | Add short-lived debug logging (dev-only) or use Safari inspector to inspect `scrollTop` at mount. | Analyst/QA |

## Instrumentation Gaps (Normal vs Debug)

- **Debug**: capture `{ pathname, scrollTop (main), isScrolled }` during `PageHeader` mount and first scroll event on mobile. This would make “why isScrolled became true” provable.
- **Normal**: not needed; this is a UX bug rather than a long-term operational metric.

## Analysis Recommendations (next investigative steps)

1. Reproduce on iPhone Safari (UAT) specifically on the onboarding About screen (map illustration card) and confirm the blur toggles with `scrollTop > 0`.
2. Verify whether removing the fixed header layer for this screen removes the blur/overlay entirely (causality check).
3. Confirm there are no other onboarding screens rendering `PageHeader` with empty content that would create similar overlays.

## Open Questions

- Should the onboarding About screen have **no header at all**, or should it have a non-blurred transparent header (e.g., only language switcher)?
- Should the blur/glass behavior in `PageHeader` be opt-in per page type, rather than implicit on any scroll?
