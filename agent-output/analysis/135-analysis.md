# Plan 135 — Bugfix Analysis: `useScrollDirection` re-render storm

**Analyst**: opencode Analyst subagent  
**Date**: 2026-06-03  
**Confidence**: HIGH (95%)

---

## Findings

| # | Finding | Confidence | Evidence |
|---|---------|------------|----------|
| 1 | `lastScrollY` declared as `useState(0)` on every render | HIGH | `src/hooks/useScrollDirection.ts:7` |
| 2 | `setLastScrollY(currentScrollY)` called each scroll event | HIGH | line 23 — unconditional update |
| 3 | `lastScrollY` in `useEffect` dependency array forces cleanup/re-run | HIGH | line 28 — `[lastScrollY]` triggers effect re-execution on every change |
| 4 | Effect cleanup calls `removeEventListener`; re-run calls `addEventListener` | HIGH | lines 26-27 |
| 5 | This produces O(scroll-pixel) listener churn | HIGH | every `scroll` → state update → re-render → effect teardown → effect setup |
| 6 | `useScrollHeader.ts:93` uses `let lastScrollY = 0` inside effect (no state) | HIGH | confirmed pattern in codebase |

---

## Root cause trace

```
useScrollDirection mount
  → listener attached, lastScrollY state = 0
  → user scrolls
    → handleScroll fires
      → setLastScrollY(currentScrollY)          # state mutation
        → component re-renders
          → useEffect deps diff [0 → N]
            → cleanup: removeEventListener
            → effect body: addEventListener
              → next scroll repeats cycle
```

Every single `scroll` event tears down and re-creates the listener. The `lastScrollY` state variable is **only ever read inside the effect closure** — it has no reason to be React state. It is purely a scratch variable for scroll-direction comparison.

---

## Affected lines

| Line | Current | Problem |
|------|---------|---------|
| 3 | `import { ..., useState }` | `useState` unused after fix |
| 7 | `const [lastScrollY, setLastScrollY] = useState(0)` | state causes re-render |
| 16 | `} else if (currentScrollY > lastScrollY) {` | reads stale value from closure? No — this is inside effect so a `let` works |
| 19 | `} else if (currentScrollY < lastScrollY) {` | same as above |
| 23 | `setLastScrollY(currentScrollY)` | triggers state cascade |
| 28 | `}, [lastScrollY]);` | dependency forces re-execution |

---

## Recommendation

Replace `useState` with a `let` variable inside the effect scope — identical pattern to `useScrollHeader.ts:93`. This avoids `useRef` overhead and keeps the variable scoped to where it's used.

**Required changes**:
1. Line 3: remove `useState` from import
2. Remove line 7 entirely
3. Inside `useEffect`, before `handleScroll`: add `let lastScrollY = 0;`
4. Line 28: change dependency array to `[]`
5. Lines 16, 19, 23: no change needed (they reference the closure `lastScrollY`)

The fix eliminates: re-renders from scroll, listener churn, and the stale closure category of bugs. Zero behavioral change. ~50 bytes removed. Performance: infinite scroll events now cost O(1) DOM/React work instead of O(n).

**Edge case**: `handleScroll` reads `lastScrollY` from closure. Since the effect only runs once (`[]`), the closure captures the `let` variable, and each scroll invocation reads/writes the same binding. This is identical to how `useScrollHeader.ts:93` works and is correct.

---

## Gap table

| Gap | Severity | Notes |
|-----|----------|-------|
| None identified | — | The bug is isolated, pattern is well-established in the same file, fix is mechanical |

---

## Verification criteria

1. `useScrollDirection` returns `{ isVisible }` — unchanged API
2. Scroll direction detection works identically before/after
3. No re-renders on scroll (verify via React DevTools profiler or `console.log` in render body)
4. `addEventListener` called exactly once per mount (verify via wrapper or breakpoint)
