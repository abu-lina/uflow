---
ID: 019
Origin: 019
UUID: c4a1d9e2
Status: Resolved
---

# Critique: Plan 019 — iPhone SE viewport overlap bugfix

**Artifact**: [agent-output/planning/019-iphone-se-viewport-overlap-bugfix-v0.6.4.md](../planning/019-iphone-se-viewport-overlap-bugfix-v0.6.4.md)  
**Date**: 2026-02-23  
**Review Status**: Initial  
**Verdict**: **APPROVED**

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-02-23T18:30Z | Planner → Critic | Initial review | Plan 019 created for iOS Safari viewport bugfix |
| 2026-03-23T10:01Z | process-improvement | Close critique | Closed after release; Status: Resolved |

---

## Value Statement Assessment

| Check | Status | Notes |
|-------|--------|-------|
| Presence | ✅ PASS | Clear user story format present |
| Clarity | ✅ PASS | "So that I can complete onboarding/landing flows without missing CTAs" is measurable |
| Alignment | ✅ PASS | Mobile UX reliability supports Master Product Objective (first-thought access) |
| Directness | ✅ PASS | Value delivered directly via class replacement; no deferral |

**Assessment**: Value statement is well-formed, measurable, and aligned with product objectives.

---

## Overview

Plan 019 addresses an iPhone SE Safari bug where fixed headers/footers overlap page content due to `h-screen` (100vh) not accounting for iOS browser chrome. The plan proposes a **sweep** of all mobile-relevant full-height wrappers to replace `h-screen` with the project's existing `h-screen-fix` utility.

**Strengths**:
1. Leverages existing proven utility (`h-screen-fix`) with iOS-specific gating and Android safeguards
2. Root cause clearly identified (100vh vs dvh on iOS Safari)
3. Scope decision explicitly documented (sweep vs targeted)
4. Risk mitigations address both over-replacement and Android regression concerns

---

## Architectural Alignment

| Check | Status | Notes |
|-------|--------|-------|
| Respects patterns | ✅ PASS | Uses existing global CSS utility pattern from Plan 015 |
| No new abstractions | ✅ PASS | No new dependencies or architectural changes |
| Consistent with prior fixes | ✅ PASS | Follows same approach as MIUI/PWA fix (Plan 015) |

The fix aligns with the established viewport handling pattern in [src/styles/globals.css](../src/styles/globals.css#L617-L627) and respects the prior decision to gate `-webkit-fill-available` behind `@supports (-webkit-touch-callout: none)`.

---

## Scope Assessment

**Scope Boundaries**: Clear and well-defined.

| Aspect | Status |
|--------|--------|
| In scope clarity | ✅ Explicit: sweep of page/screen viewport wrappers |
| Out of scope clarity | ✅ Explicit: no layout redesign, no feature-flag changes |
| Classification guidance | ✅ Provides criteria (wrapper vs non-wrapper) |

**Observation (informational)**: The grep search reveals **~50 instances** of `h-screen` usage across the codebase. The plan correctly distinguishes between:
- **Full-height page wrappers** (in scope) — e.g., `SplashLayout`, `MobileSplashScreen`, `WaitlistScreen`
- **Non-wrapper uses** (out of scope) — e.g., loading states, inner panels, suspense fallbacks

The classification guidance in the plan is sufficient for the implementer to make these distinctions.

---

## Technical Debt Risks

| Risk | Severity | Assessment |
|------|----------|------------|
| Over-replacement breaks non-wrapper UI | LOW | Mitigated by explicit classification criteria |
| Android regression from sweep | LOW | `h-screen-fix` already validated on Android (Plan 015) |
| Missed wrappers cause recurring bug | LOW | Sweep approach minimizes this risk vs targeted fix |

No significant debt introduced. The sweep standardizes viewport handling across mobile screens.

---

## Findings

### Finding 019-C1: Missing explicit wrapper inventory

- **Severity**: LOW
- **Status**: RESOLVED
- **Location**: Plan section "1. Sweep: inventory all `h-screen` full-height wrappers"
- **Description**: The plan describes the inventory step but doesn't pre-populate a candidate list for the implementer.
- **Impact**: Minor — implementer must run the search themselves.
- **Recommendation**: Not blocking. The plan provides sufficient search guidance. Implementer can execute `grep -r "h-screen"` and classify during implementation.

### Finding 019-C2: Version mismatch between roadmap and package.json

- **Severity**: LOW
- **Status**: RESOLVED (previously noted in plan)
- **Location**: Plan "Version note" in Context section
- **Description**: Roadmap shows v0.6.1, but `package.json` shows v0.6.3. Plan acknowledges this.
- **Impact**: Minor confusion; plan correctly targets v0.6.4 as next patch.
- **Recommendation**: Roadmap agent should update "Current Version" after release. Not a blocker for this plan.

---

## Unresolved Open Questions

**None.** The prior open question (targeted vs sweep) was resolved with user decision: **sweep**.

---

## Risk Assessment

| Category | Level | Notes |
|----------|-------|-------|
| Technical risk | LOW | CSS class swap, no behavior change |
| Regression risk | LOW | Existing utility tested on multiple devices |
| Scope creep risk | LOW | Explicit out-of-scope boundaries |
| Integration risk | N/A | No external dependencies |

---

## Recommendations

1. **Proceed to implementation** — Plan is complete, actionable, and aligned.
2. During implementation, log the list of files changed for QA traceability.
3. Prioritize the reported screens (splash/onboarding) first to confirm the fix before sweeping other wrappers.

---

## Verdict

**APPROVED** — Plan 019 is ready for implementation.

- Value statement: Clear and aligned
- Scope: Well-defined with sweep decision locked
- Architecture: Consistent with existing patterns
- Risks: Adequately mitigated
- No blocking findings

---

**Next Step**: Handoff to ⑤ Implementer

