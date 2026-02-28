---
ID: 022
Origin: 022
UUID: c4a1f7d2
Status: OPEN
---

# Critique — Plan 022: Remove Blurred Header Overlay on Onboarding Slide 1

**Artifact**: `agent-output/planning/022-blurred-header-overlay-onboarding-plan.md`
**Analysis**: `agent-output/analysis/closed/022-blurred-header-overlay-onboarding-analysis.md`
**Review Date**: 2026-02-24
**Verdict**: **APPROVED** (with advisory notes)

## Change Log

| Date       | Handoff          | Request        | Summary                                                                                      |
| ---------- | ---------------- | -------------- | -------------------------------------------------------------------------------------------- |
| 2026-02-24 | Planner → Critic | Initial review | Plan 022 evaluated against Critic checklist; approved with advisory notes on open questions. |

---

## Value Statement Assessment

| Check          | Status  | Notes                                                                                                               |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| **Presence**   | ✅ PASS | Clear user story format: "As a new mobile user (iPhone Safari), I want ... so that ..."                             |
| **Clarity**    | ✅ PASS | "So that" outcome is verifiable: content not obscured, onboarding feels high-quality                                |
| **Alignment**  | ✅ PASS | Supports Master Product Objective — first-run trust is critical for "first thought when any Muslim seeks a service" |
| **Directness** | ✅ PASS | Value delivered directly by removing the overlay; no deferral                                                       |

**Assessment**: Value statement is well-formed and aligned with onboarding funnel conversion goals.

---

## Overview

Plan 022 proposes removing a blurred/frosted header overlay on the onboarding "About" slide (map illustration) on iPhone Safari. The plan is minimal, targeted, and well-scoped based on high-confidence root cause analysis (Analysis 022).

---

## Architectural Alignment

| Check                        | Status  | Notes                                                                                          |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Respects existing patterns   | ✅ PASS | Plan explicitly constrains changes to onboarding/About, avoiding global `PageHeader` refactors |
| Supports roadmap direction   | ✅ PASS | UX polish aligns with onboarding/funnel trust goals                                            |
| Consistency with prior plans | ✅ PASS | Follows Plans 019-021 pattern of localized viewport/layout fixes                               |

**Assessment**: Architecturally sound; localized change with explicit regression sweep planned.

---

## Scope Assessment

| Check                   | Status  | Notes                                           |
| ----------------------- | ------- | ----------------------------------------------- |
| Boundaries clear        | ✅ PASS | In-scope/out-of-scope sections are explicit     |
| Deliverables listed     | ✅ PASS | 4 milestones with clear deliverables            |
| Dependencies identified | ✅ PASS | Source analysis linked; no external blockers    |
| Version specified       | ✅ PASS | v0.6.7 with rationale (next patch after v0.6.6) |

**Assessment**: Scope is appropriately bounded for a CSS/conditional-rendering fix.

---

## Technical Debt Risks

| Risk                          | Assessment                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Global header behavior drift  | LOW — plan constrains changes to onboarding/About; regression sweep in Milestone 3 |
| Safe-area spacing regressions | LOW — explicit mitigation: verify on iPhone SE dimensions                          |
| Future maintenance burden     | LOW — localized gating is preferable to global opt-in/opt-out mechanisms           |

**Assessment**: No significant debt introduced; approach is defensive and localized.

---

## Findings

### F1: Plan contains OPEN QUESTIONs that should be addressed

- **Severity**: LOW (advisory)
- **Status**: OPEN
- **Location**: Open Questions section
- **Description**: Two open questions exist:
  1. "Is the screenshot definitively from the onboarding 'About' screen?"
  2. "Should onboarding have no header at all, or a transparent non-blurring header?"
- **Impact**: These are implementation-level decisions, not plan blockers. The plan provides candidate approaches for Implementer to choose from.
- **Recommendation**: Implementer should resolve Q1 during reproduction (Milestone 1) and Q2 based on simplest-correct-fix principle. If user clarifies screenshot context before implementation, update the plan.

### F2: Hotfix risk question — "How will this plan result in a hotfix after deployment?"

- **Severity**: LOW (advisory)
- **Status**: ADDRESSED in plan
- **Description**: Per Critic protocol, I ask: what could go wrong post-deploy?
  - **Risk**: Safe-area padding removed unintentionally → content touches notch/status bar
  - **Risk**: Language switcher portal becomes inaccessible if header is removed entirely
- **Mitigation in plan**: Both risks are addressed — Milestone 2 constraints say "maintain functional essentials (e.g., language switcher portal remains usable)" and Risks section covers safe-area spacing with explicit iPhone SE verification.
- **Assessment**: Plan is defensive; no additional mitigations required.

---

## Questions for Planner (Optional)

None blocking. The plan is clear enough to proceed.

---

## Risk Assessment

| Category                  | Level  | Rationale                                                                |
| ------------------------- | ------ | ------------------------------------------------------------------------ |
| Implementation complexity | LOW    | Conditional rendering or CSS-only change                                 |
| Regression risk           | LOW    | Explicit regression sweep in Milestone 3                                 |
| User impact if incorrect  | MEDIUM | Onboarding is conversion-critical, but fix is visually verifiable in UAT |

---

## Recommendations

1. **Proceed to implementation.** Plan is clear, well-scoped, and aligned.
2. **Resolve open questions during Milestone 1** (reproduction confirmation) rather than blocking on user clarification.
3. **UAT should include real iPhone Safari device** to confirm visual fix (as plan already specifies).

---

## Verdict

**APPROVED** — Plan 022 meets all Critic criteria. Open questions are implementation-level and do not block planning approval.

---

## Revision History

| Date       | Revision | Changes      | Status Impact |
| ---------- | -------- | ------------ | ------------- |
| 2026-02-24 | Initial  | First review | APPROVED      |
