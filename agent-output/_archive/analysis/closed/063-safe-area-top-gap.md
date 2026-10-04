---
ID: 063
Origin: 063
UUID: b7e3a1d9
Status: Planned
---

# Analysis: Provider Detail Page — Safe-Area Top Gap

## Changelog

| Date       | Author  | Change                     |
| ---------- | ------- | -------------------------- |
| 2026-03-25 | Analyst | Initial analysis completed |
| 2026-03-25T21:11Z | Planner | Status updated to Planned; handed off to planning artifact 063 |

## Value Statement and Business Objective

The provider detail page is the primary conversion surface for users exploring services. On Dynamic Island / notch devices (iPhone X+, iPhone 14 Pro, iPhone 15 Pro), the page content overlaps the system status bar, creating an unprofessional appearance and potentially obscuring the back button. Fixing this ensures a polished experience on the fastest-growing segment of iOS devices while preserving the layout on non-notch devices (iPhone SE, older Android).

## Objective

Determine the root cause of insufficient top spacing on the provider detail page when viewed on notch/Dynamic Island iPhones, and document the exact files, CSS classes, and fix approach.

## Context

- **Reported symptom**: On iPhone 15 Pro (Dynamic Island), the provider detail page for "Halal Asia Delights" (Essen & Trinken category) has its hero image pushed right up against the status bar / Dynamic Island area.
- **Works fine**: iPhone SE (non-notch device).
- **Web standard**: `env(safe-area-inset-top)` resolves to the hardware inset on notch devices and `0px` on non-notch devices — meaning adding it is always safe.

## Methodology

1. Verified `viewport-fit=cover` is set in root layout (required for `env()` to work).
2. Grepped entire `src/` for `safe-area-inset`, `viewport-fit`, `safe-area` patterns.
3. Traced render path: `page.tsx` → `ProviderDetailPageClient` → (mobile) `ProviderDetailPage` → `MobileProviderDetail`.
4. Inspected every layer's CSS classes for `padding-top` / `safe-area` usage.
5. Compared with sibling pages that correctly use `env(safe-area-inset-top)`.

## Findings

### Finding 1 — `viewport-fit=cover` is correctly configured (VERIFIED)

**File**: `src/app/layout.tsx` line 28

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f5f5f5',
  viewportFit: 'cover',   // ✅ Correct — enables env() safe-area values
};
```

**Status**: No issue here.

### Finding 2 — `MobileProviderDetail` uses fixed `pt-6` with NO safe-area offset (VERIFIED — ROOT CAUSE)

**File**: `src/components/providers/MobileProviderDetail.tsx` line 75

```tsx
return (
  <div className="flex w-full flex-col items-start px-6 pt-6">
```

`pt-6` = 24px fixed padding. On non-notch devices, `env(safe-area-inset-top)` resolves to `0px`, so 24px is adequate. On Dynamic Island devices, `env(safe-area-inset-top)` ≈ 59px (iPhone 15 Pro), so the content needs at least `59px + visual gap` of top padding.

**This is the primary root cause.** The component never accounts for the hardware-defined safe area inset at the top.

### Finding 3 — Parent wrappers add NO safe-area top compensation (VERIFIED)

The render chain from root to the MobileProviderDetail content:

| Layer | File | Top-spacing CSS | Safe-area? |
|-------|------|-----------------|------------|
| Root `<body>` | `src/app/layout.tsx` | `p-0` (explicit reset) | ❌ None |
| `RootClientLayout` | `src/components/layout/RootClientLayout.tsx` | `<main>` has no `pt-*` | ❌ None |
| `ProviderDetailPage` (mobile branch) | `src/components/providers/ProviderDetailPage.tsx` L329 | `h-screen-fix overflow-y-auto` — no `pt-*` | ❌ None |
| Inner wrapper | `ProviderDetailPage.tsx` L331 | `pb-24` — no `pt-*` | ❌ None |
| `MobileProviderDetail` | `src/components/providers/MobileProviderDetail.tsx` L75 | `pt-6` (fixed 24px) | ❌ None |

**No layer in the chain applies `env(safe-area-inset-top)`.** The entire gap between status bar and hero image is only the fixed 24px from `pt-6`.

### Finding 4 — Established safe-area patterns exist in the codebase (VERIFIED)

The project has well-established patterns for safe-area handling:

1. **Tailwind tokens** in `tailwind.config.ts`:
   - `safe-top` → `env(safe-area-inset-top)`
   - `header-spacing` → `calc(env(safe-area-inset-top) + 16px + 40px + 24px)`

2. **CSS utility classes** in `globals.css`:
   - `.pt-safe-top` → `padding-top: max(12px, env(safe-area-inset-top))`
   - `.pt-safe-top-spacing` → `padding-top: calc(1rem + env(safe-area-inset-top))`

3. **Inline calc patterns** used in sibling pages:
   - Edit pages: `pt-[calc(env(safe-area-inset-top)+24px+40px)]`
   - Providers list: `paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))'`
   - City page: `paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))'`

### Finding 5 — Why iPhone SE works correctly (VERIFIED)

On iPhone SE (no notch, no Dynamic Island):
- `env(safe-area-inset-top)` resolves to `0px`
- `pt-6` = 24px is sufficient visual spacing from the status bar
- Status bar is 20px on iPhone SE, so 24px padding clears it

On iPhone 15 Pro (Dynamic Island):
- `env(safe-area-inset-top)` resolves to ~59px
- `pt-6` = 24px is **insufficient** — content renders ~35px under the Dynamic Island
- Back button and hero image collide with the status bar area

### Finding 6 — Loading skeleton also lacks safe-area (VERIFIED, secondary)

**File**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx` lines 80-81

The loading skeleton header uses `sticky top-0 ... px-6 py-4` with no safe-area offset. While less critical (skeleton is brief), it should be addressed for consistency.

## Root Cause

**`MobileProviderDetail.tsx` line 75** uses a fixed `pt-6` (24px) padding-top on its outermost `<div>`. No ancestor in the layout chain compensates for `env(safe-area-inset-top)`. On devices with notch/Dynamic Island where the safe-area inset is ~47–59px, the hero image and back button overlap the system UI.

**Confidence level**: **VERIFIED** — direct code trace, no ambiguity.

## Affected Files

| File | Line(s) | Issue |
|------|---------|-------|
| `src/components/providers/MobileProviderDetail.tsx` | 75 | Primary — `pt-6` needs safe-area offset |
| `src/components/providers/ProviderDetailPage.tsx` | 329 | Secondary — outer wrapper could also apply safe-area |
| `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx` | 80 | Minor — loading skeleton lacks safe-area |

## Analysis Recommendations (next steps for Planner)

1. **Test which layer to fix**: Either add `env(safe-area-inset-top)` to `MobileProviderDetail.tsx`'s `pt-6`, or to the `ProviderDetailPage.tsx` mobile wrapper at L329. Recommended: fix at the `MobileProviderDetail` level to match the self-contained pattern used in other components.

2. **Follow existing codebase pattern**: Use `pt-[calc(env(safe-area-inset-top)+24px)]` to replace `pt-6`. This matches the pattern in `ProvidersContent.tsx` and edit pages.

3. **Validate on both device types**: iPhone SE (env resolves to 0 → unchanged 24px) and iPhone 15 Pro (env resolves to ~59px → total ~83px, clearing the Dynamic Island).

4. **Address the secondary loading skeleton**: Update `ProviderDetailPageClient.tsx` L80 to include safe-area-inset-top.

5. **No regression risk on desktop**: Desktop path is separate (`!isMobile` branch in `ProviderDetailPage.tsx`) and is not affected.

## Open Questions

None — root cause is verified and the fix pattern is well-established in the codebase.
