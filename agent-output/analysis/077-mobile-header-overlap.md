---
ID: 077
Origin: 077
UUID: d4e8a1f2
Status: Planned
---

# 077 — Mobile Header Overlap on Providers Page

## Changelog

| Date       | Event                        | Outcome                                      |
| ---------- | ---------------------------- | -------------------------------------------- |
| 2026-04-04 | Initial analysis (Analyst)   | Root cause identified (L1 Proven). Handoff.  |
| 2026-04-04T08:00Z | Plan created (Planner) | Status → Planned; plan 077 in agent-output/planning/ |
| 2026-04-04T07:58Z | Critique complete (Critic) | Plan 077 reviewed; APPROVED WITH COMMENTS (1 MEDIUM: epic mismatch) |

## Value Statement & Business Objective

The providers discovery page (`/providers`) is the primary user-facing browse surface. On iOS devices with a notch (safe-area-inset-top > 0), the fixed search/category header overlaps the first ~45–60 px of provider card content. This:

- Obscures the first provider card image and category badge
- Prevents touch interaction on the overlapped region (tap/scroll dead zone)
- Is more severe for admin users whose `AdminStatusFilter` tabs render directly behind the header

Fixing this directly improves mobile UX on the most common browse path.

## Context

- **Branch**: `session/077-mobile-header-overlap`
- **Affected route**: `/providers` (ProvidersContent with `showGreeting=false`)
- **Viewport**: Mobile only (`sm:hidden` header, < 640 px). Desktop header is a separate component (`Header.tsx`) hidden on mobile.
- **Reproducible on**: Any iOS device with a display notch / Dynamic Island (iPhone X and later).

## Methodology

1. **Upstream Tracing** — Followed component hierarchy from `layout.tsx` → `RootClientLayout` → `ProvidersContent` → `ProvidersPageHeader`.
2. **Height Calculation** — Manually computed the fixed header height vs. the content `padding-top` offset.
3. **Pattern Comparison** — Compared with the city page Stage 3 header which uses the correct `max()` pattern.
4. **Invisible Interceptor Heuristic** — Enumerated all positioned/fixed ancestors from the blocked target to root.

## Findings

### F1 — Root Cause: Hardcoded `pt-32` ignores `env(safe-area-inset-top)` [L1 Proven]

The `ProvidersPageHeader` is `position: fixed; top: 0; z-index: 50` and its height is **dynamic**, depending on the device safe area:

```
Header height = max(24px, env(safe-area-inset-top) + 24px)   ← top padding
              + 40px                                          ← SearchBar (h-10)
              + 12px                                          ← pb-3 gap
              + ~32px                                         ← CategoryFilter (py-1 + text-base + pb-2)
              + 6px                                           ← pb-1.5 outer wrapper
```

| Device class            | safe-area-inset-top | Header height | Content `pt-32` | Deficit |
| ----------------------- | ------------------- | ------------- | --------------- | ------- |
| Non-notch (iPhone SE)   | 0 px                | ~114 px       | 128 px          | +14 px ✅ |
| Notch (iPhone 15 Pro)   | ~59 px              | ~173 px       | 128 px          | **−45 px** ❌ |
| Dynamic Island (16 Pro) | ~59 px              | ~173 px       | 128 px          | **−45 px** ❌ |

The content `<main>` uses a static Tailwind class `pt-32` (128 px) that does **not** include `env(safe-area-inset-top)`:

```tsx
// ProvidersContent.tsx:523-525
showGreeting
  ? 'pt-0 sm:pt-8 md:pt-28'
  : 'pt-32 sm:pt-8 md:pt-28'  // ← 128px, no safe-area compensation
```

**Evidence**: The city page Stage 3 correctly uses the `max()` pattern:
```tsx
// city/[cityName]/page.tsx — CORRECT
<div className="w-full px-6 pt-[max(141px,calc(env(safe-area-inset-top)+141px))]">
```

The providers page does not.

**Source files**:
- `src/components/providers/ProvidersPageHeader.tsx` (lines 23–75) — fixed header definition
- `src/app/(public)/providers/ProvidersContent.tsx` (line 525) — hardcoded `pt-32`

### F2 — Admin Status Filter Exacerbates the Visual Overlap [L1 Proven]

For admin/moderator users, the `AdminStatusFilter` renders **inside** the `<main>` content, immediately after the `pt-32` gap:

```tsx
// ProvidersContent.tsx:530-537
{isAdmin && (
  <div className="mb-6 px-4 sm:px-6">
    <AdminStatusFilter ... />
  </div>
)}
```

On notch phones, the admin filter tabs ("Approved", "Pending", "Needs Revision", etc.) start at Y=128 px from the viewport top, but the header extends to ~173 px. The filter tabs are **completely hidden** behind the glassmorphic header.

**Evidence**: Screenshot 2 shows "Needs Revision" text partially visible behind the category filter — this is the `AdminStatusFilter` tab peeking out from under the overlapping header.

The admin filter adds its own height (~36 px + 24 px margin-bottom) but does not change the header height or padding. The root cause is the same as F1.

### F3 — No Invisible Layer Between Header and Content [L1 Proven]

Applying the Invisible Interceptor heuristic, I traced all positioned ancestors from the blocked content to the viewport root:

| Layer | Element | Positioning | z-index | Intercepts? |
| ----- | ------- | ---------- | ------- | ----------- |
| 1 | `ProvidersPageHeader <header>` | `fixed top-0` | 50 | **Yes — primary blocker** |
| 2 | `RootClientLayout > div` | `relative` | auto | No (just stacking context) |
| 3 | `RootClientLayout > <main>` | static | auto | No (scroll container only, `overflow-y-auto`) |
| 4 | `PageTransition > div` | `relative` | auto | No (opacity transition, no transform) |
| 5 | Desktop `Header` wrapper | `hidden md:block` | — | No (not rendered on mobile) |
| 6 | `mobile-bottom-ui-slot` | `relative` | auto | No (bottom of flex, `pointer-events: none` when inactive) |
| 7 | `MobileFooterBar <nav>` | `fixed bottom-0` | 50 | No (bottom, not top; correctly handled by `mobile-nav-spacing`) |

**Conclusion**: There is only **one** interceptor — the `ProvidersPageHeader` itself. No invisible layers or secondary blockers are contributing. The overlap is purely a padding arithmetic issue.

### F4 — `position: fixed` Is Not Broken by Ancestor Contexts [L1 Proven]

Checked all ancestors of `ProvidersPageHeader` for CSS properties that create a containing block for `position: fixed` (`transform`, `filter`, `will-change`, `contain`):

- `PageTransition`: uses `transition-opacity` only — does NOT affect fixed positioning
- `RootClientLayout main`: `overflow-y-auto` — creates scroll context but does NOT affect fixed positioning
- No ancestor uses `transform`, `perspective`, `filter`, or `will-change: transform`

The `ProvidersPageHeader` correctly pins to the **viewport**. The issue is not about fixed positioning being broken.

### F5 — Desktop Is Unaffected [L1 Proven]

At `sm:` breakpoint (≥ 640 px) and above:
- `ProvidersPageHeader` has `sm:hidden` — not rendered
- Desktop uses `Header.tsx` (wrapped in `hidden md:block`) which is a completely separate component with its own `h-20` nav and correct offset system
- Content padding at `sm:pt-8 md:pt-28` is appropriate because the desktop header uses `header-spacer` CSS tokens

The bug is **mobile only**.

### F6 — Correct Pattern Exists in Codebase [L2 Observed]

The codebase already has the correct approach in two places:

1. **City page Stage 3** (`src/app/(public)/city/[cityName]/page.tsx`):
   ```tsx
   pt-[max(141px,calc(env(safe-area-inset-top)+141px))]
   ```

2. **RootPageContent Stage 3** (`src/components/shared/RootPageContent.tsx`):
   ```tsx
   pt-[max(141px,calc(env(safe-area-inset-top)+141px))]
   ```

Both use `max(base, calc(env(safe-area-inset-top) + base))` to ensure the safe area is accounted for while maintaining a minimum on non-notch devices.

## Invisible Interceptor Summary

| Candidate | Type | Confirmed Blocker? | Confidence |
| --------- | ---- | ------------------ | ---------- |
| `ProvidersPageHeader` | `fixed top-0 z-50` with glassmorphic backdrop | **Yes** — overlaps content by ~45 px on notch phones | L1 Proven |
| Desktop `Header` wrapper | `hidden md:block` | No — not rendered on mobile | L1 Proven |
| `PageTransition` wrapper | `relative`, `transition-opacity` | No — doesn't create fixed containing block | L1 Proven |
| `mobile-bottom-ui-slot` | `relative`, `pointer-events: none` | No — bottom of flex, no top overlap | L1 Proven |
| `MobileFooterBar` | `fixed bottom-0 z-50` | No — bottom bar, handled by `mobile-nav-spacing` | L1 Proven |

## Required Padding Calculation

For the `ProvidersPageHeader`, the content padding should be:

```
Required padding-top = max(24px, env(safe-area-inset-top) + 24px)  ← header top padding
                     + 40px                                         ← SearchBar h-10
                     + 12px                                         ← pb-3
                     + 32px                                         ← CategoryFilter
                     + 6px                                          ← pb-1.5
                     + ~16px                                        ← visual gap
                     ≈ env(safe-area-inset-top) + 130px
```

The current `pt-32` = 128 px. A safe-area-aware value like `pt-[max(130px,calc(env(safe-area-inset-top)+130px))]` would be needed, or better: dynamically measuring the header height.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Status |
|---|---------|---------|-----------------|--------|
| 1 | Exact `safe-area-inset-top` on all target devices | Low — standard values are well-documented | Verify on physical iPhone X/14/15/16 | Deferred to QA |
| 2 | Whether `showGreeting=true` (Stage 2) has the same overlap | N/A — uses `pt-0` with `CityCard pb-8` gap, different layout | Verify visually | Deferred to QA |

## Analysis Recommendations

1. **Trace the correct `max()` pattern** already used in `city/[cityName]/page.tsx` and apply the same technique to `ProvidersContent.tsx` line 525. Replace the static `pt-32` with a safe-area-aware Tailwind arbitrary value.
2. **Test on iPhone SE (non-notch)** and iPhone 15 Pro (notch) to validate the gap is correct on both device classes.
3. **Verify admin view**: After fix, confirm `AdminStatusFilter` tabs are fully visible below the header on notch phones.
4. **Consider extracting** the header height + offset logic into a shared CSS custom property or utility class to prevent future drift (this pattern is duplicated across `ProvidersPageHeader`, city page Stage 3, and `RootPageContent`).

## Open Questions

None — root cause fully determined.
