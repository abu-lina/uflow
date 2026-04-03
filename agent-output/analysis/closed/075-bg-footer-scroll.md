---
ID: 075
Origin: 075
UUID: d4e8f1a7
Status: Planned
---

# 075 — Background Scrolls Over Footer CTA on iOS Provider Detail Page

## Changelog

| Date       | Agent    | Summary                                     |
|------------|----------|---------------------------------------------|
| 2026-04-03 | Analyst  | Initial RCA — layout trace, iOS scroll chain identified |
| 2026-04-03 | Analyst  | Scope refined: top-of-screen issue already fixed; only bottom CTA overlay during upward drag |

## Value Statement & Business Objective

Provider detail pages are the primary conversion surface — users tap "Save" or "Share" from the fixed footer CTA. When the page background visually overlays these buttons during iOS upward scroll/drag gestures, the CTA appears broken/unreachable, harming conversion and trust.

## Context

**Bug**: On iPhone SE and iPhone 16 Pro, when the user scrolls/drags the page **upward** (bottom overscroll), the page background overlays the fixed bottom CTA action buttons.

**Not in scope**: Any top-of-screen display issues (already fixed separately).

**Affected route**: `/providers/[provider_id]` (mobile view)

**Reproduction**: Open any provider detail page on a physical iOS device. Scroll to the bottom of the content, then continue dragging upward. The page background/content visually overlays the fixed footer CTA buttons.

## Methodology

- **Upstream Tracing**: Traced DOM hierarchy from root layout → RootClientLayout → `<main>` → PageTransition → ProviderDetailPage → fixed footer CTA.
- **Component Isolation**: Identified the exact scroll containers, stacking contexts, and fixed-position elements.
- **CSS Analysis**: Examined `globals.css` for `overscroll-behavior`, stacking rules, and iOS-specific workarounds.

## Findings

### F1 — Missing `overscroll-behavior-y: contain` on scroll container (L2 Observed)

**File**: `src/components/providers/ProviderDetailPage.tsx` line 329

The ProviderDetailPage mobile wrapper:
```html
<div class="h-screen-fix overflow-y-auto bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
```

This is the **only scroll surface** on the mobile provider detail page. It does NOT apply `overscroll-behavior-y: contain`.

Without this property, when the user scrolls past the content boundary (top or bottom), iOS Safari **chains the scroll** through the parent elements (`<main>` → `<body>` → viewport), triggering the **viewport-level elastic rubber-band bounce**. During this system-level compositor animation, the scroll content layer and `position: fixed` elements can desynchronize, causing scroll content to visually overlap the fixed footer.

The codebase already defines a `.scrollable-container` class (`globals.css:673`) with `overscroll-behavior-y: contain`, but it is not applied here.

### F2 — Semi-transparent footer background amplifies visual bleed (L2 Observed)

**File**: `src/components/providers/ProviderDetailPage.tsx` line 595

The footer CTA:
```html
<div class="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/30 bg-white/95 px-6 pt-4 backdrop-blur-sm">
```

- `bg-white/95` = 95% opacity white → content behind it is partially visible.
- `backdrop-blur-sm` = CSS `backdrop-filter: blur(4px)` → On iOS, during compositor-level rubber-band animations, backdrop-filter can momentarily fail or flicker, exposing unblurred content through the semi-transparent background.

Even a small compositor desync (F1) becomes visible because the footer is not fully opaque.

### F3 — Nested scroll containers (`<main>` wrapping inner scroller) (L2 Observed)

**File**: `src/components/layout/RootClientLayout.tsx` line 134

```html
<main class="flex min-h-0 flex-1 flex-col overflow-y-auto">  ← SCROLL CONTAINER #1
  <PageTransition>
    <div class="h-screen-fix overflow-y-auto ...">            ← SCROLL CONTAINER #2
```

- `<main>` has `overflow-y-auto` making it a scroll container.
- Its child (via PageTransition) is the ProviderDetailPage div, also `overflow-y-auto` with `h-screen-fix`.
- Because the inner div is exactly viewport height and the content inside it is what actually overflows, `<main>` itself never scrolls.
- However, the double `overflow-y-auto` **creates ambiguity in the scroll chain** on iOS. When the inner container overscrolls, iOS may propagate the event to `<main>` (which accepts scroll events due to `overflow-y-auto` even though it has no overflow), and then to the viewport.
- There is no `overscroll-behavior: contain` on either container.

### F4 — `body::before` pattern overlay compositing layer (L3 Inferred)

**File**: `src/styles/globals.css` line 167

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('/images/pattern.svg');
  background-repeat: repeat;
  background-attachment: scroll;
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
}
```

This creates a full-viewport `position: fixed` compositing layer at `z-index: 0`. While it is correctly below the footer CTA (`z-index: 50`), its presence adds an extra compositing layer that the iOS compositor must manage during rubber-band bounce. This **may** contribute to visual desync artifacts.

- **Confidence**: L3 — the pattern overlay is subtle (5% opacity) and correctly z-ordered. It's a secondary contributor at most.
- **Fastest disconfirming test**: Temporarily remove `body::before` rule and reproduce the bug on iOS. If the bug persists identically, this is not a factor.
- **Missing telemetry**: No compositor layer diagnostics available on production iOS devices.

### F5 — `PageTransition` opacity transition may create temporary containing block (L3 Inferred)

**File**: `src/components/ui/PageTransition.tsx` line 33

```jsx
<div className="relative flex flex-1 flex-col transition-opacity duration-300 ease-out"
     style={{ opacity: isPreloading ? 0 : 1 }}>
```

During the 300ms opacity transition (page load), the transitioning opacity creates a stacking context. On some WebKit versions, a transitioning `opacity` or `transform` on an ancestor can briefly affect `position: fixed` descendants, causing them to behave as `position: absolute` relative to the transitioning ancestor rather than the viewport.

- **Confidence**: L3 — this only applies during the 300ms page transition, not during steady-state scrolling. The reported bug occurs during scrolling, not during page entry.
- **Fastest disconfirming test**: Observe if the bug only manifests immediately after page load (during transition) vs. after the page is fully loaded.
- **Missing telemetry**: No timing correlation between the visual artifact and the opacity transition state.

## Full DOM Hierarchy (Mobile Provider Detail)

```
<body class="relative m-0 min-h-screen overflow-x-hidden">
  body::before ─── position: fixed, z-index: 0, pattern.svg at 5% opacity
  │
  <div.page-background.h-screen-fix.relative.flex.flex-col> ─── RootClientLayout
  │
  ├── <main.flex.min-h-0.flex-1.flex-col.overflow-y-auto> ─── SCROLL CONTAINER #1
  │   │
  │   └── <PageTransition.relative.flex.flex-1.flex-col.transition-opacity>
  │       │
  │       └── <div.h-screen-fix.overflow-y-auto.bg-gradient-to-b> ─── SCROLL CONTAINER #2 (actual scroll surface)
  │           │
  │           ├── <div.pb-24> ─── Content wrapper (padding for footer clearance)
  │           │   ├── <MobileProviderDetail> ─── Image carousel (touch-pan-x)
  │           │   ├── Provider info card
  │           │   ├── Trust badges
  │           │   ├── Offers / Needs sections
  │           │   └── ...
  │           │
  │           └── <div.fixed.bottom-0.z-50.bg-white/95.backdrop-blur-sm> ─── FOOTER CTA ⚠️
  │
  └── <div.mobile-bottom-ui-slot[data-mobile-ui='none']> ─── Hidden (provider detail excluded)
```

**Key observation**: The footer CTA (`position: fixed; z-index: 50`) is a child of the inner scroll container. While `position: fixed` should anchor to the viewport regardless of parent scroll state, iOS Safari's compositor can desynchronize these layers during elastic overscroll.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Status |
|---|---------|---------|-----------------|--------|
| 1 | Exact visual artifact during overscroll (content ON TOP vs. bleed-through) | No physical iOS device attached to inspector | Reproduce with Safari Web Inspector attached to confirm compositor layer behavior | Open |
| 2 | Whether `body::before` contributes to the artifact | Requires iOS device test | Temporarily disable `body::before` and test | Open |
| 3 | Whether bug occurs during page transition or only during steady-state scroll | Unobserved | Test both scenarios on iOS | Open |
| 4 | Whether ProviderCardModal (desktop-on-mobile fallback) has the same issue | Not tested | Test modal path | Open |

## Analysis Recommendations

1. **Test `overscroll-behavior-y: contain` on the inner scroll container** — Add to ProviderDetailPage's `div.h-screen-fix.overflow-y-auto` and verify on iPhone SE + iPhone 16 Pro.
2. **Test opaque footer background** — Change `bg-white/95 backdrop-blur-sm` to opaque `bg-white` and verify whether the visual artifact is masked.
3. **Test removing nested scroll** — Consider whether the inner `h-screen-fix overflow-y-auto` can delegate scrolling to `<main>` (removing the double container).
4. **Confirm `body::before` is not a factor** — Disable the pattern overlay temporarily and retest.

## Open Questions

1. Does the artifact appear as content rendering ON TOP of the footer, or as content "bleeding through" the semi-transparent footer background? (Affects whether the fix is z-index/stacking vs. opacity/compositing.)
2. Is the bug reproducible in PWA standalone mode (no Safari browser chrome), or only in Safari? (Affects whether iOS viewport dynamics are involved.)
