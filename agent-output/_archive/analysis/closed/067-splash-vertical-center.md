---
ID: 067
Origin: 067
UUID: b7f2c8a3
Status: Planned
---

# Analysis 067 — Splash Screen Vertical Centering

## Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-03-28 | analyst | Created | Investigate splash content positioned too high; identify root cause |
| 2026-03-28 | planner | Status: Planned | Plan 067 created; analysis closed |

## Value Statement and Business Objective

As a **first-time mobile visitor** arriving on the splash/onboarding entry,
I expect the content (Bismillah illustration, title, subtitle, and CTA button) to be **vertically centered** in the viewport,
so that the landing experience feels **balanced and intentional**, making a positive first impression.

## Objective

Determine why the splash/onboarding screen content appears positioned too high on mobile despite Plan 028's flex-1 centering fix being applied and UAT-approved.

## Context

- **Reported symptom**: Splash content sits in the top ~60% of the viewport instead of being vertically centered.
- **Plan 028** (commit `6bec1122`, v0.6.10) previously addressed this exact issue by adding `flex-1` to the motion.div wrappers in MobileSplashScreen, to the SplashLayout outer container, and to the RootPageContent mobile wrapper.
- Plan 028 was code-reviewed, QA-passed, and UAT-approved on iPhone Safari.
- Only one post-028 change touched affected layout files: commit `a0ca08d2` (v0.8.2, Plan 044) changed `.mobile-bottom-ui-slot` from `min-height: var(--mobile-nav-total)` to `min-height: 0`. This change is benign for splash centering (the slot was already collapsed to 0 during splash via `data-mobile-ui='none'`).

## Methodology

1. Traced the complete flex-1 height propagation chain from the root layout to the splash content.
2. Examined each container's `display`, `flex-direction`, `flex`, `height`, `min-height`, `overflow`, and `align-items` properties.
3. Cross-referenced CSS globals, Tailwind config, and component styles.
4. Reviewed git history for regressions after Plan 028.
5. Analyzed the component render lifecycle (SSR → hydration → mounted state).

## Findings

### 1. Complete Flex-1 Chain (VERIFIED)

The height propagation chain from root to splash content:

| # | Element | Flex Context (as item) | Own Flex Layout | Height Source |
|---|---------|----------------------|-----------------|---------------|
| 1 | `.page-background.h-screen-fix` | N/A (block child of body) | `flex flex-col` | `height: 100dvh` (definite) |
| 2 | `<main>` | `flex-1` in #1 (col) → fills viewport | `flex flex-col` | flex-1 from parent |
| 3 | PageTransition div | `flex-1` in #2 (col) → fills main | `flex flex-col` | flex-1 from parent |
| 4 | Mobile wrapper div | `flex-1` in #3 (col) → fills transition | `flex flex-col` | flex-1 from parent |
| 5 | **motion.div** (splash) | `flex-1` in #4 (col) → fills wrapper | **`flex` (ROW!)** | flex-1 from parent (vertical) |
| 6 | SplashLayout outer div | `flex-1` in #5 (**ROW** → expands WIDTH) | `flex flex-col` | **`align-items: stretch` from #5** |
| 7 | Content section div | `flex-1` in #6 (col) → fills SplashLayout | `flex` (row) | flex-1 from parent |
| 8 | Footer | `flex-shrink-0` in #6 (col) | — | Content height (~45px) |

**Key observations**:
- Every element from #1 to #7 has `flex-1` or equivalent.
- Desktop header div, desktop footer div, and mobile-bottom-ui-slot are all invisible/0-height on mobile during splash.
- `<main>` has `overflow-y: auto` (creates a scroll container), but content is shorter than viewport, so no scrolling occurs.

### 2. The motion.div Flex Direction Gap (HIGH-CONFIDENCE INFERENCE)

**Primary finding**: The `motion.div` wrappers at row #5 use `className="flex flex-1 w-full"` — this is a **flex-row** container (no `flex-col`).

In the parent's column context (mobile wrapper), `flex-1` correctly expands the motion.div **vertically**. The motion.div gets the full viewport height. ✓

However, inside the motion.div (flex-ROW), SplashLayout's `flex-1` expands **horizontally** (along the main axis), not vertically. The SplashLayout's height depends entirely on `align-items: stretch` (default cross-axis alignment in flex-row), which should stretch it to the motion.div's height.

**Per CSS spec, `align-items: stretch` works when:**
- The child's `height` property is `auto` (not explicitly set) — SplashLayout has `height: auto` ✓
- The child's `align-self` is not overriding — no override ✓
- The parent's cross-size (height) is definite — motion.div's height comes from `flex-1` in column parent ✓

**Why it may still fail:**
- `align-items: stretch` is a **cross-axis** mechanism. It depends on the browser correctly resolving the motion.div's cross-size before stretching children. In deeply nested flex layouts with a scroll container ancestor (`<main>` overflow-y: auto), some browsers — particularly iOS Safari — may not propagate the definite height through the cross-axis stretch chain.
- SplashLayout also has `min-h-full` (min-height: 100%), which should be redundant with stretch but adds complexity to height resolution. Percentage min-height requires the parent to have a CSS-definite height, which may or may not be satisfied by the flex algorithm's resolved height in all browsers.
- The `motion` library (v12.23.23) may add inline styles during `initial → animate` transitions that transiently interfere with flex layout.

### 3. Two-Phase Render Timing (VERIFIED)

The MobileSplashScreen renders differently before and after mount:

| Phase | Render Path | SplashLayout's Parent | Height Mechanism |
|-------|-------------|----------------------|------------------|
| Pre-mount (SSR + first hydration frames) | SplashLayout directly in mobile wrapper | Mobile wrapper (flex-col) | `flex-1` in column context → **explicit vertical expansion** |
| Post-mount (after useEffect, AnimatePresence) | SplashLayout inside motion.div | motion.div (flex-**row**) | `align-items: stretch` → **implicit cross-axis stretch** |

The pre-mount render uses **explicit** height propagation (flex-1 in a column parent). The post-mount render uses **implicit** cross-axis stretch. If the implicit stretch fails, only the post-mount render is broken — and the post-mount render is what the user sees persistently.

### 4. Footer Offset (VERIFIED — MINOR)

SplashLayout renders a footer (~45px) below the content section. The content is centered within `(viewport_height - footer_height)`, not the full viewport. This shifts the visual center up by ~22px — noticeable but not the primary issue.

### 5. Safe Area Handling (VERIFIED — MINOR)

- `h-screen-fix` uses `100dvh` (iOS: `-webkit-fill-available`). This gives the correctly sized viewport excluding browser chrome.
- The SplashLayout language switcher portal uses `max(env(safe-area-inset-top), 0.25rem)` for positioning.
- No safe-area padding is applied to the centering container itself, so content is centered within the full dvh height (including status bar area). This means the perceived center (accounting for status bar) is slightly below the CSS center.
- Combined safe-area and footer offset: content center is ~35–70px above the perceived viewport center depending on device. This is secondary to the primary flex-direction issue.

### 6. No Post-028 Regression (VERIFIED)

Git log shows only one change to affected files after Plan 028: the mobile-bottom-ui-slot min-height change (Plan 044). This change is benign — it changed the slot from `min-height: var(--mobile-nav-total)` (collapsed to 0 during splash) to `min-height: 0` (always 0). No material layout impact.

## Root Cause

**Confidence: HIGH-CONFIDENCE INFERENCE** (cannot prove without real-device testing; static analysis complete)

The motion.div wrappers in `MobileSplashScreen.tsx` (lines ~112 and ~124) use `className="flex flex-1 w-full"`, creating **flex-row** containers. This forces the SplashLayout's vertical sizing to rely on `align-items: stretch` (cross-axis) rather than `flex-1` (main-axis in a column).

While `align-items: stretch` should work per CSS spec, the deeply nested flex context (6 levels deep with a scroll container ancestor) creates conditions where cross-axis height propagation may fail on certain browsers — particularly iOS Safari, which has documented quirks with percentage-based min-height and nested flex stretch resolution.

The pre-mount render (SplashLayout directly in a flex-col parent) uses explicit column-axis `flex-1` and likely IS centered. The post-mount render (SplashLayout inside flex-row motion.div) relies on implicit cross-axis stretch and is the render the user actually sees.

**Disconfirming test**: Add `flex-col` to both motion.div wrappers and verify centering on iOS Safari. If centering is restored, this confirms the cross-axis stretch failure hypothesis.

## System Weaknesses

### Architecture

| Weakness | Risk Mechanism | Detection |
|----------|---------------|-----------|
| flex-row motion.div wrapping a flex-col layout | Cross-axis height relies on implicit stretch instead of explicit flex-1 in column direction | Visual inspection on mobile devices |
| Deep flex nesting (6+ levels) | Height propagation chain is fragile; any level can break centering | DevTools computed height audit |
| `overflow-y: auto` on `<main>` creating scroll context | May interact with flex height resolution differently across browsers | Cross-browser visual regression test |

### Code

| Weakness | Risk Mechanism | Detection |
|----------|---------------|-----------|
| Two render phases (pre-mount vs post-mount) with different flex strategies | Post-mount render changes the parent flex direction, creating divergent height mechanisms | Comparing pre-mount and post-mount DOM structure |
| `min-h-full` on SplashLayout (percentage min-height in nested flex) | Percentage min-height resolution depends on parent having CSS-definite height; may not resolve via stretch-allocated height in all browsers | Remove `min-h-full` and test centering still holds |
| motion.div wrappers only added to `loading` and `splash` states (not other states) | Inconsistent wrapping pattern; other states use block-level motion.divs with their own layout | Code review of all AnimatePresence children |

### Process

| Weakness | Risk Mechanism | Detection |
|----------|---------------|-----------|
| Plan 028 UAT was approved on a single device | Cross-device/cross-browser centering wasn't validated | UAT checklist requiring multiple device classes |
| CSS layout changes validated via visual inspection only, no automated visual regression | Centering issues silently regress | Implement Percy/Chromatic or screenshot diff tests |

## Instrumentation Gaps

| Telemetry | Level | Purpose |
|-----------|-------|---------|
| Log `motion.div` computed height at mount time for splash state | **Debug** (opt-in) | Verify whether the motion.div has full viewport height after mount |
| Log `getComputedStyle(splashLayout).height` after AnimatePresence enter | **Debug** | Confirm whether stretch allocates the correct height |
| CSS Container Query breakpoint logging (if added) | **Debug** | Track which breakpoints are active on different devices |

## Analysis Recommendations (Next Steps)

1. **Fastest disconfirming test**: Add `flex-col` to both motion.div wrappers in MobileSplashScreen (`className="flex flex-1 flex-col w-full"`) and test on iOS Safari. If centering is restored, the root cause is confirmed.

2. **Secondary validation**: Open Chrome DevTools → Mobile emulation (iPhone 14 Pro) → Inspect computed heights for each element in the flex chain. Verify that the motion.div, SplashLayout, and content section all have the expected viewport-filling heights.

3. **Redundancy removal**: If `flex-col` fix works, `min-h-full` on SplashLayout can likely be removed (it was the Plan 028 iteration-1 fix that proved insufficient). Clean up to reduce spec complexity.

4. **Consistency audit**: The About, Waitlist, Success, and EarlyAccess states use motion.divs WITHOUT flex classes (plain block elements). Verify these screens don't have the same centering issue. If they do, they need their own layout wrapper.

## Open Questions

1. **Was Plan 028's UAT device the same model/OS version experiencing the current issue?** If not, this may be a device-specific rendering difference.
2. **Does the pre-mount render (SplashLayout directly in flex-col) appear centered before the post-mount render takes over?** If yes, it confirms the two-phase render timing theory.
3. **Does the motion library (v12.23.23) add any inline `display`, `height`, or `transform` styles to the motion.div that could override the flex classes?** Inspect the actual DOM in browser DevTools.

## File Reference

| File | Role | Lines of Interest |
|------|------|-------------------|
| [src/components/shared/MobileSplashScreen.tsx](src/components/shared/MobileSplashScreen.tsx#L109-L133) | motion.div wrappers for loading/splash states | `className="flex flex-1 w-full"` (missing `flex-col`) |
| [src/components/layout/SplashLayout.tsx](src/components/layout/SplashLayout.tsx#L56) | Outer flex container + content centering | `flex min-h-full flex-1 flex-col` |
| [src/components/shared/SplashContent.tsx](src/components/shared/SplashContent.tsx#L39) | Splash content block | Content structure + gaps |
| [src/components/layout/RootClientLayout.tsx](src/components/layout/RootClientLayout.tsx#L117) | `<main>` scroll container | `flex min-h-0 flex-1 flex-col overflow-y-auto` |
| [src/components/ui/PageTransition.tsx](src/components/ui/PageTransition.tsx#L32) | Flex chain intermediate | `relative flex flex-1 flex-col` |
| [src/components/shared/RootPageContent.tsx](src/components/shared/RootPageContent.tsx#L248) | Mobile wrapper with flex-1 | `flex flex-1 flex-col md:hidden` (Plan 028) |
| [src/styles/globals.css](src/styles/globals.css#L628) | `h-screen-fix` definition | `height: 100dvh` / `-webkit-fill-available` |
