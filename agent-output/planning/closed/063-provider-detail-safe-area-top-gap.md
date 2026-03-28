---
ID: 063
Origin: 063
UUID: b7e3a1d9
Status: Released
---

# 063 — Provider Detail Safe-Area Top Gap Remediation Plan

## Changelog

| Date & Time       | Author  | Change |
| ----------------- | ------- | ------ |
| 2026-03-25T21:11Z | Planner | Initial plan created from Analysis 063 |
| 2026-03-25T21:16Z | Implementer | Status → In Progress |
| 2026-03-25T21:28Z | Code Reviewer | Status → Code Review Approved; Fix-in-Review applied (skeleton py-4 → pb-4) |
| 2026-03-25T21:35Z | QA | Status → QA Complete |
| 2026-03-25T21:45Z | UAT | Status → UAT Approved; APPROVED FOR RELEASE |
| 2026-03-25T21:46Z | DevOps | Status → Committed for Release v0.9.2 |
| 2026-03-25T22:05Z | DevOps | Target Release adjusted to v0.9.3 after origin/main/tag advanced to v0.9.2 |
| 2026-03-25T22:25Z | DevOps | Status → Released as v0.9.3; branch pushed, tag created, local smoke checks passed |

## Plan Header

- **Target Release**: v0.9.3
- **Epic Alignment**: Bugfix follow-up to mobile viewport and safe-area hardening work; supports the roadmap objective of making provider discovery feel polished and trustworthy on mobile.
- **Status**: Released as v0.9.3
- **Related Issues**: None

## Release Strategy

Standalone (no other known plans for this version).

## Value Statement and Business Objective

As a mobile service seeker using an iPhone with a notch or Dynamic Island, I want the provider detail page hero and back navigation to clear the system status area, so that I can browse provider details confidently without obstructed UI or a degraded first impression.

This supports the roadmap master objective by protecting the quality of the provider-detail experience, which is a primary conversion step from discovery to intent.

## Objective

Remediate the provider detail page top-spacing defect on notch and Dynamic Island devices by applying safe-area-aware top spacing at the correct mobile detail boundary, preserving the current layout on non-notch devices, and aligning the loading state with the same spacing model.

## Decision Record

- [RESOLVED] Apply the fix at the mobile provider-detail component boundary rather than the global app shell. Rationale: the defect is localized and a shell-level change would broaden regression risk across unrelated public pages.
- [RESOLVED] Keep `viewport-fit=cover` unchanged in the root layout. Rationale: analysis verified it is already present and correctly enables `env(safe-area-inset-top)`.
- [RESOLVED] Use the project’s existing safe-area pattern (`env(safe-area-inset-top)` plus the current visual top gap) instead of inventing a new token or utility. Rationale: this minimizes implementation drift and matches sibling pages.
- [RESOLVED] Include the mobile loading skeleton in scope. Rationale: the loading path is user-visible on cold loads and should not temporarily regress the same spacing defect.
- [RESOLVED] Leave desktop provider-detail rendering out of scope. Rationale: analysis verified the issue exists only on the mobile path and desktop uses a separate render branch.

## Assumptions

- Analysis 063 remains authoritative: the root cause is the fixed `pt-6` top padding in the mobile provider-detail component with no ancestor-level safe-area compensation.
- On non-notch devices, `env(safe-area-inset-top)` resolves to `0px`, so preserving the current base top gap remains feasible without device-specific branching.
- No product or design change is intended beyond correcting the spacing defect and aligning transient loading UI.

## Scope

### In Scope

1. Add safe-area-aware top spacing to the mobile provider-detail hero container.
2. Align the provider-detail loading skeleton with the same top-spacing model.
3. Verify the existing root viewport configuration remains correct and unchanged.
4. Run standard validation gates appropriate for a focused UI bugfix.
5. Update release artifacts at DevOps time for the confirmed next patch release.

### Explicit Non-Goals

- Reworking the global mobile layout shell or `RootClientLayout`
- Redesigning the provider detail hero, back button, or image carousel
- Changing desktop provider detail rendering
- Introducing device detection or user-agent-specific styling

## Key Context From Analysis 063

- The mobile provider detail route renders through `src/app/(public)/providers/[provider_id]/page.tsx` → `ProviderDetailPageClient` → mobile `ProviderDetailPage` → `MobileProviderDetail`.
- `src/components/providers/MobileProviderDetail.tsx` currently applies fixed `pt-6` on the outer mobile detail wrapper.
- No ancestor layer applies safe-area top compensation.
- The codebase already uses safe-area-aware spacing successfully in public browse and provider edit flows.

## Implementation Milestones

1. **Milestone 1 — Safe-area correction at the mobile detail boundary**
   - Update the mobile provider-detail top wrapper so the top spacing combines the existing visual gap with `env(safe-area-inset-top)`.
   - Keep the fix local to the provider detail mobile path unless implementation proves a strictly local change cannot satisfy the acceptance criteria.

   **Acceptance Criteria**:
   - On notch and Dynamic Island devices, the provider detail hero and back button clear the status area.
   - On non-notch devices, the visual spacing remains effectively unchanged from current behavior.
   - No desktop rendering path is altered.

2. **Milestone 2 — Loading-state parity**
   - Update the mobile loading skeleton for the provider detail route so its top spacing behavior matches the final rendered page.

   **Acceptance Criteria**:
   - Cold-load skeleton state no longer presents a top-spacing mismatch versus the resolved page.
   - The loading header remains visually stable while data resolves.

3. **Milestone 3 — Regression and device-shape validation**
   - Validate behavior against both safe-area and non-safe-area device classes.
   - Confirm no regression to provider detail scrolling, back navigation affordance visibility, or hero image presentation.

   **Acceptance Criteria**:
   - Dynamic Island / notch scenario shows adequate top gap.
   - iPhone SE or equivalent non-notch scenario remains unchanged.
   - Standard project gates relevant to the touched files pass, or any deferral is explicitly documented with owner and rationale.

4. **Milestone 4 — Version and release artifacts**
   - During DevOps Stage 1, confirm the exact next patch version after `origin/main` `0.9.1`, ensure no tag collision, then update version artifacts and release notes accordingly.

   **Acceptance Criteria**:
   - Exact release version is confirmed only after DevOps Stage 1 tag verification.
   - Version artifacts and `CHANGELOG.md` reflect the safe-area bugfix in user-impact terms.

## Validation

- Confirm `viewport-fit=cover` remains present in the root app layout.
- Validate the affected public provider-detail route on:
  - one notch / Dynamic Island viewport
  - one non-notch viewport
- Run the applicable automated checks for the touched UI surface (at minimum the repo’s normal bugfix gates chosen by implementer/QA, such as type-check, lint, targeted tests, and build verification where appropriate).
- Record any validation deferral explicitly if a real-device or equivalent simulator check is unavailable in the implementation environment.

## Testing Strategy

- **Regression focus**: mobile provider-detail rendering, skeleton state, and back-button visibility.
- **Automated coverage**: leverage targeted component, route, or regression coverage where feasible for the touched files; avoid broad unrelated test churn.
- **Manual coverage**: verify one safe-area device class and one non-safe-area device class because the bug is driven by hardware-defined CSS env values.

Specific test cases belong to QA.

## Risks and Mitigations

- **Risk**: Applying the spacing at too high a layout layer changes unrelated routes.
  - **Mitigation**: keep the first implementation localized to `MobileProviderDetail` and only expand scope if validation proves necessary.

- **Risk**: The final page is fixed but the loading skeleton still flashes too close to the status area.
  - **Mitigation**: keep the skeleton explicitly in scope and validate cold-load behavior.

- **Risk**: Safe-area spacing becomes overly large on some devices if the base gap is duplicated at multiple layers.
  - **Mitigation**: verify only one effective top-spacing layer owns the safe-area adjustment.

## Duration Estimates

- **Analysis**: complete
- **Planning**: 0.5h
- **Implementation**: 0.5–1.5h
- **QA**: 0.5–1.0h
- **UAT**: 0.25–0.75h
- **DevOps**: 0.25–0.5h

Uncertainty drivers:

- Availability of a trustworthy iPhone notch/Dynamic Island verification environment
- Whether the loading-state parity fix needs minor visual adjustment after implementation

## Handoff Notes

- Prefer the existing codebase safe-area expression style already used in public browse and provider edit flows.
- Avoid moving this bugfix into `RootClientLayout` or root layout unless the localized component fix fails validation.
- Preserve the current desktop branch and public route structure.

## Open Questions

None.