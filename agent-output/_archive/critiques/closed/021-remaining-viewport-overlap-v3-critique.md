---
ID: 21
Origin: 21
UUID: c4d82e6f
Status: Resolved
---

# 021 — Remaining Viewport Overlap (Onboarding + City-Selection) — Plan Critique

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-02-24T18:30Z | Planner → Critic | Review Plan 021 for approval | Initial critique |
| 2026-03-23T10:01Z | process-improvement | Close critique | Closed after release; Status: Resolved |

## Artifact & Analysis

- **Plan**: [agent-output/planning/021-remaining-viewport-overlap-v3-plan.md](../planning/021-remaining-viewport-overlap-v3-plan.md)
- **Analysis**: [agent-output/analysis/closed/021-remaining-viewport-overlap-analysis.md](../analysis/closed/021-remaining-viewport-overlap-analysis.md)
- **Date**: 2026-02-24
- **Status**: Initial Review

---

## Value Statement Assessment

✅ **CLEAR, USER-FOCUSED, AND CONVERSION-CRITICAL**

> As an iPhone Safari user (especially iPhone SE), I want onboarding and city-selection CTAs to remain fully visible and tappable (not clipped behind empty header/footer space), so that I can complete onboarding and reach provider discovery without friction.

**Assessment:**
- **Presence**: ✅ Value statement exists in proper user-story format
- **Clarity**: ✅ The "so that" outcome (complete onboarding, reach provider discovery) is verifiable via manual device testing
- **Alignment**: ✅ Directly supports Master Product Objective — users cannot discover providers if stuck at onboarding CTAs
- **Directness**: ✅ Value is delivered directly by this plan; not deferred

**Verdict**: The plan correctly frames this as a conversion-critical fix for the primary funnel. No issues.

---

## Overview

Plan 021 is a direct follow-up to Plan 020 (v0.6.5), which fixed the landing splash CTA but left subsequent onboarding screens and city-selection with the same clipping issue. Real-device UAT screenshots provided irrefutable evidence of the remaining problem.

**Root Cause (from Analysis 021):**
The `mobile-bottom-ui-slot` CSS reserves 128px (`var(--mobile-nav-total)`) **even when `data-mobile-ui="none"`**, shrinking `<main>` by 128px. On iPhone SE (~559px viewport), this pushes CTAs below the visible area.

**Proposed Fix:**
1. Collapse the slot when `data-mobile-ui="none"` (CSS rule: `min-height: 0`)
2. Add a smooth CSS transition to mitigate hydration layout shift
3. Secondary sweep: replace remaining `h-screen-fix → h-full` in waitlist screens

**Target Release:** v0.6.6 (patch release, standalone)

**Strengths:**
- Correctly identifies that Plan 020 addressed the symptom (nested viewport claims) but left the root cause untouched (slot reservation)
- Clear milestone sequencing with dependencies
- User-confirmed scope decisions (transition included, v0.6.6 target)
- Explicit non-goals prevent scope creep
- Duration estimates provided (satisfies PI 004 feedback)

---

## Unresolved Open Questions

✅ **ALL OPEN QUESTIONS RESOLVED**

| Open Question | Status | Resolution |
|---------------|--------|------------|
| Target release v0.6.6? | `[CLOSED]` | Confirmed |
| Include smooth transition? | `[CLOSED]` | Confirmed |

**No blocking open questions remain.** The plan is ready for implementation.

---

## Architectural Alignment

✅ **ARCHITECTURALLY SOUND**

**Principle Reinforcement:**
Plan 020 established the architectural principle: *"Root layout is single viewport-height owner."* Plan 021 extends this correctly by noting that the **slot reservation violated the principle in a different way** — not by claiming viewport height, but by unconditionally consuming it.

**CSS Change Analysis:**
- Adding `.mobile-bottom-ui-slot[data-mobile-ui='none'] { min-height: 0; }` is a targeted, attribute-based rule that respects the existing `data-mobile-ui` mechanism
- Adding `transition: min-height 0.15s ease-out` aligns with existing transitions in the codebase and mitigates hydration shift (a concern raised in Plan 020)

**Secondary Sweep:**
Replacing `h-screen-fix → h-full` in `WaitlistScreen.tsx`, `WaitlistSuccessScreen.tsx`, and `HomePageShell.tsx` is consistent with Plan 020's approach. These were explicitly deferred from Plan 020 as "secondary sweep candidates," and the analysis confirms they are in the onboarding state machine.

**No conflicts with:**
- Next.js 15 App Router patterns
- Postgres-first philosophy (this is pure frontend)
- Server/Client component boundaries

---

## Scope Assessment

✅ **WELL-SCOPED WITH CLEAR BOUNDARIES**

### In Scope (justified):
1. CSS slot collapse — directly addresses root cause
2. CSS transition — user-confirmed, mitigates layout shift
3. Secondary sweep (waitlist screens) — these are **in the onboarding flow** and will be affected by the same geometry change
4. Manual iPhone SE verification — essential for UAT

### Explicit Non-Goals (appropriate):
- Redesigning bottom navigation UI
- Changing which pages show footer vs navbar
- Introducing new UI components

### Scope Risk:
The plan explicitly notes "Out-of-scope pages still contain `h-screen-fix`" and defers them. This is **acceptable** — the scope is focused on the user-reported funnel. Additional pages can be tracked separately.

---

## Technical Debt Risks

✅ **LOW DEBT INTRODUCTION**

| Risk | Assessment |
|------|------------|
| Spreading conditional CSS rules | LOW — the `data-mobile-ui` attribute already exists; this is consistent usage |
| Transition performance | LOW — `min-height` transition is GPU-friendly; short duration (150ms) |
| Remaining `h-screen-fix` elsewhere | ACKNOWLEDGED — plan explicitly limits scope and recommends tracking separately |

The plan does not introduce new patterns; it completes the pattern established in Plan 020.

---

## Findings

### No CRITICAL or HIGH findings.

### MEDIUM Findings

#### M-001: Implicit Dependency on SSR `mobileUiMode` Initial Value
- **Severity**: MEDIUM
- **Status**: RESOLVED
- **Location**: Plan section "Risks and Mitigations" (first risk)
- **Description**: The plan mentions hydration layout shift when the slot expands from 0 → 128px "after mount." This implies SSR renders `data-mobile-ui="none"` initially, and the client-side hydration may set a different value. The plan relies on the transition to smooth this, but does not clarify what the SSR initial value actually is.
- **Impact**: If the SSR value is not `"none"`, the transition mitigation may be unnecessary (or may work in reverse).
- **Recommendation**: No blocker — the implementer should verify the SSR initial value during implementation. If SSR always returns `"none"` (because `shouldShowMobileFooter` logic runs on client only), the transition approach is correct.
- **Verdict**: This is an implementation detail, not a plan flaw.

### LOW Findings

#### L-001: No Explicit Regression Test for Desktop Layout
- **Severity**: LOW
- **Status**: RESOLVED
- **Location**: Milestone 3 (Testing Strategy)
- **Description**: The plan focuses on iPhone SE Safari verification but does not explicitly mention desktop regression testing. The slot collapse could theoretically affect desktop layout if `data-mobile-ui="none"` is set on desktop.
- **Impact**: Unlikely regression — the bottom slot is already hidden on desktop via other mechanisms, but worth a sanity check.
- **Recommendation**: Implementer/QA should include a brief desktop viewport sanity check.

---

## Risk Assessment

| Risk | Severity | Mitigation in Plan | Adequacy |
|------|----------|-------------------|----------|
| Visible layout shift on mount | MEDIUM | CSS transition | ✅ Adequate |
| Screens relying on implicit bottom padding | MEDIUM | Ensure explicit spacing utilities | ✅ Adequate |
| Out-of-scope pages with same pattern | LOW | Track separately | ✅ Adequate |

**Overall Risk Level:** LOW — The plan is a focused CSS fix with clear mitigations.

---

## Recommendations

1. **Proceed to implementation** — No blocking findings.
2. **Implementer should verify** the SSR initial value of `mobileUiMode` to confirm the transition direction (Finding M-001).
3. **QA should include** a brief desktop sanity check alongside iPhone SE verification (Finding L-001).

---

## Questions for Planner

None. The plan is complete and ready for implementation.

---

## Verdict

### ✅ APPROVED

**Rationale:**
- Value statement is clear and conversion-critical
- Root cause correctly identified (slot reservation, not nested viewport claims)
- Architectural alignment is strong (completes Plan 020's principle)
- Scope is appropriate with explicit non-goals
- All open questions resolved
- Duration estimates provided
- No CRITICAL or HIGH findings

**Gate Passed:** Plan document exists in planning, verdict is APPROVED.

---

## Revision History

| Revision | Date | Summary |
|----------|------|---------|
| Initial | 2026-02-24 | First review — APPROVED |
