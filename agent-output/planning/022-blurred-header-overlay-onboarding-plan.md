---
ID: 022
Origin: 022
UUID: c4a1f7d2
Status: UAT Approved
---

# Plan 022 — Remove Blurred Header Overlay on Onboarding Slide 1

## Plan Header

- **Target Release**: v0.6.9 (adjusted; v0.6.8 released during plan execution)
- **Epic Alignment**: Onboarding UX polish (funnel conversion / first-run trust)
- **Status**: UAT Approved
- **Related Issues**: None

## Change Log

| Date       | Agent   | Change       | Rationale                                                                                                         |
| ---------- | ------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| 2026-02-24 | planner | Created plan | Convert Analysis 022 into implementable milestones for removing the frosted header overlay on onboarding slide 1. |
| 2026-02-24 | qa      | QA complete  | Automated QA gates pass; QA report created for Plan 022.                                                          |
| 2026-02-24 | uat     | UAT approved | User confirmed visual validation on real device; approved for v0.6.9 release.                                     |

## Value Statement and Business Objective

As a **new mobile user (iPhone Safari)**, I want the **onboarding slide with the map illustration to display without a blurred/frosted header overlay**, so that **content isn’t obscured and the onboarding experience feels high-quality and trustworthy**.

## Objective

Ship a minimal, targeted change that ensures **no blurred header section** overlays onboarding slide 1 (map illustration) while avoiding regressions to existing header behavior on other pages.

## Source Analysis

- Root cause analysis: `../analysis/closed/022-blurred-header-overlay-onboarding-analysis.md`

## Scope

### In Scope

- Remove/disable the frosted/blurred fixed header overlay effect on the onboarding “About” screen (map illustration slide).
- Ensure the map/hero is not visually covered by a fixed blurred region at the top.
- Maintain functional essentials on the onboarding funnel (e.g., language switcher portal remains usable).

### Out of Scope

- Redesigning headers globally or changing the app-wide glassmorphism theme.
- General refactors of `PageHeader` beyond what’s required to meet the AC.

## Acceptance Criteria

1. On iPhone Safari (UAT/prod-equivalent), onboarding slide 1 (map illustration) shows **no blurred/frosted header section** covering the top of the illustration.
2. No regression to other pages using `PageHeader` / desktop `Header` (header visibility, safe-area padding, scroll blur behavior elsewhere remains as-is).
3. Onboarding flow remains navigable and visually stable (no new layout jumps introduced).

## Target Release and Versioning

- **Proposed target**: v0.6.7
- **Note**: Roadmap doc currently lists older “Current Version”; this plan should be bundled into the next patch release after v0.6.6.
- **Coordination**: Roadmap agent should confirm v0.6.7 release grouping once other plans (if any) are known.

## Release Strategy

- **Standalone (no other known plans for v0.6.7)** based on current `agent-output/planning/` scan.

## Implementation Plan (Milestones)

1. **Reproduction and confirmation (UAT + iPhone Safari)**
   - Objective: Confirm the screenshot corresponds to the onboarding “About” screen with `MapIllustration` and determine whether blur appears on load vs after any scroll.
   - Deliverable: Short note in implementation doc describing reproduction conditions and observed scroll/blur trigger.

2. **Select the smallest, safest mechanism to remove the blurred header overlay on this screen**
   - Objective: Ensure the onboarding About screen has no blurred/frosted header overlay region.
   - Constraints:
     - Keep changes localized to onboarding/About where possible.
     - Avoid changing `PageHeader` default behavior for the rest of the app unless explicitly required.
   - Candidate approaches (choose one during implementation):
     - Do not render the fixed `PageHeader` / `HeaderSpacer` when the screen requests an “empty header” mode (no title/back/right content).
     - Add an explicit “no-glass/no-blur” mode to `PageHeader` and apply it only on onboarding/About.

3. **Regression sweep across top-level routes using headers**
   - Objective: Verify pages that intentionally rely on glass/blur headers still work (scrolling behavior, safe-area padding, z-index layering).
   - Deliverable: List of checked routes and a brief status (pass/fail) in implementation doc.

4. **Version and release artifacts**
   - Update `package.json` version to v0.6.7.
   - Add CHANGELOG entry under v0.6.7 describing the onboarding blurred header fix (reference Plan 022).

## Validation (Developer)

- `npm run type-check`
- `npm test`
- `npm run build`

## Testing Strategy (High-Level)

- Unit/integration coverage is optional if change is purely conditional rendering/styling with low logic complexity, but the change must be validated by:
  - Visual check on iPhone Safari (real device preferred) for onboarding slide 1.
  - Quick spot-check of representative pages using `PageHeader`.

## Risks and Mitigations

- **Risk**: Removing/altering header changes spacing (safe-area / top padding) and causes content jumps.
  - Mitigation: Keep spacing explicit and verify on iPhone SE dimensions.
- **Risk**: Global header behavior changes unintentionally.
  - Mitigation: Prefer localized gating to onboarding/About; regression sweep on other header pages.

## Open Questions

- **OPEN QUESTION**: Is the screenshot definitively from the onboarding “About” screen (map illustration), or a different onboarding step/page?
- **OPEN QUESTION**: Should onboarding have _no_ header at all, or a transparent non-blurring header (e.g., only language switcher)?

## Duration Estimates

- Analysis: 0.25–0.5h (confirm reproduction context)
- Planning: 0.25h (this doc)
- Implementation: 0.5–1.5h (localized header change + spacing)
- QA (automated gates): 0.5–1.0h
- UAT (real device visual): 0.5–1.0h
- DevOps (bundle + release): 0.5–1.0h

Uncertainty drivers: availability of real iPhone Safari validation; whether the issue is present at rest or only after scroll restoration.
