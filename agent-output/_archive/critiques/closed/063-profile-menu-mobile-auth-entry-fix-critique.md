---
ID: 063
Origin: 063
UUID: a7e4f3b2
Status: Resolved
---

# Critique — Plan 063: Restore Mobile Profile Entry When Logged Out

## Critique Header

- Artifact: `agent-output/planning/063-profile-menu-mobile-auth-entry-fix-plan.md`
- Analysis: `agent-output/analysis/closed/063-profile-menu-stage-gating-analysis.md`
- Date: 2026-03-26
- Status: Initial Review

## Changelog

| Timestamp (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-26T21:33Z | Planner → Critic | Initial review | First critique of Plan 063 v1.0 |

---

## Value Statement Assessment

**Present**: Yes — user story format with "As a… I want… so that…" structure.  
**Clarity**: Clear. The "so that" outcome is verifiable: "I can always log in / sign up… regardless of device, onboarding state, or authentication status."  
**Alignment**: Aligned with product objective (user acquisition, mobile-first). Auth-entry blockers directly harm onboarding funnel.  
**Directness**: Value is delivered directly — no deferrals on the core deliverable.

**Verdict: PASS**

---

## Overview

Plan 063 correctly identifies two distinct bugs under one umbrella and proposes separate milestones for each. The plan is well-structured: clear scope boundaries, explicit out-of-scope items, decision record with one deferred item properly tagged, and a milestone dependency graph. The analysis-to-plan handoff is clean and traceable.

---

## Architectural Alignment

The plan respects the existing architecture:

- Does not propose new navigation surfaces or pages.
- Preserves Stage 3 behavior (Decision 3).
- Implementation surface areas are constrained to CSS (`globals.css`) and navigation utility logic (`navigationUtils.ts`), both of which are the correct targets.
- No new external dependencies or services proposed.

**Verdict: PASS**

---

## Scope Assessment

Scope is well-bounded and appropriate:

- Bug A (CSS): narrow, single-file change.
- Bug B (logic): narrow, single-function change in `shouldShowCityEarlyAccessNavbar`.
- Testing is scoped to logic (navigation utility), not end-to-end.
- Explicit out-of-scope items prevent scope creep into onboarding redesign.

**Verdict: PASS**

---

## Technical Debt Risks

- **Dual-purpose `/` route**: The analysis identified that `/` serves as both landing page and onboarding entry. The plan constrains the fix to `/` only (Decision 4 defers `/about` and `/welcome`), which is appropriate. No new debt introduced.
- **`hasCompletedOnboarding()` vs `skipWaitlist` inconsistency**: The analysis identified this as an architecture weakness. The plan does not propose resolving this systemic inconsistency — it routes around it by changing `shouldShowCityEarlyAccessNavbar` directly. This is pragmatic for a patch fix, but the inconsistency remains as latent debt. Acceptable at this scope.

**Verdict: PASS (with LOW observation — see F-4 below)**

---

## Unresolved Open Questions

No `OPEN QUESTION` markers found in the plan document. ✓

---

## Decision Record Check

- Decisions 1–3: `[RESOLVED]` — all clear, well-rationalized.
- Decision 4: `[DEFERRED: Product + reason: UX tradeoff]` — properly tagged with target ("follow-up plan if needed").

**Verdict: PASS**

---

## Duration Estimates Check

Present and reasonable. Implementation range (2–6h) appropriately reflects the two-bug scope. Uncertainty drivers are noted.

**Verdict: PASS**

---

## Findings

### F-1 — Milestone 1 may already be on the branch (LOW / Process)

| Attribute | Value |
|---|---|
| **Issue** | Milestone 1 (Bug A: iOS hit-testing CSS fix) appears to already be implemented on the feature branch (commit `1c9259b3`, v0.9.5 slot-level `pointer-events: auto` fix). The plan does not acknowledge prior implementation. |
| **Status** | OPEN |
| **Impact** | The Implementer may duplicate work or be confused about what remains to be done. |
| **Recommendation** | Add a note to Milestone 1 clarifying that the CSS fix already exists on the feature branch and the remaining task is to carry it forward during rebase/merge onto `main`. This keeps the plan honest about what "implementation" means for this milestone. |

---

### F-2 — Milestone 2 acceptance criteria should specify which nav component appears (MEDIUM / Clarity)

| Attribute | Value |
|---|---|
| **Issue** | Milestone 2 says "visiting `/` on mobile shows a Profile icon." It does not specify whether the expected nav is `CityEarlyAccessNavbar` or `MobileFooterBar` for the fresh-user case. Since stage = `'onboarding'` for fresh users, the Implementer needs to know which component should render. |
| **Status** | OPEN |
| **Impact** | Ambiguity in implementation target. The analysis confirms `CityEarlyAccessNavbar` is the correct target (it's the early-access nav for Stage 1/2/onboarding), but the plan should state this explicitly. |
| **Recommendation** | Amend Milestone 2 acceptance criteria: "visiting `/` on mobile shows the `CityEarlyAccessNavbar` with a Profile icon that routes to `/login`." |

---

### F-3 — Missing: interaction between Bug B fix and `RootPageContent` onboarding rendering (MEDIUM / Completeness)

| Attribute | Value |
|---|---|
| **Issue** | The analysis identified that `RootPageContent` conditionally renders onboarding content (splash screen) vs city content based on stage. If `shouldShowCityEarlyAccessNavbar` is changed to show the navbar for fresh users on `/`, the Implementer should verify that the page content behind the navbar is coherent (i.e., fresh users don't see an empty city state they haven't selected a city for). The plan does not address this interaction. |
| **Status** | OPEN |
| **Impact** | The fix could produce a valid Profile icon over an incoherent page state — a UX concern that the plan should explicitly acknowledge, even if the answer is "acceptable: the user can tap Profile to log in, which is the primary goal." |
| **Recommendation** | Add a brief note to the Risks section or Milestone 2 acceptance criteria: confirm that showing the navbar on `/` for fresh users does not conflict with `RootPageContent`'s onboarding rendering. State the expected page state (e.g., "onboarding splash content behind the navbar is acceptable"). |

---

### F-4 — `hasCompletedOnboarding()` / `skipWaitlist` inconsistency remains untracked (LOW / Debt)

| Attribute | Value |
|---|---|
| **Issue** | The analysis (Finding 2) identified a systemic inconsistency: `useAppStage()` respects `skipWaitlist` but `hasCompletedOnboarding()` does not. This plan routes around it rather than fixing it. The plan does not create an open-actions item or reference for future tracking. |
| **Status** | OPEN |
| **Impact** | Low for this fix, but the inconsistency could cause similar bugs in future navigation features. Without a tracking entry, it may be forgotten. |
| **Recommendation** | Add a single bullet to either the Risks section or a new open-actions tracker entry: "Latent: `hasCompletedOnboarding()` does not respect `skipWaitlist` — track for future alignment." |

---

### F-5 — Planner chatmode file missing (LOW / Process)

| Attribute | Value |
|---|---|
| **Issue** | `.github/chatmodes/planner.chatmode.md` does not exist. Per Critic operating instructions, this should be read at review start. |
| **Status** | OPEN |
| **Impact** | No impact on this review. Noted for process completeness. |
| **Recommendation** | No action required for Plan 063. Consider creating the chatmode file in a future process-improvement task. |

---

## Risk Assessment

The plan's risk inventory is adequate for its scope. The two risks identified (dual-purpose `/` route, iOS version variability) are the most likely failure modes.

One risk not listed but worth noting: the feature branch has significant divergence history (`session/060-profile-menu-fix` has been rebased/force-pushed multiple times). Milestone 0 (rebase readiness) addresses this, but a note about "start from clean `origin/main`" could save the Implementer time given the branch's history.

---

## Recommendations

1. Address F-2 (specify `CityEarlyAccessNavbar`) — ensures Implementer targets the correct component.
2. Address F-3 (page content coherence) — brief acknowledgment is sufficient.
3. Consider F-1 and F-4 — low priority, can be addressed in revision or deferred to implementation notes.
4. F-5 is informational only.

---

## Verdict

**APPROVED** — with two MEDIUM findings (F-2, F-3) that should be addressed but are not blocking. The plan is clear, complete, well-scoped, and architecturally aligned. The value statement is strong and the delivery is direct. The Implementer has sufficient guidance to proceed.

Findings F-2 and F-3 can be addressed either by a quick plan revision or by the Implementer confirming the answers during implementation.

---

## Revision History

| Version | Date | Changes |
|---|---|---|
| Initial | 2026-03-26 | First critique of Plan 063 v1.0 — APPROVED with 2 MEDIUM, 3 LOW findings |
