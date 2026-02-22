---
ID: 007
Origin: 007
UUID: e7f4a31c
Status: OPEN
---

# 007 — Performance Improvements Plan Critique

**Artifact**: [agent-output/planning/007-performance-improvements-v0.4.0.md](../planning/007-performance-improvements-v0.4.0.md)
**Analysis**: [agent-output/analysis/closed/007-performance-review-analysis.md](../analysis/closed/007-performance-review-analysis.md)
**Date**: 2026-02-22
**Status**: Initial Review

## Changelog

| Date       | Handoff          | Request             | Summary                    |
| ---------- | ---------------- | ------------------- | -------------------------- |
| 2026-02-22 | Planner → Critic | Initial plan review | First critique of Plan 007 |

---

## Value Statement Assessment

**Present**: ✅ Yes — User story format with clear "As a / I want / So that" structure
**Clarity**: ✅ Pass — "pages load quickly", "searches feel instant", "browse and contact without friction" are observable outcomes
**Alignment**: ✅ Pass — Supports Master Product Objective ("first thought when any Muslim seeks a service") by reducing friction in discovery-to-contact flow
**Directness**: ✅ Pass — Value delivered directly via performance improvements; no deferral or workaround

**Verdict**: **PASS** — Value statement is complete and well-aligned.

---

## Overview

Plan 007 is an internal engineering improvement plan targeting the v0.4.0 release. It focuses on:

1. Reducing frontend bundle size from 687 kB to ≤350 kB
2. Replacing forbidden ILIKE usage with tsvector RPC search
3. Adding missing GIN indexes for search functions
4. Bounding previously unbounded data fetches
5. Reducing middleware bundle size

The plan derives from Analysis 007 which identified concrete performance bottlenecks with supporting evidence (build output, code locations, migration review).

---

## Architectural Alignment

| Check                     | Assessment                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Postgres-first philosophy | ✅ **Aligned** — Plan enforces tsvector over ILIKE, adds GIN indexes, explicitly defers Redis/Elasticsearch |
| No premature services     | ✅ **Aligned** — Out-of-scope list explicitly excludes adding Redis/Elasticsearch/queues                    |
| Search implementation     | ✅ **Aligned** — Milestone 2 & 3 directly implement the `TECH_STACK_BEST_PRACTICES.md` search guidance      |
| PWA/CDN strategy          | ✅ **Neutral** — Plan doesn't change caching strategy (correctly not in scope)                              |

**Verdict**: **Architecturally sound** — Plan respects and reinforces existing architecture constraints.

---

## Scope Assessment

**In-scope items**: Well-defined with clear boundaries. Frontend bundle, ILIKE removal, GIN indexes, query limits, middleware size.

**Out-of-scope items**: Appropriately deferred:

- Cursor-based pagination (not needed at current scale)
- Major UI redesigns (not a performance plan)
- External services (explicitly rejected per architecture)
- Broad Iconify replacement (conditional deferral if bundle target met)

**Scope clarity**: ✅ **Good** — The locked scope decisions for Iconify/Motion provide clear guidance to implementers about what is mandatory vs conditional.

**Risk**: One minor scope ambiguity — see Finding F-1.

---

## Technical Debt Risks

| Item                               | Assessment                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ILIKE removal                      | ✅ **Reduces debt** — Enforces project rule compliance                                                                                                  |
| Unbounded queries                  | ✅ **Reduces debt** — Prevents future scaling issues                                                                                                    |
| Middleware in-memory rate limiting | ⚠️ **Documents but doesn't fix** — Acceptable for v0.4.0 (single-instance), but creates future debt if horizontal scaling happens without addressing it |
| Motion/Iconify in shell            | ✅ **Reduces debt** — Trimming global shell improves baseline for future features                                                                       |

**Verdict**: **Net debt reduction** — Plan addresses more debt than it creates.

---

## Findings

### F-1: Middleware ≤50 kB Target May Be Unachievable Without Behavior Change

- **Severity**: LOW
- **Status**: OPEN
- **Location**: Milestone 6 acceptance criteria
- **Description**: The acceptance criteria says "Middleware size reduced OR a clear, documented rationale for remaining size". This is appropriately flexible, but there's no analysis of what's actually in the 79.3 kB middleware bundle and whether ≤50 kB is realistic without removing functionality.
- **Impact**: Implementer may spend effort chasing an unachievable target.
- **Recommendation**: Accept as-is since the "OR document rationale" escape hatch exists. However, recommend Implementer do a quick middleware bundle breakdown first to determine feasibility before investing in reduction work.

### F-2: UAT Data Sizing — Cleanup Procedure Not Specified

- **Severity**: LOW
- **Status**: OPEN
- **Location**: Milestone 2 deliverables
- **Description**: Plan says "document how it is generated and cleaned up" for UAT test data, but doesn't specify whether cleanup is manual or automated, or who is responsible for ensuring UAT isn't polluted with synthetic data before production-like validation.
- **Impact**: UAT environment could end up with stale synthetic data affecting other testing.
- **Recommendation**: Add explicit instruction: synthetic data should be generated in a transaction or with a cleanup script that runs after validation; QA should verify UAT is clean before marking milestone complete.

### F-3: Bundle Target (≤350 kB) Rationale Not Documented

- **Severity**: LOW
- **Status**: OPEN
- **Location**: Success Metrics (Frontend)
- **Description**: The target of ≤350 kB is a ~50% reduction from 687 kB, but the plan doesn't explain why this specific number was chosen (e.g., industry benchmark, Lighthouse score threshold, competitor analysis).
- **Impact**: If implementer achieves 400 kB and can't go lower without major refactoring, there's no guidance on whether that's acceptable.
- **Recommendation**: Add a note: "350 kB target is based on halving current size as a first step; if achieved, reassess for further reduction in future releases. 400 kB with documented blockers is acceptable for v0.4.0."

---

## Unresolved Open Questions

**None** — All 3 original OPEN QUESTIONs are marked as RESOLVED with clear decisions.

---

## Risk Assessment

| Risk                                        | Likelihood | Impact | Mitigation in Plan                                                                                            |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Icon library migration causes missing icons | Medium     | Medium | ✅ Mitigated — Iconify replacement is conditional, not mandatory                                              |
| Removing motion changes perceived polish    | Medium     | Low    | ✅ Mitigated — Only decorative animations removed; interaction-critical kept                                  |
| Migration rollback difficulty               | Low        | High   | ✅ Mitigated — Plan notes additive migrations preferred; RPC signatures stable                                |
| Middleware simplification breaks auth       | Medium     | High   | ⚠️ Partial — Plan notes risk but no specific mitigation; recommend Implementer add auth flow regression tests |

---

## Recommendations

1. **Accept F-1 as-is** — The "OR document" escape hatch is sufficient; Implementer should do a quick feasibility check first.
2. **Clarify F-2** — Add one sentence about UAT data cleanup responsibility.
3. **Accept F-3 as-is** — Add a flexibility note but don't block on it; 350 kB is a reasonable ambitious target.
4. **Add auth regression tests** — Implementer should add explicit test coverage for auth/redirect flows before simplifying middleware.

---

## Verdict

**APPROVED** — Plan is clear, well-scoped, architecturally aligned, and directly delivers user value. All open questions are resolved. Findings are LOW severity and do not block implementation.

Gate for Implementer: Implementer should review findings F-1, F-2, F-3 and decide whether to address them before starting or accept them as documented risks.

---

## Revision History

| Revision | Date       | Changes      | Findings Addressed | New Findings  | Status Changes |
| -------- | ---------- | ------------ | ------------------ | ------------- | -------------- |
| Initial  | 2026-02-22 | First review | —                  | F-1, F-2, F-3 | —              |
