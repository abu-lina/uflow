---
ID: 185
Origin: 185
UUID: b4f8d3c1
Status: Active
---

# Plan: Fix Provider Modal Back-Navigation

## Changelog
| Date | Agent | Summary |
|------|-------|---------|
| 2026-06-18 | Orchestrator | Plan created from analysis 185 |

## Objective
Replace hardcoded `/providers` navigation with `router.back()` so users return to their previous page (e.g., `/food?status=pending&section=food`) when closing the provider detail modal or clicking back on mobile.

## Changes

### Change 1: Desktop modal close — use router.back()
**File**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`
**Line**: 72
**Current code**:
```typescript
const handleModalClose = () => {
  router.push('/providers');
};
```
**New code**:
```typescript
const handleModalClose = () => {
  router.back();
};
```

### Change 2: Mobile backPath — remove hardcoded prop
**File**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`
**Line**: 146
**Current code**:
```typescript
<ProviderDetailPageComponent
  backPath="/providers"
  ...
/>
```
**New code**:
```typescript
<ProviderDetailPageComponent
  ...
/>
```

### Change 3: No change needed in ProviderDetailPage.tsx
**File**: `src/components/providers/ProviderDetailPage.tsx`
**Lines**: 103-109
The existing fallback logic is correct:
```typescript
const handleBack = () => {
  if (backPath) {
    router.push(backPath);
  } else {
    router.back();
  }
};
```
Removing the `backPath` prop will make it fall through to `router.back()`. No code change needed here.

## Edge Cases

### Direct navigation (no history)
If a user navigates directly to `/providers/{uuid}` (e.g., via bookmark or URL paste), `router.back()` will leave the SPA. In Next.js, if there's no previous history entry, `router.back()` behaves like `window.history.back()` — it goes to the browser's previous page (could be an external site). This is acceptable behavior — it's what browsers do by default.

### Modal close via Escape key
The modal already has an Escape key handler (`ProviderDetailModal.tsx` line 261) that calls `onClose()` → `handleModalClose()` → `router.back()`. This will also work correctly.

### ProviderDetailModal onClose callers
The `onClose` prop in `ProviderDetailModal` is only called from:
1. The X close button (line 601)
2. The Escape key handler (line 262)
3. Community service "Barakah Effect" click handler (line 624) — calls `onClose()` followed by `router.push()` to the community service page, which is correct behavior

## Testing Strategy

### Automated tests
1. **Unit test for handleModalClose**: Verify the function calls `router.back()` instead of `router.push('/providers')`
2. **Regression test**: Mock router and verify that navigating from a search page → provider → closing modal triggers `router.back()`, not `router.push()`

### Manual test
1. Visit `/food?status=pending&section=food` on desktop
2. Click a provider → modal opens
3. Close the modal / press Escape
4. **Expected**: Returns to `/food?status=pending&section=food`
5. Repeat on mobile viewport

## Branch
Create branch: `fix/185-modal-back-navigation` from latest `main`
