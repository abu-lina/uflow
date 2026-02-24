---
ID: 20
Origin: 20
UUID: b7e3f41a
Status: Planned
---

# 020 — iPhone SE Viewport Overlap v2 — Root Cause Analysis

## Changelog

| Date       | Author   | Change                                     |
| ---------- | -------- | ------------------------------------------ |
| 2025-07-25 | Analyst  | Initial root cause analysis                |
| 2026-02-24 | Planner  | Closed analysis: planned remediation        |

## Value Statement and Business Objective

Users on iPhone SE (and other iOS devices) cannot access CTA buttons on the landing page, city-selection page, and city page. Content is hidden behind/under the bottom navigation area. This directly blocks user onboarding — the primary conversion funnel.

Plan 019 (v0.6.4) replaced `h-screen` with `h-screen-fix` across 24 files. The viewport unit fix was correct (`100vh` → `100dvh`) but **insufficient** — the real issue is an architectural nesting problem that was not addressed.

## Objective

Determine why content (CTA buttons, map) is hidden behind the header and footer areas on three key screens, despite the v0.6.4 `h-screen-fix` deployment.

## Context

### Affected Screens (user-reported)

1. **Landing page** (`/`): "Muslimische Anbieter entdecken" button hidden by footer area
2. **City selection** (`/city-selection`): Map hidden behind header, CTA hidden by footer area
3. **City page** (`/city/[cityName]`): Same header/footer overlap pattern

### Prior Work

- Plan 019 (v0.6.4): Replaced `h-screen` with `h-screen-fix` in 24 files
- `h-screen-fix` correctly uses `100dvh` + `-webkit-fill-available` for iOS
- Deployed successfully after npm ci fix (commits `3d6962c`, `b2eefa6`, `a992dfc`)

## Methodology

Systematic file-by-file trace of the complete component hierarchy:
- Outer layout → `<main>` → child screen wrappers → content/CTA elements
- CSS analysis of the `mobile-bottom-ui-slot` reservation behavior
- Navigation utility logic trace for visibility conditions

### Files Investigated

| File | Key Finding |
| ---- | ----------- |
| `src/styles/globals.css` (lines 107-110, 424-445, 617-627) | CSS vars, slot CSS, h-screen-fix definition |
| `src/components/layout/RootClientLayout.tsx` | Outer `h-screen-fix` + always-present 128px bottom slot |
| `src/components/layout/SplashLayout.tsx` | NESTED `h-screen-fix` inside `<main>` |
| `src/components/shared/SplashContent.tsx` | CTA button ("Muslimische Anbieter entdecken") |
| `src/components/shared/MobileSplashScreen.tsx` | Additional `h-screen-fix` wrapper in loading state |
| `src/components/shared/RootPageContent.tsx` | Mobile rendering conditional logic |
| `src/components/shared/CityEarlyAccessEmptyState.tsx` | NESTED `h-screen-fix`, partial `pb` |
| `src/components/shared/EarlyAccessScreen.tsx` | NESTED `h-screen-fix`, no bottom padding |
| `src/components/shared/HomePageShell.tsx` | NESTED `h-screen-fix` (2 instances) |
| `src/components/shared/WaitlistScreen.tsx` | NESTED `h-screen-fix` |
| `src/components/shared/WaitlistSuccessScreen.tsx` | NESTED `h-screen-fix` |
| `src/app/city-selection/page.tsx` | NESTED `h-screen-fix` |
| `src/app/(public)/city/[cityName]/page.tsx` | NESTED `h-screen-fix` (3 instances) |
| `src/components/common/MobileFooterBar.tsx` | `fixed bottom-0 z-50` |
| `src/components/shared/CityEarlyAccessNavbar.tsx` | `fixed bottom-0 z-50` |
| `src/utils/navigationUtils.ts` | Footer/navbar visibility logic |

## Findings

### VERIFIED: Root Cause — Nested Viewport Height + Always-Present Bottom Slot

**Confidence: VERIFIED** (traced through code, confirmed via CSS rules)

The architecture creates a **double viewport height conflict**:

```
┌──────────────────────────────────────┐ ← 0px
│  RootClientLayout                     │
│  div.h-screen-fix.flex.flex-col       │ ← height: 100dvh
│                                       │
│  ┌──────────────────────────────┐    │
│  │  <main> flex-1 min-h-0       │    │ ← gets: 100dvh − 128px
│  │  overflow-y-auto             │    │
│  │                              │    │
│  │  ┌────────────────────────┐  │    │
│  │  │  Child screen          │  │    │
│  │  │  div.h-screen-fix      │  │    │ ← height: 100dvh (OVERFLOWS!)
│  │  │                        │  │    │
│  │  │  [content...]          │  │    │
│  │  │                        │  │    │
│  │  │  [CTA button] ─────────────────── HIDDEN: pushed below
│  │  │                        │  │    │   visible area by 128px
│  │  └────────────────────────┘  │    │
│  └──────────────────────────────┘    │
│                                       │
│  ┌──────────────────────────────┐    │
│  │  mobile-bottom-ui-slot       │    │ ← min-height: 128px
│  │  flex-shrink: 0              │    │   ALWAYS reserved
│  │  ┌─ MobileFooterBar ──────┐ │    │
│  │  │  fixed bottom-0 z-50   │ │    │   (visibility toggled)
│  │  └────────────────────────┘ │    │
│  │  ┌─ CityEarlyAccessNavbar ┐ │    │
│  │  │  fixed bottom-0 z-50   │ │    │   (visibility toggled)
│  │  └────────────────────────┘ │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘ ← 100dvh
```

#### Problem 1: Always-Present 128px Bottom Slot

The `mobile-bottom-ui-slot` CSS (globals.css lines 424-428):
```css
.mobile-bottom-ui-slot {
  position: relative;
  min-height: var(--mobile-nav-total);  /* 128px */
  flex-shrink: 0;
}
```

This **always** reserves 128px regardless of `data-mobile-ui` value. There is **NO CSS rule** for `data-mobile-ui="none"` to collapse the slot. When `mobileUiMode` is `'none'` (during splash, onboarding, or unauthenticated states), the slot still takes 128px of flex space — reducing `<main>` to `100dvh - 128px`.

#### Problem 2: Nested `h-screen-fix` in Child Screens

13 components/pages use `h-screen-fix` as an inner wrapper while being rendered inside `<main>`. Each claims `height: 100dvh` inside a container that only has `100dvh - 128px` of space. The child overflows by exactly 128px.

Because `<main>` has `overflow-y-auto`, the child content IS scrollable — but the bottom 128px of the child (where CTA buttons live) is scrolled below the visible bottom edge, and the `mobile-bottom-ui-slot` (even when invisible) occupies that space.

**Affected child screens with `h-screen-fix`:**
- `SplashLayout.tsx` line 56 — Landing page wrapper
- `MobileSplashScreen.tsx` line 111 — Loading state wrapper
- `EarlyAccessScreen.tsx` line 61 — Early access home
- `CityEarlyAccessEmptyState.tsx` line 85 — City empty state (Stage 1)
- `HomePageShell.tsx` lines 47, 59 — Home loading/error states
- `WaitlistScreen.tsx` line 167 — Waitlist screen
- `WaitlistSuccessScreen.tsx` line 34 — Waitlist success
- `city-selection/page.tsx` line 477 — City selection page
- `city/[cityName]/page.tsx` lines 191, 200, 215 — City page loading/error/fallback states
- `ProfileProviderDetailPage.tsx` lines 69, 78
- `ProviderEditPage.tsx` line 22
- `ProviderDetailPage.tsx` line 329

#### Problem 3: Fixed Position + Slot = Double Space Consumption

When a bottom navbar IS visible (e.g., `CityEarlyAccessNavbar` on `/` after onboarding):
- The slot reserves 128px of flexbox space (reducing `<main>`)
- The navbar uses `fixed bottom-0` — it floats OVER content independently
- The slot's children use `position: absolute` + `visibility: hidden/visible`
- So the slot correctly prevents layout shift but the fixed navbar simultaneously overlaps scrollable content

This is architecturally correct for pages that DON'T use `h-screen-fix` internally (they scroll naturally and the slot pushes content up). But for pages that DO use `h-screen-fix`, the fixed navbar overlaps the bottom of the already-overflowing content.

### VERIFIED: Why Plan 019 Was Insufficient

Plan 019 replaced `h-screen` → `h-screen-fix` which changed:
- `height: 100vh` → `height: 100vh; height: 100dvh;` + iOS `-webkit-fill-available`

This correctly fixes the iOS Safari dynamic toolbar issue (where `100vh` includes the address bar area). However, it does NOT address the nesting problem — `100dvh` inside a `100dvh - 128px` container overflows by the same 128px regardless of whether the unit is `vh` or `dvh`.

### VERIFIED: `mobileUiMode` Values per Screen

Traced via `navigationUtils.ts`:

| Screen | Route | `showMobileFooter` | `showCityEarlyAccessNavbar` | `mobileUiMode` | Slot Behavior |
| ------ | ----- | ------------------- | --------------------------- | --------------- | ------------- |
| Landing (splash) | `/` | `false` | `false` | `'none'` | 128px reserved, nothing visible |
| City selection | `/city-selection` | `false` | `false` | `'none'` | 128px reserved, nothing visible |
| City page (stage1) | `/city/[name]` | `false` | `true` | `'navbar'` | 128px reserved, navbar visible |
| City page (stage2+) | `/city/[name]` | `true` | `false` | `'footer'` | 128px reserved, footer visible |

On the landing page and city-selection page, the slot reserves 128px for **nothing visible** — pure wasted space that pushes `<main>` content up.

## System Weaknesses

### Architecture

1. **No constraint coordination**: The outer layout establishes viewport bounds but child screens independently claim viewport height, creating an uncoordinated double-height system.
2. **Rigid slot reservation**: The `mobile-bottom-ui-slot` was designed to prevent layout shift but lacks a `'none'` collapse rule, wasting 128px on screens where no bottom navigation exists.
3. **Mixed positioning model**: Bottom navbars use `fixed` positioning (outside normal flow) while simultaneously being inside a flexbox slot that reserves space. This creates correct behavior for scrolling pages but wrong behavior for viewport-height pages.

### Code

4. **23+ duplicate `h-screen-fix` patterns**: Every child screen independently claims viewport height instead of relying on the parent layout. This is a DRY violation and the direct cause of the overflow.

## Instrumentation Gaps

**Normal (always-on):**
- Add viewport height debug info to the health endpoint or dev overlay: `window.innerHeight`, `document.documentElement.clientHeight`, `main.clientHeight`, `main.scrollHeight`
- Log `mobileUiMode` transitions in development console (already partially present)

**Debug (opt-in):**
- CSS outline mode for layout debugging: add a `?debug-layout` query param that outlines the `<main>`, child `h-screen-fix`, and `mobile-bottom-ui-slot` with distinct colors

## Analysis Recommendations

### Recommended Fix Direction (for Planner)

**Approach A — Remove nested `h-screen-fix` from child screens** (RECOMMENDED):

- Replace `h-screen-fix` in child screens with `h-full` or `flex-1 flex flex-col` to fill the available `<main>` space naturally
- The outer `RootClientLayout` already correctly establishes `h-screen-fix` on the root — children should fill the remaining space, not claim their own viewport
- This is the architecturally correct solution and affects ~13 components
- Loading/error states that genuinely need centering should use `h-full flex items-center justify-center` instead of `h-screen-fix flex items-center justify-center`

**Approach B — Collapse slot when empty** (SUPPLEMENTARY):

- Add CSS: `.mobile-bottom-ui-slot[data-mobile-ui='none'] { min-height: 0; }`
- This recovers the 128px on screens where no navbar is shown
- Should be applied IN ADDITION to Approach A, not instead of it

**Approach C — Pure CSS fix** (MINIMAL):

- Apply only Approach B
- Add `padding-bottom: var(--mobile-nav-total)` to child screens when navbar IS visible
- Riskier because it requires each screen to know about the slot — poor separation of concerns

**Recommendation**: Apply **Approach A + B** together. This is the correct architectural solution — children fill available space, and the slot collapses when empty.

## Open Questions

1. **Provider pages**: `ProfileProviderDetailPage.tsx`, `ProviderEditPage.tsx`, `ProviderDetailPage.tsx` also use `h-screen-fix` — are they also affected? User didn't report issues there, but the same nesting pattern applies.
2. **Desktop impact**: The slot is `block md:hidden` — desktop is NOT affected. But removing `h-screen-fix` from children should be verified on desktop layout too.
3. **Scrollable vs fixed pages**: Some pages (e.g., `ProviderDetailPage` with `overflow-y-auto`) are intentionally scrollable and may need different handling than fixed-layout pages.
4. **`<main>` overflow behavior**: With `overflow-y-auto` on `<main>`, the nested `h-screen-fix` children DO create a scrollable area. Some of these pages may rely on `<main>` scrolling vs internal scrolling — need to verify scroll behavior per page.
