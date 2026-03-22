---
ID: 053
Origin: 053
UUID: b7e4a1c9
Status: Released
---

# Plan 053 — JoinHalal vxconfig Fix and Offer Auto-Creation

## Plan Header

- **Target Release**: `v0.8.13`
- **Epic Alignment**: Provider discovery data integrity and import reliability, supporting the Master Product Objective by keeping halal business listings complete, deduplicated, and trustworthy
- **Status**: Released
- **Related Issues**: None

### Changelog

| Date (UTC) | Author | Change | Rationale |
|---|---|---|---|
| 2026-03-22T19:10Z | planner | Created plan | Convert Analysis 053 into implementation-ready work covering vxconfig parsing, auto-created offers, and no-drop import behavior |
| 2026-03-22T19:55Z | planner | Revised plan after Critic comments | Resolve F-1 by fixing category assignment strategy for auto-created offers; clarify dedup and service-role assumptions |
| 2026-03-22T20:24Z | devops | Stage 1 committed locally | Version `v0.8.13` confirmed, deferred staging validation tracked, and plan advanced to committed state pending release approval |
| 2026-03-22T20:28Z | qa | QA completed | QA gates passed for Plan 053 scope; automated evidence recorded and plan advanced for UAT handoff |
| 2026-03-22T20:45Z | uat | UAT completed | All 5 UAT scenarios PASS; APPROVED FOR RELEASE; plan advanced for DevOps handoff |
| 2026-03-22T20:36Z | devops | Released | Release branch `release/v0.8.13-prep` and tag `v0.8.13` pushed to origin; plan chain marked Released |

## Value Statement and Business Objective

As a **Muslim user searching for halal businesses**,
I want **imported JoinHalal providers to keep stable source IDs and complete food-offer mappings**,
so that **UFlow shows accurate listings, supports safe re-imports without duplicates, and preserves discoverability for the food options each provider actually serves**.

## Objective

Deliver a focused patch that restores JoinHalal source identity extraction, guarantees unmatched Speisen terms are auto-created as offers instead of being dropped, and ensures the resulting `offers_ids` are persisted on provider rows in both insert and re-import flows.

## Context

- Analysis 053 proved the released parser reads only the first vxconfig block, while real JoinHalal pages contain multiple blocks and the authoritative `current_post.id` lives in a later block.
- Analysis 053 also proved the current Speisen pipeline only links offers already present in the `offers` table.
- The user has explicitly set the product requirement that non-existent offers must be auto-created and not silently dropped.
- Architecture guidance already treats `offers_ids` as a core indexed provider attribute and keeps data modeling Postgres-first.

## Assumptions

1. JoinHalal remains the authoritative source for provider page content and Speisen vocabulary.
2. Auto-created offers are acceptable as pending catalog entries and will be inserted with `created_by = NULL` under the existing service-role import path, which bypasses RLS.
3. A patch release is appropriate because this is a production data-integrity bug in an already released import workflow.

## Release Strategy

Release Strategy: Standalone (no other known active plans in `agent-output/planning/` currently targeting the next patch after `origin/main` version `0.8.12`).

## Decision Record

1. **[RESOLVED]** Unmatched Speisen terms will be auto-created in the `offers` table during import execution rather than omitted.
Rationale: Silent data loss breaks provider completeness and directly contradicts the user’s required outcome.

2. **[RESOLVED]** Offer creation and provider linkage must happen in the same import run.
Rationale: Creating offers later would leave provider `offers_ids` incomplete and undermine re-import determinism.

3. **[RESOLVED]** vxconfig parsing will be fixed centrally in the shared parser utility, not patched separately in CLI and import-core callers.
Rationale: The same parser feeds display-name extraction and source-ID extraction; central repair avoids drift and duplicated logic.

4. **[RESOLVED]** Dry-run and write mode must expose identical unmatched-offer accounting semantics, with write mode no longer silently dropping terms.
Rationale: Operators need consistent observability before and during production imports.

5. **[RESOLVED]** Existing imported providers with null JoinHalal identity keys require an explicit remediation path as part of this work.
Rationale: Without cleanup or controlled re-import guidance, the parser fix alone can create duplicate provider rows.

6. **[RESOLVED]** The solution stays Postgres-first and in-repo, using existing migrations and Supabase tables rather than introducing external catalog or queue services.
Rationale: The current scale and architecture guidance do not justify added infrastructure.

7. **[RESOLVED]** Auto-created offers will use the existing `Essen & Trinken` category UUID `20c10efe-404b-4a39-bb81-5089a0332d78`, matching the seeding precedent in migration 061, with provider-category-specific refinement explicitly out of scope for this patch.
Rationale: `offers.category_id` is `NOT NULL`, and migration 061 already established `Essen & Trinken` as the deterministic schema-safe category for JoinHalal Speisen-derived offers.

## Plan

1. **Repair shared vxconfig extraction for real JoinHalal pages**
   - Update the shared HTML parser contract so it scans all vxconfig blocks and selects the one containing authoritative `current_post` data.
   - Ensure both display-name normalization and JoinHalal post-ID extraction use the corrected shared behavior.
   - Acceptance:
     - Real multi-block vxconfig pages yield a non-null `import_source_id`.
     - `extractDisplayNameFromHtml` and `extractJoinHalalPostId` succeed against the same live-structure fixture.
     - Records with valid post IDs flow into the upsert path instead of insert-only fallback.

2. **Add offer auto-creation to the import pipeline**
   - Extend the import flow so unmatched Speisen values are resolved into new `offers` rows before provider records are finalized.
   - Assign every auto-created offer to `Essen & Trinken` (`20c10efe-404b-4a39-bb81-5089a0332d78`) so inserts satisfy the existing `offers.category_id NOT NULL` constraint and remain aligned with migration 061's Speisen seeding pattern.
   - Keep creation rules deterministic by preserving the original Speisen casing, using `ON CONFLICT (name_de) DO NOTHING` for idempotency, and treating case-insensitive dedup as a resolution-time concern rather than a second creation-time normalization layer.
   - Ensure the shared import core and CLI write flow use the same creation policy and resulting catalog view.
   - Acceptance:
     - A provider with previously unknown Speisen terms completes import with new `offers` rows created and linked.
     - Re-running the same import does not create duplicate offer rows for the same `name_de` value and does not create a second provider-side loss path for casing-only variations.
     - Offer creation respects existing schema and audit constraints, including `category_id NOT NULL` and nullable `created_by`.

3. **Guarantee no silent drops in write mode**
   - Remove the current write-path asymmetry where unmatched Speisen are discarded without operator visibility.
   - Update write reporting so operators can see how many offers were matched, created, and attached during the run.
   - Preserve dry-run visibility so preview and execution reports stay consistent.
   - Acceptance:
     - Write mode reports created-offer counts and any residual failures.
     - No provider finishes with a dropped Speisen term unless a documented hard failure occurs.
     - Dry-run and write mode expose compatible offer-mapping summaries.

4. **Protect provider upsert and re-import integrity**
   - Verify the provider persistence path preserves the corrected `import_source` / `import_source_id` behavior and keeps `offers_ids` source-controlled on update.
   - Include explicit remediation instructions for rows imported before the parser fix so the first corrected re-import does not multiply stale records.
   - Acceptance:
     - Re-import of an already keyed provider updates source-controlled fields rather than creating a new row.
     - Existing null-keyed import rows have a documented operator remediation path before production rerun.
     - `offers_ids` updates correctly when source Speisen change across imports.

5. **Regression coverage and engineering validation**
   - Add regression coverage for the real bug path: multi-block vxconfig pages and unknown Speisen terms requiring same-run offer creation.
   - Validate both shared import-core behavior and CLI write-path contracts relevant to this change.
   - Acceptance:
     - Regression coverage proves the pre-fix parser bug and the post-fix multi-block behavior.
     - Regression coverage proves unknown Speisen produce created offers and linked provider `offers_ids`.
     - Type-check, lint, and targeted automated tests pass, or unrelated failures are explicitly documented.

6. **Version and release artifacts**
   - Prepare the patch for the next available release after `0.8.12`, with exact version confirmed only at DevOps Stage 1.
   - Update changelog and release-facing notes to reflect both the parser correction and the new no-drop offer-creation behavior.
   - Acceptance:
     - Version artifacts align on the confirmed patch version.
     - Release notes explain source-ID recovery, auto-created offers, and any required operator remediation.

## Baseline & Measurements

This plan does not introduce a new performance budget, but it does require operational measurement of data integrity during implementation:
- **What will be measured**: count of providers receiving non-null `import_source_id`; count of unmatched Speisen terms auto-created; count of providers linked with non-empty `offers_ids` after creation.
- **Where**: local automated validation and first staging/UAT-like import execution.
- **Success thresholds**:
  - Multi-block vxconfig fixture resolves `current_post.id` in 100% of covered regression cases.
  - Unknown Speisen used in regression coverage are auto-created and linked in 100% of covered write-path cases.
  - Write reporting exposes created-offer counts with no silent unmatched-term loss in the validated path.
- **Allowed deferral**: live staging counts may be deferred if no safe staging dataset is available, but the deferral must name an owner, rationale, and follow-up release or open-actions artifact.

## Testing Strategy

- Unit coverage for parser and Speisen normalization/resolution behavior.
- Integration-style coverage for shared import-core transformation and provider persistence contracts.
- CLI-oriented contract coverage for write-mode reporting and same-run offer creation/linkage.
- Static analysis and repo-standard validation gates: type-check, lint, relevant test suites.

## Validation Signals (Non-QA)

- Providers imported after the fix carry non-null `import_source='joinhalal'` and valid `import_source_id` values.
- Providers with previously unknown Speisen receive non-empty `offers_ids` tied to newly created catalog rows.
- Re-import of the same page updates the existing provider rather than creating duplicates.
- Operator output makes created-offer behavior visible instead of hiding it.

## Risks and Mitigations

- **Risk**: Auto-created offers may introduce near-duplicate catalog entries due to inconsistent casing or spelling.
  - Mitigation: Normalize creation keys and require deterministic duplicate prevention before inserting.

- **Risk**: Existing null-keyed rows remain in production and cause duplicate providers on first corrected import.
  - Mitigation: Include explicit remediation guidance and make it a release-blocking operational step.

- **Risk**: Parser changes fix `current_post.id` but unintentionally change provider naming behavior.
  - Mitigation: Cover both display-name and source-ID extraction with the same real-structure fixture.

- **Risk**: Offer auto-creation affects moderation or taxonomy quality.
  - Mitigation: Keep the scope limited to required schema-safe creation and document any follow-up catalog-governance cleanup separately.

## Rollback Considerations

- If the patch introduces incorrect offer creation behavior, rollback must revert the release and stop further import runs before more catalog rows are created.
- Any rollback plan must distinguish between code rollback and data cleanup for auto-created offers inserted during validation or production execution.
- Existing parser-fix remediation steps should be retained in deployment notes even if the release is rolled back.

## Duration Estimates

- Analysis: 0.5–1.0h completed
- Planning: 0.5h completed
- Implementation: 3–5h
- QA: 1–2h
- UAT: 0.5–1.0h
- DevOps: 0.5–1.0h
- Uncertainty drivers: remediation handling for already imported null-keyed provider rows and any normalization needed to prevent low-quality casing variants from accumulating in the offers catalog.

## Handoff Notes

- This plan intentionally changes the product behavior established in Analysis 053: unmatched Speisen are no longer allowed to disappear from the write path.
- Keep the implementation scoped to import reliability and data integrity; do not expand into broader offer-taxonomy redesign.
- Auto-created offers should follow the migration 061 seeding precedent: `name_de` from Speisen, `category_id = '20c10efe-404b-4a39-bb81-5089a0332d78'`, `created_by = NULL`.
- The import continues to rely on service-role credentials, so RLS does not block offer inserts in this path.
