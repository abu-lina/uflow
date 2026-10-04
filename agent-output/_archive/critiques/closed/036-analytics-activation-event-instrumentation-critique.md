---
ID: 036
Origin: 036
UUID: c2f1a9d4
Status: Resolved
---

# Critique 036 — Analytics Activation & Event Instrumentation

**Artifact**: [agent-output/planning/036-analytics-activation-event-instrumentation-v0.7.1.md](../planning/036-analytics-activation-event-instrumentation-v0.7.1.md)
**Date**: 2026-03-08T08:00Z
**Status**: Initial Review
**Verdict**: **APPROVED**

### Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-08T08:00Z | Planner → Critic | Initial review | Plan created; first critique pass |
| 2026-03-08T08:10Z | Planner → Critic | Plan updated | Planner clarified `contact_type` scope; L-1 resolved; critique closed. |

---

## Value Statement Assessment

| Check | Result | Notes |
|-------|--------|-------|
| **Presence** | ✅ PASS | Clear user story format: "As a UFlow operator and product team..." |
| **Clarity** | ✅ PASS | "So that we can measure acquisition/activation and iterate confidently" — verifiable via dashboard events |
| **Alignment** | ✅ PASS | Supports Master Product Objective — measurement enables data-driven growth iteration |
| **Directness** | ✅ PASS | Value delivered directly: Plausible activated + events wired in this release |

**Assessment**: Value statement is well-formed. The "so that" outcome is measurable (events appear in Plausible) and aligns with the growth measurement foundation established in Plan 035.

---

## Overview

Plan 036 is a direct follow-up to Plan 035 (v0.7.0), completing the measurement activation that was explicitly deferred:

1. **M1**: Deploy Plausible CE (self-hosted on Hetzner) and activate via env vars
2. **M2/M2b**: Wire `trackEvent()` for two north-star events
3. **M3**: Validate events in UAT + production dashboards
4. **M4**: Deployment path audit
5. **M5**: Version bump to v0.7.1

The plan correctly inherits context from Plan 035 and Architecture 035, referencing the guardrails for self-hosted Plausible (separate container stack, persistent storage, health checks, access controls, non-fatal analytics).

---

## Architectural Alignment

| Check | Result | Notes |
|-------|--------|-------|
| Architecture reference | ✅ | Cites Arch 035 guardrails explicitly |
| Self-host guardrails | ✅ | Volume backups, health checks, restart policies, access controls — all documented in M1 |
| CSP compatibility | ✅ | Plan correctly notes CSP may need updating; current `next.config.js` already uses `NEXT_PUBLIC_PLAUSIBLE_HOST` env var in CSP — self-host will work if env var is set |
| Non-fatal analytics | ✅ | Existing `trackEvent()` is SSR-safe no-op; plan preserves this |
| Privacy posture | ✅ | No PII, no high-cardinality identifiers — explicitly constrained |

**Assessment**: Architecturally aligned. The plan respects Arch 035's "managed-first, self-host allowed with guardrails" decision and applies all required guardrails.

---

## Scope Assessment

| Check | Result | Notes |
|-------|--------|-------|
| Scope boundaries | ✅ | Clear in-scope + explicit non-goals |
| Deliverables | ✅ | Each milestone has acceptance criteria |
| Dependencies | ✅ | Mermaid diagram shows correct sequencing; M3 requires M1 |
| Risks | ✅ | CSP mismatch, double-counting, ClickHouse growth — all documented with mitigations |
| Version rationale | ✅ | v0.7.1 patch — internal measurement, no user-facing behavior changes |

**Assessment**: Scope is appropriate for a patch release. The plan adds infrastructure (Plausible CE) but this is internal tooling, not user-facing functionality.

---

## Technical Debt Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Ops overhead (ClickHouse) | LOW | Documented; monitoring + backups mentioned |
| Legacy placement not addressed | INFO | Plan explicitly defers src/components/providers refactoring — acceptable per non-goals |

**Assessment**: No new technical debt introduced. Existing legacy file placement is correctly scoped out.

---

## Findings

### L-1: Email Contact Intent Omitted

- **Severity**: LOW
- **Status**: RESOLVED
- **Location**: M2 scope description
- **Description**: Plan 035's Baseline & Measurements section mentions "phone tap, website tap, **email tap**" for `contact_intent_triggered`. Plan 036 only defines `contact_type: call | website`, omitting email.
- **Impact**: Event schema may be incomplete relative to Plan 035's measurement specification.
- **Recommendation**: Clarify whether email is intentionally omitted (no email action handlers exist in ProviderActionBar/ProviderCardModal) or should be added as `contact_type: 'email'`. If intentional, document the rationale in the plan.

### L-2: DEFERRED Decision Acknowledgement

- **Severity**: LOW
- **Status**: INFO
- **Location**: Decision Record
- **Description**: One decision is marked `[DEFERRED: user | choose Plausible public hostname + access controls | target: Plan 036 implementation]`.
- **Impact**: Implementer must make this decision during implementation.
- **Recommendation**: Acknowledged; plan proceeds with this deferral per user's operational preference. No action required.

---

## Unresolved Open Questions

**None.** The plan contains no `OPEN QUESTION` items.

---

## Decision Record Check

- ✅ 5 decisions marked `[RESOLVED]`
- ⚠️ 1 decision marked `[DEFERRED]` — user acknowledges proceeding with this deferral

**User acknowledgement**: The DEFERRED decision (access control method) is acceptable to proceed; implementer will apply at least one access-control layer per the deferred decision's notes.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Status |
|------|------------|--------|-------------------|
| CSP blocks self-hosted script | Low | Medium | ✅ Documented; CSP already uses env var |
| Event double-counting | Low | Low | ✅ Documented; single emission point per path |
| ClickHouse disk growth | Medium | Low | ✅ Documented; monitoring noted |
| DNS/TLS setup delays | Low | Medium | Time estimate includes uncertainty |

**Overall**: Risks are appropriately identified and mitigated.

---

## Questions for Planner

1. **L-1 Clarification**: Is the omission of `email` from `contact_type` intentional? If so, please add a brief note to M2 explaining why (e.g., "no email tap handler exists in current UI").

---

## Recommendations

1. **Minor**: Add clarifying note for L-1 (email omission rationale) before implementation — can be done inline during implementation or via plan update.

---

## Critic Verdict

**APPROVED**

The plan is clear, complete, architecturally aligned, and ready for implementation. The single LOW finding (L-1) is a documentation clarification that does not block progress — implementer can clarify during implementation based on codebase reality (email handlers do not exist).

**Gate for Analyst**: Plan document exists in `agent-output/planning/` ✅

---

## Revision History

| Date | Artifact Version | Findings Addressed | New Findings | Status Changes |
|------|------------------|-------------------|--------------|----------------|
| 2026-03-08 | Initial | N/A | L-1, L-2 | Created; APPROVED |

---

✅ PHASE COMPLETE: ③ Critic — Verdict: **APPROVED**
📄 Output: agent-output/critiques/036-analytics-activation-event-instrumentation-critique.md
➡️ NEXT: Pick "④ Architect" from the Orchestrator handoff suggestions
   Gate: No blocking architectural concerns (Arch 035 already provides guidance)

**Note**: Given that Arch 035 already addressed Plausible deployment and event instrumentation patterns, architecture review may be optional for this follow-up plan. Proceed directly to ⑤ Implementer if no new architectural decisions are required.
