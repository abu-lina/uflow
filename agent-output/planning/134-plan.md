---
ID: 134
Origin: 134
UUID: 134
Status: Active
---

# Plan 134 — Fix Missing `useCallback` on `finishModerationAction`

**Changelog**
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-06-03 | Planner | Initial plan — 5 edits to restore memoization chain |

---

## Summary

Three plain arrow functions in `AdminProviderEditPage` (`saveProviderEdits`, `reviewProvider`, `finishModerationAction`) are recreated every render, defeating `handleRejectConfirm`'s `useCallback` (which lists `finishModerationAction` as a dep) and causing unnecessary `<RejectModal>` re-renders. An inline arrow on `approve.onClick` compounds the issue.

**Fix**: Wrap all three in `useCallback` with correct deps, and extract the inline `approve.onClick` to a named `useCallback`.

## `useCallback` Already Imported

Line 3: `import { use, useCallback, useEffect, useState } from 'react';` — **no import change needed**.

---

## Edit 1 — Wrap `saveProviderEdits` in `useCallback`

**Location**: Lines 57–147

**Captures**: `providerId` (line 99), `t` (line 133)

**Deps**: `[providerId, t]`

**Old**:
```typescript
  const saveProviderEdits = async (formData: ProviderEditFormData) => {
    const normaliseProviderImages = (rawImages: string): string | undefined => {
      // ...
    };

    const normalisedImages = normaliseProviderImages(formData.images);

    const requestBody: Record<string, unknown> = {
      // ... (all existing body)
    };

    // ...
    return {
      updatedAt: responseData.data?.updated_at,
    };
  };
```

**New**:
```typescript
  const saveProviderEdits = useCallback(async (formData: ProviderEditFormData) => {
    const normaliseProviderImages = (rawImages: string): string | undefined => {
      // ...
    };

    const normalisedImages = normaliseProviderImages(formData.images);

    const requestBody: Record<string, unknown> = {
      // ... (all existing body, unchanged)
    };

    // ...
    return {
      updatedAt: responseData.data?.updated_at,
    };
  }, [providerId, t]);
```

> **Note**: The inner helper `normaliseProviderImages` is defined inside the callback body — no hoisting concerns.

---

## Edit 2 — Wrap `reviewProvider` in `useCallback`

**Location**: Lines 149–171

**Captures**: `providerId` (line 154)

**Deps**: `[providerId]`

**Old**:
```typescript
  const reviewProvider = async (reviewStatus: 'approved' | 'rejected', expectedUpdatedAt?: string, reviewFeedback?: string) => {
    const response = await fetch('/api/admin/review-provider', {
      // ...
    });
    // ...
  };
```

**New**:
```typescript
  const reviewProvider = useCallback(async (reviewStatus: 'approved' | 'rejected', expectedUpdatedAt?: string, reviewFeedback?: string) => {
    const response = await fetch('/api/admin/review-provider', {
      // ...
    });
    // ...
  }, [providerId]);
```

---

## Edit 3 — Wrap `finishModerationAction` in `useCallback`

**Location**: Lines 173–189

**Captures**: `saveProviderEdits`, `reviewProvider`, `queryClient`, `providerId`, `router`

**Deps**: `[saveProviderEdits, reviewProvider, queryClient, providerId, router]`

**Old**:
```typescript
  const finishModerationAction = async (
    formData: ProviderEditFormData,
    reviewStatus: 'approved' | 'rejected',
    reviewFeedback?: string
  ) => {
    const { updatedAt } = await saveProviderEdits(formData);
    await reviewProvider(reviewStatus, updatedAt, reviewFeedback);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] }),
      queryClient.invalidateQueries({ queryKey: ['providers'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
    ]);

    toast.success(reviewStatus === 'approved' ? 'Provider approved successfully' : 'Provider rejected');
    router.push(`/providers`);
  };
```

**New**:
```typescript
  const finishModerationAction = useCallback(async (
    formData: ProviderEditFormData,
    reviewStatus: 'approved' | 'rejected',
    reviewFeedback?: string
  ) => {
    const { updatedAt } = await saveProviderEdits(formData);
    await reviewProvider(reviewStatus, updatedAt, reviewFeedback);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['provider', providerId] }),
      queryClient.invalidateQueries({ queryKey: ['providers'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
    ]);

    toast.success(reviewStatus === 'approved' ? 'Provider approved successfully' : 'Provider rejected');
    router.push(`/providers`);
  }, [saveProviderEdits, reviewProvider, queryClient, providerId, router]);
```

---

## Edit 4 — No Change: `handleRejectConfirm` deps remain correct

**Location**: Lines 195–203

**Current deps**: `[rejectModal.formData, finishModerationAction]`

After Edit 3, `finishModerationAction` is stable → `handleRejectConfirm`'s `useCallback` works correctly. **No source change needed.**

---

## Edit 5 — Extract `handleApproveConfirm` from inline arrow

### 5a — Add named `useCallback` (after `handleRejectClose`, before loading guard)

**Location**: Insert after line 209 (between `handleRejectClose` and the `if (loading)` check)

**New code**:
```typescript
  const handleApproveConfirm = useCallback(async (formData: ProviderEditFormData) => {
    await finishModerationAction(formData, 'approved');
  }, [finishModerationAction]);
```

### 5b — Replace inline arrow with reference

**Location**: Lines 266–271

**Old**:
```typescript
            approve: {
              label: 'Approve',
              variant: 'success',
              onClick: async (formData) => finishModerationAction(formData, 'approved'),
              'aria-label': 'Approve provider and save changes',
            },
```

**New**:
```typescript
            approve: {
              label: 'Approve',
              variant: 'success',
              onClick: handleApproveConfirm,
              'aria-label': 'Approve provider and save changes',
            },
```

---

## Dependency-Aware Edit Order

| Order | Edit | Depends on | Affects |
|-------|------|-----------|---------|
| 1 | Wrap `saveProviderEdits` | — | Edit 3 |
| 2 | Wrap `reviewProvider` | — | Edit 3 |
| 3 | Wrap `finishModerationAction` | Edits 1, 2 | Edit 5, `handleRejectConfirm` (already stable) |
| 4 | (no-op) `handleRejectConfirm.depts` | — | — |
| 5a | Add `handleApproveConfirm` | Edit 3 | Edit 5b |
| 5b | Replace inline `onClick` | Edit 5a | — |

This order ensures that when `finishModerationAction` is wrapped, the two functions it depends on (`saveProviderEdits`, `reviewProvider`) are already stable.

---

## Hook Call Order Invariant

Current hook call order: `handleRejectClick` → `handleRejectConfirm` → `handleRejectClose`

After fix: `saveProviderEdits.useCallback` → `reviewProvider.useCallback` → `finishModerationAction.useCallback` → `handleRejectClick` → `handleRejectConfirm` → `handleRejectClose` → `handleApproveConfirm`

Order is deterministic (same sequence every render). ✅

---

## Verification Steps

1. **Type-check**: `npm run type-check` — must pass with zero errors
2. **Lint**: `npm run lint:check` — must pass with zero warnings
3. **Test**: `npx vitest run src/app/\(dashboard\)/dashboard/providers/\[id\]/edit/page.test.tsx 2>/dev/null || npx vitest run --passWithNoTests` — run any existing tests; if none exist, note the gap
4. **Manual smoke test**: Navigate to a provider edit page, approve a provider, reject a provider — both flows must complete without console errors
5. **React DevTools profiler (optional)**: Verify `<RejectModal>` no longer re-renders unnecessarily

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `saveProviderEdits` captures a value from scope not in deps | Low | Medium — stale closure | Already audited: only `providerId` and `t` are captured; `queryClient`/`router`/`toast` are not used in this function |
| `reviewProvider` captures a value from scope not in deps | Low | Medium — stale closure | Already audited: only `providerId`; `toast` is a stable import |
| `finishModerationAction` deps cause infinite re-render | Low | Low — all deps are stable after wrapping (`saveProviderEdits`/`reviewProvider` become stable via useCallback, `queryClient`/`router` are stable hook returns, `providerId` is a stable `use(params)` derivation) | Verify with `npm run type-check` |
| `handleApproveConfirm` inserted in wrong position breaks hook order | Low | High — React `Rendered more hooks than during the previous render` error | Must be inserted **after** `handleRejectClose` (last existing hook) and **before** the loading guard (line 211) |
| `approve.onClick` change breaks `ProviderEditForm` prop expectation | Low | Low — `onClick` type is `(formData: ProviderEditFormData) => Promise<void>` in both cases | Type-check will catch signature mismatches |
| `normaliseProviderImages` closure changes behaviour | Low | Medium — moving it inside useCallback should be safe as it doesn't capture any outer scope variables | Confirm it only uses `rawImages` (its parameter) |

---

## Edge Cases

1. **Stale `t`**: `t` comes from `useLanguage()`. If `LanguageProvider` changes `t` on language switch, the `useCallback` will correctly pick up the new `t` because it's in the deps array. ✅
2. **Multiple rapid clicks**: The `handleApproveConfirm` and `handleRejectConfirm` callbacks don't have built-in debouncing. This is pre-existing behaviour — the fix only stabilises references, not logic.
3. **`providerId` stability**: `use(params)` on Next.js 15+ returns a stable value for the lifetime of the page. If the param changes, the component remounts. ✅
