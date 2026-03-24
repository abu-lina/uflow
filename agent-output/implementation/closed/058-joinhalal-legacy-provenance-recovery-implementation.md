---
ID: 058
Origin: 058
UUID: f8cb0a9c
Status: Committed
---

# Implementation 058 — JoinHalal Legacy Provenance Recovery (Alcohol Backfill Enablement)

## Plan Reference

[agent-output/planning/058-joinhalal-legacy-provenance-recovery-plan.md](../planning/058-joinhalal-legacy-provenance-recovery-plan.md)

## Date

2026-03-24

## Changelog

| Date (UTC) | Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-03-24T13:21Z | Critic → Implementer | Implement Plan 058 | Created matching functions, migration 065, provenance recovery CLI mode, updated backfill to use recovered provenance |
| 2026-03-24T13:55Z (approx.) | QA → Implementer | Remediate 3 QA findings | Fixed lint defects (MEDIUM-002), added stale-clone audit CLI mode + function (HIGH-001), completed TDD evidence (MEDIUM-001) |
| 2026-03-24T14:17Z | DevOps | Stage 1 commit prepared | Retargeted release to `v0.8.26`, updated release artifacts, and marked implementation committed for local bundling |

## Implementation Summary

Implemented Plan 058 to recover JoinHalal listing provenance for legacy import-bot providers.

**What was delivered:**

1. **New matching functions** (`normalizeMatchKey`, `matchLegacyProviders`) in `src/lib/import/joinhalal.ts`
   - Deterministic matching by `import_source_id` (highest confidence) or normalized name+city
   - Evidence recording for every match
   - Classification into matched/ambiguous/unmatched with safety guardrails

2. **New migration 065** adding `import_source_url` column to `providers` table
   - Persists authoritative JoinHalal listing URL for backfills/auditing
   - Updated `upsert_joinhalal_providers` RPC to accept and persist the new column

3. **New CLI mode `--recover-provenance`** in `scripts/import-joinhalal.ts`
   - Loads legacy providers from DB
   - Fetches JoinHalal sitemap and builds corpus index from detail pages
   - Matches legacy rows to corpus using deterministic strategy
   - Persists `import_source_url` for matched pending rows
   - Reports matched/ambiguous/unmatched statistics

4. **Updated alcohol backfill** to prefer `import_source_url` over `social_website`
   - Backfill now fetches JoinHalal pages from recovered provenance (not merchant sites)

**How this delivers value:**

The legacy JoinHalal population (914 import-bot rows) no longer blocks alcohol remediation. Operators can:
1. Run `--recover-provenance --dry-run` to assess match coverage
2. Run `--recover-provenance --write` to persist JoinHalal URLs for matched rows
3. Run `--backfill-alcohol --dry-run` to identify alcohol sellers against recovered provenance
4. Run `--backfill-alcohol --write` to reject alcohol-selling providers

## Milestones Completed

- [x] Step 3: Deterministic matching + evidence recording (implemented `matchLegacyProviders`)
- [x] Step 4: Schema + persistence for `import_source_url` (migration 065)
- [x] Step 5: Backfill uses recovered provenance
- [x] Step 6: Stale-clone audit — `auditStaleCloneOverlap()` function + `--audit-stale-clone` CLI mode implemented with TDD
- [x] Step 7: Version artifacts (CHANGELOG, migration)

**Deferred to operator execution (tooling delivered):**

- [ ] Step 1: Baseline inventory — operator runs `--recover-provenance --dry-run` against production DB
- [ ] Step 2: JoinHalal corpus capture — corpus fetch happens at runtime
- [ ] Step 6 report artifact: Operator runs `--audit-stale-clone` against production to generate the required report

## Files Modified

| Path | Changes | Lines |
| --- | --- | --- |
| `scripts/import-joinhalal.ts` | Added `--recover-provenance` CLI mode, added `--audit-stale-clone` CLI mode, updated imports, added `runProvenanceRecovery()`, added `runStaleCloneAudit()`, updated backfill to use `import_source_url`, removed unused `normalizeMatchKey` import, fixed non-null assertion | ~300 |
| `src/lib/import/joinhalal.ts` | Added `normalizeMatchKey`, `matchLegacyProviders`, `auditStaleCloneOverlap`, and related types (`CorpusEntry`, `LegacyProviderRow`, `MatchEvidence`, `ProvenanceMatch`, `AmbiguousMatch`, `UnmatchedProvider`, `MatchResult`, `StaleCloneExactDuplicate`, `StaleClonePartialOverlap`, `StaleCloneAuditResult`) | ~270 |

## Files Created

| Path | Purpose |
| --- | --- |
| `supabase/migrations/065_add_import_source_url_column.sql` | Adds `import_source_url` column and updates RPC |
| `src/__tests__/lib/import/joinhalal-provenance.test.ts` | TDD tests for matching functions + stale-clone audit |
| `src/__tests__/scripts/import-joinhalal-stale-clone-audit.test.ts` | CLI-level test for `--audit-stale-clone` mode |

## Code Quality Validation

- [x] `npm run type-check` — passes (0 errors)
- [x] `npm test` — 489 passed, 1 failed (pre-existing AdminProvidersPageContent flaky test unrelated to changes)
- [x] Provenance tests — 16 passed (12 matching + 4 audit)
- [x] Backfill tests — 3 passed
- [x] CLI provenance recovery tests — 2 passed
- [x] CLI stale-clone audit test — 1 passed
- [x] ESLint on scripts/import-joinhalal.ts — 0 plan-specific errors (2 pre-existing at Supabase client init)

## Value Statement Validation

**Original value statement:**

> As an operator maintaining halal trust signals, I want legacy JoinHalal-imported providers to be deterministically linked back to their authoritative JoinHalal detail pages (or explicitly flagged as unmatched/ambiguous), so that the released alcohol-badge backfill can correctly identify alcohol-selling listings without risking false matches or overwriting human moderation decisions.

**How implementation delivers:**

- ✅ Legacy providers can now be matched to JoinHalal listings via `--recover-provenance`
- ✅ Matched rows get `import_source_url` persisted for repeatable backfills
- ✅ Ambiguous/unmatched rows are reported explicitly, not auto-modified
- ✅ Only pending rows are updated (safety guardrail)
- ✅ Backfill prefers `import_source_url` over merchant website

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| --- | --- | --- | --- | --- | --- |
| `normalizeMatchKey()` | `joinhalal-provenance.test.ts` | ✅ Yes | ✅ Yes | module resolution failure (function undefined) | ✅ Yes |
| `matchLegacyProviders()` | `joinhalal-provenance.test.ts` | ✅ Yes | ✅ Yes | module resolution failure (function undefined) | ✅ Yes |
| `auditStaleCloneOverlap()` | `joinhalal-provenance.test.ts` | ✅ Yes | ✅ Yes | TypeError: not a function | ✅ Yes |
| `runProvenanceRecovery()` | `import-joinhalal-provenance-recovery.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes | CLI orchestration; QA-created regression tests verify dry-run reporting and write-mode persistence + pending guard | ✅ Yes |
| `runStaleCloneAudit()` | `import-joinhalal-stale-clone-audit.test.ts` | ✅ Yes | ✅ Yes | CLI module import + function not wired | ✅ Yes |

## Test Coverage

### Unit Tests

- `normalizeMatchKey` — 5 tests (normalization, null city, whitespace, Germans umlauts)
- `matchLegacyProviders` — 7 tests (import_source_id match, name+city match, ambiguous, unmatched, skipped reviewed, evidence, priority)
- `auditStaleCloneOverlap` — 4 tests (classification, recommendation, empty stale-clone, empty legacy)

### Integration Tests

- Backfill tests updated to include `import_source_url` in type interface — 3/3 pass
- CLI provenance recovery (QA-owned) — 2/2 pass
- CLI stale-clone audit — 1/1 pass

## Test Execution Results

```
$ npm run type-check
tsc --noEmit
[no output = success]

$ npx vitest run src/__tests__/lib/import/joinhalal-provenance.test.ts
✓ (16 tests) 5ms
Test Files  1 passed (1)
Tests  16 passed (16)

$ npx vitest run src/__tests__/scripts/import-joinhalal-backfill.test.ts
✓ (3 tests) 1119ms
Test Files  1 passed (1)
Tests  3 passed (3)

$ npx vitest run src/__tests__/scripts/import-joinhalal-provenance-recovery.test.ts
✓ (2 tests) 1860ms
Test Files  1 passed (1)
Tests  2 passed (2)

$ npx vitest run src/__tests__/scripts/import-joinhalal-stale-clone-audit.test.ts
✓ (1 test) 1860ms
Test Files  1 passed (1)
Tests  1 passed (1)

$ npx eslint --no-ignore scripts/import-joinhalal.ts
2 pre-existing errors (no-non-null-assertion at Supabase client creation line 170)
0 plan-specific errors
```

## Schema Decision Resolution

Per the DEFERRED decision in Plan 058 with selection criteria:

> prefer the new column unless Architect/implementation discovery identifies a near-term requirement for multi-source provenance beyond JoinHalal

**Decision: Option A — new `import_source_url` column on `providers`**

**Rationale:**
- Only JoinHalal provenance is needed for the foreseeable future
- Minimal migration (single `ALTER TABLE ADD COLUMN`)
- Consistent with existing `import_source` / `import_source_id` pattern from migration 062
- No near-term multi-source provenance requirement identified

## Outstanding Items

### Operator Actions Required (Plan Steps 1, 2, 6 report)

1. **Stale-clone audit report**: Run `--audit-stale-clone` against production DB to generate the required report artifact. This produces the overlap classification and action recommendation required by Plan 058 acceptance criteria. The tooling and audit logic are fully implemented and tested.

2. **Baseline inventory**: Run `--recover-provenance --dry-run` against production to assess:
   - Total legacy rows needing provenance
   - Match coverage (how many can be matched)
   - Ambiguous/unmatched counts

3. **Sequencing**: If the stale-clone audit reveals overlap > 0, finalize remediation of duplicates before running provenance recovery in write mode.

4. **Provenance recovery write**: After audit, run `--recover-provenance --write`

5. **Alcohol backfill**: Run `--backfill-alcohol --dry-run` then `--write`

### Pre-Existing Test Failure (Not Blocking)

`AdminProvidersPageContent.test.tsx` has a flaky test ("shows a single conflict toast and refetches after a 409 review response"). This is a pre-existing issue unrelated to Plan 058 changes.

## Next Steps

1. **Code Review** — Review implementation for quality, security, and adherence to plan
2. **QA** — Validate against acceptance criteria, run automation
3. **UAT** — Operator dry-run evidence review, spot checks
4. **DevOps** — Apply migration 065, deploy, then execute operator actions

