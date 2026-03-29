---
ID: 060
Origin: 067
UUID: d4e8f1a2
Status: Released
---

# Plan 060 — Onboarding Remaining State Centering Follow-Up

## Plan Header

- **Target Release**: v0.9.8
- **Epic Alignment**: Landing / onboarding entry experience — preserve a balanced, trustworthy first-run mobile flow from splash through onboarding progression
- **Status**: Released in v0.9.8
- **Related Issues**: None

### Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-03-28T21:22Z | planner | Created from Analysis 060 | User screenshot and follow-up analysis prove the remaining top-alignment bug is in non-splash onboarding states |
| 2026-03-28T21:34Z | implementer | Status → In Progress | Implementation started after APPROVED critique |
| 2026-03-28T22:00Z | code-reviewer | Status → Code Review Approved | APPROVED — no findings; all gates passed |
| 2026-03-28T22:07Z | qa | Status → QA Complete | Automated gates passed; manual browser/device validation deferred to UAT |
| 2026-03-28T22:15Z | uat | Status → UAT Approved | CONDITIONAL APPROVAL — value delivery confirmed; DF-01 manual device validation deferred to DevOps smoke test |
| 2026-03-28T22:06Z | devops | Status → Committed | Stage 1 bundle commit prepared for release v0.9.8; DF-01 remains a Stage 2 blocker before tag/push |

## Value Statement and Business Objective

As a **mobile visitor progressing through onboarding**, I want **every onboarding state after the initial splash to remain vertically centered in the viewport**, so that the **first-run experience feels deliberate, stable, and trustworthy instead of visually broken after I continue past the opening screen**.

## Objective

Correct the top-aligned layout regression affecting the remaining `MobileSplashScreen` states after Plan 067, while keeping the fix minimal, preserving the existing onboarding flow structure, and avoiding unrelated layout refactors.

## Context

Analysis 060 confirms that the user-reported screenshot is not the splash screen. It is the `about` onboarding state rendered after the visitor advances past the initial splash CTA. That distinction changes the root cause materially:

1. Plan 067 fixed only the `loading` and `splash` `motion.div` wrappers by adding `flex-col`.
2. The `about`, `waitlist`, `success`, `earlyAccess`, and `aboutFromEarlyAccess` wrappers still render as plain block-level `motion.div` elements with no `flex`, `flex-1`, or `flex-col` participation.
3. Once the user transitions into those states, the flex height propagation chain breaks at the wrapper layer, so the child screen collapses to content height and sits at the top of the viewport.

This is a follow-up to the current active Plan 067 and also mirrors the already-released historical fix pattern captured in Plan 029 (`v0.6.10`), where remaining onboarding states required the same structural correction after the initial splash-only fix proved incomplete.

Roadmap alignment remains straightforward: this is a high-value, low-risk onboarding polish fix serving the Master Product Objective by preventing a visibly broken first-run mobile experience.

Architecture alignment remains within the existing Next.js client-side onboarding flow:

- `RootClientLayout` defines the viewport-height shell and mobile main content area.
- `PageTransition` and `RootPageContent` provide the height propagation chain.
- `MobileSplashScreen` is the state machine boundary where the regression occurs.

No backend, auth, data, deployment, or API contracts are touched.

## Assumptions

1. The root cause is the missing `flex w-full flex-1 flex-col` wrapper behavior on the remaining `AnimatePresence` branches in `MobileSplashScreen.tsx`.
2. The child screens for those states are intended to consume the available viewport height once their parent wrapper participates in the flex chain.
3. Some child screens may still need local root-container height participation review, but the wrapper-level correction is the first required gate because it is definitively missing today.
4. The splash/loading fix from Plan 067 remains valid and must be preserved.
5. Footer-offset and safe-area compensation remain secondary concerns and are out of scope for this follow-up unless they block acceptance after the wrapper fix is complete.

## Decision Record

| # | Decision | Resolution |
|---|---|---|
| D1 | Treat this as a follow-up plan, not a rewrite of Plan 067 | [RESOLVED] Plan 067 fixed a real subset of the problem; Plan 060 closes the remaining broken states revealed by user evidence |
| D2 | Keep the fix centered in `MobileSplashScreen.tsx` first | [RESOLVED] The missing wrapper participation is proven there; broader layout refactors would add risk without first validating the narrow fix |
| D3 | Bundle this work with active Plan 067 for release coordination | [RESOLVED] Both plans target the same next patch line and together represent the complete onboarding-centering regression response |
| D4 | Re-check child screen root containers only after wrapper participation is restored | [RESOLVED] This preserves KISS and avoids speculative edits to child components before the primary break is repaired |
| D5 | Keep footer/safe-area tuning out of scope for this plan | [RESOLVED] The user-visible failure is gross top alignment, not minor visual-center drift; YAGNI applies until the primary break is fixed |
| D6 | Confirm version only at DevOps Stage 1 using git tags and `origin/main` | [RESOLVED] Git tag and `origin/main:package.json` both currently show `v0.9.7` / `0.9.7`; exact next patch remains a DevOps confirmation step |

## Release Strategy

Bundled with: Plan 067 — [agent-output/planning/067-splash-vertical-center.md](../planning/067-splash-vertical-center.md)

Sequencing notes: implement the remaining-state wrapper fix after preserving the existing Plan 067 splash/loading wrapper correction, then run combined validation across the full onboarding state machine before any release handoff. This plan should not ship independently of the current active Plan 067 chain.

## Plan

### Milestone 1: Confirm Remaining Broken State Paths

**Objective**: Verify every non-splash onboarding branch in `MobileSplashScreen.tsx` still lacks the flex wrapper participation required for full-height centering.

**Tasks**:

1. Inspect all `AnimatePresence` branches in `src/components/shared/MobileSplashScreen.tsx`.
2. Confirm `about`, `waitlist`, `success`, `earlyAccess`, and `aboutFromEarlyAccess` do not include the same `flex w-full flex-1 flex-col` wrapper pattern now present on `loading` and `splash`.
3. Record whether any branch has branch-specific structural needs that would make a shared wrapper unsafe.

**Acceptance**:

- The remaining five broken branches are explicitly enumerated.
- The difference between fixed and unfixed branches is documented at the wrapper level.
- No hidden alternate branch or conditional path is discovered that would invalidate the analysis.

**Dependencies**: Analysis 060.

### Milestone 2: Restore Flex Participation for Remaining States

**Objective**: Make the remaining onboarding state wrappers participate in the same full-height flex chain as the corrected splash/loading states.

**Primary file**: `src/components/shared/MobileSplashScreen.tsx`

**Tasks**:

1. Apply the same wrapper participation pattern to `about`, `waitlist`, `success`, `earlyAccess`, and `aboutFromEarlyAccess`.
2. Preserve existing animation behavior and branch keys.
3. Avoid unrelated changes to flow logic, routing, or translation behavior.

**Acceptance**:

- All seven `AnimatePresence` branches that render full-screen onboarding content participate in the flex chain consistently.
- No animation semantics, state names, or user flow transitions change.
- The fix stays limited to the minimum layout surface necessary to restore height propagation.

### Milestone 3: Validate Child Screen Height Consumption

**Objective**: Confirm the child screen components rendered inside the corrected wrappers actually consume the available height and center correctly once the parent chain is restored.

**Candidate child surfaces**:

1. `AboutPageContent`
2. `WaitlistScreen`
3. `WaitlistSuccessScreen`
4. `EarlyAccessScreen`

**Tasks**:

1. Review each screen's root container strategy after wrapper correction.
2. If a child screen still fails to fill available height, address only its root height/flex participation without changing content structure or interaction design.
3. Keep any child-component edits strictly limited to the screens that demonstrably remain broken after Milestone 2.

**Acceptance**:

- The `about` screen shown in the user screenshot is vertically centered after the wrapper fix.
- Waitlist, success, and early-access screens do not regress into top-aligned layouts.
- Any child-component follow-up edits are justified by actual remaining layout breakage, not speculation.

### Milestone 4: Regression Validation Across the Onboarding Flow

**Objective**: Validate the complete onboarding flow after the combined Plan 067 + Plan 060 corrections.

**Tasks**:

1. Exercise the first-visit path from splash to about to waitlist and any reachable success/early-access branches.
2. Check that the CTA remains visible and reachable on smaller mobile viewports.
3. Confirm no overflow, clipping, or spacing regression appears in German, English, or RTL rendering.
4. Confirm the mounted render remains consistent with the pre-mount path from a layout perspective.

**Acceptance**:

- No onboarding state is visibly top-aligned unless intentionally designed that way.
- The user can progress through the onboarding flow without layout jumps that suggest broken height propagation.
- RTL/localized content does not reintroduce vertical collapse.

### Milestone 5: Engineering Validation Gates

**Objective**: Preserve engineering quality while keeping the work scoped to the layout regression.

**Tasks**:

1. Run `npm run type-check`.
2. Run `npm run lint` or changed-file linting if repo-wide lint remains blocked by pre-existing issues.
3. Run `npm test -- --run`.
4. Run `npm run build` if required environment prerequisites are available; otherwise document the blocker precisely.

**Acceptance**:

- No new type, lint, or test regressions are introduced by the remaining-state centering fix.
- Any blocked gate is clearly identified as pre-existing or environment-dependent.
- Implementation evidence records combined validation outcomes for Plans 067 and 060.

### Milestone 6: Version and Release Artifacts

**Objective**: Keep release artifacts aligned with the coordinated patch bundle.

**Tasks**:

1. At DevOps Stage 1, confirm the exact next patch version after current `origin/main` version `0.9.7` and latest tag `v0.9.7`.
2. Update version artifacts for the bundled release.
3. Ensure changelog text makes clear that the onboarding centering fix spans both initial splash and remaining onboarding states.

**Acceptance**:

- The bundled release version is confirmed without tag collision.
- Version artifacts and changelog reflect the complete onboarding-centering bugfix scope.
- No standalone release claim is made for Plan 060 outside the bundle.

## Testing Strategy

Expected test types:

- Unit/integration gates for regression safety: type-check, lint, existing Vitest suite
- Manual browser validation for viewport centering: mobile emulation plus real-device validation in downstream QA/UAT
- Focused logic/source inspection for state-machine branch coverage so no onboarding state is omitted again

Coverage expectations:

- The first-run onboarding path must be reviewed end-to-end, not just the initial splash state.
- Each full-screen onboarding branch inside `MobileSplashScreen` must be explicitly accounted for.
- Historical regression precedent from Plan 029 should inform validation emphasis on child height propagation, especially if wrapper fixes alone are insufficient.

Critical scenarios:

- Splash to About transition on first visit
- Waitlist entry state on mobile
- Success and early-access states on mobile
- Small viewport device class (iPhone SE / similar)
- English, German, and at least one RTL locale

## Validation

High-level validation signals:

- The `about` state shown in the user screenshot is vertically centered within the visible viewport rather than pinned to the top.
- Remaining onboarding states no longer collapse to content height at the wrapper layer.
- Combined Plans 067 and 060 leave no inconsistent `AnimatePresence` branch with broken flex participation.
- Engineering gates show no new regressions attributable to the fix.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrapper fixes alone may not fully center every child screen | Medium | Medium | Milestone 3 explicitly checks child root-container height participation only if needed |
| Another onboarding branch remains overlooked | Medium | High | Milestone 1 requires explicit enumeration of all branches in `MobileSplashScreen` |
| Fixing all remaining states introduces unintended spacing differences | Low | Medium | Keep edits limited to wrapper/root height participation; avoid content/layout redesign |
| Release confusion between Plan 067 and Plan 060 | Medium | Medium | Bundle explicitly and document that release notes must cover both plans together |

## Rollback

Rollback scope is limited to the follow-up remaining-state centering changes. Reverting the additional wrapper/root height participation edits restores pre-Plan-060 behavior without touching backend, migrations, or release infrastructure.

## Duration Estimates

| Phase | Range | Uncertainty Drivers |
|---|---|---|
| Analysis | Complete (060) | Root cause now proven at the wrapper-state level |
| Planning | Complete (this doc) | None |
| Implementation | 20–45 min | Wrapper-only fix is short; child screen follow-up may add small extra scope |
| QA | 1–2 hours | Requires full onboarding-state walkthrough and browser/device validation |
| UAT | 30–60 min | Real-device confirmation for the screenshot path and adjacent states |
| DevOps | 30 min | Standard bundled patch coordination with Plan 067 |

## Open Questions

OPEN QUESTION [RESOLVED]: Is the user screenshot still the splash screen? Resolved by Analysis 060: no, it is the `about` state.

OPEN QUESTION [RESOLVED]: Should this work replace Plan 067 or bundle with it? Bundled with Plan 067, because 067 remains a valid partial fix and this plan completes the same regression class.

OPEN QUESTION [RESOLVED]: Must child components be edited immediately? Only if they remain broken after wrapper participation is restored.
