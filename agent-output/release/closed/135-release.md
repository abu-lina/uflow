---
ID: 135
Origin: 135
UUID: a3f7c2b1
Status: Stage 1 Complete
---

# Release 135 — `useScrollDirection` re-render storm fix

**Changelog**
| Rev | Date | Author | Summary |
|-----|------|--------|---------|
| 0.1 | 2026-06-03 | DevOps | Stage 1 local commit only — no push/deploy |

---

## Stage 1 — Local Commit

| Item | Detail |
|------|--------|
| **Commit SHA** | `95e99789` |
| **Branch** | `main` |
| **Commit message** | `fix(hooks): replace lastScrollY useState with closure let in useScrollDirection (#135)` |
| **Stage** | 1 (local commit only) |
| **Push** | ❌ Skipped — Stage 1 only per pipeline instructions |

### Files Committed

| File | Status |
|------|--------|
| `src/hooks/useScrollDirection.ts` | Modified (state→closure let, deps→`[]`) |
| `agent-output/analysis/135-analysis.md` | Created |
| `agent-output/planning/135-plan.md` | Created |
| `agent-output/implementation/135-implementation.md` | Created |
| `agent-output/review/135-review.md` | Created |
| `agent-output/qa/135-qa.md` | Created |

---

## Summary

Replaced `useState`-backed `lastScrollY` with a `let` variable scoped inside `useEffect`, matching the established pattern in `useScrollHeader.ts:93`. Eliminates O(scroll-pixel) re-render storm and listener churn.

**Changes applied:**
1. Removed `const [lastScrollY, setLastScrollY] = useState(0)` state variable
2. Added `let lastScrollY = 0` inside effect, before `handleScroll`
3. Replaced `setLastScrollY(currentScrollY)` → `lastScrollY = currentScrollY`
4. Changed dependency array `[lastScrollY]` → `[]`

All verification checks pass: tests (1,274/1,274 ✓), type-check (zero errors), lint (zero warnings).
