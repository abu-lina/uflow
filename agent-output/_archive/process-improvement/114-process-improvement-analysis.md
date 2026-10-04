---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Implemented
---

# Process Improvement Analysis 114 — DB Schema Staged Refactor (Phase 5 Dual-PK Consolidation)

**Source Retrospective**: `agent-output/retrospectives/closed/114-phase5-dual-pk-consolidation-retrospective.md`
**Date**: 2026-04-30T17:00Z
**Analyst**: DevOps (closeout)

---

## Executive Summary

| Metric | Value |
|---|---|
| Retrospective source | 114-phase5-dual-pk-consolidation-retrospective.md |
| Systemic findings | 5 (R1–R5) |
| Agent files affected | 4 (implementer, qa, code-reviewer, devops) |
| Conflicts found | 0 |
| High-risk changes | 0 |
| Changes ready to implement | 5 (all) — already applied in commit `fc859ce4` |
| Overall risk | LOW |

---

## Findings

Two systemic issues surfaced during Plan 114 Phase 5:

1. **Code Review REJECTION cycle** (+4h): Implementer authored migrations without applying the FK-safe PK cutover pattern. The Code Reviewer caught 2 HIGH findings (FK cutover sequencing; admin badge auth query). This extended the pipeline by approximately 4 hours and is a class of error preventable with an implementation checklist.

2. **Post-merge CI failure**: After PR merge, the CI `Run Tests` job failed because 2 test files hardcoded the migration filename `006_phase4_semantic_constraints.sql`, which was renamed to `0061_phase4_semantic_constraints.sql` during QA to resolve a naming collision. A post-merge fix commit (`a5060361`) was required — not a clean release cadence.

Secondary findings:
- Migration prefix naming collision (`006_` assigned to two migrations) discovered mid-QA
- PROD migration apply procedure was unplanned (CI does not run `supabase db push`)
- EXPLAIN ANALYZE benchmarks deferred (no performance baseline captured post-Phase-5)

---

## Recommendation Analysis

### R1 — FK-Safe PK Cutover Checklist (Implementer)

**Source**: Code Review HIGH-1 — FK cutover sequencing violation

**Gap**: Implementer migrations dropped UNIQUE constraints before confirming inbound FK safety, which would cause constraint violations at apply time. This is a known Postgres migration anti-pattern.

**Proposed change**: Add "FK-safe migration pattern" checklist to `implementer.agent.md` for any migration that promotes a column to PK or changes constraint structure:
- Enumerate all inbound FKs on the target table
- Verify UNIQUE constraints are preserved during PK cutover (add UNIQUE before dropping old PK, never drop first)

**Alignment**: ✅ Additive. No existing instruction conflicts.
**Risk**: LOW — purely additive checklist item.

---

### R2 — Migration Prefix Collision Check (QA)

**Source**: Migration naming collision — `006_` prefix assigned to two different migrations

**Gap**: QA executed `supabase db push --include-all` without first verifying that no two migration files share the same numeric prefix. The collision forced a mid-QA rename (`006_` → `0061_`) and cascaded to test file breakage and a post-merge fix commit.

**Proposed change**: Add a pre-push migration prefix collision check to QA instructions:
```bash
ls supabase/migrations/*.sql | sed 's/_.*//' | sort | uniq -d
# Any output = collision → resolve before push
```

**Alignment**: ✅ Additive. New step before `supabase db push`.
**Risk**: LOW — one-liner check, no migration logic impact.

---

### R3 — Migration Filename Reference Check (Code Reviewer)

**Source**: Post-merge CI failure — 2 test files hardcoded migration filename as literal string

**Gap**: The Code Reviewer's first pass did not inspect test files for hardcoded migration filename references. When the Phase 4 migration was renamed, those tests became broken silently (only discovered in CI post-merge).

**Proposed change**: Add checklist item 6i to `code-reviewer.agent.md` migration review section:
- Flag test files that reference migration filenames as exact literal strings
- Require glob patterns or `fs.readdirSync` with pattern matching instead

**Alignment**: ✅ Additive. New item in existing migration checklist.
**Risk**: LOW — catches a late-discovery failure pattern.

---

### R4 — PROD Migration Apply Procedure (DevOps)

**Source**: Manual PROD migration apply was unplanned; discovered post-Stage-2

**Gap**: The CI/CD pipeline (GitHub Actions → Docker → Hetzner SSH) does not run `supabase db push`. PROD migrations must be applied manually after every release that includes migration files. This was not a named DevOps step and was handled reactively.

**Proposed change**: Add an explicit "PROD migration apply" section (§3g) to `devops.agent.md` Stage 2D, covering:
- Tool options (MCP `apply_migration` or CLI `supabase db push --linked`)
- Environment ref mapping (DEV: `qrekonfhaenjdnjhwdum`, PROD: `rdtdtcfntopcxcigkqoq`)
- Apply order (filename sort), verification SQL, and result recording

**Alignment**: ✅ Additive. New mandatory subsection in Stage 2D.
**Risk**: LOW — makes an implicit step explicit and documented.

---

### R5 — EXPLAIN ANALYZE Gate for Schema Migrations (QA)

**Source**: EXPLAIN ANALYZE benchmarks deferred (DF-1 open action)

**Gap**: The plan required pre- and post-migration EXPLAIN ANALYZE outputs; they were deferred as DF-1. Without a performance baseline, it is impossible to detect regressions introduced by the PK restructure on the 4 affected tables.

**Proposed change**: Elevate EXPLAIN ANALYZE to a required C-gate (not a deferred DF item) for QA on schema-affecting migrations. Add Option A (evidence required) / Option B (named deferral with owner + due date) gate to `qa.agent.md`.

**Alignment**: ✅ Additive. Strengthens an existing quality gate expectation.
**Risk**: LOW — creates obligation; does not block release if named deferral is acceptable.

---

## Implementation Status

All 5 recommendations implemented in commit `fc859ce4` (2026-04-30T16:53 UTC+2):

| R# | Agent File | Change | Status |
|----|-----------|--------|--------|
| R1 | `implementer.agent.md` | FK-Safe PK Cutover checklist added | ✅ Applied |
| R2 | `qa.agent.md` | Migration Prefix Collision Check added | ✅ Applied |
| R3 | `code-reviewer.agent.md` | Migration Filename Reference Check (6i) added | ✅ Applied |
| R4 | `devops.agent.md` | PROD Migration Apply (§3g) added | ✅ Applied |
| R5 | `qa.agent.md` | EXPLAIN ANALYZE Gate added | ✅ Applied |

---

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-30T17:00Z | devops (closeout) | PI analysis doc created — post-merge recovery |
