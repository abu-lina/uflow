---
ID: 047
Origin: 047
UUID: 6c8f14ab
Status: Committed
---

# Plan 047 — JoinHalal Provider Data Ingestion Pipeline

## Plan Header

- **Target Release**: v0.8.4
- **Epic Alignment**: Provider supply growth / admin ingestion automation / faster city coverage expansion
- **Status**: UAT Approved
- **Related Issues**: None

## Changelog

| Date | Change | Agent | Notes |
|---|---|---|---|
| 2026-03-19T00:00Z | Initial plan created from approved feature request | Planner | Session-scoped plan for JoinHalal scraping, transformation, dry-run, and bulk upsert workflow |
| 2026-03-19T11:15Z | Revision 1 after Critic review | Planner | Added minimal provenance/outreach controls and conditional `provider_description` verification |
| 2026-03-19T15:25Z | QA completed | QA | QA report created with verdict QA Complete |
| 2026-03-19T15:45Z | UAT completed | UAT | All 7 scenarios PASS; APPROVED FOR RELEASE; live staging smoke test deferred to DevOps |

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

## Value Statement and Business Objective

As an admin/operator, I want to ingest public halal business listings from joinhalal.com into the existing UFlow providers dataset through a repeatable dry-run-capable import pipeline, so that UFlow can expand provider coverage quickly without manual entry and improve city-level discovery for Muslim users.

## Objective

Deliver a developer/admin-only Node.js TypeScript ingestion workflow in `scripts/` that fetches public JoinHalal provider listings, normalizes source data into the existing `providers` schema, resolves category mappings against UFlow categories, and performs safe bulk upserts into Supabase with a dry-run mode and auditable output.

The workflow must also ensure imported rows remain operationally identifiable after insertion and do not unintentionally enqueue provider-owner outreach records.

## Scope

### In Scope

- A new script entrypoint in `scripts/` for one-shot/manual JoinHalal imports
- Public-source data retrieval from joinhalal.com listing/detail pages without login-dependent access
- Source-to-target transformation for business name, category, city/location, description, and available public contact/website fields where present
- Category resolution against the existing `categories` table and provider-compatible categories only
- Admin/service-role bulk upsert behavior for `providers` using existing Supabase conventions
- A minimal provenance mechanism using existing schema fields so imported rows remain queryable as an import cohort without widening schema scope
- Dry-run mode that reports what would be inserted, updated, skipped, or left unmapped without writing database changes
- Import guardrails for rate limiting, duplicate detection, normalization, and failure reporting
- Import safety rules that prevent unintended provider-owner outreach queue creation as a side effect of ingestion
- Release artifact updates for the target version

### Out of Scope

- Runtime ingestion inside `src/` application flows or API routes
- Scheduled/cron synchronization, background workers, or queue infrastructure
- CAPTCHA bypassing, authenticated scraping, or any anti-bot circumvention beyond respectful public-page retrieval
- Redesigning the provider schema, public search UX, or admin review UI
- New search implementations that bypass existing `tsvector`/GIN-based search strategy
- Importing media assets, ratings, or non-core source fields unless they already fit the existing schema cleanly

## Context

The repository already separates admin/service-role database access from runtime code through `src/lib/supabase/admin.ts`, and provider creation paths show the canonical provider fields in `src/services/providerService.ts`. Search and category filtering already rely on `tsvector`-based RPCs and GIN indexes rather than `ILIKE`, including provider/category search support in `src/services/categories.ts` and provider search migrations in `supabase/migrations/014_add_fulltext_search_indexes_and_functions.sql` and `supabase/migrations/056_add_provider_community_service_search_indexes.sql`.

The import pipeline must therefore behave as an admin-only data seeding tool rather than a new runtime subsystem:

- script lives in `scripts/`, not `src/app` or request handlers
- database writes use service-role/admin access because imports are operational tasks and must not depend on end-user RLS flows
- imported provider records must preserve compatibility with existing search, category filters, city counts, outreach triggers, and admin review workflows
- provider text fields should map into the existing provider columns already used by search and admin tooling, especially `provider_name`, `provider_description`, `category_id`, `address_city`, `contact_email`, `contact_phone`, `social_website`, and `review_status`

The current database also has an outreach trigger on provider insert in `supabase/migrations/059_create_provider_outreach_trigger.sql` that enqueues outreach when both `provider_owner_id` and `user_created_id` are `NULL` and contact data exists. The import plan must therefore avoid making imported rows indistinguishable from anonymous recommendations.

## Assumptions

- JoinHalal exposes enough public listing/detail HTML to gather the required core fields without authentication.
- The first release should prioritize a reliable manual import path over a fully automated recurring sync.
- Not every source category will map cleanly to an existing UFlow category on day one; unmapped rows are acceptable if they are reported clearly and skipped or routed to a controlled fallback.
- Imported records should not become publicly visible until they pass the platform's normal review expectations.
- The target environment will provide the same Supabase environment variables already used for admin/server operations.

## Decision Record

- [RESOLVED] Target `v0.8.4` for this plan — `package.json` is already at `0.8.3` while the roadmap still records `v0.8.2` as released, so the safest non-colliding next product patch is `v0.8.4`.
- [RESOLVED] Implement the importer as a script under `scripts/` — project guidance explicitly places dev/admin import tooling outside runtime code.
- [RESOLVED] Use service-role/admin Supabase access for imports — bulk operational ingestion must bypass end-user RLS safely and align with existing admin patterns in `src/lib/supabase/admin.ts`.
- [RESOLVED] Preserve search compatibility by writing into existing provider columns rather than inventing parallel fields — provider search and category filtering already depend on established schema and `tsvector` indexes.
- [RESOLVED] The importer should use a dedicated non-null system import identity in `user_created_id` or an equivalent existing-field provenance marker approved during implementation review — this keeps imported rows traceable and prevents the outreach trigger from treating them as anonymous recommendations.
- [RESOLVED] Default imported providers to `review_status = 'pending'` unless a later explicit approval workflow authorizes otherwise — externally scraped records should not bypass moderation and public visibility safeguards.
- [RESOLVED] Dry-run support is a release-critical requirement, not an optional convenience — operators need to inspect row counts, mappings, and skipped records before mutating production-like data.
- [RESOLVED] Mapping into `provider_description` is conditional on target-environment schema verification — if the column is absent or unusable in the destination environment, the importer must skip that mapping and record the fallback rather than fail writes.
- [DEFERRED: Implementer + only if public-page parsing proves unstable + follow-up plan/version after v0.8.4] Introduce parser hardening beyond basic HTML scraping abstraction, such as source adapters, fixture snapshots, or fallback acquisition paths.
- [DEFERRED: Product/Operations + requires operational policy decision + follow-up plan/version after v0.8.4] Decide whether future imports should expand provenance beyond the minimal current-release mechanism, support incremental update syncs, or add richer source metadata.

## Plan

### Milestone 1 — Define the JoinHalal Source Contract and Import Boundaries

**Objective**: Establish exactly which public pages and fields are required for a safe first import release.

**Acceptance Criteria**:

- The implementation documents the source pages/endpoints to be fetched and the minimum field set required per provider record.
- Required fields are classified as mandatory, optional, or best-effort.
- The script's operating modes are explicit: dry-run, write/import, and any paging/limit controls needed for operator safety.
- The import boundary is explicit that the script is manual/admin-only and not invoked by runtime request paths.

**Dependencies**: None

---

### Milestone 2 — Normalize Source Records into the Existing Provider Schema

**Objective**: Convert scraped JoinHalal records into UFlow-compatible provider payloads without changing the public schema contract.

**Acceptance Criteria**:

- Source field mapping is defined for business name, category text, location/city, description, and any available public contact/website fields.
- The target mapping aligns with existing provider fields used elsewhere in the repo, especially `provider_name`, `provider_description`, `category_id`, `address_city`, `contact_email`, `contact_phone`, `social_website`, and `review_status`.
- `provider_description` mapping is explicitly gated by target-environment schema verification; if the column is unavailable in the destination environment, the implementation documents a no-description fallback instead of treating it as a write failure.
- Normalization rules cover whitespace trimming, null handling, duplicate-safe comparison keys, and city/category string cleanup.
- Rows missing required target data are surfaced in reporting rather than silently failing.

**Dependencies**: Milestone 1

---

### Milestone 3 — Resolve Categories and Duplicate/Conflict Handling

**Objective**: Ensure imported providers land in the correct category and do not create uncontrolled duplicates.

**Acceptance Criteria**:

- The importer resolves source category labels against existing provider-compatible categories in the `categories` table.
- Unmapped categories are reported explicitly, with operator-visible counts and source examples.
- The importer defines a deterministic upsert key or duplicate-detection strategy suitable for repeated runs.
- Imported records remain queryable as a distinct operational cohort via the agreed minimal provenance marker so rollback, audit, and cleanup do not depend on timestamp guesswork alone.
- Repeated imports are idempotent at the operational level: unchanged source rows are not duplicated.

**Dependencies**: Milestone 2

---

### Milestone 4 — Execute Safe Bulk Upsert with Admin Access and Dry-Run Reporting

**Objective**: Perform operationally safe writes to Supabase while preserving review and observability expectations.

**Acceptance Criteria**:

- Database writes use admin/service-role access and are isolated to the import script path.
- Dry-run mode produces a summary of inserts, updates, skips, unmapped categories, and parsing failures without mutating data.
- Write mode performs batched or bulk upsert behavior appropriate for Postgres/Supabase rather than row-by-row interactive flows.
- Write mode prevents unintended `provider_owner_outreach` queue creation for imported rows by using the approved provenance/identity strategy rather than anonymous-recommendation semantics.
- Imported rows default to `pending` review status and remain compatible with existing admin moderation flows.
- Failure handling preserves actionable output so operators can rerun safely after fixing mapping or source issues.

**Dependencies**: Milestone 3

---

### Milestone 5 — Add Operator-Facing Usage Surface and Implementation Validation

**Objective**: Make the importer usable by maintainers and verifiable before release.

**Acceptance Criteria**:

- The script has a clear CLI invocation path, expected environment variables, and explicit dry-run/write flags.
- Operational usage documentation is added or updated in the repository where maintainers would expect it.
- Validation covers parsing logic, transformation logic, and end-to-end dry-run/import execution at an appropriate level.
- The implementation demonstrates that provider search and downstream provider tooling remain schema-compatible after import.

**Dependencies**: Milestone 4

---

### Milestone 6 — Update Version and Release Artifacts

**Objective**: Align release metadata with the planned product patch.

**Acceptance Criteria**:

- `package.json` version is updated consistently to `0.8.4` if the implementation ships in this release.
- `CHANGELOG.md` includes a user- and operator-facing entry for the JoinHalal provider ingestion pipeline.
- Release artifacts remain consistent with the plan's target release assignment.

**Dependencies**: Milestone 5

## Testing Strategy

- Unit-level validation for source parsing, field normalization, category mapping, duplicate-key generation, and dry-run summary behavior
- Integration-level validation for Supabase admin write-path behavior, including batched upsert semantics and pending-review defaults
- Fixture-based or recorded-sample validation for JoinHalal parsing so source structure changes are detected early
- Standard repository gates for changed TypeScript/script files, including type-checking and linting
- Manual operator smoke validation of both dry-run and write mode against a constrained sample size before broad import execution

## Validation (Non-QA)

- Confirm the new workflow lives entirely in `scripts/` and any supporting non-runtime utility locations, with no runtime request-path coupling.
- Confirm the importer uses admin/service-role configuration and fails loudly when required environment variables are missing.
- Confirm dry-run output is sufficient for an operator to answer: how many rows would insert, update, skip, fail mapping, or fail parsing.
- Confirm imported rows are traceable after write-mode execution via the chosen minimal provenance marker.
- Confirm import execution does not unintentionally enqueue `provider_owner_outreach` records for scraped businesses.
- Confirm repeated execution with the same sample dataset does not create uncontrolled duplicates.
- Confirm imported records remain compatible with existing provider search/category/city logic that depends on `provider_name`, `provider_description` when available, `category_id`, `address_city`, and `review_status`.

## Risks

- **Source fragility**: JoinHalal HTML structure may change unexpectedly; mitigate with parsing isolation, source fixtures/snapshots, and explicit failure reporting.
- **Category mismatch risk**: source taxonomies may not align neatly with UFlow categories; mitigate with explicit mapping tables, skipped-row reporting, and conservative fallback behavior.
- **Duplicate imports**: lack of a stable source identifier could create repeat-import collisions; mitigate with deterministic duplicate keys and idempotent upsert rules.
- **Outreach queue pollution**: imported rows with contact info may be mistaken for anonymous recommendations; mitigate by using the approved non-null provenance/identity strategy for imported rows.
- **Moderation bypass risk**: direct admin writes could expose unreviewed data if status defaults are wrong; mitigate by enforcing pending review status unless explicitly overridden in a later controlled change.
- **Operational blast radius**: a large import can create many pending providers quickly; mitigate with pagination, batch limits, dry-run preview, and small-sample first execution.

## Handoff Notes

- Use existing provider/admin patterns as the schema authority before introducing any new import-specific fields.
- Keep search behavior aligned with the current Postgres-first approach; do not introduce `ILIKE`-based discovery or alternate search columns.
- Prefer source-specific parsing isolation so future ingestion sources can be added without entangling core import logic.
- Verify `provider_description` availability in the target environment before writing to it; if absent, proceed without that field and record the fallback in operator-facing output or documentation.
- Treat provenance and outreach-trigger avoidance as release-critical acceptance conditions, not implementation details to revisit later.
- If implementation reveals missing schema support for stable provenance or deduplication, escalate with a targeted follow-up plan rather than widening this scope implicitly.

## Duration Estimates

- Analysis: 0.5–1.0h
- Planning: 0.5h
- Implementation: 4–8h
- Code Review: 0.5–1.0h
- QA: 1–2h
- UAT: 0.5–1.0h
- DevOps: 0.5h

**Uncertainty drivers**: JoinHalal page structure stability, presence or absence of stable source identifiers, category-mapping complexity, and the amount of fixture coverage needed to keep the scraper maintainable.