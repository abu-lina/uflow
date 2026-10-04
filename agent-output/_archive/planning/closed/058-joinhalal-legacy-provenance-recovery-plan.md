---
ID: 058
Origin: 058
UUID: f8cb0a9c
Status: Committed
---

# Plan 058 — JoinHalal Legacy Provenance Recovery (Alcohol Backfill Enablement)

**Target Release**: v0.8.27 (retargeted at DevOps Stage 2 after `v0.8.26` was already tagged on origin for Plan 059)  
**Epic Alignment**: JoinHalal import integrity + trust-first moderation correctness  
**Status**: Committed for Release v0.8.27  
**Related Issues**: None

## Release Strategy

Standalone (no other known active plans targeting v0.8.27 in `agent-output/planning/`).

## Changelog

| Date (UTC) | Agent | Change | Rationale |
| --- | --- | --- | --- |
| 2026-03-24T12:23Z | planner | Created plan from Analysis 058 | Legacy JoinHalal rows lack persisted listing URLs; provenance recovery is required before alcohol-badge backfill can work |
| 2026-03-24T12:39Z | planner | Revised plan after Critique 058 | Added sequencing gate for stale-clone overlap and explicit schema-selection heuristic for implementation |
| 2026-03-24T14:00Z | code-reviewer | Code Review complete | APPROVED_WITH_COMMENTS — 3 LOW/INFO findings, all accepted for release; ready for QA |
| 2026-03-24T13:41Z | qa | QA complete | QA FAILED — missing stale-clone audit deliverable, incomplete TDD evidence for CLI path, and plan-specific script lint defects |
| 2026-03-24T13:55Z (approx.) | implementer | QA remediation | Fixed all 3 QA findings: added stale-clone audit CLI mode + function (HIGH-001), completed TDD evidence (MEDIUM-001), fixed lint defects (MEDIUM-002) |
| 2026-03-24T14:02Z | qa | QA re-validation | QA COMPLETE — all 3 findings resolved; 22/22 tests pass, type-check clean, lint clean |
| 2026-03-24T14:10Z | uat | UAT complete | APPROVED FOR RELEASE — all plan objectives met, safety constraints verified, stale-clone audit tooling delivered |
| 2026-03-24T14:17Z | devops | Stage 1 commit prepared | Retargeted release from `v0.8.25` to `v0.8.26` after version collision, updated release artifacts, created deferred follow-up tracker, and closed lifecycle docs for local commit |
| 2026-03-24T15:04Z | devops | Stage 2 version collision correction | Retargeted release from `v0.8.26` to `v0.8.27` after origin already contained tag `v0.8.26` for Plan 059 |

## Value Statement and Business Objective

As an **operator maintaining halal trust signals**, I want **legacy JoinHalal-imported providers to be deterministically linked back to their authoritative JoinHalal detail pages (or explicitly flagged as unmatched/ambiguous)**, so that **the released alcohol-badge backfill can correctly identify alcohol-selling listings without risking false matches or overwriting human moderation decisions**.

## Context

Analysis 058 verified that the legacy JoinHalal population (914 import-bot rows) does not persist JoinHalal listing URLs. The released backfill therefore re-fetches merchant websites (or malformed strings) via `social_website`, producing mostly fetch/parse failures and `Would reject: 0` for reasons unrelated to actual alcohol sales.

Separately, an operator ran a stale clone importer which inserted **864** rows via the *normal* importer path. This batch must be audited so that provenance recovery and backfill do not compound duplicates or mixed-provenance records.

## Scope

**In scope**
- Recover or reconstruct authoritative JoinHalal provenance for **legacy** rows:
  - deterministically match legacy providers back to **current JoinHalal detail pages** when safe
  - persist recovered JoinHalal listing URL (and any stable listing identifier) for future backfills/audits
- Define safe handling for:
  - **unmatched** legacy rows
  - **ambiguous** matches (multiple possible JoinHalal pages)
- Audit the stale-clone import run that inserted **864** rows:
  - quantify overlap with existing providers
  - propose safe remediation (dedupe/retain/rollback strategy)

**Out of scope**
- Any new UI surfaces, moderation dashboards, or operator tooling beyond the minimum required reporting artifacts for safe execution.
- Changing the halal/alcohol policy rules (Plan 051) or expanding the set of rejection heuristics.
- Rewriting the JoinHalal importer end-to-end.

## Assumptions

- JoinHalal still exposes enough stable identity signals across sitemap + detail pages (name, city, address/phone, external website) to support high-confidence matching for a meaningful subset of the 914 legacy rows.
- Safety beats coverage: it is acceptable if some rows remain unmatched rather than risking incorrect automated rejections.

## Decision Record

- [RESOLVED] Persist recovered JoinHalal provenance (at minimum listing URL) in the database for matched legacy rows. Rationale: without persisted provenance, backfills remain non-repeatable and unverifiable.
- [RESOLVED] Use a confidence-gated, deterministic matching pipeline that only applies updates when exactly one high-confidence JoinHalal candidate exists. Rationale: prevents silent false positives.
- [RESOLVED] Ambiguous matches must not change `review_status`; they are reported for manual follow-up only. Rationale: avoids overwriting human moderation with uncertain automation.
- [RESOLVED] Unmatched legacy rows remain untouched (no auto moderation), but are explicitly tagged/recorded as `unmatched_provenance` for auditability. Rationale: makes the gap visible without forcing risky guesses.
- [DEFERRED: Implementer — schema tradeoff; target Plan 058 / v0.8.27] Choose between (A) a new `import_source_url` column on `providers` or (B) a dedicated provenance table for multi-source extensibility. Rationale: both can satisfy the immediate need; prefer the new column unless Architect/implementation discovery identifies a near-term requirement for multi-source provenance beyond JoinHalal, in which case the dedicated table is justified.
- [RESOLVED] Treat the stale-clone insert batch (864 rows) as a separate operational risk: produce an audit report + remediation recommendation before any deletions. Rationale: deletion without overlap analysis risks data loss.

## Plan

1. **Baseline & inventory (legacy + stale-clone batches)**
   - Identify the exact legacy target set (914 import-bot rows) and record:
     - counts by `review_status`
     - fields available for matching (name/city/address/phone/website)
     - current provenance fields (`import_source`, `import_source_id`, `social_website` quality)
   - Identify the stale-clone batch (864 inserted rows) and record:
     - counts, created-at window (if applicable), and provenance markers
     - overlap rate with the legacy set and with any modern `import_source='joinhalal'` rows
   - **Sequencing gate**: if this inventory finds any overlap between the stale-clone batch and the legacy remediation target set, implementation must define the deduplicated target set and finalize the stale-clone remediation recommendation before provenance matching or persistence begins. Provenance recovery must not run across rows that are still candidates for merge/delete/rollback.
   - Output: a deterministic CSV/JSON report checked into `agent-output/implementation/058-*` during implementation.

2. **JoinHalal corpus capture for matching**
   - Fetch current JoinHalal sitemap candidate set for restaurant listings.
   - For each candidate detail page, extract stable identity attributes needed for matching (e.g., listing URL, listing ID/slug, name, city, address, phone, external website domain) and build an index for lookup.
   - Output: structured cache file(s) generated during the run (location + format decided by implementer), plus summary counters.

3. **Deterministic matching + evidence recording**
   - Define a matching strategy that is explainable and stable (example categories):
     - exact match on JoinHalal listing ID when available
     - exact match on normalized phone number
     - exact match on external website domain + city
     - strict normalized name + city (+ optional postal code/address token) match
   - Require that every accepted match includes:
     - a single winning candidate (no ties)
     - an explicit `match_method`
     - evidence fields captured (e.g., which keys matched)
   - Output: “matched / ambiguous / unmatched” lists with per-row reasoning.

4. **Persist provenance for matched legacy rows (idempotent)**
   - Write recovered provenance to DB for matched legacy rows:
     - authoritative JoinHalal listing URL
     - stable JoinHalal ID/slug if available
     - ensure `import_source='joinhalal'` is set only when provenance is real and unique
   - Guardrails:
     - never modify rows with non-pending `review_status`
     - updates must be idempotent (re-runs should converge without drift)

5. **Enable alcohol backfill against recovered provenance**
   - Update the legacy backfill flow so it fetches JoinHalal HTML from the persisted JoinHalal listing URL (not merchant websites).
   - Execute in two phases:
     - dry-run producing a candidate list + counters
     - write-run gated behind explicit operator confirmation

6. **Stale-clone import batch audit + remediation recommendation**
   - Produce an audit answering:
     - how many of the 864 rows are exact duplicates of existing providers
     - how many conflict/overlap partially (same name/city, different IDs)
     - whether any rows should be soft-deleted, merged, or retained
  - If Step 1 finds overlap with the legacy remediation target set, this recommendation becomes a blocking prerequisite for Steps 2-5 rather than a post-match cleanup task.
   - Deliverable: a recommended cleanup approach with rollback notes (no silent deletes).

7. **Version and release artifacts**
   - Update version artifacts and `CHANGELOG.md` for the target release.
   - Ensure release notes clearly separate:
     - provenance recovery enablement
     - stale-clone batch audit results and any cleanup actions

## Acceptance Criteria

- Legacy JoinHalal alcohol remediation is no longer blocked on missing listing URLs:
  - matched legacy rows have persisted JoinHalal detail-page URLs
  - backfill fetches JoinHalal pages from that provenance (not merchant sites)
- Safety guarantees hold:
  - rows with non-pending `review_status` are never modified
  - ambiguous/unmatched rows do not receive automated moderation changes
- Stale-clone batch is not ignored:
  - an explicit audit report exists for the 864-row insert run with an action recommendation

## Validation (Non-QA)

- Static checks: `npm run lint` + `npm run type-check`.
- Automated tests: `npm test` (and any targeted additions needed for matching determinism).
- Evidence: terminal outputs / report artifacts attached in Implementation 058.

## Risks and Mitigations

- **Risk**: false matches lead to wrongful alcohol rejection.
  - **Mitigation**: strict confidence gating + evidence capture + no changes for ambiguous matches.

- **Risk**: JoinHalal listings changed/removed, reducing match coverage.
  - **Mitigation**: treat low coverage as acceptable; report unmatched explicitly; avoid guessing.

- **Risk**: schema change choice becomes a time sink.
  - **Mitigation**: allow implementer to choose the minimal schema that persists URL + stable ID; keep migration narrow.

- **Risk**: stale-clone duplicates inflate counts or confuse provenance recovery.
  - **Mitigation**: audit and classify the 864-row batch before any destructive cleanup.

## Duration Estimates

- Analysis: 1–3h (field inventory, overlap quantification, match-key feasibility)
- Planning: 0.5–1h (this plan + decision record)
- Implementation: 4–10h (indexing + matching + persistence + backfill enablement)
- QA: 2–6h (automation runs + regression checks; manual verification deferred to QA artifacts)
- UAT: 1–2h (operator dry-run evidence review + spot checks)
- DevOps: 0.5–1.5h (versioning + deploy/migration sequencing)

Uncertainty drivers: JoinHalal listing churn since the legacy import; quality of legacy identity fields; schema migration complexity (column vs provenance table).
