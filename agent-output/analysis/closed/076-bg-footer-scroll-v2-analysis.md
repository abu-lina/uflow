---
ID: 076
Origin: 076
UUID: b4e8f21a
Status: Planned
---

# 076 — iOS Footer CTA Overlay — Root Cause v2

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-04-03 | Analyst | Initial analysis — Plan 075 fix deployed but issue persists |
| 2026-04-03 | Planner | Status → Planned; plan doc created at planning/076-bg-footer-scroll-v2-plan.md |

## Value Statement and Business Objective

The provider detail page CTA footer (Save / Share) becomes visually overlaid by background content when users drag/overscroll on iOS (iPhone SE + iPhone 16 Pro). Plan 075 applied `overscroll-contain` and an opaque `bg-white` footer — verified deployed to UAT via merge `f8c9bcb2` — but the user reports the issue persists. This analysis identifies why the v1 fix was insufficient and what structural issues remain.

## Context

- **Reported surface**: `/providers/[provider_id]` on iOS Safari (iPhone SE, iPhone 16 Pro)
- **Plan 075 applied**:
  1. `overscroll-contain` on inner scroll container (`ProviderDetailPage.tsx` L329)
  2. `bg-white` (opaque) on footer CTA (`ProviderDetailPage.tsx` L595)
  3. `bg-white` (opaque) on `ProviderCardModal.tsx` L780
- **Deployment confirmed**: Branch merged to `origin/main` as `f8c9bcb2 Session/075 bg footer scroll (#110)`
- **Prior art**: Plan 020 analysis identified the same structural pattern (`h-screen-fix` nesting inside flex chain) as root cause of viewport overlap issues across 13+ components

## Methodology

1. Verified merge to `origin/main` (deployed code matches session branch)
2. Traced the full DOM/CSS hierarchy from `<body>` to the footer CTA
3. Reviewed CSS spec for `overscroll-behavior: contain` vs `none`
4. Reviewed Plan 020 analysis for prior findings on nested `h-screen-fix`
5. Analyzed CSS stacking/compositing behavior on iOS Safari

## DOM Hierarchy (Mobile Provider Detail)

```
body::before                          (fixed, z-0, pattern.svg 5% opacity)
#__next::before                       (fixed, z-0, pattern.svg 5% opacity)
└─ div.page-background.h-screen-fix.relative.flex.flex-col
   ├─ <main>.flex.min-h-0.flex-1.flex-col.overflow-y-auto         ← OUTER SCROLL CONTAINER
   │  └─ PageTransition.relative.flex.flex-1.flex-col.transition-opacity
   │     └─ div.h-screen-fix.overflow-y-auto.overscroll-contain   ← INNER SCROLL CONTAINER
   │        ├─ div.pb-24                                          ← CONTENT
   │        │  ├─ MobileProviderDetail (images, info card...)
   │        │  ├─ TrustBadgesSection
   │        │  ├─ Barakah Effect section
   │        │  └─ Offers & Needs sections
   │        └─ div.pb-safe.fixed.bottom-0.z-50.bg-white           ← FOOTER CTA (position: fixed)
   │           ├─ BookmarkButton
   │           └─ Share button
   ├─ div.hidden.md:block (DesktopFooter — display:none on mobile)
   ├─ div.mobile-bottom-ui-slot[data-mobile-ui="none"] (min-height: 0, 0px)
   └─ PushNotificationPrompt (position: fixed, no flex space)
```

**Key structural facts**:
- Two nested scroll containers: `<main>` (overflow-y-auto) and inner div (overflow-y-auto)
- Footer CTA is a **child** of the inner scroll container (not a sibling)
- Inner div uses **viewport-based height** (`h-screen-fix` = 100dvh / -webkit-fill-available) rather than flow-based height (`h-full` / `flex-1`)
- `<main>` has `overflow-y-auto` but **NO** overscroll containment

## Findings

### F1 — `overscroll-behavior: contain` allows local rubber-band — **L1 Proven**

**Evidence**: CSS spec (MDN, W3C):
> `contain` — Default scroll overflow behavior is observed inside the element (e.g. "bounce" effects), but no scroll chaining occurs to neighboring scrolling areas. **The boundary default overscroll behavior (rubber-banding) is still applied.**
>
> `none` — Default scroll overflow behavior is NOT observed, AND the default overscroll boundary effect is also prevented.

Plan 075 applied `overscroll-contain` (maps to `overscroll-behavior: contain`). This prevents scroll chaining from the inner div to `<main>`, but **the inner scroll container itself still visually rubber-bands on iOS**. During this rubber-band, the container's content and background can visually shift past its bounds, potentially overlaying the `position: fixed` footer.

**Impact**: The Plan 075 fix addresses the wrong half of the problem. `contain` prevents chaining but allows the very visual effect that causes the overlay.

### F2 — `h-screen-fix` height mismatch with flex chain — **L2 Observed**

**Evidence**: Code inspection of the height resolution chain:
- `page-background`: `height: -webkit-fill-available` (resolves against `#__next` / viewport)
- `<main>`: `flex: 1 1 0%; min-height: 0` (resolves via flex algorithm)
- PageTransition: `flex: 1 1 0%` (resolves via flex algorithm)
- Inner div: `height: -webkit-fill-available` (resolves against PageTransition's content box)

Both the root (`page-background`) and the inner div use `.h-screen-fix`, which on iOS Safari resolves via `@supports (-webkit-touch-callout: none)` to `height: -webkit-fill-available`. This non-standard property resolves against each element's **own containing block**, not a shared viewport constant.

If the inner div resolves to a value even 1px larger than the flex-computed height of `<main>`, then `<main>` becomes scrollable. `<main>` has `overflow-y-auto` with **no `overscroll-behavior` set**, so its overscroll is completely uncontrolled on iOS.

**Prior confirmation**: Plan 020 analysis (doc `020-iphone-viewport-overlap-v2-analysis.md`) identified this exact pattern across 13+ components and recommended replacing `h-screen-fix` with `h-full` or `flex-1` on nested child screens.

### F3 — `<main>` has uncontrolled overscroll — **L2 Observed**

**Evidence**: `RootClientLayout.tsx` L120:
```html
<main class="flex min-h-0 flex-1 flex-col overflow-y-auto">
```

No `overscroll-behavior` is set on `<main>`. If `<main>` becomes scrollable (due to F2), its overscroll effect propagates to the viewport, triggering the iOS viewport-level rubber-band which is outside CSS control.

### F4 — Fixed footer inside scroll container — iOS compositing risk — **L3 Inferred**

**Evidence**: The footer CTA (`position: fixed; z-index: 50; bg-white`) is a DOM child of the inner scroll container. Per CSS spec, `position: fixed` should be viewport-relative regardless of DOM position. However, iOS Safari has documented historical issues with fixed elements inside overflow scroll containers:
- Fixed elements may be composited as part of the parent scroll container's GPU layer
- During overscroll/rubber-band, the entire compositor layer (including the "fixed" element) may shift together
- This can cause the fixed element to appear to scroll with the content during momentum/overscroll

**Cannot be verified without physical device** — this is an L3 hypothesis based on known iOS Safari behavior patterns.

**Fastest disconfirming test**: Move the footer CTA **outside** the inner scroll container (e.g., make it a sibling) and test on device. If the issue disappears, F4 is confirmed.

## Root Cause Summary

The Plan 075 fix (`overscroll-contain` + opaque footer) was necessary but **not sufficient**. The issue persists due to a combination of:

| # | Finding | Confidence | Fix Direction |
|---|---------|------------|---------------|
| F1 | `contain` still allows local rubber-band | **L1 Proven** | Change to `overscroll-none` |
| F2 | `h-screen-fix` on inner div may overflow `<main>` | **L2 Observed** | Replace with `h-full` or `flex-1 min-h-0` |
| F3 | `<main>` has no overscroll protection | **L2 Observed** | Add `overscroll-none` to `<main>` for provider pages, or universally |
| F4 | Fixed element inside scroll container — iOS compositor issue | **L3 Inferred** | Move footer outside scroll container |

## System Weaknesses

### Architecture
1. **Viewport-height anti-pattern in nested children**: The inner scroll container claims its own viewport height (`h-screen-fix`) instead of filling the available flex space. This creates an uncoordinated sizing system where two elements independently resolve to "viewport height" at different DOM levels, with no guarantee of matching.
2. **No layout coordination between `<main>` and child pages**: `<main>` establishes a scroll container (`overflow-y-auto`), and child pages independently establish their own scroll container. Neither coordinates with the other on overscroll behavior.

### Code
3. **Fixed element parented inside scroll container**: The CTA footer uses `position: fixed` but lives inside the scroll container. Moving it outside would eliminate all compositor-level ambiguity.
4. **`overscroll-behavior` mismatch**: The inner container has `contain` while `<main>` has nothing. Both should have explicit overscroll behavior.

## Instrumentation Gaps

**Normal (always-on)**:
- Log `main.scrollHeight - main.clientHeight` on provider detail page mount. If > 0, `<main>` is scrollable (confirms F2 on real devices).

**Debug (opt-in)**:
- Add a `?debug-layout` CSS overlay showing: `<main>` bounds (blue), inner scroll container bounds (green), footer CTA bounds (red). Would immediately visualize any height mismatch.

## Analysis Recommendations

1. **Upgrade `overscroll-contain` to `overscroll-none`** on the inner scroll container — this is the fastest test to suppress the local rubber-band (F1). Verify on iOS device.
2. **Replace `h-screen-fix` with `h-full` on the inner scroll container** — this makes the inner div fill `<main>` naturally via flow, eliminating the viewport-height mismatch risk (F2). This is the architecturally correct fix per Plan 020 recommendations.
3. **Add `overscroll-none` to `<main>`** as a safety net — ensures `<main>` never rubber-bands even if it becomes scrollable (F3).
4. **Move the footer CTA outside the inner scroll container** — eliminates the compositor ambiguity on iOS (F4). Since the footer is `position: fixed`, its visual position is the same regardless of DOM position.
5. **Test on physical iOS devices** — F4 cannot be confirmed without device access. Steps 1-3 should be tested individually to determine which combination resolves the issue.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Does `overscroll-behavior: none` fully suppress rubber-band on iOS Safari 16+? | No physical device | Test on iPhone SE + iPhone 16 Pro | Device owner |
| 2 | Is `<main>` actually scrollable on iOS? (F2 height mismatch) | No physical device | Add `console.log(main.scrollHeight, main.clientHeight)` or test with debug overlay | Device owner |
| 3 | Does moving footer outside scroll container resolve the issue? (F4 compositor theory) | No physical device | Structural change + device test | Planner → Implementer |
| 4 | Does `ProviderCardModal` have the same issue? | Bug report is for detail page only | Verify on modal path after fix | QA |

## Open Questions

None — all questions are tracked as Gaps above.
