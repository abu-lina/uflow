---
ID: 168
Origin: 168
UUID: 1a85c6f3
Status: Active
---

# Analysis: Double navbar on mobile on /create

## Changelog

| Date | Agent | Outcome |
|------|-------|---------|
| 2026-06-13 | Analyst | Initial analysis |

## Value Statement

Diagnose why `/create` renders two overlapping navbars on mobile, causing visual and functional duplication.

## Context

- UAT bug report: two navbars visible on mobile viewport at https://uat.ummahflow.com/create
- Recent commit `bfe4af5d` ("fix: correct mobile header gap on /create, /saved, /profile") modified header spacing tokens but did not touch the double-rendering issue
- The `CityEarlyAccessNavbar` was originally placed directly in `create/page.tsx` before `RootClientLayout` took over global bottom-nav management

## Methodology

- Code inspection of create page, layout hierarchy, navigation utility functions
- Git history tracing of the `CityEarlyAccessNavbar` inclusion
- CSS analysis of the `mobile-bottom-ui-slot` visibility control

## Findings

### Stack of rendered components on mobile (`/create`)

| Layer | Component | File | Position |
|-------|-----------|------|----------|
| Top header | `PageHeader` | `create/page.tsx:41` | `fixed top-0 z-50` |
| Content | `PageContent` + cards | `create/page.tsx:46` | scrollable |
| Bottom nav (from page) | `CityEarlyAccessNavbar` | `create/page.tsx:109` | `fixed bottom-0 z-50` |
| Bottom nav (from layout) | `CityEarlyAccessNavbar` | `RootClientLayout.tsx:154` | `fixed bottom-0 z-50` |

### Root cause

**File**: `src/app/(public)/create/page.tsx`, lines 107–110

```tsx
{/* Bottom Navigation Bar - Mobile Only */}
<div className="block md:hidden">
  <CityEarlyAccessNavbar />
</div>
```

**File**: `src/components/layout/RootClientLayout.tsx`, lines 145–156

```tsx
<div
  className="mobile-bottom-ui-slot block md:hidden"
  data-mobile-ui={mobileUiMode}
  data-testid="mobile-footer-bar"
>
  <div className="mobile-footer-bar-wrapper">
    <MobileFooterBar />
  </div>
  <div className="city-navbar-wrapper">
    <CityEarlyAccessNavbar />
  </div>
</div>
```

`RootClientLayout` already handles showing the correct bottom navigation for `/create`:

- **Stage 3**: `shouldShowMobileFooter` returns `true` → `mobileUiMode = 'footer'` → `MobileFooterBar` shown
- **Early access**: `shouldShowCityEarlyAccessNavbar` returns `true` → `mobileUiMode = 'navbar'` → `CityEarlyAccessNavbar` shown

The explicit `CityEarlyAccessNavbar` in the page component is **redundant**. Because both instances use `fixed bottom-0 left-0 right-0 z-50`, they overlap, creating a duplicated bottom navigation bar.

### Which ones should be visible vs hidden

- **Keep**: `RootClientLayout.tsx:154` — it is the single source of truth for bottom navigation
- **Remove**: `create/page.tsx:107-110` — it was added before RootClientLayout managed this globally and is now obsolete

### Evidence that RootClientLayout covers `/create`

From `src/utils/navigationUtils.ts`:

- `shouldShowCityEarlyAccessNavbar('/create', ...)` returns `true` for Stages 1/2 (no exclusion matches `/create`)
- `shouldShowMobileFooter('/create', ...)` returns `true` for Stage 3
- No other create subpage (`/create/basics`, `/create/media`, etc.) renders `CityEarlyAccessNavbar` at the page level — they all rely on RootClientLayout

### Additional concern: double bottom UI on Stage 3

Even without the root cause described above, on **Stage 3 mobile**:
- RootClientLayout shows `MobileFooterBar` (data-mobile-ui = 'footer')
- Page-level `CityEarlyAccessNavbar` would still render (its wrapper is just `block md:hidden`, no stage/flag guard)
- This produces a `MobileFooterBar` + `CityEarlyAccessNavbar` stack — two different bottom bars visible simultaneously

## Confidence

**Proven** (Level 1) — verified by reading all four files and tracing the rendering logic.

## Recommended Fix

**File**: `src/app/(public)/create/page.tsx`

Remove lines 107–110 (the `CityEarlyAccessNavbar` block):

```diff
-      {/* Bottom Navigation Bar - Mobile Only */}
-      <div className="block md:hidden">
-        <CityEarlyAccessNavbar />
-      </div>
```

Also remove the import on line 10 if `CityEarlyAccessNavbar` is no longer used elsewhere in this file:

```diff
- import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
```

This is a safe removal because `RootClientLayout.tsx:154` already renders `CityEarlyAccessNavbar` when appropriate, and its visibility is controlled by the `data-mobile-ui` attribute and the navigation utility logic.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | None | — | — | — |
