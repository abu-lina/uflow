---
ID: 044
Origin: 044
UUID: f7a92c3d
Status: Planned
---

# 044 — Mobile Footer Overlay Layer Analysis

## Changelog

| Date (UTC) | Agent | Change | Summary |
|------------|-------|--------|---------|
| 2026-03-15 | Analyst | Initial analysis | Investigated mobile footer overlay blocking content |
| 2026-03-15T16:35Z | Planner | Status: Active → Planned | Plan 044 created with inherited ID/Origin/UUID; analysis ready for closure |

---

## Value Statement and Business Objective

As a **mobile user**, I want **interactive content above the footer to remain tappable and not blocked by invisible layers**, so that **I can interact with CTAs, buttons, and links without accidental touches on hidden elements**.

---

## Objective

Determine which element creates the overlapping layer above the footer that blocks content visibility and interaction on mobile devices.

---

## Context

The user reports that on mobile UI, "a layer above the footer sits in front of page content and blocks the visible area above the footer." This suggests an invisible or transparent element is capturing touch events, preventing interaction with content that should be interactive.

### Related Prior Work

Prior viewport-overlap bugfixes addressed **different** issues:
- **Plan 019** (v0.6.4): iPhone SE h-screen → h-screen-fix sweep
- **Plan 020** (v0.6.5): Nested viewport-height conflict in onboarding
- **Plan 021** (v0.6.6): Collapsed `mobile-bottom-ui-slot` when `data-mobile-ui='none'`

These focused on **CTA clipping due to viewport sizing**, not on **touch-blocking overlay layers**.

---

## Methodology

1. Traced RootClientLayout component structure
2. Analyzed CSS for `mobile-bottom-ui-slot` and wrapper elements
3. Examined pointer-events, visibility, and z-index stacking
4. Reviewed positioning of fixed footer components (MobileFooterBar, CityEarlyAccessNavbar)
5. Searched for invisible overlays or transparent blocking elements

### Files Examined

| File | Observation |
|------|-------------|
| [src/components/layout/RootClientLayout.tsx](src/components/layout/RootClientLayout.tsx) | Slot wraps both footer and navbar; no explicit pointer-events management |
| [src/styles/globals.css](src/styles/globals.css) (lines 424-451) | Slot uses `position: relative`; wrappers use `position: absolute; visibility: hidden/visible` |
| [src/components/common/MobileFooterBar.tsx](src/components/common/MobileFooterBar.tsx) | Uses `position: fixed; bottom: 0; z-50` — escapes wrapper |
| [src/components/shared/CityEarlyAccessNavbar.tsx](src/components/shared/CityEarlyAccessNavbar.tsx) | Also uses `position: fixed; bottom: 0; z-50` — escapes wrapper |

---

## Findings

### Finding 1: Dual-Layer Architecture (Verified — Confidence: Proven)

The mobile footer system uses a **dual-layer architecture**:

1. **Document-flow layer**: `mobile-bottom-ui-slot` (128px reserved height via flex)
2. **Viewport-fixed layer**: MobileFooterBar/CityEarlyAccessNavbar (position: fixed; z-50)

The slot reserves space in the DOM to prevent layout shift, while the actual footer is fixed-positioned to the viewport.

```
┌─────────────────────────────────────────────────────────┐
│  page-background (h-screen-fix, flex flex-col)          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ <main> (flex-1, overflow-y-auto)                    ││
│  │ ┌─────────────────────────────────────────────────┐ ││
│  │ │ Content area (children)                         │ ││
│  │ └─────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │ mobile-bottom-ui-slot (128px, position: relative)   ││
│  │ ┌───────────────────────────────────────────────┐   ││
│  │ │ .mobile-footer-bar-wrapper (absolute bottom:0) │  ││ ← SUSPECT
│  │ │   └── MobileFooterBar (fixed bottom:0 z-50)    │  ││
│  │ └───────────────────────────────────────────────┘   ││
│  │ ┌───────────────────────────────────────────────┐   ││
│  │ │ .city-navbar-wrapper (absolute bottom:0)       │  ││ ← SUSPECT
│  │ │   └── CityEarlyAccessNavbar (fixed bottom:0)   │  ││
│  │ └───────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Finding 2: Wrappers Lack pointer-events: none (Verified — Confidence: Proven)

The CSS for the wrappers is:

```css
.mobile-bottom-ui-slot .mobile-footer-bar-wrapper,
.mobile-bottom-ui-slot .city-navbar-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  visibility: hidden;  /* Toggled to visible based on data-mobile-ui */
}
```

**Critical Observation**: These wrappers:
- Use `visibility: hidden/visible` for show/hide (not `display: none`)
- Have NO `pointer-events: none` declaration
- Are positioned `absolute` spanning full width of the slot

When the `visibility` is `visible`, the wrapper element itself (regardless of its content's fixed positioning) remains in the DOM and **CAN receive pointer events** if it has any computed height.

### Finding 3: Wrapper Height Uncertainty (Inferred — Confidence: Medium)

The wrappers' children use `position: fixed`, which should remove them from normal flow, leaving the wrappers with **0 intrinsic height**. However:

1. Browser rendering may vary (especially on mobile Safari)
2. The wrappers have no explicit `height: 0` declaration
3. Any pseudo-elements, margins, or other factors could contribute height

**This requires device testing to verify.**

### Finding 4: Slot Itself Has No pointer-events Control (Verified — Confidence: Proven)

The `mobile-bottom-ui-slot` itself (128px height) has:
- `position: relative` (creates stacking context)
- `min-height: var(--mobile-nav-total)` (128px)
- **No `pointer-events` declaration**

While the slot is positioned AFTER `<main>` in the flexbox (not overlapping), **any absolutely-positioned children could extend beyond expected bounds** and capture events.

---

## Root Cause Analysis

### Primary Hypothesis (Confidence: High)

**The wrapper elements (`.mobile-footer-bar-wrapper` and `.city-navbar-wrapper`) may be capturing touch events despite appearing empty.**

Evidence supporting this:
1. Wrappers are `position: absolute; bottom: 0; left: 0; right: 0;` — they span full width
2. Wrappers use `visibility: visible` when active (not `display: none`)
3. Wrappers have NO `pointer-events: none` declaration
4. The fixed-positioned children (MobileFooterBar/CityEarlyAccessNavbar) escape the wrapper, leaving them visually empty but potentially still interactive

### Why visibility: hidden Doesn't Help for the Active Wrapper

When `data-mobile-ui='footer'`:
- `.mobile-footer-bar-wrapper` → `visibility: visible` ← This one is ACTIVE
- `.city-navbar-wrapper` → `visibility: hidden` ← This one is hidden

The ACTIVE wrapper has `visibility: visible`. If it has any computed height (even 1px due to rendering quirks), it becomes an invisible touch target spanning the full width of the slot area.

### Alternative Hypothesis (Confidence: Medium)

The slot's 128px reserved height creates "dead space" at viewport bottom that somehow intercepts touch events before they reach the fixed-positioned footer. This is less likely because the slot is after `<main>` in the flex layout, not overlapping it.

---

## Recommended Fix Direction (For Planner)

### Option 1: Add pointer-events: none to Wrappers (Preferred)

Add `pointer-events: none` to the wrapper elements so they pass through touch events:

```css
.mobile-bottom-ui-slot .mobile-footer-bar-wrapper,
.mobile-bottom-ui-slot .city-navbar-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  visibility: hidden;
  pointer-events: none;  /* ← ADD THIS */
}
```

The fixed-positioned children (MobileFooterBar, CityEarlyAccessNavbar) already have their own z-index and positioning — they will still receive events independently.

### Option 2: Add pointer-events: none to Slot Itself

Add `pointer-events: none` to the entire slot, then `pointer-events: auto` to the visible footer components:

```css
.mobile-bottom-ui-slot {
  /* existing rules */
  pointer-events: none;  /* Pass through by default */
}
```

The fixed-positioned footer components already have explicit `z-50` and should work fine.

### Option 3: Use display: none Instead of visibility: hidden

Change the wrapper visibility mechanism from `visibility: hidden/visible` to `display: none/block`. This completely removes the inactive wrapper from layout and event handling.

**Caution**: This may require testing for layout shift during transitions.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Exact computed height of active wrapper | Cannot confirm without device inspection | Inspect element on mobile device with DevTools | Device testing |
| 2 | Which pages/routes trigger the bug | User report doesn't specify | Reproduce to identify affected routes | UAT |
| 3 | iOS Safari vs other browsers | Bug may be browser-specific | Test across Mobile Safari, Chrome on iOS, Chrome on Android | QA |

---

## Analysis Recommendations

1. **Test Option 1 locally**: Add `pointer-events: none` to wrappers and verify the footer still receives touch events
2. **Reproduce on device**: Use Safari Web Inspector on a connected iOS device to inspect the wrapper elements and their computed dimensions
3. **Test affected pages**: Identify which routes exhibit the blocking behavior (onboarding flow, provider pages, etc.)

---

## Open Questions

1. Does the bug occur on ALL pages with the mobile footer, or only specific routes?
2. Is the bug specific to iOS Safari, or does it also affect Android Chrome?
3. Are there any pages that use additional overlays (push prompts, modals) that might compound the issue?

---

## Handoff Notes for Planner

This analysis identifies the **wrappers inside mobile-bottom-ui-slot** as the most likely root cause of touch-blocking behavior. The fix is straightforward: add `pointer-events: none` to ensure the wrappers pass through events to content below.

**Gate satisfied**: Analysis document exists in `agent-output/analysis/`.

**Confidence Level**: High (code analysis verified; device reproduction pending).

---

## Next Step

➡️ **Planner**: Create implementation plan based on Option 1 (add `pointer-events: none` to wrappers).
