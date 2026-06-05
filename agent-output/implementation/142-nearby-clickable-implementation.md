---
ID: 142
Origin: 142
UUID: a3f7c2b1
Status: Active
---

# Implementation: Nearby Provider Click Navigation

## Summary

Made nearby provider list items in `ProviderDetailSections.tsx` clickable. Clicking a nearby provider now navigates to `/providers/{provider_id}`.

## Changes Made

### `src/features/providers/components/ProviderDetailSections.tsx`

| Change | Detail |
|--------|--------|
| Added `useRouter` import | `import { useRouter } from 'next/navigation'` |
| `DetailListItem` signature | Added optional `onClick?: () => void` prop |
| `DetailListItem` render | Conditionally renders `<button>` (when `onClick` provided) or `<div>` (when not) |
| `DetailListItem` className | Added `cursor-pointer` to shared className (per critique F2) |
| Router initialization | Added `const router = useRouter()` after `useLanguage()` |
| Nearby items | Added `onClick={() => router.push(`/providers/${nearby.provider_id}`)}` to nearby `DetailListItem` |

### `src/__tests__/features/providers/ProviderDetailSections.test.tsx`

| Change | Detail |
|--------|--------|
| Restructured imports | `ProviderDetailSections` imported dynamically in `beforeAll` (to work with module namespace mocking) |
| Navigation test | New `[plan-142] navigates to nearby provider page when nearby item is clicked` — uses `getByRole('button')` (per critique F1) and asserts `push` was called with correct path |
| Non-navigation test | New `[plan-142] non-navigable items do not trigger navigation` — clicks a menu item and asserts `push` was NOT called |

## TDD Compliance

| Stage | Status |
|-------|--------|
| Pre-change tests passing | ✅ All 10 existing tests passed |
| Post-change tests passing | ✅ All 12 tests pass (10 existing + 2 new) |
| TypeScript compiles | ✅ `npm run type-check` passes |

## Code Review Fixes Applied (Iteration 2)

| Finding | Severity | Fix |
|---------|----------|-----|
| `cursor-pointer` on non-interactive `<div>` elements | MEDIUM | Moved `cursor-pointer` into conditional class: `${onClick ? ' cursor-pointer' : ''}` — only interactive `<button>` elements show pointer cursor |
| Missing `type="button"` on `<button>` element | MINOR | Added `type={Component === 'button' ? 'button' : undefined}` to the rendered component |
| Inconsistent `useRouter` mock style | MINOR | Changed plain arrow `() => ({...})` to `vi.fn(() => ({...}))` for consistency |

## Test Evidence

```
✓ src/__tests__/features/providers/ProviderDetailSections.test.tsx (12 tests)

Test Files  1 passed (1)
     Tests  12 passed (12)
```

## Critique Findings Addressed

| Finding | Severity | Applied |
|---------|----------|---------|
| F1: Use `getByRole('button', ...)` instead of `getByText()` | MINOR | ✅ Navigation test uses `screen.getByRole('button', { name: 'Restaurant A' })` |
| F2: Add `cursor-pointer` to className | MINOR | ✅ Added `cursor-pointer` to shared `DetailListItem` className |

## Key Technical Detail

The test needed to assert `router.push` was called with the correct path. However, the setup file (`setup.ts`) and test utilities (`test-utils.tsx`) both register `vi.mock('next/navigation', ...)` which creates a new `push` mock per `useRouter()` call. To intercept the component's `router.push`, the test dynamically imports `next/navigation` and replaces `useRouter` on the module namespace (which propagates via live bindings in Vitest's mocked module system).
