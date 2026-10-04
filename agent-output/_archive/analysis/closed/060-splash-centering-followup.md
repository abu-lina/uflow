---
ID: 060
Origin: 067
UUID: d4e8f1a2
Status: Planned
---

# Analysis 060 — Splash Vertical Centering: Follow-Up Investigation

## Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-03-28T20:53Z | analyst | Created | User reports centering "still wrong" after flex-col fix; thorough POC investigation |
| 2026-03-28T21:15Z | analyst | Revised root cause | Screenshot shows About screen (about state), not Splash — motion.div wrapper missing flex classes |
| 2026-03-28T21:22Z | planner | Status: Planned | Follow-up plan created to repair remaining onboarding states and bundle with active Plan 067 |

## Value Statement and Business Objective

As a **first-time mobile visitor** arriving on the splash/onboarding entry,
I expect the content to be **vertically centered in the viewport**, not shifted toward the top,
so that the landing experience feels balanced.

## Objective

Determine whether the `flex-col` fix from Plan 067 implementation is working, and if so, identify what residual issues cause the user to perceive the centering as "still wrong."

## Context

- Plan 067 added `flex-col` to two `motion.div` wrappers in `MobileSplashScreen.tsx`.
- QA phase passed: type-check, tests, delta lint all clean.
- User reports the fix is "still wrong" — centering not visually correct.

## Methodology

1. Static code trace of the complete flex-1 chain (8 levels from root to content).
2. **User screenshot analysis** — the screenshot shows a map illustration with "Where do I find Muslim providers?" and "Continue" button. This is the **About** screen (`currentState === 'about'`), NOT the Splash screen.
3. Cross-referenced motion.div wrapper classes across all `currentState` branches in `MobileSplashScreen.tsx`.
4. Identified that Plan 067 only fixed `loading` and `splash` states, leaving 5 other states unfixed.

## Findings

### 1. User's Screenshot Shows the `about` State, NOT the `splash` State (VERIFIED)

The screenshot content:
- Map illustration with location pins = `AboutCard` component (from `AboutPageContent`)
- "Where do I find Muslim providers?" = About screen title (translation key from About cards)
- "Many Muslim offers remain invisible – even in our own city." = About screen description
- "Continue" button = About screen CTA
- "EN" language switcher = Portal from SplashLayout or AboutPageContent

This is NOT the SplashContent (which shows Bismillah calligraphy + Logo + `splash.title`). The user has navigated past the splash screen to the `about` state.

### 2. Plan 067 Only Fixed 2 of 7 motion.div Wrappers (VERIFIED — Root Cause)

In `MobileSplashScreen.tsx`, the AnimatePresence contains 7 state branches. Plan 067 added `className="flex w-full flex-1 flex-col"` only to `loading` and `splash`:

| State | motion.div className | flex-1? | flex-col? | Status |
|-------|---------------------|---------|-----------|--------|
| `loading` | `"flex w-full flex-1 flex-col"` | ✅ | ✅ | Fixed (Plan 067) |
| `splash` | `"flex w-full flex-1 flex-col"` | ✅ | ✅ | Fixed (Plan 067) |
| `about` | *(none — only opacity animation)* | ❌ | ❌ | **BROKEN** |
| `waitlist` | *(none)* | ❌ | ❌ | **BROKEN** |
| `success` | *(none)* | ❌ | ❌ | **BROKEN** |
| `earlyAccess` | *(none)* | ❌ | ❌ | **BROKEN** |
| `aboutFromEarlyAccess` | *(none)* | ❌ | ❌ | **BROKEN** |

Without `flex w-full flex-1 flex-col`, the motion.div defaults to `display: block` and collapses to its content height. The content sits at the top of its parent with the remaining viewport space empty below — exactly matching the user's screenshot.

### 3. Pre-mount Render Also Lacks Wrapper (VERIFIED — Secondary Issue)

The pre-mount render path (lines 95-100) returns SplashLayout directly without a motion.div wrapper:
```tsx
if (!isMounted || !isInitialized) {
  return (
    <SplashLayout onContinue={handleContinue}>
      <SplashContent />
    </SplashLayout>
  );
}
```
This path inherits flex-1 from the parent mobile wrapper, so centering DOES work here. Not the issue for the user's screenshot.

### 4. Previous Analysis 067 Footer Offset Is a Secondary Issue (VERIFIED)

The 45px footer offset (~22px from viewport center) documented in Analysis 067 and deferred in Plan 067 Decision D3 is real but minor. The PRIMARY issue the user is seeing is the complete absence of flex-1 on the `about` state's motion.div, causing content to sit at the top with ~45% empty space below.

## Root Cause Summary

| Issue | Status | Severity |
|-------|--------|----------|
| motion.div wrapper missing `flex w-full flex-1 flex-col` on `about` state | ❌ NOT FIXED | **P0 — Content at top, not centered** |
| motion.div wrapper missing flex classes on `waitlist` state | ❌ NOT FIXED | P1 — Same layout break |
| motion.div wrapper missing flex classes on `success` state | ❌ NOT FIXED | P1 — Same layout break |
| motion.div wrapper missing flex classes on `earlyAccess` state | ❌ NOT FIXED | P1 — Same layout break |
| motion.div wrapper missing flex classes on `aboutFromEarlyAccess` state | ❌ NOT FIXED | P1 — Same layout break |
| Footer shifts visual center up by ~22px | Deferred (D3) | P2 — Cosmetic |

## System Weaknesses

### Code

| Weakness | Risk Mechanism | Detection |
|----------|---------------|-----------|
| Inconsistent motion.div class application across AnimatePresence states | Easy to fix 2 states and miss 5 others; code review didn't catch the gap | grep for `className=` across all motion.div elements in same AnimatePresence block |
| No shared wrapper component for AnimatePresence states | Each state hand-rolls its own motion.div with different classes | Extract common flex wrapper |

### Process

| Weakness | Risk Mechanism | Detection |
|----------|---------------|-----------|
| Analysis 067 focused on SplashLayout centering, not all states | The user said "splash centering" so investigation only checked splash state | Ask user which screen they're seeing; check ALL state branches |
| Plan 067 only modified the states identified in analysis | Analysis didn't enumerate all states → plan didn't fix them all | Require enumeration of all affected code paths in analysis |

## Analysis Recommendations (Next Steps)

1. **Fix all 5 remaining motion.div wrappers**: Add `className="flex w-full flex-1 flex-col"` to the `about`, `waitlist`, `success`, `earlyAccess`, and `aboutFromEarlyAccess` states in `MobileSplashScreen.tsx`.

2. **Verify each screen's own centering/layout**: Some components (e.g., `AboutPageContent`) may handle their own centering internally. The `flex-1 flex-col` ensures the motion.div fills available height; the child component decides how to use that space.

3. **Consider extracting a shared wrapper**: Instead of repeating `className="flex w-full flex-1 flex-col"` on every motion.div, extract a helper or apply the class pattern consistently.

## File Reference

| File | Role | Lines of Interest |
|------|------|-------------------|
| `src/components/shared/MobileSplashScreen.tsx` | AnimatePresence state machine | L108-200: All 7 state branches |
| `src/components/shared/AboutPageContent.tsx` | About screen content (map illustration) | All — the screen shown in user's screenshot |

## Open Questions

1. ~~Does the user consider the ~22px footer offset as "still wrong"?~~ **Resolved**: The user is seeing the `about` state, not the splash state. The issue is the missing flex classes.
2. Does `AboutPageContent` handle its own vertical centering internally, or does it rely on the parent providing full height via flex-1?
