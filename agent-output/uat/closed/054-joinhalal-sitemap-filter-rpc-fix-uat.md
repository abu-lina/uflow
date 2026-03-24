ID: 054
Origin: 054
UUID: c4e81a2f
Status: Released
---

# UAT Report: Plan 054 — JoinHalal Sitemap Non-Detail Filter + RPC Write-Path Fix

**Plan Reference**: `agent-output/planning/054-joinhalal-sitemap-filter-rpc-fix.md`
**Date**: 2026-03-22T23:30Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date (UTC)          | Agent Handoff    | Request                                   | Summary                                                                                                     |
| ------------------- | ---------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-03-22T23:30Z   | QA → UAT         | QA Complete, ready for value validation   | UAT Complete — both root causes fixed; implementation delivers stated value; deferred live run documented via 053-OA-1 |
| 2026-03-22T23:07Z   | DevOps → Stage 1 | Local Commit                              | UAT artifact moved to terminal Committed state for release preparation; APPROVED FOR RELEASE verdict retained |
| 2026-03-22T23:14Z   | DevOps → Stage 2 | Release                                   | UAT artifact marked Released after `v0.8.14` tag and branch push |

---

## Value Statement Under Test

> As an operator running the JoinHalal import pipeline,
> I want a limit-10 import run to produce 10 real provider candidates and to surface any write-path failures clearly,
> so that staging validation reflects actual ingestion behavior and a single generic listing page can never silently stand in for a complete batch of real providers.

---

## Predecessor Gate Summary

| Doc | Status | Gate |
| --- | --- | --- |
| Implementation `054-joinhalal-sitemap-filter-rpc-fix-impl.md` | Active — all 5 milestones completed | ✅ PASS |
| Code Review `054-joinhalal-sitemap-filter-rpc-fix-code-review.md` | APPROVED WITH COMMENTS — 2 non-blocking LOWs | ✅ PASS |
| QA `054-joinhalal-sitemap-filter-rpc-fix-qa.md` | QA Complete — diagnostics clean, 413 tests passing | ✅ PASS |

---

## UAT Scenarios

### Scenario 1: Listing-page contamination eliminated at the shared-utility layer

- **Given**: The live `locations-sitemap1.xml` begins with `https://joinhalal.com/locations/` — a generic listing page with no `current_post.id`
- **When**: The operator runs a limit-10 dry-run collection
- **Then**: The listing page URL is rejected before the limit slice; 10 real provider detail-page candidates (URL shape `/locations/{category}/{name-id}/`) are collected
- **Result**: PASS
- **Evidence**:
  - `isJoinHalalDetailUrl()` added to `src/utils/joinhalal-parser.ts`; integrated as a `.filter()` inside `extractUrlsFromSitemapXml()` before the URL array is returned
  - Code review verified the logic: `https://joinhalal.com/locations/` → `segments=['locations']` → `false` ✅; `https://joinhalal.com/locations/restaurant/name-26548/` → `segments=['locations','restaurant','name-26548']` (length 3, segments[0]='locations') → `true` ✅
  - Both dry-run and write-mode collectors call `extractUrlsFromSitemapXml()` (from the shared utility); neither requires a separate code change
  - Tests: `[pre-fix FAILS] rejects the generic /locations/ listing page` and `[post-fix PASSES] excludes non-detail URLs like /locations/ from extraction` — both pass in the `413 passed` run

### Scenario 2: Write-path failure is visible to operators and CI

- **Given**: The RPC function `upsert_joinhalal_providers` is absent in the target environment (as it was when the regression occurred — migrationn 063 not applied)
- **When**: The operator runs the write-mode CLI (`npx tsx scripts/import-joinhalal.ts --write --limit 10`)
- **Then**: The process exits with code 1; the operator and any CI pipeline see a failure and investigate; no silent partial-success is possible
- **Result**: PASS (code-inspection evidence)
- **Evidence**:
  - `process.exit(1)` guard added after `printWriteReport(stats)` when `stats.failed > 0`
  - `stats.failed` is incremented by both the RPC upsert loop and the insert-only loop — broader than the plan's stated RPC-only scope but strictly more correct operationally (code review LOW #1, non-blocking; marked acceptable)
  - Code-inspection evidence is documented in the implementation doc and QA report; no automated CLI process-exit test exists (residual risk acknowledged — see Deferred Follow-ups)

### Scenario 3: Regression safety — existing extraction behavior preserved

- **Given**: A sitemap containing a valid mix of detail-page URLs and non-detail URLs
- **When**: `extractUrlsFromSitemapXml()` processes the XML
- **Then**: All detail-pattern URLs are returned; all listing/category pages are excluded; malformed URLs fail safely with no exception
- **Result**: PASS
- **Evidence**:
  - 7 new tests in `src/__tests__/utils/joinhalal-parser.test.ts` covering: valid detail URL, `/locations/` rejection, `/locations/restaurant/` rejection, mixed-sitemap extraction, malformed input, empty input, non-joinhalal domain rejection
  - Full regression suite: 413 passing, 18 skipped, 0 failures
  - `npm run type-check` exit 0, zero errors

### Scenario 4: Value statement — can the regression reproduce after this fix?

- **Given**: The exact incident scenario (sitemap begins with listing page; RPC absent)
- **When**: A limit-10 write run executes
- **Then**: Step 1 — listing page is rejected by the filter; Step 2 — real provider URLs populate the candidate set; Step 3 — if RPC absent, process exits non-zero; the single bogus `joinhalal` row can no longer be the only outcome
- **Result**: PASS (logical inference from M1 + M2 combined)
- **Evidence**: Both root causes are independently closed. The combination makes the regression scenario impossible to reproduce silently.

---

## Value Delivery Assessment

The plan targets two operator-visible outcomes: accurate 10-candidate collection and surfaced write failures. Both are delivered:

1. **Candidate accuracy**: `isJoinHalalDetailUrl()` in the shared parser is a deterministic positive-match filter. The business rule (only URLs with exactly 3 path segments under `/locations/`) is correctly encoded and tested. No listing page can enter the candidate set.

2. **Failure visibility**: `process.exit(1)` on `stats.failed > 0` makes the write-path failure detectable by any operator or CI pipeline. The code path is straightforward and correct by inspection.

The deferred item — a live staging write run confirming real providers are inserted with valid `import_source_id` values — is tracked as `053-OA-1` and deliberately deferred pending a staging environment with migration 063 applied. This deferral was baked into the plan's objective from the start and does not reduce the confidence in the code's correctness.

**Core value is not deferred.** The code changes that prevent the regression are in place and tested. The live staging confirmation is an operational gate, not a code correctness gate.

---

## QA Integration

**QA Report Reference**: `agent-output/qa/054-joinhalal-sitemap-filter-rpc-fix-qa.md`
**QA Status**: QA Complete
**QA Findings Alignment**: All QA findings documented and acknowledged:
- Changed-file diagnostics: PASS on all 6 files
- Unit tests: 413 passing, 0 failures
- Type check: exit 0
- Residual: no automated test for CLI process exit-code path (acknowledged, non-blocking)

The QA report correctly identified the CLI exit-code coverage gap and explicitly deferred it as acceptable given the narrow scope of the behavior change and the code-inspection evidence. This UAT concurs.

**Remediation Review**: No prior QA failure occurred for Plan 054. This is the first QA pass.

---

## Technical Compliance

- M1 — Filter non-detail URLs before limit slice: **PASS** — `isJoinHalalDetailUrl()` integrated into shared utility
- M2 — Surface RPC write-path failures with non-zero exit: **PASS** — `process.exit(1)` guard in place
- M3 — Regression tests (7 new tests): **PASS** — all passing; named with `[pre-fix FAILS]`/`[post-fix PASSES]` convention
- M4 — Updated `053-open-actions.md` with validation runbook: **PASS** — runbook documents migration check + write-run procedure + expected output
- M5 — Version bumped to 0.8.14, CHANGELOG entry, lockfile aligned: **PASS** — confirmed in all three files
- Test coverage: 413 passing / 18 skipped in full suite; all new code paths covered except CLI exit code
- Known limitations: CLI exit-code behavior unverified by automated test; live staging run deferred (053-OA-1)

---

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**: The plan objective is to fix two root causes of the "only one entry despite selecting 10" regression. Both root causes have independent, targeted fixes applied at the correct layer (shared utility for M1; CLI entry point for M2). The value statement's three outcomes — 10 real candidates, surfaced failures, listing page can never stand in for a batch — are all satisfied by the code changes.

**Drift Detected**: None. The implementation is narrowly scoped to the two milestones. The only scope expansion is that the M2 exit guard also covers insert-only failures (not just RPC), which code review assessed as strictly more correct. No product requirements were missed or added.

---

## Deferred Follow-ups

### 053-OA-1 — Live staging write validation (pre-existing, deferred)

| Field | Detail |
| --- | --- |
| **Owner** | DevOps / operator running staging |
| **Trigger / due window** | Before production promotion of v0.8.14; within 1 sprint if staging is available |
| **Evidence required to close** | `npx tsx scripts/import-joinhalal.ts --write --limit 10` on staging with migration 063 applied; at least 9 rows with non-null `import_source_id` inserted; process exits 0; `provider_name` is not `joinhalal` |
| **Runbook** | `agent-output/planning/053-open-actions.md` — item 053-OA-1 |
| **Recommended next action** | DevOps Stage 1 (local v0.8.14 commit) → Stage 2 (push + tag); staging validation is an operational gate, not a code gate |

### CLI exit-code automated test gap (informational)

| Field | Detail |
| --- | --- |
| **Owner** | Next implementer touching `scripts/import-joinhalal.ts` |
| **Trigger / due window** | Opportunistic — no immediate risk; not blocking release |
| **Evidence required to close** | A Vitest test that mocks `stats.failed > 0` and asserts `process.exit` is called with `1` |
| **Recommended destination** | Append to `src/__tests__/utils/joinhalal-parser.test.ts` or a new `scripts/__tests__/` when the write-script test harness is established |

---

## UAT Status

**Status**: Released
**Rationale**: All three predecessor gates pass. Both plan milestones (M1 and M2) are implemented, tested (where automatable), and correct by code review. The value statement is demonstrably satisfied by the code evidence chain. Deferred items are tracked with explicit owners and trigger conditions and do not block release.

---

## Release Decision

**Final Status**: APPROVED FOR RELEASE
**Rationale**: Implementation fixes both root causes of the live regression. Tests confirm the URL filter contract. Code review confirms correctness and security posture. QA confirms no diagnostic regressions. Deferred live staging run is an operational gate tracked under 053-OA-1 and does not affect code correctness.

**Recommended Version**: `v0.8.14` — patch bump from v0.8.13; no breaking changes, no new migrations, no API contract changes.

**Key Changes for Changelog** (supplement to CHANGELOG.md entry):
- `fix`: Exclude generic `/locations/` and category listing pages from JoinHalal sitemap URL collection; only 3-segment `/locations/{category}/{slug}/` URLs pass the new `isJoinHalalDetailUrl()` filter
- `fix`: Write-mode CLI now exits non-zero when any RPC or insert batch fails, surfacing silent write-path failures to operators and CI pipelines

## Next Actions

None required before release. DevOps Stage 1 (local v0.8.14 commit) and Stage 2 (push + tag v0.8.14) are the immediately actionable next steps. After tag is pushed, 053-OA-1 becomes the blocking operational gate for production promotion.
