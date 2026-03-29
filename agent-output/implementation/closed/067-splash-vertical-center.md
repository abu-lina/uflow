---
ID: 067
Origin: 067
UUID: b7f2c8a3
Status: Released
---

# Implementation — Plan 067: Splash Screen Vertical Centering (Mobile)

## Plan Reference

[agent-output/planning/067-splash-vertical-center.md](agent-output/planning/067-splash-vertical-center.md)

## Date

2026-03-28T19:49Z

## Changelog

| Date (UTC)        | Handoff              | Request            | Summary                                                                                                 |
| ----------------- | -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| 2026-03-28T19:49Z | Critic → Implementer | Implement Plan 067 | Added `flex-col` to splash/loading motion wrappers; validation run completed with two external blockers |
| 2026-03-28T22:06Z | DevOps | Document closed | Status: Committed — bundled with Plan 060 for Stage 1 release candidate v0.9.8 |

## Implementation Summary

Implemented the minimum viable fix from Plan 067 by adding `flex-col` to the two `motion.div` wrappers used for the `loading` and `splash` states in `MobileSplashScreen`.

This changes the wrappers from flex-row to flex-col containers, so `SplashLayout`'s existing `flex-1` expands on the vertical axis instead of relying on cross-axis `align-items: stretch`. The result is a more reliable viewport-height propagation chain for the first-visit splash screen, especially on Safari-class browsers where the previous nested flex-row stretch behaviour was fragile.

## Root Cause Addressed

Before the fix, both wrappers used:

- `className="flex flex-1 w-full"`

That created flex-row parents. Inside a row flex parent, `flex-1` expands width, not height, so `SplashLayout` had to rely on implicit stretch to fill height. The fix changes both to:

- `className="flex flex-1 flex-col w-full"`

This restores explicit vertical expansion and aligns the mounted render path with the pre-mount SSR render path.

## Milestones Completed

- [x] Milestone 1: Confirmed affected rendering path in `MobileSplashScreen.tsx`
- [x] Milestone 2: Added `flex-col` to both `loading` and `splash` motion wrappers
- [x] Milestone 3: Regression sweep of `AnimatePresence` branches by source inspection
- [x] Milestone 4a: `npm run type-check`
- [x] Milestone 4b: `npm test -- --run`
- [ ] Milestone 4c: `npm run lint` — blocked by pre-existing repo issue outside scope
- [ ] Milestone 4d: `npm run build` — blocked by missing required environment variable outside scope
- [ ] Milestone 5: Version and release artifacts — DevOps phase

## Files Modified

| Path                                                                                              | Changes                               | Lines |
| ------------------------------------------------------------------------------------------------- | ------------------------------------- | ----- |
| [src/components/shared/MobileSplashScreen.tsx](src/components/shared/MobileSplashScreen.tsx#L108) | Added `flex-col` to `loading` wrapper | 1     |
| [src/components/shared/MobileSplashScreen.tsx](src/components/shared/MobileSplashScreen.tsx#L122) | Added `flex-col` to `splash` wrapper  | 1     |

## Files Created

| Path                                                                                                                   | Purpose                       |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [agent-output/implementation/067-splash-vertical-center.md](agent-output/implementation/067-splash-vertical-center.md) | Implementation handoff record |

## Regression Sweep

Source inspection confirms the other `AnimatePresence` states remain structurally independent of this fix:

- `about`
- `waitlist`
- `success`
- `earlyAccess`
- `aboutFromEarlyAccess`

These states use plain `motion.div` wrappers without competing flex classes, so they are not affected by the splash/loading wrapper correction.

No other production code files were changed.

## Code Quality Validation

### Environment Preparation

The worktree initially had no `node_modules/`, so validation tools (`tsc`, `eslint`, `vitest`, `next`) were unavailable. Ran:

- `npm ci`

This installed the locked dependency set without modifying application code.

### Validation Results

| Command              | Result                                 | Notes                                                                                       |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run type-check` | ✅ Pass                                | No TypeScript errors                                                                        |
| `npm test -- --run`  | ✅ Pass                                | 65 test files passed, 1 skipped; 667 tests passed, 18 skipped                               |
| `npm run lint`       | ⚠️ Blocked by unrelated existing issue | Fails on `agent-output/qa/tmp/059-schema-negative-check.ts` not being in the TS project set |
| `npm run build`      | ⚠️ Blocked by missing env              | Fails because `NEXT_PUBLIC_SUPABASE_URL` is not set in this worktree                        |

### Lint Blocker Detail

`npm run lint` fails with a parsing error for:

- `agent-output/qa/tmp/059-schema-negative-check.ts`

Error summary:

- `parserOptions.project` includes TS project enforcement
- the file is outside the configured project set
- this is unrelated to the splash fix and predates the change

### Build Blocker Detail

`npm run build` reaches Next.js page-data collection, then fails on:

- missing `NEXT_PUBLIC_SUPABASE_URL`

This is an environment configuration issue, not a code regression from the splash fix.

## Visual Validation Status

Manual browser/device validation was not completed in this environment.

Pending QA / UAT validation:

- mobile responsive verification in browser tools
- iPhone Safari real-device check
- optional Android Chrome / PWA spot-check

## TDD Compliance

| Function/Class                       | Test File | Test Written First? | Failure Verified? | Failure Reason                                                                      | Pass After Impl? |
| ------------------------------------ | --------- | ------------------- | ----------------- | ----------------------------------------------------------------------------------- | ---------------- |
| `MobileSplashScreen` layout wrappers | N/A       | ⚠️ TDD Exception    | N/A               | CSS/Tailwind class change; viewport centering is not meaningfully testable in jsdom | N/A              |

**Exception rationale**: This change modifies two Tailwind class strings controlling layout direction. The bug is visual and browser-layout-specific, so unit tests would not provide reliable proof of correctness. Existing engineering gates and forthcoming QA/UAT device validation are the appropriate controls.

## Test Execution Evidence

| Evidence       | Result                                                       |
| -------------- | ------------------------------------------------------------ | --------------------- |
| Vitest summary | `65 passed                                                   | 1 skipped` test files |
| Vitest summary | `667 passed                                                  | 18 skipped` tests     |
| TypeScript     | clean                                                        |
| Lint           | blocked by unrelated repo artifact in `agent-output/qa/tmp/` |
| Build          | blocked by missing `NEXT_PUBLIC_SUPABASE_URL`                |

## Value Statement Validation

**Original value**: As a first-time mobile visitor arriving on the UFlow splash/onboarding screen, I want the primary content to be vertically centered in the visible viewport, so that my first impression is balanced and intentional.

**Implementation impact**: The mounted splash render now uses a column flex wrapper, allowing `SplashLayout` to consume available height on the vertical axis explicitly. This removes the fragile dependency on cross-axis stretch and directly supports the intended centered presentation.

## Outstanding Risks

1. Real-device Safari validation is still required to fully confirm the visual fix.
2. The repo-wide lint failure in `agent-output/qa/tmp/059-schema-negative-check.ts` remains and should be handled separately from this bugfix.
3. Build verification requires a valid environment file with `NEXT_PUBLIC_SUPABASE_URL`.

## Rollback

Rollback is trivial: remove `flex-col` from the two wrapper class strings in `MobileSplashScreen.tsx`.
