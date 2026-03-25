---
ID: 058
Origin: 058
UUID: f8cb0a9c
Status: OPEN
---

# Critique 058 — JoinHalal Legacy Provenance Recovery (Alcohol Backfill Enablement)

- **Artifact**: `agent-output/planning/058-joinhalal-legacy-provenance-recovery-plan.md`
- **Analysis**: `agent-output/analysis/closed/058-joinhalal-legacy-backfill-provenance-gap-analysis.md`
- **Date**: 2026-03-24T12:35Z
- **Status**: Initial Review
- **Verdict**: APPROVED (with advisories)

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-03-24T12:35Z | User → Critic | Review Plan 058 | Initial critique of provenance recovery plan |
| 2026-03-24T12:42Z | Planner → Critic | Re-review revised plan | Plan revised with sequencing gate (MEDIUM-001) and schema criteria (MEDIUM-002); re-review for approval |

---

## Value Statement Assessment

**Rating: PASS**

The value statement is present in clear user-story format:

> As an **operator maintaining halal trust signals**, I want **legacy JoinHalal-imported providers to be deterministically linked back to their authoritative JoinHalal detail pages (or explicitly flagged as unmatched/ambiguous)**, so that **the released alcohol-badge backfill can correctly identify alcohol-selling listings without risking false matches or overwriting human moderation decisions**.

- **Clarity**: The "So that" outcome is verifiable — the backfill produces non-zero candidates against the recovered provenance set.
- **Alignment**: Directly supports the Master Product Objective (trustworthy, halal-verified provider discovery). Alcohol-selling providers in the trust corpus without remediation degrades "trust-first" positioning.
- **Directness**: Value is delivered directly by this plan. The provenance gap is the blocker, and the plan addresses it.

---

## Overview

Plan 058 is a well-structured response to Analysis 058's verified root cause: legacy JoinHalal rows store merchant websites in `social_website`, not JoinHalal listing URLs, making the released backfill unable to evaluate alcohol badges. The plan correctly reframes the problem as a provenance-recovery challenge requiring corpus matching, not a simple backfill extension.

The plan is grounded in the analysis findings, sequences 7 steps logically, includes a thorough decision record with 5 RESOLVED and 1 appropriately DEFERRED decisions, and adds the stale-clone audit as a separate operational concern.

The scope boundaries are clean — no UI surfaces, no policy changes, no importer rewrite.

---

## Architectural Alignment

**Rating: PASS**

- Stays within the existing import pipeline (`scripts/import-joinhalal.ts`) and extends established patterns (sitemap fetching, detail-page parsing).
- Postgres-first: data persisted in the database; no Redis, Elasticsearch, or external matching services.
- Schema change is deferred to the implementer with "minimal change consistent with existing schema patterns" — this is appropriate given the plan's WHAT/WHY focus.
- Guardrails respect existing moderation contracts: never modify non-pending `review_status`, idempotent writes.

---

## Scope Assessment

**Rating: PASS**

- **In scope**: Provenance recovery, deterministic matching, persistence, backfill enablement, stale-clone audit.
- **Out of scope**: UI tooling, policy changes (Plan 051), importer rewrite.
- Boundaries are unambiguous. No feature creep risk.

---

## Technical Debt Risks

**Rating: LOW-MEDIUM**

- The matching pipeline (Step 3) introduces a one-time data-recovery workflow. If the matching logic is embedded in the CLI script rather than isolated, it adds maintenance surface to `import-joinhalal.ts` which is already growing.
- The schema change (new column or provenance table) is a permanent addition. The DEFERRED decision is reasonable but the implementer should be aware this is a migration that affects production.
- The corpus cache (Step 2) is ephemeral and doesn't persist as technical debt — good.

---

## Findings

### MEDIUM-001: Stale-clone audit sequencing could create provenance conflicts

| Field | Value |
| --- | --- |
| **Status** | ADDRESSED |
| **Severity** | MEDIUM |
| **Issue** | Step 1 inventories both the legacy set (914 rows) and the stale-clone batch (864 rows), including overlap rates. However, the stale-clone *remediation* is deferred to Step 6, after provenance recovery (Steps 2-5). If Step 1 reveals significant overlap — e.g., the 864 rows are duplicates of legacy rows with different IDs — then Steps 3-4 (matching + persistence) would assign provenance to rows that may later be deleted or merged in Step 6. |
| **Impact** | Provenance could be persisted on rows that are subsequently soft-deleted, wasting matching effort and creating inconsistent state. Worse, if both the original legacy row and its stale-clone duplicate receive provenance, the backfill could process the same provider twice. |
| **Recommendation** | Add an explicit gate: if Step 1 reveals overlap >0 between the 864-row batch and the 914 legacy target set, the remediation recommendation from Step 6 should be finalized *before* Steps 2-5 proceed. Alternatively, state that the matching pipeline must operate on a deduplicated target set that excludes any rows identified as stale-clone duplicates. This is a sequencing clarification, not a scope change. |

### MEDIUM-002: DEFERRED schema decision lacks selection criteria

| Field | Value |
| --- | --- |
| **Status** | ADDRESSED |
| **Severity** | MEDIUM |
| **Issue** | The most impactful technical decision (new `import_source_url` column on `providers` vs. dedicated provenance table) is deferred to the implementer with guidance to "pick the minimal change consistent with existing schema patterns." While the deferral is reasonable for a WHAT/WHY plan, the plan doesn't provide decision criteria the implementer can evaluate against — e.g., "choose column if only JoinHalal provenance is needed within 2 releases; choose table if multi-source provenance is foreseeable." |
| **Impact** | Without criteria, the implementer may choose based on immediate convenience rather than architectural fit. A column is simpler now but harder to extend; a table is more work but cleaner for multi-source scenarios. Either choice affects migration complexity and rollback strategy. |
| **Recommendation** | Add 1-2 sentences to the DEFERRED decision record entry providing a heuristic the implementer can use: e.g., "Prefer the new column approach unless the Architect review identifies a near-term need for multi-source provenance beyond JoinHalal." This respects the WHAT/WHY boundary while giving the implementer a decision framework. |

### LOW-001: Target release version may be incorrect

| Field | Value |
| --- | --- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue** | The plan targets v0.8.25, stating it is "next available patch after `origin/main` version `0.8.24`." However, the roadmap shows the current released version is v0.8.23 (Plan 057). Version 0.8.24 does not exist yet. |
| **Impact** | Minor — the plan already says "confirm at DevOps Stage 1," making this self-correcting. |
| **Recommendation** | No action required. DevOps Stage 1 will assign the correct version. |

### LOW-002 (Process): Missing planner chatmode file

| Field | Value |
| --- | --- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue** | `.github/chatmodes/planner.chatmode.md` does not exist. Per Critic instructions this should be read at review start. |
| **Impact** | None — no planner-specific constraints were missed. |
| **Recommendation** | No action required for this plan. |

### LOW-003 (Process): Orphan critiques in non-closed directory

| Field | Value |
| --- | --- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue** | Critiques 053 and 055 exist in both `agent-output/critiques/` (Status: OPEN) and `agent-output/critiques/closed/` (resolved copies). The non-closed copies appear to be orphans from a previous lifecycle gap. Additionally, critiques 031, 048, 049, and 057 remain in the non-closed directory — 057 is Status OPEN with APPROVED verdict and two LOW findings remaining. |
| **Impact** | Clutters the active critiques view. Not blocking. |
| **Recommendation** | Housekeeping: remove the duplicate 053/055 from non-closed (closed copies are canonical). Evaluate 031/048/049/057 for closure. Outside Plan 058 scope. |

---

## Unresolved Open Questions

None found. The plan contains no items marked `OPEN QUESTION`.

---

## Decision Record Assessment

| Decision | Status | Assessment |
| --- | --- | --- |
| Persist recovered provenance in DB | RESOLVED | Correct — non-negotiable for repeatability |
| Confidence-gated matching (single winner only) | RESOLVED | Strong — prevents false positives |
| Ambiguous matches → no auto-moderation | RESOLVED | Correct — respects human review boundary |
| Unmatched rows → tagged, untouched | RESOLVED | Correct — makes gap visible without risky guesses |
| Schema choice (column vs table) | DEFERRED | Acceptable deferral. See MEDIUM-002 for improvement. |
| Stale-clone batch → audit before delete | RESOLVED | Correct — prevents data loss |

The plan has **1 DEFERRED decision** with explicit owner and gating. This does not block approval, but the user should acknowledge that the plan proceeds with this deferral.

**User acknowledgement requested**: This plan has 1 DEFERRED decision (schema choice — column vs provenance table). Do you approve proceeding with this deferred to the implementer, or should the Planner resolve it first?

---

## Duration Estimates Assessment

**Present**: Yes.

| Phase | Estimate | Assessment |
| --- | --- | --- |
| Analysis | 1–3h | Already completed (Analysis 058) |
| Planning | 0.5–1h | Already completed |
| Implementation | 4–10h | Wide range. Justified by uncertainty in matching feasibility and schema migration complexity. |
| QA | 2–6h | Reasonable given the matching pipeline needs verification. |
| UAT | 1–2h | Appropriate for operator dry-run + spot checks. |
| DevOps | 0.5–1.5h | Standard. |

Uncertainty drivers are well-identified (listing churn, field quality, schema complexity).

---

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

| Vector | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| False match → wrongful alcohol rejection | Low | High | Single-candidate matching, evidence capture, dry-run-first, pending-only guard |
| Schema migration breaks production | Low | High | Standard migration process; implementer tests against production shape |
| Persisted URLs go stale (JoinHalal changes) | Medium | Low | Not a hotfix — backfill retries would surface the issue |
| Stale-clone duplicates cause double processing | Low | Medium | Step 1 inventory + Step 6 audit (see MEDIUM-001) |

**Residual risk**: LOW. The dry-run-first semantics, pending-only guards, and single-candidate matching provide layered protection. The primary residual is MEDIUM-001 (stale-clone overlap could create inconsistent state if not gated).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Quality |
| --- | --- | --- | --- |
| False matches → wrongful rejection | Low | High | Strong (confidence gating + evidence + dry-run) |
| JoinHalal listing churn reduces coverage | Medium | Medium | Good (treat low coverage as acceptable; report explicitly) |
| Schema decision becomes time sink | Low | Medium | Adequate (minimal change guidance + implementer choice) |
| Stale-clone duplicates inflate counts | Medium | Medium | Good in Step 1 (inventory), weak in sequencing (see MEDIUM-001) |
| Rate limiting / blocking by JoinHalal | Low | Medium | Not addressed but extends existing import pattern |

---

## Recommendations

1. **MEDIUM-001** (sequencing gate): Add an explicit gate — if Step 1 overlap > 0, finalize stale-clone remediation before provenance matching. This is a 1-2 sentence addition.
2. **MEDIUM-002** (schema criteria): Add a decision heuristic for the implementer. Also a 1-2 sentence addition.
3. Both MEDIUM findings are non-blocking advisories. The plan is sound, well-grounded in Analysis 058, and ready for implementation with these clarifications applied during implementation or accepted as-is.
4. LOW findings are informational only.

---

## Revision History

| Revision | Date | Findings Addressed | New Findings | Status |
| --- | --- | --- | --- | --- |
| Initial | 2026-03-24T12:35Z | — | MEDIUM-001, MEDIUM-002, LOW-001, LOW-002, LOW-003 | OPEN |
| Rev 1 | 2026-03-24T12:42Z | MEDIUM-001 (sequencing gate added in Step 1 + Step 6), MEDIUM-002 (schema heuristic added to DEFERRED decision) | — | APPROVED — no blocking findings remain |
