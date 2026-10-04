---
ID: 185
Origin: 185
UUID: a3f7c2b2
Status: Active
---

# Analysis: Provider Modal Close Navigation Bug

## Changelog
| Date | Agent | Summary |
|------|-------|---------|
| 2026-06-18 | Orchestrator | Initial analysis — root cause identified |

## Value Statement
Users who navigate to a provider detail page from a filtered search results page (e.g., `/food?status=pending&section=food`) expect closing the modal to return them to that exact page. Instead, it always navigates to `/providers`, losing all search context and forcing users to manually re-navigate.

## Methodology
- Source code inspection of provider detail page components
- Tracing the navigation flow from provider click → detail page → modal → close

## Context
- UAT URL: `https://uat.ummahflow.com/providers/{uuid}`
- User flow: `/food?status=pending&section=food` → click provider → `/providers/{uuid}` → modal opens → close modal → lands on `/providers` (wrong)
- Expected: returns to `/food?status=pending&section=food` (the previous page)

## Findings

### Finding 1: Hardcoded `/providers` in modal onClose (Desktop) — Proven
**File**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`
**Lines**: 70-73

```typescript
// Handle modal close - navigate back to providers page
const handleModalClose = () => {
  router.push('/providers');
};
```

The `handleModalClose` function is passed to `ProviderDetailModal` as `onClose` prop. It unconditionally pushes `/providers` instead of using `router.back()` to return to the user's previous page.

### Finding 2: Hardcoded `/providers` as backPath (Mobile) — Proven
**File**: `src/app/(public)/providers/[provider_id]/ProviderDetailPageClient.tsx`
**Lines**: 144-153

```typescript
<ProviderDetailPageComponent
  backPath="/providers"
  ...
/>
```

On mobile, the `ProviderDetailPageComponent` receives a hardcoded `backPath="/providers"` which `handleBack` uses to navigate. Same issue — loses referrer context.

### Finding 3: fallback-to-backPath logic in ProviderDetailPage — Proven
**File**: `src/components/providers/ProviderDetailPage.tsx`
**Lines**: 103-109

```typescript
const handleBack = () => {
  if (backPath) {
    router.push(backPath);
  } else {
    router.back();
  }
};
```

The mobile component has a fallback pattern that prefers `router.back()` only when `backPath` is not set. Since `backPath="/providers"` is always passed, `router.back()` is never reached.

### Root Cause
Both desktop (modal) and mobile (full page) paths hardcode `/providers` as the navigation target when closing/going back. There is no referrer-tracking mechanism. The navigation should use `router.back()` to return to wherever the user came from, or alternatively track the referrer URL.

## Recommendation
Change both paths to use `router.back()` instead of hardcoded `/providers`:

1. **Desktop (ProviderDetailPageClient.tsx line 72)**:
   Change `router.push('/providers')` → `router.back()`

2. **Mobile (ProviderDetailPageClient.tsx line 146)**:
   Remove `backPath="/providers"` prop so `ProviderDetailPageComponent.handleBack` falls through to `router.back()`
