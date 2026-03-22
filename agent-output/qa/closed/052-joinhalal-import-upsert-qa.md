---
ID: 052
Origin: 052
UUID: b4e91c3f
Status: Committed
---

# QA Report: Plan 052 — JoinHalal Import Upsert with Unique ID

**Plan Reference**: `agent-output/planning/052-joinhalal-import-upsert-plan.md`
**Implementation Reference**: `agent-output/implementation/052-joinhalal-import-upsert-impl.md`
**Code Review Reference**: `agent-output/code-review/052-joinhalal-import-upsert-code-review.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date       | Agent Handoff | Request                               | Summary                                                                                                                                     |
| ---------- | ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-22 | Code Reviewer | Implementation complete, ready for QA | Created QA strategy, validated final changed surface, and identified blocking correctness gap in the upsert write path                      |
| 2026-03-22 | QA            | Final verdict                         | QA Failed: conflict updates still overwrite admin-controlled provider fields; acceptance criteria and regression coverage remain incomplete |
| 2026-03-22 | Implementer   | QA re-fix complete                    | Re-validated the new RPC-based upsert path, independent gates, and regression coverage; prior blockers are resolved                         |

## Timeline

- **Test Strategy Started**: 2026-03-22
- **Test Strategy Completed**: 2026-03-22
- **Implementation Received**: 2026-03-22
- **Testing Started**: 2026-03-22
- **Testing Completed**: 2026-03-22
- **Final Status**: QA Complete

## QA State

- **Phase 1**: Test Strategy Development → complete
- **Phase 2**: Testing In Progress → complete
- **Final**: QA Complete

## Preflight Notes

- `agent-output/qa/` exists.
- No orphan QA docs with terminal statuses were found outside `closed/`.
- `agent-output/qa/README.md` is missing in this workspace, so this review followed the active QA mode instructions and prior closed QA artifacts directly.
- Flowbaby memory retrieval succeeded.
- Chain invariant check passed for the active chain: Plan, Implementation, Code Review, and this QA document all use `ID: 052`, `Origin: 052`, `UUID: b4e91c3f`.
- Roadmap context was taken from `agent-output/roadmap/product-roadmap.md`; it still reports `Current Version: v0.8.6`, which is stale but non-blocking for this plan.

## Test Strategy (Pre-Implementation)

The user-facing risk in this plan is not whether a fresh import inserts rows. The critical risk is whether a **re-import conflict update** preserves moderator/admin state on an existing provider while refreshing only source-controlled fields. The strategy therefore prioritizes conflict-update correctness over raw coverage counts.

### Testing Infrastructure Requirements

**Test Frameworks Needed**:

- Vitest (existing repo standard)
- React Testing Library (existing repo standard for dashboard consumer)

**Testing Libraries Needed**:

- Existing `vitest` mocks and assertions

**Configuration Files Needed**:

- None additional

**Build Tooling Changes Needed**:

- None additional

**Dependencies to Install**:

```bash
None
```

⚠️ TESTING INFRASTRUCTURE NEEDED: None additional.

### Required Unit Tests

- Verify `extractJoinHalalPostId()` extracts a stable post ID from `vxconfig.current_post.id`.
- Verify dry-run classification distinguishes `wouldInsert` vs `wouldUpdate` for import-source keyed records.
- Verify duplicate import-source keys within a single dry-run do not inflate `wouldInsert`.

### Required Integration Tests

- Verify a conflict update preserves admin-controlled fields (`review_status`, `provider_owner_id`, `user_created_id`, `show_address`, `needs_ids`, `barakah_effects`, images/feedback if applicable).
- Verify the write-mode reporting surface distinguishes inserts vs updates if the plan requires an `updated` counter.
- Verify the write path does not regress null-key fallback behavior for records without `import_source_id`.

### Acceptance Criteria

- Re-importing the same provider updates source-controlled fields only.
- Admin-controlled fields remain unchanged after conflict updates.
- Dry-run clearly distinguishes inserts vs updates.
- Write-mode reporting is not misleading about insert/update disposition.

## Implementation Review (Post-Implementation)

### Code Changes Summary

- Migration `062_add_import_source_columns.sql` adds `import_source`, `import_source_id`, a partial unique index, and an `updated_at` trigger.
- Parser support added via `extractJoinHalalPostId()` and shared `parseVxConfig()`.
- Dry-run core now loads both name/city keys and import-source keys and reports `wouldUpdate`.
- Dashboard dry-run UI now displays `Would UPDATE`.
- CLI write path now routes records with `import_source_id` through `.upsert(..., { onConflict: 'import_source,import_source_id' })` and keeps null-key records on insert-only fallback.
- Code Review fix-in-review already tightened dry-run intra-run dedup and removed unused `count: 'exact'` overhead.

### User-Scenario Risk Assessment

Highest-risk user scenario:

1. Moderator has already reviewed or enriched an imported provider.
2. Operator re-runs the JoinHalal import.
3. Existing provider conflicts on `(import_source, import_source_id)`.
4. `.upsert()` updates the row using the full payload currently built in `ProviderUpsert`.
5. Admin-controlled columns are reset to import defaults (`review_status: 'pending'`, `provider_owner_id: null`, `show_address: true`, `needs_ids: []`, `barakah_effects: []`, `user_created_id: IMPORT_BOT_UUID`).
6. Existing moderation state and enrichment are lost or corrupted.

This is the opposite of the plan’s main safety requirement and makes the current release unsafe.

## TDD Compliance Gate

**Result**: PASS with documented integration limitation.

- The implementation document includes a TDD table.
- The original parser and dry-run regression tests still pass.
- A new contract test file verifies the source-controlled vs admin-controlled field classification that the new SQL RPC function relies on.
- The highest-risk runtime path is now implemented with a dedicated SQL allowlist rather than generic `.upsert()` behavior, which materially lowers the overwrite risk identified in the failed QA pass.
- Remaining limitation: there is still no DB-backed automated test that executes the RPC function against a live conflicting provider row in this workspace. That remains a UAT / environment-backed validation item, not a blocker for code-level QA given the explicit SQL implementation and clean gate results.

## Test Coverage Analysis

### New/Modified Code

| File                                                         | Function/Class                             | Test File                                            | Test Case                                                                       | Coverage Status   |
| ------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------- |
| `src/utils/joinhalal-parser.ts`                              | `extractJoinHalalPostId`                   | `src/__tests__/utils/joinhalal-parser.test.ts`       | parser extraction cases                                                         | COVERED           |
| `src/lib/import/joinhalal.ts`                                | dry-run `wouldUpdate` classification       | `src/__tests__/lib/import/joinhalal-dry-run.test.ts` | `counts a provider with matching import_source+import_source_id as wouldUpdate` | COVERED           |
| `src/lib/import/joinhalal.ts`                                | null-key fallback dedup                    | `src/__tests__/lib/import/joinhalal-dry-run.test.ts` | `a page without vxconfig falls back to name+city dedup`                         | COVERED           |
| `src/lib/import/joinhalal.ts`                                | mixed insert/update/skip invariant         | `src/__tests__/lib/import/joinhalal-dry-run.test.ts` | `mixed: one update, one insert, one skip — invariant holds`                     | COVERED           |
| `supabase/migrations/063_upsert_joinhalal_provider_rpc.sql`  | conflict update field preservation         | `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts` | `source-controlled fields match the RPC DO UPDATE SET allowlist`            | PARTIALLY COVERED |
| `scripts/import-joinhalal.ts`                                | write-mode RPC insert/update reporting     | code inspection + gate rerun                           | `.rpc('upsert_joinhalal_providers')` populates `stats.inserted` and `stats.updated` | PARTIALLY COVERED |
| `src/features/import/components/ImportDryRunPageContent.tsx` | dry-run stats rendering with `wouldUpdate` | indirect only                                        | additive UI review only                                                         | PARTIALLY COVERED |

### Coverage Gaps

- No DB-backed automated test executes `upsert_joinhalal_providers()` against a real conflicting provider row.
- No automated test directly asserts CLI console output formatting for inserted vs updated reporting.
- These gaps are real, but they are narrower than the previous failed state because the conflict behavior now lives in explicit SQL rather than implicit PostgREST payload semantics.

### Comparison to Test Plan

- **Tests Planned**: at least 3 focused areas (parser, transform/upsert classification, admin-field preservation)
- **Tests Implemented**: parser, dry-run classification, field-classification contract coverage
- **Tests Missing**: DB-backed conflict-update execution test, direct CLI output assertion
- **Tests Added Beyond Plan**: dry-run intra-run dedup guard via invariant coverage

## Test Execution Results

### Independent Re-QA Automated Evidence

- **Command**: `npx vitest run`
- **Status**: PASS
- **Output**: 41 passed, 1 skipped test files; 395 passed, 18 skipped, 0 failed. This includes the new `joinhalal-upsert-fields` contract tests and the fixed `wouldUpdate` dry-run tests.

- **Command**: `npx tsc --noEmit`
- **Status**: PASS
- **Output**: clean

- **Command**: `npx eslint "src/lib/import/joinhalal.ts" "src/lib/import/joinhalal-fields.ts" "src/__tests__/lib/import/joinhalal-dry-run.test.ts" "src/__tests__/lib/import/joinhalal-upsert-fields.test.ts" "src/utils/joinhalal-parser.ts" "src/__tests__/utils/joinhalal-parser.test.ts"`
- **Status**: PASS
- **Output**: clean

- **Command**: `npm run build`
- **Status**: FAIL (non-blocking, environment/config related)
- **Output**: build compiles successfully, then fails during page data collection for `/api/badges/[badgeId]/revoke` with `Missing NEXT_PUBLIC_SUPABASE_URL environment variable`. This is outside the JoinHalal import change surface.

### Current IDE / Diagnostics Validation

- `scripts/import-joinhalal.ts`: no IDE errors
- `src/lib/import/joinhalal.ts`: no IDE errors
- `src/lib/import/joinhalal-fields.ts`: no IDE errors
- `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts`: no IDE errors
- `supabase/migrations/063_upsert_joinhalal_provider_rpc.sql`: no IDE errors

### Lint / Script Scope Note

- Direct `eslint --no-ignore scripts/import-joinhalal.ts` is not usable as a QA gate in this repo because the script is outside the configured TypeScript ESLint project set and fails with a parser-project configuration error.
- This is treated as tooling scope, not a Plan 052 defect. Type safety and editor diagnostics for the script are clean.

## Findings

No blocking findings remain for Plan 052.

### Resolved Since Failed QA

- **[RESOLVED] HIGH / Data Integrity**: the JoinHalal write path no longer uses generic `.upsert()` for conflict updates. It now calls `upsert_joinhalal_providers()`, whose `DO UPDATE SET` clause only mutates source-controlled fields.
- **[RESOLVED] MEDIUM / Reporting**: `WriteStats.updated` is now populated from the RPC response and surfaced in `printWriteReport()`.
- **[RESOLVED] MEDIUM / Regression adequacy**: the previous `wouldUpdate` regression tests now pass, and a new contract test covers the source/admin field split used by the RPC allowlist.

### Residual Non-Blocking Risks

- A DB-backed automated conflict test would still strengthen confidence further.
- The production build remains environment-sensitive due missing Supabase env vars outside this plan’s surface.

## QA Verdict

**Status**: QA Complete

**Rationale**:

The failed-QA blocker is closed. The JoinHalal write path now routes conflict updates through a dedicated SQL function with an explicit source-field allowlist, which directly addresses the prior overwrite risk. Independent re-QA gates passed (`vitest`, `tsc`, delta lint on in-scope files), the dry-run regression path is green again, and the write report now distinguishes inserted vs updated counts.

There is still no live DB-backed automated execution of the RPC conflict path in this workspace, but the implementation moved the risky behavior out of implicit PostgREST payload semantics and into explicit SQL that is straightforward to inspect and reason about. That remaining gap is better handled in UAT / environment-backed verification than as a blocker here.

## Required Actions Before Re-QA

None. Re-QA passed.

## Residual Risks / Notes

- `agent-output/qa/README.md` is still missing; the repo should either add it or stop referring agents to it.
- `agent-output/roadmap/product-roadmap.md` still reports `Current Version: v0.8.6`, which is stale but outside this plan.
- `npm run build` still depends on Supabase env configuration outside this plan’s change surface. In this re-QA run the build compiled successfully and then failed during page-data collection because `NEXT_PUBLIC_SUPABASE_URL` was missing.
- Recommended UAT focus: apply migration 063 in the target environment, run a controlled re-import of a known existing JoinHalal provider, and verify admin fields remain unchanged while source fields refresh.

## Handoff

Handing off to uat agent for value delivery validation.
