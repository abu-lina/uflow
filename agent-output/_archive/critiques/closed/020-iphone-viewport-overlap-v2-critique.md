---
ID: 20
Origin: 20
UUID: b7e3f41a
Status: Resolved
---

# 020 — iPhone SE Viewport Overlap v2 — Plan Critique

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-02-24T15:00Z | Planner → Critic | Review Plan 020 for approval | Initial critique |
| 2026-02-24T15:20Z | Planner → Critic | Re-review after revisions | Approved after scope lock + duration estimates |

## Artifact & Analysis

- **Plan**: [agent-output/planning/020-iphone-viewport-overlap-v2-plan.md](../planning/020-iphone-viewport-overlap-v2-plan.md)
- **Analysis**: [agent-output/analysis/closed/020-iphone-viewport-overlap-v2-analysis.md](../analysis/closed/020-iphone-viewport-overlap-v2-analysis.md)
- **Date**: 2026-02-24
- **Status**: Initial Review

## Value Statement Assessment

✅ **CLEAR AND USER-FOCUSED**

The value statement correctly identifies the core user need: mobile users (iPhone SE / iOS Safari) need CTAs and content to remain visible and interactable without being clipped behind bottom UI. This directly addresses the conversion funnel blockage reported by the user.

The statement appropriately labels this as "conversion-critical" — the landing CTA and city-selection CTAs are indeed part of the primary onboarding flow, making this a P0 fix despite being a bugfix.

**Alignment with Master Product Objective**: The plan supports "Make UFlow the first thought" by removing friction from the core discovery journey. Users cannot discover providers if they can't access the CTAs to enter the funnel.

## Overview

Plan 020 proposes a remediation for the persistent iPhone SE viewport overlap issue (Plan 019 v0.6.4 was insufficient). The root cause analysis identified a nested viewport height problem: child screens claim `100dvh` inside a parent container that only has `100dvh - 128px` of available space due to the `mobile-bottom-ui-slot` reservation.

**Approach summary:**
- Primary: Remove nested `h-screen-fix` from child screens, use fill-parent sizing (`flex-1`, `h-full`) instead
- Secondary: Decide whether to collapse the bottom slot when `data-mobile-ui="none"` (OPEN QUESTION)

**Target Release**: v0.6.5 (patch release, standalone)

**Strengths:**
- Correctly identifies the architectural fix (single viewport height owner)
- Clear primary/secondary file lists with explicit priority
- Recognizes hydration layout shift risk with the slot-collapse option
- Includes manual iPhone SE verification as a milestone

**Concerns:**
- One unresolved OPEN QUESTION marked as "blocking"
- No duration estimate (Planner instructions require duration estimates per PI 004)
- Version mismatch: roadmap says v0.6.1, repo says v0.6.4, plan targets v0.6.5

## Unresolved Open Questions

✅ Plan revisions resolved the previously blocking decision.

### Open Question 1 (Previously Blocking) — RESOLVED

**Decision taken**: Option 1 — keep `mobile-bottom-ui-slot` reserved height behavior unchanged.

This removes hydration shift risk while keeping the fix focused on the true root cause (nested viewport-height claims).

### Open Question 2 (Non-blocking)

**Question**: Should we include the secondary sweep candidates (waitlist/provider pages) in this same release, or limit to the onboarding funnel only?

**Impact**: Scope boundary question. Secondary candidates have the same pattern but were not user-reported.

**Recommendation**: This can be deferred to implementation discretion or QA feedback. It does not block starting work on the primary targets.

## Architectural Alignment

✅ **ARCHITECTURALLY SOUND**

The plan correctly identifies the architectural principle: **single source of truth for viewport height**. The outer `RootClientLayout` establishes the viewport boundary, and children should fill available space rather than claiming their own viewport height.

**Alignment with Next.js 15 patterns:**
- No changes to Server/Client component boundaries
- No new components or data flow changes
- Pure layout/styling fix within existing component structure

**Alignment with existing architecture:**
- Respects the `mobile-bottom-ui-slot` intentional design (prevents layout shift)
- Maintains the fixed-position bottom navigation pattern
- No impact on tsvector search, DB layer, or API routes

**No Postgres-first philosophy conflicts**: This is pure frontend CSS/layout.

**No premature service additions**: No external services proposed.

## Scope Assessment

✅ **WELL-SCOPED**

**In Scope (clear and justified):**
1. Remove nested `h-screen-fix` from 6 primary target files
2. Fix loading/error/fallback states with the same pattern
3. Manual iPhone SE Safari verification
4. Version bump + changelog

**Explicit Non-Goals (appropriate):**
- No bottom nav UI redesign
- No `fixed` → `sticky` conversion
- No new UI components

**Scope boundaries:**
- Primary targets: onboarding funnel (landing, city-selection, city page)
- Secondary candidates: waitlist/provider pages (deferred decision)

**Concern — Missing duration estimate:**
Per Process Improvement 004, Planner must include duration estimates. This plan lacks time estimates for milestones, making it harder to track velocity and identify blockers early.

**Suggested durations (for Planner to add):**
- M1 (Remove nested h-screen-fix): 2-3 hours
- M2 (Slot behavior decision + impl): 1-2 hours
- M3 (Validation + device verification): 2-3 hours
- M4 (Version + changelog): 30 minutes
- **Total estimated duration**: 6-9 hours

## Technical Debt Risks

🟡 **MEDIUM — Manageable with vigilance**

### Risk 1: Scroll Behavior Changes (MEDIUM)

**Description**: Removing `h-screen-fix` from child screens changes which element is the scroll container. If not carefully implemented, this could introduce double-scroll (scroll-within-scroll) or break intended centering layouts.

**Impact**: User experience regression — scrolling feels broken, or loading states no longer center properly.

**Mitigation (from plan)**: "Enforce one scroll container (prefer `<main>`), ensure child screens use `min-h-0` appropriately."

**Additional recommendation**: QA should test scroll behavior on each affected screen, especially on:
- Screens with long content (should scroll smoothly in `<main>`)
- Loading/error states (should remain centered without scrolling)

### Risk 2: Hydration Layout Shift (LOW if Option 1, MEDIUM if Option 2)

**Description**: If Option 2 is chosen (collapse slot when `data-mobile-ui="none"`), there's a risk of visible layout shift when the footer/navbar appears after hydration.

**Impact**: Visual "jump" during page load, poor perceived performance.

**Mitigation (from plan)**: "Treat slot-collapse as optional; only implement with explicit decision + verification."

**Recommendation**: If Option 2 is pursued, capture baseline screen recordings on iPhone SE before/after to compare shift. If shift is noticeable (>10px or causes reflow), reject Option 2 and proceed with Option 1 only.

### Risk 3: Incomplete File Coverage (LOW)

**Description**: The analysis identified 13+ files with nested `h-screen-fix`, but the plan only lists 6 primary targets. If secondary candidates are not swept, they may still have the same issue.

**Impact**: Issue recurs on non-primary screens (waitlist, provider pages).

**Mitigation**: Plan explicitly lists secondary candidates and defers decision to Open Question 2.

**Recommendation**: QA/UAT should at minimum verify secondary candidates are NOT broken by the fix (even if not explicitly targeted). If they exhibit the same issue, file a follow-up plan rather than expanding scope mid-implementation.

## Findings

### ✅ CLEAR (No Issues)

| Issue | Status | Description | Impact | Recommendation |
|-------|--------|-------------|--------|----------------|
| Value Statement | ✅ Clear | User-focused, conversion-critical, aligned with Master Product Objective | N/A | None |
| Architectural Fit | ✅ Clear | Single viewport height owner, no server/client boundary changes | N/A | None |
| Explicit Non-Goals | ✅ Clear | Correctly excludes UI redesign and new components | N/A | None |
| Testing Strategy | ✅ Clear | Unit/integration/manual verification on iPhone SE | N/A | None |

### 🟡 MEDIUM (Process Improvements)

| Issue | Status | Description | Impact | Recommendation |
|-------|--------|-------------|--------|----------------|
| M-001: Missing Duration Estimates | 🟡 Medium | Plan lacks milestone time estimates (PI 004 requirement) | Velocity tracking, blocker identification | Planner should add 6-9 hour total estimate |
| M-002: Version Mismatch Documented | 🟡 Medium | Roadmap says v0.6.1, repo says v0.6.4, plan targets v0.6.5 | Confusion, potential version conflict | DevOps should update roadmap "Current Version" field after each release |

### 🟠 OPEN QUESTION (Blocking)

| Issue | Status | Description | Impact | Recommendation |
|-------|--------|-------------|--------|----------------|
| OQ-001: Bottom Slot Behavior | 🟠 Open Question (Blocking) | Choose Option 1 (keep reserved height) vs Option 2 (collapse when none) | Affects M2 scope and hydration risk | **RECOMMEND OPTION 1** — it's sufficient to fix the issue, avoids hydration risk, maintains intentional layout shift prevention |

## Questions for Planner

1. **Duration estimates**: Can you add time estimates for each milestone to comply with PI 004?
2. **Bottom slot decision**: Do you recommend Option 1 (safer, sufficient) or Option 2 (tidier, riskier)? If Option 2, what's the acceptable threshold for hydration shift?
3. **Secondary sweep**: Should we treat secondary candidates (waitlist/provider pages) as out-of-scope for this release, or include them if time permits?

## Risk Assessment

**Overall Risk**: 🟡 **MEDIUM-LOW**

- **Technical Risk**: LOW — Approach A (remove nested h-screen-fix) is straightforward CSS/layout refactor with clear implementation pattern
- **Scope Risk**: LOW — Well-bounded to onboarding funnel, explicit non-goals
- **Testing Risk**: MEDIUM — Requires manual iPhone SE verification; no automated way to catch viewport overlap regressions
- **Debt Risk**: LOW — Fix actually REDUCES debt by eliminating the nested viewport height anti-pattern
- **Hydration Risk**: LOW (if Option 1), MEDIUM (if Option 2)

**Risk Summary**: This is a low-risk, high-value fix IF the OPEN QUESTION is resolved before implementation. The primary approach (Approach A) is architecturally correct and sufficient. The secondary approach (Option 2) is optional and introduces risk without corresponding value given that Approach A already solves the problem.

## Recommendations

### 1. Resolve OPEN QUESTION Before Implementation

**Decision Required**: Choose Option 1 vs Option 2 for bottom slot behavior.

**Critic Recommendation**: **Choose Option 1 (keep reserved height)**

**Rationale:**
- Approach A (remove nested h-screen-fix) is sufficient to fix all three reported screens
- The slot reservation was intentionally designed to prevent hydration layout shift
- Option 2 adds complexity and risk (hydration shift) without adding value
- The 128px reservation on pages where no bottom nav appears is acceptable — those pages are scrollable anyway (e.g., landing during splash)
- If future need emerges to reclaim that space, it can be a separate, targeted optimization after this fix is validated

### 2. Add Duration Estimates

Planner should add time estimates per PI 004. Suggested:
- M1: 2-3 hours
- M2: 1-2 hours (or 0 if Option 1 chosen and M2 is skipped)
- M3: 2-3 hours
- M4: 30 minutes
- **Total: 6-9 hours**

### 3. Limit Scope to Primary Targets

Secondary candidates (waitlist, provider pages) should be out-of-scope for v0.6.5 unless QA identifies them as broken during testing. If they have the same issue, file a follow-up plan rather than expanding scope.

### 4. Update Roadmap After Release

DevOps should update roadmap "Current Version" field after each release to prevent version drift. Roadmap currently says v0.6.1 but repo is v0.6.4.

### 5. Consider CSS Regression Tests (Future)

This is the second viewport-related bugfix (Plan 019 then Plan 020). Consider adding automated visual regression tests for critical mobile screens to catch overlap issues before deployment. This is out-of-scope for Plan 020 but worth noting for future PI work.

## Verdict

✅ **APPROVED**

Plan updates addressed the prior findings:
- OQ-001 resolved with Option 1 (no slot behavior change)
- Duration estimates added
- Secondary sweep explicitly treated as out-of-scope for v0.6.5 unless QA/UAT confirms impact

## Revision History

| Date | Artifact Changes | Findings Addressed | New Findings | Status Change |
|------|------------------|-------------------|--------------|---------------|
| 2026-02-24T15:00Z | Initial plan review | N/A | M-001 (duration), M-002 (version), OQ-001 (slot) | Initial → Revision Requested |
