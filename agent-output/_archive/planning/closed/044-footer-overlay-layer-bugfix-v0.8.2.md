---
ID: 044
Origin: 044
UUID: f7a92c3d
Status: Released
---

# Plan 044 — Mobile Footer Overlay Layer Bugfix

## Plan Header

- **Target Release**: v0.8.2
- **Epic Alignment**: Mobile UX reliability / touch-safe navigation shell behavior
- **Status**: UAT Approved
- **Related Issues**: None

## Changelog

| Date | Change | Agent | Notes |
|---|---|---|---|
| 2026-03-15T16:35Z | Initial plan created from Analysis 044 | Planner | Targets next product patch after v0.8.1 release; shared-layout bugfix only |
| 2026-03-15T16:30Z | Status: Active → In Progress | Implementer | Beginning implementation; Critique 044 APPROVED |
| 2026-03-15T16:47Z | Status: In Progress → Code Review Approved | Code Reviewer | Implementation approved with zero findings; ready for QA |
| 2026-03-15T16:59Z | Status: Code Review Approved → QA Complete | QA | Automated gates pass; device validation deferred to UAT |
| 2026-03-15T17:05Z | Status: QA Complete → UAT Approved | UAT | APPROVED FOR RELEASE — value delivered; device validation deferred with LOW residual risk |
| 2026-03-15T21:32Z | Iteration 2: Local validation fix | Implementer | Added pointer-events: none to slot + min-height: 0; local validation passed; ready for DevOps |

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

## Value Statement and Business Objective

As a mobile user, I want interactive content above the footer to remain fully visible and tappable, so that I can complete page flows without invisible layout layers intercepting touches near the bottom of the screen.

## Objective

Remove or neutralize the shared footer-adjacent structural layer that blocks interaction above the mobile footer while preserving the intended mobile footer and early-access navbar behavior.

## Scope

### In Scope

- Shared mobile layout shell behavior in the footer-adjacent slot used by `RootClientLayout`
- CSS or layout-level event-handling adjustments needed to stop non-visual wrapper layers from intercepting touches
- Regression protection for all three slot states: footer visible, early-access navbar visible, and no bottom UI visible
- Release artifact updates for the next product patch

### Out of Scope

- Redesigning the mobile footer or early-access navbar visuals
- Changing route rules that decide when footer, navbar, or no mobile bottom UI should render
- New navigation patterns, new overlays, or broader mobile layout refactors unrelated to the touch-blocking layer
- Deployment/infrastructure changes beyond normal release metadata updates

## Context

Analysis 044 identified the shared `mobile-bottom-ui-slot` wrapper structure as the likely source of the bug. The current layout keeps a DOM slot for mobile bottom UI and places visible footer components as fixed-position children. The wrapper elements around those fixed children are structural, not user-facing, but currently have no explicit event-pass-through rule. That creates a risk that the active wrapper becomes an invisible interaction layer above the footer zone.

This work should preserve the existing architecture where:

- `RootClientLayout` owns the page shell and bottom slot
- the visible footer/navbar remains fixed to the viewport
- pages continue to rely on shared shell behavior instead of page-specific workaround spacing

## Assumptions

- The root cause is shared-shell behavior, not page-specific component logic
- The smallest safe fix is to neutralize event capture on the non-visual wrapper layer rather than rewriting footer structure
- Existing footer and early-access navbar components should remain interactive after the shell-level fix
- A product patch release is appropriate because this is a user-facing regression in shared mobile behavior

## Decision Record

- [RESOLVED] Target v0.8.2 as the next product patch release — roadmap and package metadata are both at v0.8.1 and the release tracker is ready for a new cycle.
- [RESOLVED] Fix the bug at the shared shell boundary instead of patching individual pages — analysis located the suspected interception layer in `RootClientLayout`-adjacent wrapper structure.
- [RESOLVED] Preserve the existing slot-based mobile footer architecture — the goal is to remove touch interception, not redesign footer rendering or route gating.
- [RESOLVED] Verification must cover all three slot states (`footer`, `navbar`, `none`) — they share the same bottom-slot mechanism and could regress each other.
- [DEFERRED: QA/UAT + exact browser/device repro matrix still needs confirmation + v0.8.2 acceptance] Confirm whether the bug reproduces only on iOS Safari or also on Android/mobile Chromium.
- [DEFERRED: Implementer + use only if the primary shell-layer fix fails + Plan 044 / v0.8.2] Consider stronger alternatives such as slot-level pointer-event gating or visibility/display strategy changes only if wrapper-level remediation does not preserve footer interaction.

## Plan

### Milestone 1 — Define the Interaction Contract at the Shell Boundary

**Objective**: Make the event-handling ownership of the mobile bottom slot explicit before changing behavior.

**Acceptance Criteria**:

- The implementation identifies which element is structural-only versus which element is intended to receive user interaction.
- The planned fix is confined to the shared mobile shell and adjacent layout styles, not page-specific content wrappers.
- The expected interaction contract is explicit: structural wrapper layers pass through touches; visible footer/navbar controls remain interactive.

**Dependencies**: None

---

### Milestone 2 — Neutralize the Touch-Blocking Footer-Adjacent Layer

**Objective**: Remove the invisible interaction layer above the footer without breaking footer or navbar usability.

**Acceptance Criteria**:

- The shared wrapper or slot layer identified in Analysis 044 no longer intercepts taps intended for content above the footer.
- The visible mobile footer remains tappable in routes where `data-mobile-ui='footer'`.
- The visible early-access navbar remains tappable in routes where `data-mobile-ui='navbar'`.
- Routes with `data-mobile-ui='none'` do not reintroduce a dead or blocking bottom layer.

**Dependencies**: Milestone 1

---

### Milestone 3 — Add Regression Protection for Shared Bottom-Slot States

**Objective**: Prevent recurrence of the shell-level interaction bug across the three mobile bottom UI states.

**Acceptance Criteria**:

- Relevant layout/component regression coverage is added or updated around `RootClientLayout` and the mobile bottom slot behavior.
- Verification demonstrates that shared shell behavior still matches intended route gating for footer/navbar/none states.
- No new client/server boundary drift is introduced while adjusting shared layout behavior.

**Dependencies**: Milestone 2

---

### Milestone 4 — Validate the Mobile UX Fix Across Build Gates and Manual Smoke Checks

**Objective**: Confirm the fix is safe, releaseable, and aligned with the value statement.

**Acceptance Criteria**:

- `npm run type-check` passes.
- Relevant lint gate passes for changed files.
- Automated tests pass.
- `npm run build` passes.
- Manual mobile smoke verification confirms that content immediately above the footer is visible and tappable on representative routes using:
  - the standard mobile footer,
  - the early-access navbar,
  - no mobile bottom UI.

**Dependencies**: Milestone 3

---

### Milestone 5 — Update Version and Release Artifacts

**Objective**: Align release metadata and changelog entries with the roadmap target version.

**Acceptance Criteria**:

- `package.json` version is updated from `0.8.1` to `0.8.2`.
- `CHANGELOG.md` includes a user-impact-focused v0.8.2 entry describing the footer-adjacent touch-blocking fix.
- Release artifacts remain consistent with roadmap assignment for v0.8.2.

**Dependencies**: Milestone 4

## Testing Strategy

- Component/layout regression coverage around shared bottom-slot behavior and state selection
- Interaction-focused validation that structural shell elements do not capture taps meant for page content
- Standard static and build gates: type-check, lint, tests, and production build
- Manual mobile verification on representative routes to confirm value delivery on real viewport behavior

## Validation (Non-QA)

- Inspect the final DOM/CSS behavior for the mobile bottom slot to confirm the structural layer is no longer an event target.
- Confirm the visible footer/navbar still accepts user interaction after the shell-level change.
- Confirm no route loses its expected bottom UI mode because of the shared-shell adjustment.

## Risks

- **Footer interaction regression**: applying event-pass-through too broadly could make footer controls untappable; mitigate by validating the visible interactive element boundary explicitly.
- **Browser-specific rendering variance**: mobile Safari may behave differently from Chromium-based browsers; mitigate with manual mobile smoke checks and QA/UAT browser coverage.
- **Shared shell blast radius**: `RootClientLayout` affects many routes; mitigate by keeping the change minimal and adding regression coverage for slot-state behavior.

## Duration Estimates

- Analysis: 0.5–1.0h
- Planning: 0.25–0.5h
- Implementation: 0.5–1.5h
- Code Review: 0.25–0.5h
- QA: 0.5–1.0h
- UAT: 0.25–0.75h
- DevOps: 0.25–0.5h

**Uncertainty drivers**: exact browser/device reproduction matrix, whether wrapper-only remediation is sufficient on all affected routes, and whether existing layout tests need light or moderate expansion.