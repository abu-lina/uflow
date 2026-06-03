---
ID: 133
Origin: 133
UUID: b4e71f9c
Status: Resolved
---

# Critique — Plan 133: Halal Proof Tier Rework

| Field           | Value                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| Artifact        | `agent-output/planning/133-halal-proof-tier-rework-plan.md`                    |
| Architecture    | `agent-output/architecture/133-halal-proof-tier-adr.md`                        |
| Date (Initial)  | 2026-05-20T07:30Z                                                              |
| Status          | APPROVED                                                                       |
| Critic          | GitHub Copilot (Critic mode)                                                   |
| GitHub Issue    | https://github.com/abu-lina/uflow/issues/232                                  |

## Changelog

| Date              | Handoff              | Request          | Summary                                                          |
| ----------------- | -------------------- | ---------------- | ---------------------------------------------------------------- |
| 2026-05-20T07:30Z | Planner → Critic     | Initial review   | Critique created — APPROVED with 2 LOW findings, 1 process note  |

---

## Value Statement Assessment

**PASS.**

> *"As a Muslim community user browsing a restaurant or store on Ummah Flow, I want to see a clear separation between the platform's halal guarantee (baseline gate) and the verification depth for each listing (proof tier), so that I understand that every listing is halal AND I can see how transparently that was verified — without the current contradictory messaging implying some listings are 'more halal' than others."*

The value statement is present, well-structured, and directly actionable:
- **"As a"**: Clear persona (Muslim community user browsing a listing).
- **"I want to"**: Concrete capability (see separation between baseline and verification depth).
- **"So that"**: Measurable outcome (understanding without contradictory messaging). This is verifiable at QA/UAT by checking the reading order and wording of the two zones.

The statement directly addresses the core UX contradiction. No deferral. No proxy goals.

---

## Overview

Plan 133 is a well-scoped Feature plan that resolves a genuine structural contradiction on the provider detail page — the co-existence of a "baseline halal guarantee" message with a "Proofs" section that implies quality gradation. The plan introduces a 3-tier verification transparency model, restructures the page layout, and bundles a latent production bug fix (broken `upsert_joinhalal_providers` RPC).

The plan supersedes Plan 126 (Nachweise Attestation), which operated on the same components. Plan 126's core deliverable (`AttestationCard`) is already merged to main and is preserved/modified by this plan — the supersession is clean and well-documented.

---

## Architectural Alignment

**STRONG ALIGNMENT.** The plan adheres to the ADR (133-halal-proof-tier-adr.md) closely:

| ADR Condition | Plan Coverage | Verdict |
|---------------|---------------|---------|
| MUST rewrite `upsert_joinhalal_providers` RPC | M1 Task 6, explicit acceptance criteria | ✅ Covered |
| MUST update import script | M2 Task 2, explicit acceptance criteria | ✅ Covered |
| MUST decouple `hasAnyDeclared` from `proof_tier` | M5 Task 4, explicit acceptance criteria | ✅ Covered |
| MUST maintain HalalTrustPopup behavior | M5 Task 5, explicit acceptance criteria | ✅ Covered |
| MUST remove stale translation keys | M3 Task 3, explicit acceptance criteria | ✅ Covered |
| SHOULD move HalalTrustBanner above sections | M5 Task 1+2, explicit acceptance criteria | ✅ Covered |
| SHOULD add "What does this mean?" explainer | M4 Task 5, explicit acceptance criteria | ✅ Covered |
| MAY adjust baseline banner wording | Not in scope | ✅ Acceptable — content decision, not plan gate |

All 5 MUST conditions from the ADR are mapped to specific milestones with testable acceptance criteria. Both SHOULD conditions are also covered. The one MAY item is correctly deferred.

---

## Scope Assessment

**APPROPRIATE.** The plan scope is well-bounded:

- **In scope**: Schema migration, RPC fix, TypeScript types, import script, translations, new component, UI layout, tests.
- **Out of scope**: Proof tier filtering/search (explicitly deferred in ADR §8), baseline banner wording change (MAY), ummah_providers (different trust model).
- **No scope creep**: The RPC fix is a necessary bundling — the RPC references the column being renamed, so fixing it in the same migration is the correct approach.

The milestone dependency graph is correctly sequenced (schema → service → translations → UI → tests → release). M4 and M5 can overlap after M3, which is correctly noted.

---

## Technical Debt Risks

**MINIMAL.** The plan is net-negative on debt:

1. **Debt removed**: Broken `upsert_joinhalal_providers` RPC fixed (HIGH severity pre-existing debt).
2. **Debt removed**: Stale translation keys cleaned up.
3. **Debt removed**: Unused `halal_level` column repurposed with clear semantics.
4. **Debt removed**: Contradictory UX messaging resolved.
5. **No new debt introduced**: The `proof_tier` column is NULL for all existing rows, which is the honest state ("verification pending"). No backfill pressure.

---

## Findings

### F-1: Import Script `offers_ids` Removal — Verify No Downstream Consumers

| Field | Value |
|-------|-------|
| Severity | LOW |
| Status | RESOLVED |
| Issue | M2 removes `offers_ids` and `needs_ids` from the import script's `JoinHalalProvider` interface. The ADR confirms `needs_ids` is always `[]`, but `offers_ids` IS populated by the import script (it maps "Speisen" to offer IDs). |
| Impact | If the import script is run after this change, offers will no longer be written to `provider_offers` via the RPC — unless the rewritten RPC in M1 handles the junction table INSERT from data passed through a different mechanism. |
| Resolution | The plan's M1 Task 6 explicitly states: "After upserting providers, INSERT into provider_offers junction table (replacing array column)". This means the RPC itself will handle the junction table write, so the import script just needs to pass the offer IDs in a different field shape. The plan DOES cover this — but the import script changes in M2 should ensure offer IDs are still passed to the RPC (just not as `offers_ids` on `providers`). The implementer should verify the RPC signature accepts offer data and writes to `provider_offers`. |

### F-2: Plan 126 Supersession — Formal Status Not Updated

| Field | Value |
|-------|-------|
| Severity | LOW |
| Status | RESOLVED |
| Issue | Plan 133 states "Plan 126 (Nachweise Attestation — superseded by this plan)" in the header, and the Release Strategy section explains the relationship. However, Plan 126's document status has not been formally updated to "Superseded" and moved to `closed/`. |
| Impact | Minor process hygiene. Plan 126's critique (126-nachweise-attestation-critique.md) also remains open at status "REVISED — Awaiting re-review". |
| Resolution | This is a lifecycle cleanup task for after Plan 133 is approved. The implementer or DevOps agent should mark Plan 126 as Superseded and move it + its critique to `closed/` as part of M7 or post-merge cleanup. No blocking impact. |

### P-1: Missing Planner Chatmode File (Process Note)

| Field | Value |
|-------|-------|
| Severity | LOW (process) |
| Status | RESOLVED |
| Issue | `.github/chatmodes/planner.chatmode.md` does not exist in the workspace. Critic mode instructions require checking for this file at review start. |
| Impact | None — the plan was produced correctly without it. |
| Resolution | Noted per Critic mode instructions. No action required. |

---

## Unresolved Open Questions

**None.** All 8 decisions in the Decision Record are marked `[RESOLVED]`. No `OPEN QUESTION` items found in the document.

## Decision Record Check

**PASS.** No decisions marked `[OPEN]` or `[DEFERRED]`. All 8 decisions (D1–D8) are `[RESOLVED]` with rationale.

## Duration Estimates Check

**PASS.** Duration Estimates section is present with per-milestone estimates, uncertainty ratings, and a total range (5–8 hours). The uncertainty drivers are identified (RPC rewrite in M1).

---

## Questions for Planner

None. The plan is complete, well-structured, and ready for implementation.

---

## Risk Assessment

| Risk Area | Verdict |
|-----------|---------|
| Value delivery | Direct — no deferral |
| Scope | Well-bounded, no creep |
| Architectural fit | Full ADR alignment verified |
| Technical debt | Net-negative (removes more debt than it introduces) |
| Migration safety | Zero-risk column rename (100% NULL), reversible |
| Test coverage | Comprehensive — unit, integration, type safety, lint, grep |
| Rollback | Documented and feasible |

---

## Recommendations

1. **Implementer**: Pay special attention to M1's RPC rewrite — the junction table INSERT pattern for `provider_offers` needs to handle the same offer-ID resolution currently done by the array column. Study the existing RPC body in `005_drop_barakah_effects.sql`.
2. **Lifecycle**: After Plan 133 is committed, update Plan 126 status to "Superseded by Plan 133" and move to `closed/`.
3. **QA**: The 4-state ProofTierCard rendering (null, 1, 2, 3) should be visually verified on both mobile and desktop viewports with each locale.

---

## Revision History

| Revision | Artifact Changes | Findings Addressed | New Findings | Status Changes |
|----------|------------------|--------------------|--------------|----------------|
| Initial  | Plan created from ADR 133 | N/A | F-1 (LOW), F-2 (LOW), P-1 (LOW process) | APPROVED |
