# Plan 135 — Fix `useScrollDirection` re-render storm

**Planner**: opencode Planner subagent
**Date**: 2026-06-03
**Status**: Active
**Pipeline**: Bugfix

---

## Summary

Replace `useState`-backed `lastScrollY` with a `let` variable inside `useEffect` scope to eliminate O(scroll-pixel) re-render + listener churn. Pattern matches `useScrollHeader.ts:93`.

---

## Source

`src/hooks/useScrollDirection.ts` — 31 lines, `'use client'` hook returning `{ isVisible }`.

---

## Changes

All edits in `src/hooks/useScrollDirection.ts`.

### 1. Import fix (line 3)

| Before | After |
|--------|-------|
| `import { useEffect, useState } from 'react';` | `import { useEffect } from 'react';` |

Remove `useState` — no longer used.

### 2. Replace state with `let` (remove line 7, add inside effect)

**Remove** (line 7):
```ts
const [lastScrollY, setLastScrollY] = useState(0);
```

**Add** inside `useEffect` callback, before `handleScroll`:
```ts
let lastScrollY = 0;
```

### 3. Dependency array (line 28)

| Before | After |
|--------|-------|
| `}, [lastScrollY]);` | `}, []);` |

Empty deps → effect runs once on mount. Cleanup runs once on unmount. No re-render cascade.

---

## Lines affected

| Line | Operation |
|------|-----------|
| 3 | Edit import |
| 7 | Delete line |
| 28 | Change `[lastScrollY]` → `[]` |

No changes to lines 16, 19, 23 — `handleScroll` reads/writes `lastScrollY` via closure, unchanged.

---

## Verification

1. `useScrollDirection` returns `{ isVisible }` — API unchanged
2. Scroll direction detection unchanged
3. No re-renders on scroll (React DevTools profiler or `console.log` in render body)
4. `addEventListener` called exactly once per mount

---

## Dependencies

None. Single-file, no new imports, no type changes.

---

## Edge cases

- `handleScroll` closure captures `let lastScrollY` — mutates the same binding on each invocation. Identical to `useScrollHeader.ts:93` pattern. Correct.
- `threshold` (64px) logic untouched.
- `isVisible` state remains React state for consumer re-renders — correct.
