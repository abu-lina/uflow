---
ID: 143
Origin: 143
UUID: b3f9a71e
Status: Active
---

# Plan 143 — Back Button Navigation Fix

## Summary
Fixed the back chevron button on the provider detail page (`/providers/[id]`) that was sometimes unresponsive by replacing the unreliable `router.back()` fallback with explicit navigation to `/providers`.

## Root Cause
`ProviderDetailPageClient.tsx` rendered `ProviderDetailPageComponent` without a `backPath` prop. This caused `ProviderDetailPage.tsx`'s `handleBack` function to fall back to `router.back()`, which silently does nothing when there's no browser history (direct link, bookmark, external referrer). The button appeared clickable but nothing happened.

## Change

**File**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`

Added `backPath="/providers"` prop to the `ProviderDetailPageComponent` on line 146:

```tsx
<ProviderDetailPageComponent
  backPath="/providers"
  customActionButtons={...}
  initialCommunityServices={...}
  provider={provider}
/>
```

This makes the mobile back button behavior consistent with the desktop modal, which already navigates to `/providers` via `handleModalClose`.

## Verification
- `npm run type-check` ✅ — no TypeScript errors
- `npm test` ✅ — 164 test files passed, 1304 tests passed, 0 failures
- No regression for desktop modal (uses separate `handleModalClose` → `router.push('/providers')`) ✅
- No regression for profile page (`ProfileProviderDetailPage.tsx` — different route, keeps `router.back()` fallback) ✅

## Affected Routes
| Route | Component | Behavior |
|-------|-----------|----------|
| `/providers/[id]` (mobile) | `ProviderDetailPage.tsx` → `MobileProviderDetail` | Now navigates to `/providers` via `backPath` |
| `/providers/[id]` (desktop) | `ProviderDetailModal` → X button | Unchanged — already navigates to `/providers` |
| `/profile/providers/[id]` | `ProfileProviderDetailPage` → `MobileProviderDetail` | Unchanged — keeps `router.back()` fallback |
