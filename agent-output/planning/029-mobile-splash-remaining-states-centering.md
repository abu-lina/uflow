---
ID: 029
Origin: 029
UUID: b7e4a1c3
Status: UAT Approved
---

# Plan 029 — Fix Vertical Centering for Remaining MobileSplashScreen States

## Plan Header

- **Target Release**: v0.6.10 (patch, bundled with Plan 028)
- **Epic Alignment**: Landing / Onboarding entry experience
- **Status**: UAT Approved
- **Related Issues**: Plan 028 Code Review Finding #2 (minor inconsistency)
- **Parent Plan**: 028 (continuation — same root cause)

### Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-03-01 | uat | Status: UAT Approved | Implementation delivers 100% of value statement; all onboarding screens vertically centered on iPhone Safari; ready for DevOps Stage 1 commit |
| 2026-03-01 | code-reviewer | Status: Code Review Approved; Root cause refined: `min-h-full` vs `h-full` | Implementation discovered that `h-full` fails in flex-sized parents on iOS Safari; changed to `min-h-full` pattern matching SplashLayout |
|---|---|---|---|
| 2026-02-28 | implementer | Scope expanded: child screens need flex-1 | Wrapper fix alone insufficient; child components relied on `h-full` which does not fill a `flex-1` parent reliably; add `flex-1` to child root containers |
| 2026-02-28 | planner | Created plan | Continuation of Plan 028: fix remaining MobileSplashScreen states missing flex-1 wrappers |

## Value Statement and Business Objective

As a **mobile visitor** progressing through the onboarding flow,
I want **every screen (about, waitlist, success, early access) to be vertically centered**,
so that the **experience feels visually consistent and polished** from first impression through completion.

## Objective

Ensure all remaining onboarding states are vertically centered by:
1) adding `className="flex flex-1 w-full"` to the remaining `motion.div` wrappers in `MobileSplashScreen`, and
2) ensuring child state screens fill the available height by using `flex-1` on their root containers.

## Context

Plan 028 fixed vertical centering for the `splash` and `loading` states by adding `className="flex flex-1 w-full"` to their `motion.div` wrappers. The Code Review for Plan 028 explicitly flagged that the other states (`about`, `waitlist`, `success`, `earlyAccess`, `aboutFromEarlyAccess`) were not updated — documented as a minor inconsistency finding.

User confirmed on local dev server (with Plan 028 applied) that the "Willkommen bei Ummah Flow" screen (the `about` state) is still not vertically centered.

Update (confirmed during follow-up): the screenshot state is actually `earlyAccess` (`EarlyAccessScreen`) — the "Meine Stadt auswählen" CTA is rendered there.

## Root Cause (Proven — continuation of Plan 028)

This is the same class of issue as Plan 028: **height must propagate through the flex chain**.

Two contributing gaps were identified:
1) Some `motion.div` wrappers did not participate in flex layout (missing `flex-1`), so they collapsed to content height.
2) Several child screens (`WaitlistScreen`, `WaitlistSuccessScreen`, `EarlyAccessScreen`) rely on `h-full` for centering. In practice, `h-full` does **not** reliably fill a parent whose height is determined by flex sizing (`flex-1`). The child root container must also opt into flex sizing (`flex-1`) to fill available space.

**Flex-1 propagation chain** (established by Plan 028):
```
RootClientLayout: h-screen-fix flex flex-col
  └─ main: flex flex-1 flex-col overflow-y-auto
      └─ PageTransition: flex flex-1 flex-col
          └─ RootPageContent: flex flex-1 flex-col md:hidden  ← Plan 028
              └─ motion.div: flex flex-1 w-full              ← Plan 028 (splash/loading only)
                  └─ Child component centering
```

The remaining problematic states break the chain at the `motion.div` level and/or within child screen root containers.

## Changes Required

### File: `src/components/shared/MobileSplashScreen.tsx`

**Single change pattern** applied to 5 `motion.div` wrappers:

| State | Line | Current | After |
|---|---|---|---|
| `about` | ~136 | `<motion.div key="about" ...>` (no className) | Add `className="flex flex-1 w-full"` |
| `waitlist` | ~147 | `<motion.div key="waitlist" ...>` (no className) | Add `className="flex flex-1 w-full"` |
| `success` | ~167 | `<motion.div key="success" ...>` (no className) | Add `className="flex flex-1 w-full"` |
| `earlyAccess` | ~182 | `<motion.div key="earlyAccess" ...>` (no className) | Add `className="flex flex-1 w-full"` |
| `aboutFromEarlyAccess` | ~192 | `<motion.div key="aboutFromEarlyAccess" ...>` (no className) | Add `className="flex flex-1 w-full"` |

### Child Components: ensure root containers fill available height

These screens already use `items-center justify-center`, but their root containers rely on `h-full`, which does not reliably fill a flex-sized parent. Add `flex-1` to the root container className so the child fills available height.

Files impacted:

- `src/components/shared/EarlyAccessScreen.tsx`
- `src/components/shared/WaitlistScreen.tsx`
- `src/components/shared/WaitlistSuccessScreen.tsx`

| Child Component | Centering Strategy | Why flex-1 parent fixes it |
|---|---|---|
| `AboutPageContent` | `PageLayout` (flex-1) + `PageContentWrapper` (flex-1 justify-center items-center) | flex-1 on parent gives PageLayout height to fill |
| `WaitlistScreen` | `h-full items-center justify-center` | Add `flex-1` so the root container fills flex-sized parent |
| `WaitlistSuccessScreen` | `h-full items-center justify-center` | Add `flex-1` so the root container fills flex-sized parent |
| `EarlyAccessScreen` | `h-full items-center justify-center` | Add `flex-1` so the root container fills flex-sized parent |

## Risk Assessment

- **Risk Level**: Very Low
- **Scope**: 4 files (MobileSplashScreen wrapper consistency + 3 child screen root containers)
- **Pattern**: Already proven by Plan 028 (splash/loading states work correctly)
- **Regression Risk**: None — adding flex-1 to a flex parent is additive; existing content layout unchanged
- **Desktop Impact**: None — changes are inside `MobileSplashScreen` which only renders in the mobile (`md:hidden`) branch

## Acceptance Criteria

1. ✅ All 5 remaining `motion.div` wrappers have `className="flex flex-1 w-full"`
2. ✅ `EarlyAccessScreen` ("Willkommen bei Ummah Flow" + "Meine Stadt auswählen") is vertically centered on iPhone Safari
3. ✅ Waitlist and success screens are vertically centered
4. ✅ No regression on splash/loading screens (Plan 028 fix preserved)
5. ✅ Automated gates pass (type-check, lint, tests, build)

## Duration Estimate

- Implementation: 10–15 minutes (wrapper additions + child root container flex-1)
- Code Review: 5 minutes
- QA: 10 minutes (automated gates + device validation)
- **Total**: ~25–35 minutes

## Pipeline

Abbreviated (root cause proven, Critic skipped):
1. ~~Analyst~~ (skipped — root cause from Plan 028)
2. ~~Critic~~ (skipped — pattern already proven)
3. **Planner** ← current
4. Implementer
5. Code Reviewer
6. QA (automated gates + iPhone Safari device validation)
7. DevOps Stage 1 (commit into v0.6.10 bundle with Plan 028)
