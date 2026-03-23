---
ID: 055
Origin: 055
UUID: 7d2f4a9c
Status: Committed
---

# Plan 055 — JoinHalal RPC `provider_description` Schema Drift Fix

**Plan ID**: 055
**Target Release**: v0.8.15 (next available patch after current `origin/main` version `0.8.14`; confirm at DevOps Stage 1)
**Epic Alignment**: JoinHalal Data Import — importer reliability, schema safety, and operator-visible failure diagnosis
**Status**: Committed for Release `v0.8.15`
**Related Issues**: User-reported GitHub Actions write failure: `column "provider_description" of relation "providers" does not exist` (no external issue ID)
**Analysis Source**: `agent-output/analysis/closed/055-joinhalal-provider-description-rpc-drift-analysis.md`

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-23T07:22Z | planner | Initial plan created from Analysis 055 after release pre-flight and bundling check |
| 2026-03-23T08:38Z | implementer | Status → In Progress; implementation started |
| 2026-03-23T08:45Z | code-reviewer | Status → Code Review Approved; 2 fix-in-review changes applied |
| 2026-03-23 | qa | Status → QA Complete; artifact-first QA passed with deferred independent reruns due terminal restriction |
| 2026-03-23T08:00Z | uat | Status → UAT Approved; all 5 UAT scenarios PASS; APPROVED FOR RELEASE v0.8.15 |
| 2026-03-23T08:04Z | devops | Status → Committed; Stage 1 preflight passed, lifecycle closure prepared, and local commit queued for v0.8.15 |

---

## Value Statement and Business Objective

> As an operator running the JoinHalal import pipeline from GitHub Actions or a terminal,
> I want the write-mode upsert path to honor the real provider schema in the target database,
> so that import runs succeed on production-shaped environments and genuine schema mismatches surface clearly before data writes begin.

---

## Objective

Fix the schema-contract mismatch identified in Analysis 055:

1. The importer already treats `provider_description` as optional when the target database lacks that column.
2. The RPC `upsert_joinhalal_providers` still references `provider_description` unconditionally in SQL.

This plan closes that mismatch at the database boundary, preserves safe upsert behavior for JoinHalal records, and improves preflight visibility so operators can distinguish missing RPC/schema capabilities from content-level import failures.

---

## Assumptions

1. `origin/main` currently targets version `0.8.14`, so the next patch release is expected to be `v0.8.15` if no tag collision occurs at DevOps Stage 1.
2. The target environment where the user observed the failure has a `providers` table without `provider_description`, matching the repository note in migration 056.
3. The current write path for rows with `import_source_id` must continue using the dedicated PostgreSQL RPC rather than falling back to generic Supabase `.upsert()`.
4. `provider_description` is not a release-critical field for importer correctness; preserving safe writes is more important than persisting that field when the schema lacks it.
5. The fix should address the root cause once at the database/interface boundary rather than relying on application-layer field omission alone.

---

## Decision Record

| # | Topic | Decision | Status |
| --- | --- | --- | --- |
| 1 | Root-cause boundary | Fix the mismatch at the RPC/database contract boundary, not only in the importer payload construction | [RESOLVED] — the current failure occurs in SQL after payload preparation, so app-layer omission alone is insufficient |
| 2 | Schema strategy | Treat `provider_description` as optional for JoinHalal import correctness and require the upsert path to operate safely whether the column exists or not | [RESOLVED] — production-shaped environments already lack the column, and imports must remain operable there |
| 3 | Upsert safety | Preserve the explicit source-controlled/admin-controlled upsert safety model from Plan 052 | [RESOLVED] — the fix must not regress moderator-field preservation just to solve one drift bug |
| 4 | Operator visibility | Add explicit preflight or failure-surface visibility for schema/RPC capability mismatches before the first write batch | [RESOLVED] — the current batch error is diagnosable but late; operators need earlier, clearer signals |
| 5 | Release scope | Ship as a standalone patch release unless another active plan is later assigned the same target version | [RESOLVED] — pre-flight found no other known active plans targeting `v0.8.15` |
| 6 | Environment verification | Confirm live schema/function shape during validation, but do not block planning on immediate DB access | [RESOLVED] — the analysis proves the repository-side contract bug already; live inspection is a validation step, not a planning blocker |

---

## Release Strategy

Standalone (no other known active plans targeting `v0.8.15`).

This plan unblocks the next production-grade JoinHalal write validation after `v0.8.14`. It is release-worthy on its own because it fixes an actively observed write-mode failure in GitHub Actions.

---

## Milestones

### M1 — Repair the RPC Schema Contract

**Objective**: Ensure `upsert_joinhalal_providers` no longer hard-depends on `providers.provider_description` when the target schema lacks that column.

**Files in scope**:
- `supabase/migrations/063_upsert_joinhalal_provider_rpc.sql`
- Any follow-up migration required to safely replace or version the live RPC definition

**Acceptance criteria**:
- The upsert path succeeds on environments where `providers.provider_description` is absent.
- The upsert path continues to preserve the explicit allowlist/preserve-list safety model from Plan 052.
- The fix does not require reverting to generic `.upsert()`.
- The plan documents whether the solution is implemented through a new migration, a replacement RPC definition, or another schema-safe mechanism.

### M2 — Align Importer and TypeScript Contract Metadata

**Objective**: Bring the application-side field classification and import contract into line with the repaired RPC behavior.

**Files in scope**:
- `src/lib/import/joinhalal-fields.ts`
- `scripts/import-joinhalal.ts`
- `src/lib/import/joinhalal.ts`

**Acceptance criteria**:
- Any field list or contract helper that currently assumes `provider_description` is always source-controlled is updated to match the actual RPC behavior.
- The importer continues to probe schema capabilities before mapping optional fields.
- There is no contradiction between runtime preflight logs and the downstream write contract.

### M3 — Add Regression Coverage for Schema-Optional Upsert Behavior

**Objective**: Make this drift bug visible in automated verification so it cannot silently re-enter through future SQL or field-list edits.

**Files in scope**:
- `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts`
- Additional SQL-contract or migration-adjacent tests, if the implementer introduces a testable contract surface

**Acceptance criteria**:
- Coverage explicitly asserts the intended field classification after the fix.
- At least one regression test name makes the schema-drift bug visible.
- Verification evidence covers the database-boundary contract, not only importer payload assembly.

### M4 — Improve Operator-Facing Preflight Visibility

**Objective**: Surface schema/RPC capability mismatches before the first write batch so operators can fail fast with actionable diagnostics.

**Files in scope**:
- `scripts/import-joinhalal.ts`
- Any related shared import utilities used by admin dry-run or write workflows

**Acceptance criteria**:
- Write-mode preflight states whether the target environment supports the required JoinHalal write contract.
- Missing schema capability or incompatible RPC definition is reported as an operator-meaningful setup error, not only as a batch-offset failure.
- The messaging distinguishes content parsing failures from environment/schema contract failures.

### M5 — Version and Release Artifacts

**Objective**: Update release artifacts for the next patch version once DevOps confirms tag availability.

**Files in scope**:
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- Planning / implementation lifecycle artifacts for Plan 055

**Acceptance criteria**:
- Version artifacts align to the confirmed patch release at implementation/devops time.
- `CHANGELOG.md` clearly describes the repaired RPC/schema contract.
- No stale references to `v0.8.14` remain in Plan 055 release artifacts.

---

## Baseline & Measurements

This plan targets correctness and operational diagnosability rather than latency.

Success measurements:

- A write-mode JoinHalal run against a production-shaped schema does not fail with `column "provider_description" of relation "providers" does not exist`.
- Preflight output explicitly reports schema/RPC compatibility status before the first batch write.
- Validation records either:
  - successful write-path evidence in a target environment, or
  - an explicit deferral stating why live DB verification could not be performed and who owns it.

---

## Testing Strategy

- **Unit / contract**: field-classification and write-contract metadata must reflect the repaired schema-optional behavior.
- **Integration / migration-adjacent**: verify the chosen RPC-repair approach preserves safe update semantics for source-controlled fields while tolerating absence of `provider_description`.
- **CLI verification**: validate the write preflight and error messaging path for schema incompatibility.
- Existing type-check and relevant test suites must continue to pass.

No QA test cases are prescribed here; QA owns the exact gate design.

---

## Validation

1. Confirm the chosen RPC definition or migration no longer assumes `provider_description` exists in the target `providers` table.
2. Verify TypeScript-side field metadata matches the repaired SQL contract.
3. Run type-check and relevant automated tests.
4. If target-environment access is available, inspect live schema/function shape:
   - `information_schema.columns` for `public.providers`
   - `pg_get_functiondef('public.upsert_joinhalal_providers'::regproc)`
5. Validate write-mode preflight output is actionable before handoff to QA/UAT.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Repairing the RPC weakens the Plan 052 admin-field preservation guarantees | Low | High | Preserve explicit source/admin field boundaries and review them as a first-class acceptance criterion |
| Live database function body differs from repository migration history | Medium | Medium | Require validation against `pg_get_functiondef` when environment access is available |
| Only `provider_description` is fixed but other columns also drift in the live environment | Medium | Medium | Compare the live `providers` schema against the full RPC field list during validation |
| Preflight messaging improves but still fails too late for operators | Low | Medium | Require an acceptance criterion that contract capability is surfaced before first batch write |

---

## Duration Estimates

| Phase | Range | Uncertainty drivers |
| --- | --- | --- |
| Analysis | Done | Analysis 055 complete |
| Planning | Done | This plan inherits the RCA directly |
| Implementation | 2–4h | Depends on whether the safest repair is a new migration, RPC replacement, or dual-schema-compatible function logic |
| QA | 45–90m | Contract validation depth and any live-schema simulation needed |
| UAT | 30–60m | Depends on whether value proof can rely on documentary evidence or needs a real write-path run |
| DevOps | 30–60m | Standard patch-release flow; may increase if live schema verification reveals extra drift |

---

## Handoff Notes

- **Implementer**: Fix the root cause once at the write-contract boundary. Do not “solve” this only by removing `provider_description` from one payload path while leaving the RPC contract inconsistent.
- **Code Reviewer**: Pay particular attention to whether the repaired solution preserves Plan 052’s admin-field safety guarantees.
- **QA**: Validate both correctness and diagnosability: the write path must be safe on production-shaped schema and the operator messaging must be more actionable than the current batch-offset failure.
- **DevOps**: Live schema/function inspection should be part of the release-confidence evidence if environment access is available.
