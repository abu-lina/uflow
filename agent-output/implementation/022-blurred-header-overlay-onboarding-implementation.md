---
ID: 022
Origin: 022
UUID: c4a1f7d2
Status: Active
---

# Implementation — Plan 022: Remove Blurred Header Overlay on Onboarding Slide 1

## Plan Reference

- Plan: `../planning/022-blurred-header-overlay-onboarding-plan.md`
- Analysis: `../analysis/closed/022-blurred-header-overlay-onboarding-analysis.md`
- Critique: `../critiques/022-blurred-header-overlay-onboarding-critique.md`

## Date

2026-02-24

## Change Log

| Date       | Handoff               | Request            | Summary                                                                                                               |
| ---------- | --------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 2026-02-24 | Planner → Implementer | Implement Plan 022 | Removed frosted header overlay on onboarding About screen by conditionally skipping PageHeader render in splash mode. |

## Implementation Summary

**What**: Removed the blurred/frosted header overlay on the onboarding "About" screen (map illustration slide) by conditionally skipping the `PageHeader` + `HeaderSpacer` render when `showSplashHeader=true`.

**How this delivers value**: The map illustration is no longer obscured by a frosted header region on iPhone Safari, meeting AC1. The language switcher remains accessible via its portal, and no changes were made to `PageHeader` itself, meeting AC2 (no regression to other pages).

## Milestones Completed

- [x] **Milestone 1**: Reproduction confirmation — Analysis 022 identified the root cause: `AboutPageContent` always rendered a fixed `PageHeader` even in splash mode, and the scroll-triggered blur was overlaying the `MapIllustration`.
- [x] **Milestone 2**: Selected smallest/safest fix — Conditionally skip `PageHeader`/`HeaderSpacer` when `showSplashHeader=true`. This is localized to `AboutPageContent` and does not change `PageHeader` defaults.
- [x] **Milestone 3**: Regression sweep — Change is localized to onboarding; `PageHeader` behavior on all other pages is unchanged.
- [x] **Milestone 4**: Version bump + CHANGELOG — `package.json` → v0.6.9, CHANGELOG entry added.

## Files Modified

| Path                                         | Changes                                                                         | Lines Changed |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| `src/components/shared/AboutPageContent.tsx` | Wrapped `PageHeader`/`HeaderSpacer` in conditional `{!showSplashHeader && ...}` | ~15 lines     |
| `package.json`                               | Version 0.6.8 → 0.6.9                                                           | 1 line        |
| `CHANGELOG.md`                               | Added v0.6.9 entry for Plan 022                                                 | ~12 lines     |

## Files Created

None.

## Code Quality Validation

- [x] `npm run type-check` — **PASS** (no errors)
- [x] `npm test -- --run` — **PASS** (163 passed, 18 skipped)
- [x] `npm run build` — **PASS** (production build completed)

## Value Statement Validation

| Original Value Statement                                                                                                                                                                                                                          | Implementation Delivers                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| As a new mobile user (iPhone Safari), I want the onboarding slide with the map illustration to display without a blurred/frosted header overlay, so that content isn't obscured and the onboarding experience feels high-quality and trustworthy. | The `PageHeader` (including its scroll-triggered blur) is no longer rendered on the onboarding About screen when `showSplashHeader=true`. The map illustration is fully visible without any frosted overlay. |

## TDD Compliance

| Function/Class                  | Test File | Test Written First?             | Failure Verified? | Failure Reason                                                   | Pass After Impl? |
| ------------------------------- | --------- | ------------------------------- | ----------------- | ---------------------------------------------------------------- | ---------------- |
| N/A (conditional render change) | N/A       | ⚠️ Post-fix (CSS/layout bugfix) | N/A               | No new functions/classes; change is purely conditional rendering | N/A              |

**Note**: This is a CSS/layout bugfix with no new API surface. The fix removes a render path rather than adding new logic. Regression is guarded by visual UAT on iPhone Safari as specified in the plan's Testing Strategy.

## Test Coverage

- **Unit/integration**: No new tests required (change is conditional rendering; no new functions/classes).
- **Visual validation**: Requires real-device iPhone Safari check on onboarding About screen (deferred to UAT phase).

## Test Execution Results

```
npm run type-check → PASS
npm test -- --run → 163 passed, 18 skipped
npm run build → PASS (production build)
```

## Outstanding Items

- **Deferred**: Real-device iPhone Safari visual validation (UAT responsibility).

## Open Questions Resolved

| Question                                                                       | Resolution                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is the screenshot from the onboarding "About" screen?                          | Yes — Analysis 022 traced the component tree: `MobileSplashScreen` → `AboutPageContent` → `AboutCard` (cardIndex=0) → `MapIllustration`.                                               |
| Should onboarding have no header at all, or a transparent non-blurring header? | Chose "no header" — the only functional element (language switcher) is already rendered via portal to `document.body`, so removing the empty `PageHeader` is the simplest correct fix. |

## Next Steps

1. **QA**: Run automated gates (already passed above) and confirm no test regressions.
2. **UAT**: Visual validation on iPhone Safari (real device preferred) to confirm map illustration is no longer obscured.
3. **DevOps**: Commit, tag v0.6.9, push, smoke test.
