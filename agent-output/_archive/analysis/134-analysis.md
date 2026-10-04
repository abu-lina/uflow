---
ID: 134
Origin: 134
UUID: 134
Status: Active
---

# Plan 134 — Analysis: Missing `useCallback` on `finishModerationAction` causes unnecessary re-renders

**Changelog**
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-06-03 | Analyst | Initial analysis — code inspection complete |

---

## Value Statement and Business Objective

The `AdminProviderEditPage` component suffers from a broken memoization chain: `finishModerationAction` (a plain function, recreated every render) is listed in the dependency array of `handleRejectConfirm`'s `useCallback`, defeating the memoization entirely. This causes `RejectModal` to re-render on every parent render, even when no relevant state has changed. On a page where the provider form may trigger many re-renders (localStorage-backed form state, review footer actions, etc.), this yields wasted reconciliation cycles and degraded performance, especially on lower-end mobile devices (the primary target for this app).

---

## Context

| Item | Detail |
|------|--------|
| **File** | `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` |
| **Component** | `AdminProviderEditPage` |
| **Bug introduced** | Originally when the moderation flow was implemented (unknown PR) |
| **Plan** | 134 |

### Relevant Lines

| Lines | Symbol | Kind | Wrapped in `useCallback`? |
|-------|--------|------|---------------------------|
| 173–189 | `finishModerationAction` | `async function` in component body | **No** |
| 191–193 | `handleRejectClick` | `useCallback` | Yes (deps: `[]`) |
| 195–203 | `handleRejectConfirm` | `useCallback` | Yes (deps: `[rejectModal.formData, finishModerationAction]`) |
| 205–209 | `handleRejectClose` | `useCallback` | Yes (deps: `[rejectModal.isLoading]`) |
| 275–281 | `<RejectModal>` | Receives `onConfirm={handleRejectConfirm}` | N/A (consumer) |

---

## Methodology

1. **Code inspection**: Read the full source file (285 lines). Identified every function defined in the component body.
2. **Dependency trace**: Checked `useCallback` dependency arrays for correctness. Identified the broken chain: `finishModerationAction` (unstable) → `handleRejectConfirm` (defeated `useCallback`) → `RejectModal` (new `onConfirm` prop every render).
3. **Closure analysis**: Verified what `finishModerationAction` captures from the outer scope (`saveProviderEdits`, `reviewProvider`, `queryClient`, `providerId`, `router`).
4. **Render impact assessment**: Traced the prop chain to `<RejectModal>` and `<ProviderEditForm>`.

---

## Findings

### F1 — Primary: `finishModerationAction` is a plain function (not `useCallback`)

**Confidence: L1 Proven** (direct code inspection at line 173)

```typescript
const finishModerationAction = async (
  formData: ProviderEditFormData,
  reviewStatus: 'approved' | 'rejected',
  reviewFeedback?: string
) => {
  // ...
};
```

This function is defined as a `const` arrow function inside the component body without `useCallback`. On every React render, a new closure is created, meaning the function reference changes every time.

### F2 — Defeated `useCallback` on `handleRejectConfirm`

**Confidence: L1 Proven** (direct code inspection at line 195–203)

```typescript
const handleRejectConfirm = useCallback(async (feedback: string) => {
  if (!rejectModal.formData) return;
  setRejectModal(prev => ({ ...prev, isLoading: true }));
  try {
    await finishModerationAction(rejectModal.formData, 'rejected', feedback);
  } catch {
    setRejectModal(prev => ({ ...prev, isLoading: false }));
  }
}, [rejectModal.formData, finishModerationAction]);
```

`finishModerationAction` is in the dependency array (line 203). Since `finishModerationAction` is a new reference on every render, `useCallback` always computes a new `handleRejectConfirm` reference. The memoization is completely defeated.

### F3 — Unnecessary `RejectModal` re-renders

**Confidence: L2 Inferred** (structural deduction)

`<RejectModal>` (line 275–281) receives `onConfirm={handleRejectConfirm}`. Because `handleRejectConfirm` is a new reference on every render, `RejectModal` receives a changed `onConfirm` prop every time, causing an unnecessary re-render even when none of its visible state (isOpen, isLoading, providerName) has changed.

### F4 — Inline arrow function in `approve` action also un-memoized

**Confidence: L1 Proven** (direct code inspection at line 269)

```typescript
approve: {
  label: 'Approve',
  variant: 'success',
  onClick: async (formData) => finishModerationAction(formData, 'approved'),
  // ...
},
```

This inline arrow function is also recreated on every render, which means the `ProviderEditForm` component receives a changed `reviewFooterActions` prop every render. However, the extent of the re-render impact depends on how `ProviderEditForm` uses `React.memo` — if it does not memoize, this is a secondary concern relative to F3.

### Dependency Chain Summary

```
Render ──→ finishModerationAction (new reference)
              │
              ├──→ handleRejectConfirm.useCallback ──→ RejectModal (re-render)
              │       (dep: finishModerationAction — defeated)
              │
              └──→ approve.onClick (inline arrow) ──→ ProviderEditForm (re-render)
                      (no memoization at all)
```

### Functions NOT affected

- `handleRejectClick` (deps `[]`) — only depends on stable `setRejectModal`, correctly memoized.
- `handleRejectClose` (deps `[rejectModal.isLoading]`) — correctly memoized, only changes when `isLoading` changes.

---

## Correct `useCallback` Dependencies for `finishModerationAction`

If `finishModerationAction` were wrapped in `useCallback`, its dependency array should include every value it captures from the render scope:

```
useCallback(async (formData, reviewStatus, reviewFeedback) => {
  const { updatedAt } = await saveProviderEdits(formData);
  await reviewProvider(reviewStatus, updatedAt, reviewFeedback);
  await Promise.all([
    queryClient.invalidateQueries(/* ... */),
    ...
  ]);
  toast.success(...);
  router.push(`/providers`);
}, [saveProviderEdits, reviewProvider, queryClient, providerId, router]);
```

| Dependency | Source | Stable? |
|-----------|--------|---------|
| `saveProviderEdits` | Defined at line 57 (plain function) | ❌ Recreated every render |
| `reviewProvider` | Defined at line 149 (plain function) | ❌ Recreated every render |
| `queryClient` | Hook return (`useQueryClient()`) | ✅ Stable reference |
| `providerId` | Local const (from `use(params)`) | ✅ Stable (derived from route param) |
| `router` | Hook return (`useRouter()`) | ✅ Stable reference |

**Note**: `saveProviderEdits` and `reviewProvider` are themselves plain functions recreated every render. Wrapping only `finishModerationAction` in `useCallback` would shift the instability to the dependency array — the function would still change whenever `saveProviderEdits` or `reviewProvider` changes. A complete fix requires wrapping all three functions (or using `useRef`/`useMemo` to stabilise them).

---

## Analysis Recommendations

### R1 — Wrap `finishModerationAction`, `saveProviderEdits`, and `reviewProvider` in `useCallback`

Wrap all three functions in `useCallback` with correct dependency arrays:

- `saveProviderEdits`: deps `[providerId, t]` — captures `providerId` and `t` from outer scope.
- `reviewProvider`: deps `[providerId]` — captures `providerId` only.
- `finishModerationAction`: deps `[saveProviderEdits, reviewProvider, queryClient, providerId, router]`.

This restores the memoization chain: `finishModerationAction` is stable → `handleRejectConfirm.useCallback` works correctly → `RejectModal.onConfirm` is stable → no unnecessary re-renders.

### R2 — Alternatively, stabilise sub-functions via `useRef`

To avoid wrapping every function, store `saveProviderEdits` and `reviewProvider` in refs and have `finishModerationAction` call them through the ref. This keeps `finishModerationAction`'s own deps to `[queryClient, providerId, router]` only. However, this is a more opaque pattern.

### R3 — (Optional) Memoize the `approve` handler

The inline `onClick` on line 269 should also be wrapped in `useCallback` or extracted as a named callback to prevent `ProviderEditForm` from receiving unstable props. Deps would be `[finishModerationAction]` (or whatever `finishModerationAction`'s stable shape becomes after R1/R2).

---

## Gap Tracking Table

| # | Unknown | Impact | Required Action |
|---|---------|--------|-----------------|
| G1 | Does `ProviderEditForm` use `React.memo` or `useMemo` on its props? | If not, the `approve.onClick` inline arrow (F4) causes no additional re-renders beyond the parent's own re-render. If yes, F4 adds a second source of wasted work. | Inspect `src/components/providers/ProviderEditForm.tsx` for memoization. |
| G2 | How frequently does the parent re-render in real usage? | Determines the real-world severity of the wasted re-renders. High-frequency re-renders (e.g., form state changes, localStorage sync) amplify the impact. | Profile with React DevTools on a real provider edit session. |

These gaps do not block the fix — the root cause (missing `useCallback`) is L1 Proven and the fix is well-defined.

---

## Handoff to Planner

**Gate satisfied**: Root cause identified with file + line references.

**Fix scope**:
- Wrap `finishModerationAction`, `saveProviderEdits`, and `reviewProvider` in `useCallback` with correct dependency arrays.
- Ensure `handleRejectConfirm.useCallback` deps remain `[rejectModal.formData, finishModerationAction]` — once `finishModerationAction` is stable, this `useCallback` will work correctly.
- Optionally, fix the `approve.onClick` inline arrow by extracting it to a named `useCallback` or wrapping it.
