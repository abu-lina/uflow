---
ID: 175
Origin: 175
UUID: a3f7c2b1
Status: Committed
---

# Analysis: Delete Button Hidden by Fixed Bottom Bar on Mobile

## 1. Changelog

| Date | Task |
|------|------|
| 2026-06-14 | Initial investigation — Plan 175: delete button overlap on Xiaomi 13T Pro |

## 2. Context

- **Bug**: Delete button on provider edit page (`/dashboard/providers/{id}/edit`) is partially hidden by a navbar/bar on mobile
- **Device**: Xiaomi 13T Pro (~390px viewport width, ~844px height in PWA standalone)
- **URL (UAT)**: `/dashboard/providers/609bac99-86ab-4429-b534-a49cfe97da12/edit`
- **Reported symptom**: The delete button at the bottom of the form is partially hidden

## 3. Methodology

Source file inspection of:
- The provider edit page and its layout
- The form component
- The dashboard layout and root client layout
- Mobile navigation components and CSS classes

## 4. Findings

### Finding 1: The edit page renders a delete button below the form [Proven]

**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:366-378`

The delete button is rendered outside `ProviderEditForm`, inside the `main` container at the bottom of the content:

```tsx
<div className="mt-8 border-t border-neutral-200 pt-6">
  <button ...>Delete Provider</button>
  <p className="mt-2 text-xs text-content-muted text-center">This action cannot be undone...</p>
</div>
```

The `main` container has `pb-4` (16px) bottom padding only:
```tsx
<main className="flex flex-1 flex-col pt-[calc(env(safe-area-inset-top)+24px+40px)] md:pt-[calc(env(safe-area-inset-top)+80px)] px-6 pb-4">
```

### Finding 2: ProviderEditForm renders a fixed bottom footer bar when reviewFooterActions is provided [Proven]

**File**: `src/components/providers/ProviderEditForm.tsx:1075-1100`

When `reviewFooterActions` is truthy (admin edit context), the form renders a fixed bottom footer:

```tsx
<footer
  className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-border/30 bg-gradient-to-b from-neutral-50 to-neutral-50 backdrop-blur-[20px]"
  style={{
    background: 'linear-gradient(to bottom, #f5f5f5 0%, #fbfbfb 100%)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
  }}
>
  <div className="flex w-full gap-3.5 px-6 pt-4 md:max-w-2xl md:mx-auto"
       style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
    <Button ...>Save</Button>
  </div>
</footer>
```

This footer is `fixed bottom-0 left-0 right-0 z-50` — always visible at the bottom of the viewport.

### Finding 3: The admin edit page provides reviewFooterActions to the form [Proven]

**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:339-356`

```tsx
<ProviderEditForm
  ...
  reviewFooterActions={{
    reject: { ... },
    approve: { ... },
  }}
  ...
/>
```

This triggers the fixed bottom footer in the form.

### Finding 4: The MobileFooterBar (bottom nav) is properly hidden on this route [Proven]

**File**: `src/utils/navigationUtils.ts:255-267`

The `shouldShowMobileFooter` function excludes paths containing `/providers/`:
```javascript
const footerExcludedPatterns = [
  '/search',
  '/providers/',  // matches /dashboard/providers/{id}/edit
  ...
];
```

**File**: `src/components/layout/RootClientLayout.tsx:89-99`

Result: `mobileUiMode = 'none'`, so the `MobileFooterBar` has `visibility: hidden`.

The MobileFooterBar is correctly invisible on this page. It is NOT the cause of the overlap.

### Finding 5: The `mobile-nav-spacing` padding is not applied to this page [Observed]

**File**: `src/components/layout/MobileLayout.tsx:15`

The `mobile-nav-spacing` class (which adds `padding-bottom: calc(var(--mobile-nav-total) + max(12px, env(safe-area-inset-bottom)))`) is only applied inside `MobileLayout.tsx`:

```tsx
<main className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 mobile-nav-spacing">
```

But the edit page does NOT use `MobileLayout` or `MobileLayoutWrapper`. The edit page uses its own `flex h-screen-fix flex-col` layout with a fixed PageHeader and a `main` with only `pb-4`.

### Finding 6: The fixed bottom bar height is ~72-80px on mobile [Inferred]

The fixed footer from `ProviderEditForm.tsx:1085` contains:
- `pt-4` (16px padding top)
- Button with `!h-[48px]` (48px height)
- `paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'` (16px + safe area)

Total: approximately 72-80px at the bottom of the viewport.

## 5. Root Cause

**Conflict between fixed bottom bar and statically positioned delete button:**

1. The `ProviderEditForm` (when `reviewFooterActions` is provided) renders a `fixed bottom-0 left-0 right-0 z-50` footer bar that stays pinned at the bottom of the viewport (`ProviderEditForm.tsx:1075-1100`)
2. The delete button is rendered BELOW the form in the page's static document flow (`page.tsx:366-378`)
3. The main container has only `pb-4` (16px) bottom padding, which is insufficient to push content above the fixed bar's ~72-80px overlay zone
4. On mobile viewports (~390px Xiaomi 13T Pro), the tall form requires scrolling. When scrolled to the bottom, the delete button sits under the fixed footer bar and is partially/completely hidden

The `z-50` on the fixed footer ensures it renders above the delete button in the stacking context.

## 6. Recommendations

### Fix A: Add bottom padding to the delete button container

Add a margin-bottom or padding-bottom to the delete button's wrapper div (or the main container) equal to the fixed footer bar height:

```tsx
// In page.tsx, on the main element:
pb-[calc(4rem+env(safe-area-inset-bottom))]
// or on the delete button container:
className="mt-8 border-t border-neutral-200 pt-6 mb-[calc(4rem+env(safe-area-inset-bottom))]"
```

### Fix B: Move delete button into the form

Place the delete button section inside the `ProviderEditForm` component, above the fixed footer's rendering point (around line 1075), so it appears in the form's scrollable content area with proper awareness of the fixed footer.

### Fix C: Use a CSS variable for the fixed footer height

Define `--fixed-footer-height` in CSS and apply it as padding-bottom on the main content container, making it responsive to the actual footer height.

### Recommended approach

**Fix A** is the simplest and least invasive. Add `mb-[88px]` (or a CSS variable) to the delete button's wrapper div to push it above the fixed bottom bar's overlay zone. Verify on actual Xiaomi 13T Pro / 390px viewport that the button is fully visible.

### Changelog
| Date | Agent | Action |
|------|-------|--------|
| 2026-06-14 | DevOps | Document closed | Status: Committed |
