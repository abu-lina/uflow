---
ID: 134
Origin: 134
UUID: 134
Status: Active
---

# Code Review 134 — Missing `useCallback` on `finishModerationAction`

**Reviewer**: Code Reviewer subagent
**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`
**Plan**: 134

---

## Summary

Five edits applied to restore the memoization chain in `AdminProviderEditPage`:
1. Wrap `saveProviderEdits` in `useCallback` with deps `[providerId, t]`
2. Wrap `reviewProvider` in `useCallback` with deps `[providerId]`
3. Wrap `finishModerationAction` in `useCallback` with deps `[saveProviderEdits, reviewProvider, queryClient, providerId, router]`
4. (No-op) `handleRejectConfirm` deps unchanged — now works correctly with stable `finishModerationAction`
5. Extract `handleApproveConfirm` as a named `useCallback` and replace inline arrow in `approve.onClick`

No QA report exists at `agent-output/qa/134-qa.md`.

---

## Checklist Results

### Correctness

| Item | Result | Notes |
|------|--------|-------|
| Dep arrays include all captured render-scope values | ✅ PASS | `saveProviderEdits`: captures `providerId`, `t` ✅. `reviewProvider`: captures `providerId` only ✅. `finishModerationAction`: captures `saveProviderEdits`, `reviewProvider`, `queryClient`, `providerId`, `router` ✅. `handleApproveConfirm`: captures `finishModerationAction` ✅. |
| Any stale closure risk? | ✅ PASS | `handleRejectConfirm` captures `rejectModal.formData` via dep — correct (new value on modal open → new callback → no stale access). All other captured values (`t`, `providerId`, `queryClient`, `router`) are either stable references or derive from `use(params)` (stable per mount). |
| `normaliseProviderImages` inner function safe? | ✅ PASS | Defined inside `saveProviderEdits` body, captures no outer scope — only its `rawImages` parameter. Recreated on each call (desired). |
| Hook call order invariant | ✅ PASS | `saveProviderEdits` → `reviewProvider` → `finishModerationAction` → `handleRejectClick` → `handleRejectConfirm` → `handleRejectClose` → `handleApproveConfirm`. All hooks before any early return. Deterministic count. |

### Performance

| Item | Result | Notes |
|------|--------|-------|
| Memoization chain restored? | ✅ PASS | `finishModerationAction` is now stable → `handleRejectConfirm.useCallback` works → `RejectModal.onConfirm` stable → no unnecessary re-renders. |
| Any new unnecessary work? | ✅ PASS | `saveProviderEdits` recreates on language switch (`t` changes) — correct and negligible (infrequent event). No new computation introduced. |
| Inline arrow removed? | ✅ PASS | `approve.onClick` now references memoized `handleApproveConfirm` instead of inline arrow. |

### Code Style

| Item | Result | Notes |
|------|--------|-------|
| Matches project conventions? | ✅ PASS | `useCallback` was already imported (line 3). Wrapping pattern matches existing usage (`handleRejectClick`, `handleRejectConfirm`, etc.). |
| Lucide/Iconify used instead of emojis? | ✅ PASS | No emojis introduced. |
| Path aliases (`@/`) used? | ✅ PASS | Existing imports untouched. |
| Comments preserve project style? | ✅ PASS | Existing `Plan 073 M1` comment preserved. No new comments added. |

### Type Safety

| Item | Result | Notes |
|------|--------|-------|
| TypeScript compiles cleanly? | ✅ PASS | `tsc --noEmit` — exit 0, zero errors (per implementation report). |
| Any `as` casts or `any` introduced? | ✅ PASS | No new type assertions. No `any` usage. The pre-existing `as { data?: { updated_at?: string } }` on line 138 is unchanged. |
| Signature compatibility? | ✅ PASS | `handleApproveConfirm: (formData: ProviderEditFormData) => Promise<void>` matches the expected `onClick` type. `handleRejectConfirm` signatures unchanged. |

### Regression Risk

| Item | Result | Notes |
|------|--------|-------|
| Could callbacks fail if `providerId` changes? | ✅ PASS | `providerId` is from `use(params)` — component remounts on param change, all callbacks are fresh. |
| Could callbacks fail if `t` changes? | ✅ PASS | `saveProviderEdits` deps include `t` — new callback created with correct `t` on language switch. |
| `reviewProvider` error handling stale? | ✅ PASS | Error message uses function parameter `reviewStatus`, not captured scope. ✅. |
| Rapid clicks / double submission? | ⚠️ PRE-EXISTING | No debouncing on approve/reject callbacks — pre-existing behavior, not introduced by this fix. |
| `reviewFooterActions` prop shape change? | ✅ PASS | Same shape (`{ reject: {...}, approve: {...} }`), only `onClick` value changed from inline arrow to named reference. |

---

## Verdict

**APPROVED**

The fix is clean, correct, and well-scoped. All five edits match the plan exactly. The memoization chain is restored: `finishModerationAction` is now stable, `handleRejectConfirm`'s `useCallback` works as intended, and `<RejectModal>` will no longer re-render unnecessarily. TypeScript and lint both pass with zero errors. No behavioral change — pure performance optimization.

### Minor observations (non-blocking)

1. **`reviewProvider` error strings use hardcoded English** (line 164: `'This provider was modified by another reviewer. Please refresh.'`). Pre-existing — not part of this fix, and consistent with the `finishModerationAction` success message pattern (line 187).
2. **No test file exists** for this page. The implementation report correctly notes this is a pure refactor exempt from TDD requirements. A follow-up could add render tests with mocked hooks to prevent regression, but outside this PR's scope.
