---
ID: 135
Origin: 135
UUID: a3f7c2b1
Status: Active
---

# Implementation 135 — Fix `useScrollDirection` re-render storm

## Edits applied

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/useScrollDirection.ts:3` | Keep `useState` in import (still needed for `isVisible`) |
| 2a | line 7→8 | Remove `const [lastScrollY, setLastScrollY] = useState(0)` |
| 2b | line 23→22 | Replace `setLastScrollY(currentScrollY)` → `lastScrollY = currentScrollY` |
| 2c | inside effect, before `handleScroll` | Add `let lastScrollY = 0;` |
| 3 | line 28→27 | Change `[lastScrollY]` → `[]` |

Result: 30 lines (was 31), no `lastScrollY` state, effect runs once on mount, scroll handler reads/writes closure-scoped `let`.

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Passed (0 errors) |
| `npx eslint ... --fix` | ✅ Passed (0 warnings) |

## TDD Compliance

This is a bugfix pipeline task (replacing state with `let` inside existing hook). No behavioral change — `{ isVisible }` API unchanged. Existing tests cover the contract. No new tests required per plan spec.
