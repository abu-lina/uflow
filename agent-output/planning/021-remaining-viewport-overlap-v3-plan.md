---
ID: 21
Origin: 21
UUID: c4d82e6f
Status: UAT Approved
---

# 021 — Remaining Viewport Overlap (Onboarding + City-Selection) — Remediation Plan

## Changelog

| Date       | Author | Change                |
| ---------- | ------ | --------------------- |
| 2026-02-24 | Planner | Initial plan created |
| 2026-02-24 | Implementer | Status → In Progress |
| 2026-02-24 | QA | Status → QA Complete |
| 2026-02-24 | UAT | Status → UAT Approved |

## Plan Header

- **Target Release**: v0.6.6
- **Epic Alignment**: Bugfix follow-up to Plan 020 (iPhone Safari viewport overlap)
- **Status**: UAT Approved
- **Related Issues**: None

## Release Strategy

Standalone (no other known plans for this version).

## Value Statement and Business Objective

As an iPhone Safari user (especially iPhone SE), I want onboarding and city-selection CTAs to remain fully visible and tappable (not clipped behind empty header/footer space), so that I can complete onboarding and reach provider discovery without friction.

This is conversion-critical: these CTAs are in the primary funnel.

## Objective

Eliminate CTA clipping on iPhone SE Safari for:
- Onboarding slides ("Weiter >", "Entdecke deine Ummah >")
- City selection (`/city-selection`) ("Meine Stadt auswählen" / discover CTA)

## Scope

### In Scope

1. **Collapse the mobile bottom slot when no bottom UI is visible**
   - When `RootClientLayout` sets `data-mobile-ui="none"` on `mobile-bottom-ui-slot`, the reserved height must collapse to 0.

2. **Smooth the collapse/expand behavior to minimize perceived layout shift**
   - Add a short CSS transition so the slot height change is not jarring.

3. **Secondary sweep: remove remaining nested viewport-height usage inside onboarding flow**
   - Replace `h-screen-fix` in onboarding flow screens that still use it (notably waitlist screens).

4. **Manual iPhone SE Safari verification (UAT-critical)**
   - Verify the affected screens on a real iPhone SE (or equivalent small iOS viewport) on UAT and/or production after deployment.

### Explicit Non-Goals

- Redesigning the bottom navigation UI
- Changing which pages show footer vs navbar (navigation rules)
- Introducing new UI components, new pages, or new navigation patterns

## Key Context (from Analysis 021)

- `mobile-bottom-ui-slot` currently reserves **128px** via `min-height: var(--mobile-nav-total)` even when `data-mobile-ui="none"`.
- During onboarding, `data-mobile-ui` is typically `none` (no footer/navbar visible), so the slot becomes **dead space**, shrinking `<main>` height and clipping CTAs on small viewports.
- Plan 020’s `h-screen-fix → h-full` changes were applied correctly but were insufficient because the remaining issue is the slot reservation.

## Milestone Dependencies

```mermaid
graph LR
  M1[Milestone 1: Slot collapse + transition] --> M2[Milestone 2: Secondary sweep (waitlist screens)]
  M2 --> M3[Milestone 3: Validation + device verification]
  M3 --> M4[Milestone 4: Version + changelog]
```

Sequencing rule: Land the slot fix first (M1), then the onboarding secondary sweep (M2), then run validations and iPhone SE verification (M3).

## Implementation Milestones

1. **Milestone 1 — Slot collapse for `data-mobile-ui="none"`**
   - Update CSS so the `mobile-bottom-ui-slot` collapses (height/spacing) when there is no mobile UI to display.
   
   **Acceptance Criteria**:
   - Onboarding screens no longer show a 128px empty area at the bottom.
   - CTA buttons on onboarding slides and city-selection are no longer clipped on iPhone SE Safari.

2. **Milestone 2 — Secondary sweep: remove nested `h-screen-fix` in onboarding flow**
   - Update onboarding flow screens still using `h-screen-fix` (notably waitlist and success screens) to fill parent space instead.

   **Acceptance Criteria**:
   - Waitlist screens do not claim their own viewport height under `RootClientLayout`.
   - No nested viewport-height conflicts remain in the onboarding state machine screens.

3. **Milestone 3 — Validation + iPhone SE verification**
   - Run automated gates: type-check, unit tests, lint, production build.
   - Manual verification on real iPhone SE Safari for:
     - Landing: `/` (ensure no regression)
     - Onboarding slides: the two quote screens ("Weiter >", "Entdecke deine Ummah >")
     - City selection: `/city-selection` (ensure CTA is fully visible)

   **Acceptance Criteria**:
   - All automated checks pass.
   - Real-device iPhone SE Safari shows all targeted CTAs fully visible and tappable.

4. **Milestone 4 — Version management and release artifacts**
   - Bump version to `v0.6.6`.
   - Update `CHANGELOG.md` with a clear entry describing:
     - Root cause (reserved 128px slot when `data-mobile-ui="none"`)
     - Fix (collapse slot + smooth transition)
     - Secondary sweep (waitlist screens)

   **Acceptance Criteria**:
   - Version artifacts consistently reflect `v0.6.6`.
   - Changelog entry is clear and user-impact focused.

## Duration Estimates

Rough estimates (CSS + small component changes; uncertainty is in iOS behavior verification):

- **Planning**: 0.5–1.0h
- **Implementation**: 1–3h
- **QA**: 0.5–1.0h
- **UAT**: 0.5–1.0h (real device)
- **DevOps**: 0.5–1.0h

Uncertainty drivers:
- Hydration/layout shift behavior when slot expands from 0 → 128px after mount
- iOS Safari viewport chrome behavior (address bar show/hide)

## Testing Strategy (High Level)

- **Unit/Integration**: Existing suite for regression safety (no new logic expected).
- **Build gates**: type-check, lint, production build.
- **Manual**: iPhone SE Safari verification for the specific screens.

(Details of test cases belong to the QA phase.)

## Risks and Mitigations

- **Risk**: Collapsing the slot when `data-mobile-ui="none"` introduces visible layout shift on mount.
  - **Mitigation**: Add a short CSS transition; validate on real device.

- **Risk**: Some screens rely on the reserved slot as implicit bottom padding.
  - **Mitigation**: Ensure screens that need bottom spacing explicitly use existing spacing utilities (e.g., `pb-mobile-nav`) only when bottom UI is actually present.

- **Risk**: Out-of-scope pages still contain `h-screen-fix` and could have similar issues.
  - **Mitigation**: Keep scope focused to funnel + waitlist screens; track secondary pages separately if user reports.

## Open Questions

OPEN QUESTION [CLOSED]: Target release v0.6.6 confirmed.

OPEN QUESTION [CLOSED]: Include smooth transition confirmed.
