---
ID: 076
Origin: 076
UUID: b4e8f21a
Status: Resolved
---

# 076 — iOS Footer CTA Overlay Fix v2 — Critique

| Field | Value |
|-------|-------|
| Artifact | `agent-output/planning/076-bg-footer-scroll-v2-plan.md` |
| Analysis | `agent-output/analysis/closed/076-bg-footer-scroll-v2-analysis.md` |
| Date | 2026-04-03T17:35Z |
| Status | Initial |

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-03T17:35Z | Planner → Critic | Initial review of Plan 076 | APPROVED — all findings RESOLVED or DEFERRED with owners |

## Value Statement Assessment

**PASS**. Clear "As a … I want … so that …" user story. Direct value delivery: fixes a confirmed-on-UAT bug where the footer CTA is obscured during iOS overscroll. No deferral or workaround — the plan directly addresses all 4 root causes identified in analysis 076.

## Overview

Plan 076 is a well-scoped follow-up to Plan 075 which was deployed but insufficient. The analysis identified 4 structural root causes (F1–F4) with confidence levels ranging from L1 Proven to L3 Inferred. The plan maps each finding to a concrete milestone with acceptance criteria. CSS-only changes across 3 files, no logic changes.

## Architectural Alignment

**PASS**. The plan aligns with the architectural direction established by Plan 020 analysis:

- Replacing `h-screen-fix` with `flex-1 min-h-0` on nested children is the recommended approach from Plan 020 (13+ components identified; this plan applies it to the reported surface only — appropriate scoping per D6).
- Adding `overscroll-none` to `<main>` is a defensive layer consistent with the project's approach to iOS Safari quirks (e.g., `h-screen-fix`, `pb-safe`, `-webkit-fill-available`).
- Moving the fixed footer outside the scroll container is architecturally correct — `position: fixed` should not depend on DOM ancestry.

## Scope Assessment

**PASS — well-bounded**.

- 3 files, CSS-only, estimated 2–4 hours including device testing
- Explicit D6 decision scoping to only the reported surfaces (not the broader 13+ component `h-screen-fix` cleanup)
- M5 (version artifacts) properly deferred to DevOps with version TBD at Stage 1

## Technical Debt Risks

**LOW**. This plan *reduces* debt from Plan 075 and progresses toward the Plan 020 architectural recommendation. No new abstractions or patterns introduced. The `h-screen-fix` → `flex-1 min-h-0` change on ProviderDetailPage sets a precedent for the remaining 12+ components but doesn't create a mandatory follow-up urgency.

## Findings

| # | Issue | Severity | Status | Description | Impact | Recommendation |
|---|-------|----------|--------|-------------|--------|----------------|
| F1 | ProviderCardModal scroll container structure unclear in M3 | LOW | Deferred | M3 says "verify the modal's inner scroll container has `overscroll-none`" and "if the footer CTA is inside a scroll container, move it outside." The modal uses `createPortal` to `document.body` with a `fixed inset-x-0 bottom-0 top-6` outer shell and `overflow-y-auto` on the inner card div (L492). The footer (L780) is inside this `overflow-y-auto` div. M3 should be explicit: the footer at L780 needs to move outside the `overflow-y-auto` div at L492, becoming a sibling within the `fixed` modal container. | Implementer may miss the exact extraction point. | Implementer should use the code inspection at L468–L492 and L780 as a guide. The footer should be a child of the `fixed inset-x-0 bottom-0 top-6` container but outside the `overflow-y-auto` div. | Downstream owner: Implementer | Target artifact: `agent-output/planning/076-bg-footer-scroll-v2-plan.md` M3 | Trigger: Implementation start |
| F2 | `bg-gradient-to-b` on `flex-1` container — verify visual fill | LOW | Deferred | Replacing `h-screen-fix` (explicit viewport height) with `flex-1 min-h-0` (flex-computed height) changes how `bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]` resolves its gradient extent. If the content is shorter than the viewport, the gradient may not fill the visible area. On `h-screen-fix` the gradient always covered the full screen; on `flex-1` it covers the flex-computed height which may be less if `<main>` is the scroll container. | Visual regression: gradient may appear cut off on providers with little content. | Implementer should verify on a provider with minimal content (no offers, no needs, no community services). If gradient doesn't fill viewport, add `min-h-full` alongside `flex-1 min-h-0`. | Downstream owner: Implementer + QA | Target artifact: `agent-output/planning/076-bg-footer-scroll-v2-plan.md` M1 | Trigger: Implementation verification |
| F3 | Planner chatmode file missing | LOW | Deferred | `.github/chatmodes/planner.chatmode.md` does not exist. Process note per critic instructions. | No impact on this plan. | Create chatmode file in a future process improvement. | Downstream owner: Process | Target artifact: Process backlog | Trigger: Next process improvement cycle |

## Unresolved Open Questions

**None**. The plan's "OPEN QUESTION check" section confirms all decisions are RESOLVED. No `OPEN QUESTION` items found in the document.

## Decision Record Check

All 7 decisions (D1–D7) are marked `[RESOLVED]` with supporting rationale. No `[OPEN]` or `[DEFERRED]` decisions found.

## Duration Estimates Check

**PASS**. Duration Estimates section present with phase-level breakdown and uncertainty ratings. Total 2–4 hours is reasonable for CSS-only changes + device testing.

## Risk Assessment

The risk table is well-structured with appropriate mitigations. The highest-likelihood risk (MED: "Fix still insufficient") has a clear escalation path (GPU layer diagnostics via Safari Web Inspector). 

One additional risk not listed: **`overscroll-none` on `<main>` may suppress pull-to-refresh** on pages that rely on it. The plan acknowledges this in the risk table ("Pull-to-refresh (if any) would be affected — verify"). This project does not appear to use browser-native pull-to-refresh, so this is non-blocking.

## Recommendations

1. Proceed to implementation. Plan is clear, well-scoped, and architecturally sound.
2. Implementer should pay attention to F1 (modal extraction point) and F2 (gradient fill verification) above.
3. The M4 iOS device verification is the true quality gate — automated testing cannot validate compositor behavior.

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| Initial | 2026-04-03T17:35Z | First review — APPROVED |
