---
ID: 21
Origin: 21
UUID: c4d82e6f
Status: Planned
---

# 021 — Remaining Viewport Overlap on Onboarding + City-Selection — Root Cause Analysis

## Changelog

| Date       | Author  | Change                     |
| ---------- | ------- | -------------------------- |
| 2026-02-24 | Analyst | Initial root cause analysis |
| 2026-02-24 | Planner | Closed analysis: planned remediation |

## Value Statement and Business Objective

Users on iPhone SE Safari (real-device UAT evidence on uat.ummahflow.com) cannot see or tap CTA buttons on 3 screens in the primary onboarding funnel. Plan 020 (v0.6.5) fixed the landing splash CTA but **did not fix** the onboarding slides, or the city-selection page. This continues to block user onboarding — the primary conversion funnel.

## Objective

Determine why CTA buttons remain clipped/hidden behind the bottom area on:
1. Onboarding slide "Wo finde ich muslimische Anbieter?" ("Weiter >" button)
2. Onboarding slide "Ummah Flow verbindet Muslime..." ("Entdecke deine Ummah >" button partially hidden)
3. City-selection page `/city-selection` ("Discover" button almost entirely hidden)

And confirm which screen from the UAT screenshots is working correctly (the "Willkommen bei Ummah Flow" / EarlyAccessScreen).

## Context

### Prior Work

- **Plan 019 (v0.6.4)**: Replaced `h-screen` → `h-screen-fix` (100dvh) in 24 files. Insufficient.
- **Plan 020 (v0.6.5)**: Removed nested `h-screen-fix` from 6 primary files → replaced with `h-full`. Fixed landing splash CTA. Chose **Option 1** (keep `mobile-bottom-ui-slot` 128px reservation unchanged).

### User-Provided Evidence (5 iPhone Safari screenshots, uat.ummahflow.com)

| Image | Screen                               | CTA Status       | Component                    |
| ----- | ------------------------------------ | ---------------- | ---------------------------- |
| 1     | Landing splash (`/`)                 | ✅ Visible        | `SplashLayout` + `SplashContent` |
| 2     | Onboarding slide 1 ("Wo finde ich...") | ❌ Button at edge | `AboutPageContent`           |
| 3     | Onboarding slide 2 ("verbindet...")  | ❌ Partially hidden | `AboutPageContent`           |
| 4     | Willkommen / EarlyAccess            | ✅ Visible        | `EarlyAccessScreen`          |
| 5     | City selection (`/city-selection`)   | ❌ Almost fully hidden | `CitySelectionPage`         |

## Methodology

1. Traced the complete component hierarchy from `RootClientLayout` → `<main>` → `PageTransition` → page content for all affected screens
2. Calculated viewport geometry for iPhone SE Safari (`100dvh ≈ 559px`)
3. Verified Plan 020 fix application on all 6 targeted files
4. Identified remaining `h-screen-fix` instances across the codebase
5. Analyzed CSS for `mobile-bottom-ui-slot` behavior with `data-mobile-ui="none"`

### Files Investigated

| File | Key Finding |
| ---- | ----------- |
| `src/styles/globals.css` (lines 107-110, 424-445) | `--mobile-nav-total: 128px`, slot always reserves 128px regardless of `data-mobile-ui` |
| `src/components/layout/RootClientLayout.tsx` | Outer `h-screen-fix` + `<main>` gets `100dvh - 128px` |
| `src/components/shared/MobileSplashScreen.tsx` | State machine rendering `AboutPageContent` in `motion.div` without height constraint |
| `src/components/shared/AboutPageContent.tsx` | Uses `PageLayout` + `PageContentWrapper(centerVertically=true)` — NOT touched by Plan 020 |
| `src/app/city-selection/page.tsx` | Plan 020 fixed `h-screen-fix → h-full`. Content still overflows due to 128px slot. |
| `src/components/shared/EarlyAccessScreen.tsx` | Plan 020 fixed. Content short enough (~348px) to fit in `<main>` (~431px). |
| `src/components/shared/WaitlistScreen.tsx` | ❌ STILL has `h-screen-fix` (secondary sweep deferred from Plan 020) |
| `src/components/shared/WaitlistSuccessScreen.tsx` | ❌ STILL has `h-screen-fix` (secondary sweep deferred from Plan 020) |
| `src/components/shared/HomePageShell.tsx` | ❌ STILL has `h-screen-fix` × 2 (secondary sweep deferred from Plan 020) |
| `src/components/ui/PageTransition.tsx` | `flex flex-1 flex-col` — passes height constraint through |
| `src/utils/navigationUtils.ts` | During onboarding: `shouldShowMobileFooter` → false, `mobileUiMode = 'none'` |

## Findings

### VERIFIED: Root Cause — 128px Bottom Slot Reservation When No Bottom UI Is Visible

**Confidence: VERIFIED** (traced through CSS rules, calculated viewport geometry, confirmed by screenshots)

The `mobile-bottom-ui-slot` CSS (globals.css lines 424-428) **always** reserves 128px:

```css
.mobile-bottom-ui-slot {
  position: relative;
  min-height: var(--mobile-nav-total);  /* 96px + 32px = 128px */
  flex-shrink: 0;
}
```

There is **no CSS rule** that collapses this slot when `data-mobile-ui="none"`. The visibility of the footer/navbar children is toggled, but the **space is always reserved**.

During the onboarding flow:
- `shouldShowMobileFooter()` returns `false` (onboarding not complete or splash visible)
- `shouldShowCityEarlyAccessNavbar()` returns `false` (onboarding not complete, or `/city-selection` is excluded)
- `mobileUiMode = 'none'`
- **Result**: 128px of empty space is reserved at the bottom, visible as a gray/white strip in the screenshots

### Viewport Geometry Analysis (iPhone SE Safari)

```
iPhone SE Safari viewport (100dvh):  ~559px

RootClientLayout layout:
┌─────────────────────────────────┐
│  div.h-screen-fix (100dvh)      │  ~559px
│  ┌───────────────────────────┐  │
│  │  <main> flex-1 min-h-0    │  │  ~431px  (559 - 128)
│  │  overflow-y-auto          │  │
│  │                           │  │
│  │  [page content]           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  mobile-bottom-ui-slot    │  │  128px (ALWAYS reserved)
│  │  data-mobile-ui="none"    │  │  ← NOTHING VISIBLE HERE
│  │  [footer hidden]          │  │     during onboarding!
│  │  [navbar hidden]          │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Per-Screen Content Height vs Available Space

| Screen | Content Height (est.) | Available `<main>` | Fits? | Screenshot |
| ------ | -------------------- | ------------------- | ----- | ---------- |
| Landing splash | ~380px | ~431px | ✅ Yes (+51px) | Image 1: CTA visible |
| Onboarding slide 1 | ~500px | ~431px | ❌ No (-69px) | Image 2: Button at edge |
| Onboarding slide 2 | ~500px | ~431px | ❌ No (-69px) | Image 3: Button partially hidden |
| EarlyAccess "Willkommen" | ~348px | ~431px | ✅ Yes (+83px) | Image 4: CTA visible |
| City-selection | ~530px | ~431px | ❌ No (-99px) | Image 5: Button almost hidden |

**If the 128px slot were collapsed (0px):**

| Screen | Content Height | Available `<main>` | Fits? |
| ------ | -------------- | ------------------- | ----- |
| Onboarding slide 1 | ~500px | ~559px | ✅ Yes (+59px) |
| Onboarding slide 2 | ~500px | ~559px | ✅ Yes (+59px) |
| City-selection | ~530px | ~559px | ✅ Yes (+29px) |

**Collapsing the bottom slot when no bottom UI is visible would fix all 3 affected screens.**

### VERIFIED: Plan 020 Fixes Applied Correctly

All 6 files Plan 020 targeted were verified — the `h-screen-fix → h-full` fix IS applied:

| File | Current State | Plan 020 Applied? |
| ---- | ------------- | ----------------- |
| `SplashLayout.tsx` | `flex h-full flex-col` | ✅ Yes |
| `MobileSplashScreen.tsx` (loading) | `flex h-full w-full items-center justify-center` | ✅ Yes |
| `EarlyAccessScreen.tsx` | `flex h-full w-full items-center justify-center` | ✅ Yes |
| `CityEarlyAccessEmptyState.tsx` | `flex h-full w-full flex-col items-center` | ✅ Yes |
| `city-selection/page.tsx` | `flex h-full w-full flex-col items-center` | ✅ Yes |
| `city/[cityName]/page.tsx` | `h-full` on 3 wrappers | ✅ Yes |

**Plan 020's `h-screen-fix → h-full` fix was necessary but insufficient.** The remaining problem is not nested viewport-height claims — it's the 128px bottom slot consuming space when no bottom UI is visible.

### VERIFIED: Secondary Issue — Remaining `h-screen-fix` Nesting

These files were deferred from Plan 020 as "secondary sweep candidates" and still have nested `h-screen-fix`:

| File | Line | Context | In Onboarding Flow? |
| ---- | ---- | ------- | -------------------- |
| `WaitlistScreen.tsx` | 167 | `h-screen-fix relative flex w-full items-center justify-center` | ✅ YES (state: `waitlist`) |
| `WaitlistSuccessScreen.tsx` | 34 | `h-screen-fix flex w-full items-center justify-center` | ✅ YES (state: `success`) |
| `HomePageShell.tsx` | 47, 59 | Loading + error states | Conditional |
| `ProviderDetailPage.tsx` | 329 | Provider detail view | No (post-onboarding) |
| `ProfileProviderDetailPage.tsx` | 69, 78 | Profile provider view | No |
| `ProviderEditPage.tsx` | 22 | Provider edit page | No |
| Various create/profile pages | Multiple | Create/edit flows | No |

**Critical**: `WaitlistScreen.tsx` and `WaitlistSuccessScreen.tsx` are in the onboarding flow (MobileSplashScreen state machine: `splash → about → waitlist → success → earlyAccess`). They still claim `100dvh` inside `<main>` which only has `~431px`.

### NOT an Issue: AboutPageContent

`AboutPageContent.tsx` does NOT use `h-screen-fix`. It uses `PageLayout` (flex-1) + `PageContentWrapper` (centerVertically=true). The content overflow is caused purely by the 128px bottom slot reducing available `<main>` height, not by a nested viewport-height claim.

## Root Cause Summary

**Two compounding issues, one primary:**

1. **PRIMARY** — `mobile-bottom-ui-slot` always reserves 128px (via `min-height: var(--mobile-nav-total)`), even when `data-mobile-ui="none"` (no bottom UI is visible). This wastes 128px of viewport height during the entire onboarding flow and on the city-selection page, pushing CTA buttons below the visible area on small viewports (iPhone SE).

2. **SECONDARY** — `WaitlistScreen.tsx` and `WaitlistSuccessScreen.tsx` still have nested `h-screen-fix` (deferred from Plan 020). These create the same nested viewport-height conflict identified in Analysis 020, compounding with Issue 1.

## System Weaknesses

### Architecture

- **Bottom slot "always reserve" pattern is overly conservative**: The decision to always reserve 128px was made to prevent hydration layout shift (Plan 020, Option 1). However, this sacrifices usability on small viewports during the entire onboarding flow where no bottom UI exists.

- **No CSS rule differentiates "no bottom UI" from "bottom UI hidden"**: The `data-mobile-ui="none"` attribute exists but the CSS doesn't use it to collapse the slot. All 3 values (`footer`, `navbar`, `none`) get the same 128px min-height.

### Code

- **Secondary sweep candidates left unfixed**: Plan 020 explicitly deferred `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`, and `HomePageShell.tsx`. Two of these are in the primary onboarding flow.

### Process

- **"Option 1 vs Option 2" decision made without real-device validation**: Plan 020 chose Option 1 (keep slot reserved) based on hydration shift risk assessment, but the screenshots prove the tradeoff was wrong — the usability impact of 128px wasted space is worse than a brief layout shift.

## Instrumentation Gaps

**Normal telemetry (always-on)**:
- None needed — this is a CSS layout issue reproducible on any iPhone SE Safari without special instrumentation.

**Debug telemetry (opt-in)**:
- Browser viewport dimensions (`window.innerHeight`, `100dvh` resolved value) logged on mobile pages during onboarding flow — would help validate fix across device models.

## Analysis Recommendations

1. **Investigate hydration shift risk**: Measure the actual visual impact of collapsing the bottom slot when `data-mobile-ui="none"`. The shift would only occur on post-onboarding pages where `mobileUiMode` transitions from 'none' (SSR/pre-mount) to 'footer'/'navbar' (after mount). A CSS `transition` on `min-height` could smooth this.

2. **Verify fix across device models**: After implementing the CSS collapse, test on:
   - iPhone SE Safari (primary target, ~559px viewport)
   - iPhone 13/14/15 Safari (larger viewport, confirm no regression)
   - Android Chrome (sanity check)

3. **Assess secondary sweep files**: Confirm `WaitlistScreen.tsx` and `WaitlistSuccessScreen.tsx` buttons are clipped on iPhone SE (they will be, given the same viewport geometry). Include in the same fix.

## Open Questions

None. Root cause is verified. Proceeding to Planner.

## Files Requiring Changes (for Planner)

### CSS Change (Primary Fix)

| File | Change | Rationale |
| ---- | ------ | --------- |
| `src/styles/globals.css` | Add rule: `.mobile-bottom-ui-slot[data-mobile-ui='none'] { min-height: 0; }` | Collapse slot when no bottom UI is visible, reclaiming 128px |

### Secondary Sweep (h-screen-fix → h-full)

| File | Line | Change |
| ---- | ---- | ------ |
| `src/components/shared/WaitlistScreen.tsx` | 167 | `h-screen-fix` → `h-full` |
| `src/components/shared/WaitlistSuccessScreen.tsx` | 34 | `h-screen-fix` → `h-full` |
| `src/components/shared/HomePageShell.tsx` | 47, 59 | `h-screen-fix` → `h-full` |

### Optional Hydration Shift Mitigation

| File | Change | Rationale |
| ---- | ------ | --------- |
| `src/styles/globals.css` | Add `transition: min-height 0.15s ease-out` to `.mobile-bottom-ui-slot` | Smooth the 0→128px transition on post-onboarding pages |
