---
ID: 051
Origin: 051
UUID: b7e24c1d
Status: Released
---

# Plan 051 — JoinHalal Alkoholverkauf Auto-Rejection

## Plan Header

- **Target Release**: next available patch after current `origin/main` version (currently `0.8.17`; expected `v0.8.18` if still available), confirm at DevOps Stage 1
- **Epic Alignment**: Provider supply quality / admin moderation safeguards / JoinHalal import rule enforcement
- **Status**: Released
- **Related Issues**: None

## Changelog

| Date | Change | Agent | Notes |
|---|---|---|---|
| 2026-03-23T00:00Z | Initial plan created from approved session request | Planner | Adds import-time rejection rule for JoinHalal providers whose `Halal Merkmale` includes `Alkoholverkauf` |
| 2026-03-23T14:12Z (approx.) | QA revalidation complete | QA | Prior importer-branch coverage blocker resolved; QA status moved to Complete |
| 2026-03-23T14:13Z (approx.) | UAT complete | UAT | All milestones 1–4 verified; value delivery confirmed; APPROVED FOR RELEASE |
| 2026-03-23T14:10Z (approx.) | Synced to `origin/main` JoinHalal refactor | Implementer | Re-applied the rule to the current shared import core (`src/lib/import/joinhalal.ts`) and CLI write path; added regression tests targeting `transformPage()` |
| 2026-03-23T14:15Z | Stage 1 commit prepared | DevOps | Version bumped to `0.8.18`, changelog updated, and artifacts closed for local commit |
| 2026-03-23T14:36Z (approx.) | Release executed | DevOps | Pushed branch + tag `v0.8.18`; Plan 051 marked Released |

## Release Strategy

Release Strategy: Standalone (no other known active plans in `agent-output/planning/` currently targeting the next available patch after `origin/main` version `0.8.17`).

## Value Statement and Business Objective

As an admin, I want JoinHalal providers with `Halal Merkmale` containing `Alkoholverkauf` to be imported directly as `review_status = 'rejected'`, so that listings that violate this business rule are automatically excluded from the moderation queue and public discovery paths.

## Objective

Update the existing JoinHalal import pipeline so the source record's halal-attributes metadata is evaluated during normalization, and any provider flagged with alcohol sales is written with `review_status = 'rejected'` instead of the current default `pending` status. The change must remain isolated to the JoinHalal import workflow, preserve the current behavior for all non-alcohol imports, and add regression coverage for both the rejection path and the unchanged passing path.

## Scope

### In Scope

- The existing JoinHalal import transformation path in `scripts/import-joinhalal.ts`
- Extraction and normalization of the source field that represents `Halal Merkmale`
- Import-time decision logic that maps `Alkoholverkauf` to `review_status = 'rejected'`
- Regression coverage for both flagged and non-flagged JoinHalal records
- Operator-visible reporting or documentation updates needed to explain the moderation outcome
- Release artifact updates for the target patch

### Out of Scope

- Retroactive bulk updates for providers already imported in previous runs unless they are re-imported through the current pipeline
- Changes to manual admin review APIs or the broader review-status model
- New schema fields, new moderation UI, or changes to public listing logic outside the existing `review_status` contract
- Expansion of business rules to other `Halal Merkmale` values beyond the specific `Alkoholverkauf` rule in this request
- New scheduled sync behavior, queues, or runtime ingestion paths

## Context

Plan 047 introduced the JoinHalal ingestion pipeline as an admin-only script in `scripts/import-joinhalal.ts`, with imported rows defaulting to `review_status = 'pending'` and using a non-null import-bot identity to avoid outreach-trigger side effects. The current transformation function still hard-codes `review_status: 'pending'` for every imported row.

The parser already models JoinHalal Schema.org `additionalProperty` data in `src/utils/joinhalal-parser.ts`, which is the most likely source for source-side halal attributes such as `Halal Merkmale`. That means this follow-up work is primarily a normalization and business-rule enforcement change, not a new ingestion subsystem.

The rule must be enforced at import time because downstream public discovery and admin filtering already rely on the persisted `review_status` value. Applying the rule after insertion would create avoidable exposure windows, complicate dry-run reporting, and weaken auditability.

## Assumptions

- JoinHalal exposes `Halal Merkmale` and its values in a stable, parseable form on the detail page data already consumed by the importer, most likely via Schema.org `additionalProperty`.
- The business rule applies only to JoinHalal-imported providers in this scope; existing user-created providers and other ingestion paths keep their current moderation behavior.
- Non-flagged JoinHalal imports should continue to default to `review_status = 'pending'`.
- Previously imported rows are not automatically backfilled by this plan; only future imports or explicit re-imports evaluate the new rule.

## Decision Record

- [RESOLVED] Enforce the alcohol-sales rule inside the JoinHalal import transformation stage rather than a post-write cleanup step — this is the earliest point where source metadata and persisted moderation status can stay consistent.
- [RESOLVED] Keep the rule scoped to the JoinHalal importer — the request is about imported provider records, and widening scope would create an unapproved moderation-policy change for other creation paths.
- [RESOLVED] Preserve the existing default of `review_status = 'pending'` for JoinHalal records that do not indicate `Alkoholverkauf` — this satisfies the request to leave non-alcohol imports unaffected.
- [RESOLVED] Treat `Alkoholverkauf` matching as a source-data normalization problem first, not a UI/admin workflow change — the business outcome depends on correct import mapping, not moderator interaction.
- [RESOLVED] Require regression coverage for both the rejection path and the passing path in the same implementation cycle — this is a client-state-precedence-style guardrail for import decision logic and prevents accidental broad rejection.
- [RESOLVED] Keep existing provenance/import-bot behavior unchanged — the new moderation rule should not disturb the trigger bypass and audit cohort introduced by Plan 047.
- [DEFERRED: Product/Operations + broader halal-policy taxonomy needs explicit approval + follow-up plan after this patch] Expand automatic moderation to other `Halal Merkmale` values or other external data sources.

## Plan

### Milestone 1 — Confirm the Source Contract for `Halal Merkmale`

**Objective**: Lock down where the importer reads the halal-attributes signal and how it distinguishes `Alkoholverkauf` from other values.

**Acceptance Criteria**:

- The implementation identifies the exact parsed source field that contains `Halal Merkmale` for JoinHalal detail pages.
- Normalization rules are explicit for whitespace, case, delimiter handling, and null/absent metadata.
- The implementation documents what happens when the source field is absent, malformed, or does not contain `Alkoholverkauf`.

**Dependencies**: None

---

### Milestone 2 — Enforce Import-Time Review Status Override

**Objective**: Apply the business rule during record transformation so flagged providers are rejected before database write.

**Acceptance Criteria**:

- The JoinHalal transformation path maps `Alkoholverkauf` to `review_status = 'rejected'` before dry-run summaries or write-mode upserts are finalized.
- Records without that indicator continue to use the existing `pending` moderation path.
- The rule is implemented in a way that does not alter import-bot provenance, category resolution, or outreach-trigger bypass behavior.
- The implementation remains idempotent for repeat imports of the same source record.

**Dependencies**: Milestone 1

---

### Milestone 3 — Surface the Moderation Outcome to Operators

**Objective**: Make the new moderation branch visible enough that dry-run and write-mode executions can be audited.

**Acceptance Criteria**:

- Dry-run or operator-facing output makes it clear when rows are being auto-rejected because of the alcohol-sales rule.
- Maintainer-facing documentation or script usage notes mention the new rule and its effect on imported `review_status` values.
- The reporting remains concise and does not require manual database inspection to understand whether the rule fired.

**Dependencies**: Milestone 2

---

### Milestone 4 — Add Regression Coverage for Rejection and Passing Paths

**Objective**: Protect the new import decision logic from false positives and regressions.

**Acceptance Criteria**:

- Automated coverage proves a JoinHalal record containing `Alkoholverkauf` resolves to `review_status = 'rejected'`.
- Automated coverage proves a comparable JoinHalal record without `Alkoholverkauf` remains on the default non-rejected path.
- Test coverage is attached to the actual decision logic, not only to adjacent parser helpers.
- Existing JoinHalal import behavior unrelated to moderation remains covered or explicitly verified as unchanged.

**Dependencies**: Milestone 2

---

### Milestone 5 — Validate Import Compatibility and Release Artifacts

**Objective**: Ship the rule change without disturbing the established import workflow.

**Acceptance Criteria**:

- Validation confirms the importer still supports dry-run and write modes with the same environment/runtime expectations as Plan 047.
- Validation confirms non-flagged records remain compatible with existing admin moderation and public visibility rules that depend on `review_status`.
- `package.json` and `CHANGELOG.md` are updated to the confirmed release version during DevOps Stage 1.
- Release metadata explicitly mentions the JoinHalal alcohol-sales auto-rejection rule.

**Dependencies**: Milestone 4

## Testing Strategy

- Unit-level or focused logic coverage for source-field normalization and `Alkoholverkauf` detection
- Import transformation coverage that exercises the real review-status selection branch used by the script
- Standard repository gates for changed TypeScript/script files, including type-checking and linting where applicable
- Constrained dry-run validation against a small JoinHalal sample before broad write-mode use, with attention to auto-rejected row reporting

## Validation (Non-QA)

- Confirm the rule is enforced before rows are upserted, not after insertion.
- Confirm records without `Alkoholverkauf` still import with the prior default moderation status.
- Confirm dry-run output or documentation makes the auto-rejection behavior observable to operators.
- Confirm the import-bot identity and outreach-trigger avoidance from Plan 047 remain intact.
- Confirm no new runtime request path, schema change, or search-path change is introduced.

## Risks

- **Source-field ambiguity**: JoinHalal may encode halal attributes inconsistently; mitigate with explicit normalization and fixture-backed examples.
- **False-positive rejection**: naive substring matching could reject benign values or labels; mitigate by narrowing detection to the confirmed `Halal Merkmale` field and exact/normalized value matching.
- **Silent operator confusion**: if the script changes status without surfacing it, maintainers may misread import results; mitigate with concise dry-run/write summaries.
- **Backfill expectations**: stakeholders may assume old imported rows are updated automatically; mitigate by documenting that this plan governs new imports and re-imports, not retrospective bulk moderation.

## Handoff Notes

- Reuse the current JoinHalal parsing and transformation boundaries instead of creating a second moderation layer elsewhere in the repo.
- Keep the implementation focused on the decision point where source metadata becomes a provider upsert payload.
- Favor a small, testable normalization helper if the source field needs parsing beyond simple string comparison.
- If implementation shows that `Halal Merkmale` is not reliably available in the current parsed payload, escalate before widening the scope to a different scraping strategy.

## Duration Estimates

- Analysis: 0.25–0.5h
- Planning: 0.5h
- Implementation: 1–2h
- Code Review: 0.25–0.5h
- QA: 0.5–1.0h
- UAT: 0.25–0.5h
- DevOps: 0.25h

**Uncertainty drivers**: exact JoinHalal source encoding for `Halal Merkmale`, whether the current fixtures already include that field, and how much operator-facing reporting needs to change to keep the rule auditable.