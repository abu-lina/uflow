---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Resolved
---

# Critique — Plan 114: Database Schema Staged Refactor

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Artifact            | `agent-output/planning/114-db-schema-staged-refactor-plan.md`         |
| Architecture Source  | `agent-output/architecture/114-db-schema-architecture-review.md`      |
| Date                | 2026-04-29T22:00Z                                                     |
| Status              | Resolved — All findings closed (Rev 2 C-7/C-8 addressed)             |

## Changelog

| Date              | Handoff        | Request                                | Summary                                                         |
| ----------------- | -------------- | -------------------------------------- | --------------------------------------------------------------- |
| 2026-04-29T22:00Z | Planner→Critic | "Plan is complete. Please review."     | Initial critique: 6 findings (0 CRITICAL, 2 HIGH, 3 MEDIUM, 1 LOW). Verdict: APPROVED with recommendations. |
| 2026-04-29T22:30Z | Planner→Critic | Plan revised per critique + no-users context | C-1 through C-5 ADDRESSED in plan revision. Returning for re-review per Gate Integrity After Revisions. |
| 2026-04-29T23:00Z | Critic | Re-review of revised plan | All 5 actionable findings RESOLVED. No new CRITICAL/HIGH. Verdict: APPROVED. Critique closed. |
| 2026-04-29T09:20Z | Planner→Critic | MAJOR REVISION: Phase 0′ inserted (ADR-114 baseline squash). Architect directed restructure. | Re-review of structural revision. 2 new findings (0 CRITICAL, 1 MEDIUM, 1 LOW). Verdict: APPROVED. |
| 2026-04-29T10:00Z | Planner | Addressed C-7 (structural parity verification) and C-8 (Phase 2 dependency text). Added explicit Implementer Tooling section. | C-7: RESOLVED. C-8: RESOLVED. All findings now closed. |
| 2026-04-29T10:15Z | Critic | Verification re-review of R3 plan revision | Confirmed C-7 and C-8 properly resolved. No new findings. Tooling section well-structured. APPROVED — all findings closed. |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement follows proper user-story format and identifies four verifiable "So that" outcomes:
1. Database-level referential integrity (measurable: FK count)
2. New providers visible in search filters (measurable: boolean state on INSERT)
3. Environment parity (measurable: table/enum/trigger count parity)
4. Reduced cognitive load from dual-PK (measurable: column count reduction)

The primary user—"developer and platform operator"—is appropriate for a Refactor-classified plan. Outcome #2 (search filter visibility) also delivers indirect end-user value via F-3. The plan correctly prioritizes F-3 in Phase 2, ensuring direct user impact is not deferred behind structural work.

Alignment with Master Product Objective ("first thought when any Muslim seeks a service") is indirect but valid: schema integrity underpins platform reliability, which sustains user trust.

---

## Overview

Well-structured 6-phase plan that systematically addresses all 10 findings from Arch-114 except F-6 (explicitly deferred with YAGNI rationale). The phasing follows a sound risk/value ordering: quick wins first, GDPR alignment, then user-facing data coherence, then structural integrity, constraints, and finally the highest-risk dual-PK consolidation.

**Strengths:**
- Phased delivery with independent releases — each phase can be verified and released in isolation
- Clear dependency graph with Mermaid visualization
- Phase 5 risk is acknowledged with table-by-table processing and deferral condition
- Rollback considerations with explicit "point of no return" markers
- Cross-environment verification mandated for every phase
- Decision Record is thorough (11 resolved decisions)
- Baseline & Measurements table provides verifiable targets
- *(Revision 1)* Operational Context section clearly establishes the no-users premise and its consequences
- *(Revision 1)* New decisions D9–D11 capture the rationale for clean-slate approach

---

## Architectural Alignment

**Verdict: ALIGNED**

The plan respects all constraints from Arch-114:
- ~~Zero-downtime migration strategy~~ → Breaking migrations acceptable (no users) — explicitly relaxed via D11 ✅
- Supabase managed Postgres limitations acknowledged ✅
- RLS/RPC/trigger audit mandated before destructive changes ✅
- Cross-environment verification (local + dev + prod) required ✅
- Supabase Auth integration risk for `users.id` explicitly noted ✅ *(Revision 1)*

The phasing also aligns with Arch-114's recommended priority order (F-9 → F-3 → F-7/F-10 → F-2 → F-4 → F-5 → F-1), with a slight reorder (F-7/F-10 moved to Phase 0 as quick wins, which is appropriate).

---

## Scope Assessment

**Verdict: APPROPRIATE**

Total estimated effort of 7–10 days (revised from 8–12). The compression is justified by the no-users context removing coordination overhead and eliminating backwards-compatible intermediate states. The phased structure means each phase is independently scoped (2 hours to 4 days). Each phase ships as its own release, effectively making this a **master plan** with 6 sub-deliverables.

The explicit deferral of F-6 (schema cohesion) is well-justified and correctly follows YAGNI.

---

## Technical Debt Risks

The plan addresses existing technical debt comprehensively. No new debt is introduced.

- *(Revision 1)* Previous concern about Phase 0 bookmarks index creating short-lived debt is resolved — index removed entirely (C-4).
- *(Revision 1)* Previous concern about Phase 2 INSERT trigger creating coupling is resolved — trigger removed, column dropped outright (C-1/D9).

---

## Findings

### C-1 · HIGH — Phase 2 INSERT Trigger Creates Backward Dependency on Deprecated Column

**Status**: RESOLVED — Plan revised: trigger removed entirely. `barakah_effects` dropped outright in Phase 2 (Decision D9). No backward dependency.

**Description**: Phase 2 Task 3 proposes creating a Postgres trigger on `providers` INSERT that maps `barakah_effects` array values to boolean columns. However, Arch-114 F-3 explicitly recommends: "Deprecate `barakah_effects` as an input mechanism." Creating a trigger that reads `barakah_effects` on every INSERT creates a *new* code path that depends on the column being populated — the opposite of deprecation.

**Impact**: Makes future `barakah_effects` removal harder (the trigger must be dropped first). Signals to developers that `barakah_effects` is still a supported input path. Creates a maintenance surface where the trigger's mapping logic must stay synchronized with form field names and boolean column names.

**Recommendation**: Instead of adding a trigger, make the service-layer change (Task 2) the *sole* fix. If the creation path sets booleans directly from form data, there is no need for a trigger catch-all. If additional code paths exist that write `barakah_effects` without booleans, enumerate and fix them rather than papering over them with a trigger. If a catch-all is truly needed for safety, make it time-boxed: add a comment and open-action to remove it once all code paths are verified.

---

### C-2 · HIGH — Phase 4 CHECK Constraints Assume `listing_type` Is Always Set

**Status**: RESOLVED — Plan revised: Phase 4 now includes enum extension (`ummah`), backfill of NULL providers, and NOT NULL constraint before CHECK constraints (Decision D10).

**Description**: Phase 4 defines CHECK constraints like `CHECK (listing_type = 'food' OR (no_alcohol = false AND no_pork = false ...))`. The `listing_type_enum` currently has only two values: `food` and `business`. The Ummah section does not have a corresponding `listing_type` value — providers serving the Ummah section may have `listing_type = NULL`.

The Ummah CHECK in the plan is `CHECK (listing_type IS NOT NULL OR accepts_donations = false)` which would force all NULL-listing_type providers to have `accepts_donations = false`, even though Ummah-section providers legitimately need `accepts_donations = true`.

**Impact**: Adding these constraints could fail validation on existing data (providers with `listing_type = NULL` and `accepts_donations = true`). Worse, they could block valid Ummah provider creation.

**Recommendation**: Before Phase 4, the Implementer must audit the current `listing_type` value distribution (especially NULL count and their boolean states). If Ummah providers currently have `listing_type = NULL`, either:
- (a) Add `'ummah'` to the `listing_type_enum` and backfill before adding constraints, OR
- (b) Adjust CHECK constraints to treat NULL as "any section" (no boolean restrictions), OR
- (c) Skip Ummah-specific constraints until the enum is extended.

The plan should document this as a Phase 4 pre-condition rather than leaving it to the Implementer to discover.

---

### C-3 · MEDIUM — Phase 5 Missing Smoke Test Gate

**Status**: RESOLVED — Plan revised: explicit runtime smoke test gate added to Phase 5 risk mitigation and acceptance criteria.

**Description**: Phase 5 specifies `EXPLAIN ANALYZE` verification but no **runtime smoke test** gate. The highest-risk scenario is an RPC or RLS policy referencing `id` that wasn't caught in the pre-audit. This would manifest as a runtime query failure, not a performance regression — `EXPLAIN ANALYZE` wouldn't catch it.

**Impact**: A missed `id` reference in an RPC would cause a 500 error on the corresponding application path. Since Phase 5 processes tables one at a time over potentially multiple days, a gap between migration deploy and smoke test discovery could leave the error live.

**Recommendation**: Add a Phase 5 acceptance criterion: "For each table, after migration deployment to dev, execute all RPC functions and core application queries that reference the table. Verify zero errors before promoting to prod." This is already implicitly covered by "full test suite must pass" but should be explicit for the highest-risk phase.

---

### C-4 · MEDIUM — Phase 0 Composite Index on `bookmarks` Will Be Dropped in Phase 3B

**Status**: RESOLVED — Plan revised: bookmarks index removed from Phase 0 entirely (not just noted as interim). Only 2 composite indexes created.

**Description**: Phase 0 Task 4 creates `bookmarks(bookmarkable_type, bookmarkable_id)`. Phase 3B replaces the polymorphic columns with typed FK columns, making this index obsolete. The index will exist for approximately the duration of Phases 1–3A before being dropped.

**Impact**: Minor — index creation is cheap and the index provides value during the interim phases. However, if Phase 3B is delayed or deferred, the index serves a useful purpose.

**Recommendation**: No change needed, but add a note in Phase 0 Task 4: "This index is interim; it will be superseded when Phase 3B replaces polymorphic columns with typed FK columns." This prevents a future reviewer from questioning why the index was created only to be dropped.

---

### C-5 · MEDIUM — Phase 5 `users.user_id` Bridge FK Needs Special Handling

**Status**: RESOLVED — Plan revised: explicit `users.id` Supabase-internal check added as Phase 5 pre-condition, risk mitigation step, acceptance criterion, and risk table entry.

**Description**: The `users` table is unique among the 6 dual-PK tables: `users.user_id` is both the business key (FK target for other tables) AND an FK source pointing to `auth.users(id)`. Promoting `user_id` to PK while it has an outgoing FK to `auth.users(id)` is valid SQL, but the plan doesn't explicitly note the bidirectional FK nature of this column.

Additionally, Supabase's internal auth system may reference `public.users.id` in ways not visible through `information_schema` (e.g., Supabase Auth hooks, Supabase client `.auth.getUser()` integration, or dashboard features).

**Impact**: If any Supabase-internal mechanism references `public.users.id`, dropping it would break auth integration silently. This would not be caught by application-layer tests since it's infrastructure-level.

**Recommendation**: Add a Phase 5 pre-condition for the `users` table specifically: "Before dropping `users.id`, verify via Supabase support documentation (or dev-environment testing) that no Supabase-internal mechanism references `public.users.id`. Test auth login/signup flow on dev after dropping `users.id` before promoting to prod."

---

### C-6 · LOW — Process Note: `.github/chatmodes/planner.chatmode.md` Not Found

**Status**: ACKNOWLEDGED — No action required per original verdict.

**Description**: Per Critic instructions, the planner chatmode file should be read at review start. No file matching `.github/chatmodes/planner.chatmode.md` was found in the workspace.

**Impact**: None for this review — the plan is evaluated on its own merits. Noted for process completeness.

**Recommendation**: No action required for this plan.

---

## Unresolved Open Questions

The plan contains one `OPEN QUESTION` — but it is marked `[RESOLVED]` and properly tracked as a Phase 1 pre-condition. **No unresolved open questions remain.**

---

## Decision Record Check

All 11 decisions are marked `[RESOLVED]`. No `[OPEN]` or unresolved `[DEFERRED]` decisions found. Decisions D9–D11 (added in revision) are well-reasoned and properly document the clean-slate context. **PASS.**

---

## Duration Estimates Check

Duration estimates section is present with per-phase ranges and uncertainty drivers. Total compressed from 8–12 to 7–10 days, justified by no-users context. Phase 5 correctly flagged as high-uncertainty with suggestion for an Analyst pre-audit. Phase 5 inline estimate (2–4 days) is consistent with the duration table. **PASS.**

---

## Risk Assessment

The risk table covers the major failure modes comprehensively. *(Revision 1)* Now includes:
- Supabase Auth referencing `public.users.id` (C-5) — with explicit mitigation
- `consent_logs` GDPR risk appropriately downgraded to MEDIUM (no users yet, but flagged for pre-launch resolution)
- Phase 5 RPC risk mitigation now includes runtime smoke test gate (C-3)

**Hotfix scenario analysis**: The most likely post-deployment hotfix paths are:
1. Phase 2: missed `barakah_effects` reference in dynamic property access (mitigated by grep + acceptance criterion)
2. Phase 4: provider creation path not setting `listing_type` after NOT NULL constraint (mitigated by backfill audit + test suite)
3. Phase 5: missed `id` reference in RPC/RLS (mitigated by smoke test gate)

All three are adequately mitigated given the no-users context. Risk posture is appropriate.

---

## Recommendations

1. ~~**Address C-1 (HIGH)**~~: ✅ RESOLVED — trigger removed, column dropped outright (D9).
2. ~~**Address C-2 (HIGH)**~~: ✅ RESOLVED — enum extended, backfill, NOT NULL before CHECKs (D10).
3. ~~**Address C-3 (MEDIUM)**~~: ✅ RESOLVED — runtime smoke test gate added.
4. ~~**Note C-4 (MEDIUM)**~~: ✅ RESOLVED — bookmarks index removed entirely.
5. ~~**Address C-5 (MEDIUM)**~~: ✅ RESOLVED — Supabase-internal check added across 4 sections.
6. **C-6 (LOW)**: No action required. ACKNOWLEDGED.

### Implementation Notes (non-blocking)

- **Phase 4**: `ALTER TYPE ... ADD VALUE` is non-transactional in Postgres. The Implementer should verify whether Supabase migration wrapping requires this to be a separate migration file.
- **Phase 4**: Verify that `community_services` does not need parallel `listing_type` constraints (architecture review shows no `listing_type` on `community_services`, but Implementer should confirm at audit time).
- **Phase 2**: Ensure grep-based code audit catches dynamic property access patterns (e.g., `provider[fieldName]` where `fieldName` is `'barakah_effects'`), not only static references.

---

## Verdict

**APPROVED** — All 5 actionable findings from the initial review are resolved in the revised plan. The revision goes further than recommended in several cases (C-1: full column drop vs. just removing the trigger; C-4: index removed vs. just adding a note), which is appropriate given the no-users operational context.

The plan is well-structured, architecturally aligned, and addresses all 10 findings from Arch-114 except F-6 (explicitly deferred with YAGNI rationale). The Operational Context section and Decisions D9–D11 properly document the clean-slate premise. No new CRITICAL or HIGH findings.

The plan is ready for implementation.

---

## Revision History

### Revision 1 (2026-04-29T23:00Z) — Re-review of Revised Plan

**Artifact changes observed**:
- Operational Context section added (no-users premise)
- Decisions D9, D10, D11 added
- Phase 0: bookmarks index removed entirely (was 3 composite → 2)
- Phase 2: rewritten — `barakah_effects` dropped outright, INSERT trigger removed, 7 tasks replacing original 6
- Phase 4: rewritten — enum extension + backfill + NOT NULL before CHECK constraints
- Phase 5: smoke test gate + `users.id` Supabase-internal check added to risk mitigation, acceptance criteria, and risk table
- Architectural Constraints: zero-downtime relaxed, Supabase Auth note added
- Rollback: simplified for no-users context
- Duration: compressed 8–12 → 7–10 days
- Baseline: `providers` target 42 → 41 (adds `barakah_effects` to drops)
- Risks: Supabase Auth risk added, `consent_logs` risk downgraded to MEDIUM
- Testing: 3 new critical scenarios added

**Findings status**:
| Finding | Initial Status | Revision 1 Status |
|---------|---------------|--------------------|
| C-1 HIGH | OPEN | RESOLVED — trigger removed, column dropped (D9) |
| C-2 HIGH | OPEN | RESOLVED — enum extended, backfill, NOT NULL (D10) |
| C-3 MEDIUM | OPEN | RESOLVED — smoke test gate added |
| C-4 MEDIUM | OPEN | RESOLVED — bookmarks index removed |
| C-5 MEDIUM | OPEN | RESOLVED — Supabase-internal check added |
| C-6 LOW | OPEN | ACKNOWLEDGED — no action required |

**New findings**: None (CRITICAL/HIGH). Three non-blocking implementation notes added to Recommendations.

**Verdict change**: APPROVED (unchanged) → APPROVED (reconfirmed, all findings resolved).

---

### Revision 2 (2026-04-29T09:30Z) — Re-review of Major Structural Revision (Phase 0′ Insertion)

**Trigger**: Architect accepted ADR-114 (Migration Baseline Squash) and elevated F-11 (HIGH: no shared migration lineage). Planner restructured Plan 114 to front-load Phase 0′ as mandatory prerequisite before all structural phases.

**Artifact changes observed**:
- New Phase 0′ (Migration Baseline Squash) inserted as first milestone with 9 tasks and 7 acceptance criteria
- Phase 0 renamed to conditional (“applies only if Phase 0′ reveals remaining cleanup”)
- Phase 0 reduced from 5 tasks to 4, marked conditional; F-8 absorbed
- Phase 1 dependency updated: depends on Phase 0′ (not standalone); task 1 struck through with resolution note
- Decision Record: D12 (ADR-114 baseline squash) and D13 (Phase 0 absorption) added, both [RESOLVED]
- Assumptions: #6 and #7 added (DDL/seed extraction feasibility)
- Second OPEN QUESTION added and marked [RESOLVED]
- Dependency graph: Phase 0′ now gates Phase 0 (conditional) and Phase 1
- Baseline & Measurements: 2 new metrics (migration chain integrity, db reset determinism)
- Duration estimates: Phase 0′ (4–8h) added; total 8–12 days (was 7–10)
- Risks: 3 new baseline-specific risks added (DDL reconstruction, prod-only objects, dev tracking conflict)
- Rollback: Phase 0′ entry added (fully reversible)
- Version Management: Phase 0′ release line added
- Changelog: 2 new entries (architect ADR-114, planner major revision)

**Review assessment**:

#### Value Statement: STILL PASSES

The value statement is unchanged. Phase 0′ directly serves the “all three environments run identical schemas” outcome and creates the precondition for all other deliverables.

#### Architectural Alignment: STRENGTHENED

The revision directly implements ADR-114 from `system-architecture.md`. The plan now references:
- F-11 from the architecture review (HIGH finding)
- ADR-114 (accepted, in master doc)
- Problem Area 13 (in master doc)

The dependency graph correctly positions Phase 0′ as a prerequisite. The plan does NOT attempt to apply Phase 0 hygiene to prod before establishing a shared baseline — this is architecturally correct.

#### Scope: APPROPRIATE

Phase 0′ adds ~4–8 hours of upfront work but:
- Eliminates the need to maintain/patch 81 historical migrations
- Resolves F-8 (local migration gap) for free (baseline = prod state)
- Provides Phase 1 investigation data for free (F-9 divergences documented during extraction)
- Gives all subsequent phases a deterministic starting point

This is net-positive scope even accounting for the duration increase.

#### New Findings

---

### C-7 · MEDIUM — Phase 0′ Acceptance Criterion #1 Needs Precision on “Same Schema” Verification

**Status**: RESOLVED — Plan revised: Phase 0′ AC#1 now specifies structural parity verification (column names/types/nullability/defaults, constraint definitions, function signatures via `pg_get_functiondef()`, trigger definitions, index definitions). Task 9 added: run same introspection queries against local and diff against prod MCP output. Acceptable deltas documented.

**Description**: Phase 0′ acceptance criterion states: “`001_baseline.sql` produces the same schema as prod when applied to a clean database (verified via table/index/trigger/function count comparison).” Count comparison alone is insufficient — it would pass even if column types, constraint definitions, or function bodies differ between the baseline-derived local and actual prod.

**Impact**: A count-match could mask structural divergences (e.g., missing CHECK constraints, different column defaults, or function body drift). This would undermine the very parity that Phase 0′ is designed to achieve.

**Recommendation**: Strengthen the verification criterion to include:
- Table column-level parity check (column names, types, nullability, defaults)
- Constraint-level parity (CHECK, UNIQUE, FK names and definitions)
- Function signature parity (`pg_get_functiondef()` hash comparison)
- Trigger parity (trigger names + attached function names)

A practical approach: run the same introspection queries used to build the baseline against the local DB post-reset, and diff the output against prod MCP results. Document acceptable deltas (e.g., auth schema differences managed by Supabase).

---

### C-8 · LOW — Phase 2 Dependency Stale Reference

**Status**: RESOLVED — Plan revised: Phase 2 dependency updated to “Phase 0′ complete (baseline guarantees badge sync trigger locally). Phase 0 complete if applicable. Phase 1 complete (environment parity established).”

**Description**: Phase 2 still says “**Dependencies**: Phase 0 complete (badge sync trigger must be verified locally).” With the new structure, Phase 2 should depend on Phase 0′ (which guarantees local = prod, including the badge sync trigger) and conditionally Phase 0. The dependency graph (Mermaid) correctly shows `P0 → P2` and `P1 → P2`, which transitively includes P0′, but the inline text is now slightly misleading.

**Impact**: Minor — the Mermaid graph is correct. An Implementer reading Phase 2 in isolation might not realize the trigger verification is already guaranteed by the baseline approach. No functional risk.

**Recommendation**: Update Phase 2 dependency text to: “**Dependencies**: Phase 0′ complete (baseline guarantees badge sync trigger locally). Phase 0 complete if applicable. Phase 1 complete (environment parity established).”

---

## Unresolved Open Questions

All OPEN QUESTIONs in the plan are marked `[RESOLVED]`. **No unresolved open questions.**

## Decision Record Check (Revision 2)

All 13 decisions are marked `[RESOLVED]`. No `[OPEN]` or unresolved `[DEFERRED]` decisions. D12 and D13 are well-reasoned with MCP-verified evidence supporting the rationale. **PASS.**

## Duration Estimates Check (Revision 2)

Duration estimates section is present and updated. Phase 0′ (4–8 hours) is reasonable for DDL extraction + assembly + local verification. Total 8–12 days acknowledges the upfront investment. Key uncertainty driver (MCP DDL reconstruction feasibility) is clearly stated with fallback (operator pg_dump). **PASS.**

---

## Revision 2 Findings Summary

| Finding | Severity | Status | Description |
|---------|----------|--------|-------------|
| C-7 | MEDIUM | RESOLVED | Phase 0′ acceptance needs structural parity verification beyond count matching |
| C-8 | LOW | RESOLVED | Phase 2 dependency text references old Phase 0 instead of Phase 0′ |

---

## Verdict (Revision 2)

**APPROVED** — The major revision is architecturally sound, well-justified by MCP-verified evidence (ADR-114 / F-11), and correctly restructures the execution order. Phase 0′ is the right prerequisite. Two minor findings (1 MEDIUM, 1 LOW) are non-blocking but should be addressed before implementation begins:

- C-7: Strengthen Phase 0′ AC#1 verification beyond count comparison
- C-8: Fix stale Phase 2 dependency text

Neither finding blocks implementation of Phase 0′ itself. The plan is ready for execution.

Previous findings (C-1 through C-6) remain RESOLVED/ACKNOWLEDGED — no regression from the revision.

---

## Revision 2 Status Summary

| Finding | Initial | Rev 1 | Rev 2 |
|---------|---------|-------|-------|
| C-1 HIGH | OPEN | RESOLVED | RESOLVED |
| C-2 HIGH | OPEN | RESOLVED | RESOLVED |
| C-3 MEDIUM | OPEN | RESOLVED | RESOLVED |
| C-4 MEDIUM | OPEN | RESOLVED | RESOLVED |
| C-5 MEDIUM | OPEN | RESOLVED | RESOLVED |
| C-6 LOW | OPEN | ACKNOWLEDGED | ACKNOWLEDGED |
| C-7 MEDIUM | — | — | RESOLVED |
| C-8 LOW | — | — | RESOLVED |

---

## Revision 3 (2026-04-29T10:15Z) — Verification of C-7/C-8 Resolution + Tooling Addition

**Trigger**: Planner addressed C-7 (structural parity), C-8 (Phase 2 dependency), and added explicit Implementer Tooling section. Critic re-review requested.

**Verification**:

### C-7 — CONFIRMED RESOLVED

Phase 0′ AC#1 now reads: "verified via **structural parity check** (not just counts): column names/types/nullability/defaults match, constraint definitions match, function signatures and bodies match (`pg_get_functiondef()`), trigger definitions match, index definitions match. Acceptable deltas documented."

Additionally, new Task 9 provides the implementation approach: "Run the same introspection queries from step 1 against local (`psql` via terminal) and diff results against prod MCP output." This directly implements the recommendation from C-7.

### C-8 — CONFIRMED RESOLVED

Phase 2 dependency now reads: "Phase 0′ complete (baseline guarantees badge sync trigger locally — prod state replicated). Phase 0 complete if applicable. Phase 1 complete (environment parity established)." Matches the recommended text.

### Tooling Section Assessment

The new "Implementer Tooling (MANDATORY)" section is well-structured:
- Explicit tool-to-environment mapping table
- Key principle documented (reproducibility, auditability, no manual intervention)
- Per-phase `**Tooling**:` subsections on Phases 0′, 0, 1, 2 with specific MCP tool names
- Phases 3–5 covered by the MANDATORY section (no inline tooling needed — these phases are primarily code changes with verification)

### New Findings Check

**No new findings.** The revision is additive-only (strengthened AC, fixed dependency text, added tooling context). No regressions, no ambiguities introduced. Changelog entries are chronologically ordered within the 2026-04-29 session.

### Verdict (Revision 3)

**APPROVED — All findings RESOLVED.** Plan 114 is complete, clear, and ready for implementation. The Implementer has unambiguous tooling guidance, structural verification criteria, and correctly sequenced dependencies.

| Finding | Final Status |
|---------|-------------|
| C-1 HIGH | RESOLVED |
| C-2 HIGH | RESOLVED |
| C-3 MEDIUM | RESOLVED |
| C-4 MEDIUM | RESOLVED |
| C-5 MEDIUM | RESOLVED |
| C-6 LOW | ACKNOWLEDGED |
| C-7 MEDIUM | RESOLVED |
| C-8 LOW | RESOLVED |
