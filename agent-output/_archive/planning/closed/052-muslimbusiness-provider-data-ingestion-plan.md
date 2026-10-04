---
ID: 052
Origin: 052
UUID: 52c1b8af
Status: Released
---

# Plan 052 — MuslimBusiness Provider Data Ingestion Pipeline

## Plan Header

- **Target Release**: v0.8.19 (confirmed at DevOps Stage 1; v0.8.16, v0.8.17, and v0.8.18 all already existed, v0.8.19 is the next available patch)
- **Epic Alignment**: Provider supply growth / admin ingestion automation / faster city coverage expansion
- **Status**: Committed
- **Related Issues**: None

## Changelog

| Date | Change | Agent | Notes |
|---|---|---|---|
| 2026-03-23T11:50Z | Initial plan created from approved session request | Planner | Reserved 052 plan for muslimbusiness.de provider import pipeline, mirroring Plan 047 architecture while adapting extraction to a Next.js directory source |
| 2026-03-23T14:15Z | Code Review complete — APPROVED_WITH_COMMENTS | Code Reviewer | 0 CRITICAL/HIGH findings; 1 LOW fixed in review (--limit NaN guard); 2 INFO observations |
| 2026-03-23T14:20Z | QA complete | QA | Added CLI regression tests for the review-phase `--limit` fix; full suite green; real dry-run deferred pending local Supabase env |
| 2026-03-23T14:30Z | UAT complete — APPROVED FOR RELEASE | UAT | All plan milestones 1–5 confirmed; value statement delivered; dry-run live test deferred to operator (env-provisioning constraint, not code gap) |
| 2026-03-23T14:45Z | DevOps Stage 1 — Committed for v0.8.19 | DevOps | Version collision resolved twice (v0.8.17, v0.8.18 both existed); target bumped to v0.8.19; package.json and CHANGELOG updated; all lifecycle docs closed |

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

## Value Statement and Business Objective

As an admin/operator, I want to ingest public provider listings from muslimbusiness.de/datenbank into the existing UFlow providers dataset through a repeatable dry-run-capable import pipeline, so that UFlow can expand Germany-focused provider coverage quickly without manual entry and strengthen city/category discovery for Muslim users.

## Objective

Deliver a developer/admin-only TypeScript ingestion workflow that follows the proven Plan 047 structure:

- parser utilities in `src/utils/`
- focused parser tests in `src/__tests__/utils/`
- a one-shot/manual import CLI in `scripts/`

The workflow must adapt the acquisition layer to muslimbusiness.de's Next.js-rendered directory page instead of assuming JoinHalal's sitemap-plus-detail-page model, while still preserving the same operational guarantees: dry-run first, category mapping to existing UFlow categories, deterministic duplicate handling, safe bulk upsert via Supabase service-role access, and imported rows marked for moderation rather than immediate publication.

## Scope

### In Scope

- A new import script entrypoint in `scripts/` for manual muslimbusiness.de imports
- A new pure parser utility in `src/utils/` dedicated to extracting provider records from muslimbusiness.de directory output
- Unit tests and representative source fixtures/fragments for the parser and normalization boundary
- Mapping visible source fields into existing `providers` schema fields where a clean schema destination already exists
- Category resolution against existing UFlow categories only; no new main categories in this release
- Consideration of hidden/non-user-visible subcategory support only if existing schema/workflow already supports it without widening user-facing taxonomy
- Deterministic create-or-update behavior for repeated imports
- Dry-run reporting that exposes inserts, updates, duplicates, unmapped categories, parsing failures, and intentionally omitted source fields
- Service-role/admin write path using existing Supabase operational patterns
- Release artifact updates for the eventual confirmed patch version

### Out of Scope

- Runtime ingestion inside `src/app`, API routes, cron jobs, or background workers
- New public UI, filter UI changes, or browse-page taxonomy redesign
- New main categories or broad taxonomy/schema redesign
- Anti-bot circumvention, authenticated scraping, or browser automation unless a later analysis proves the public HTML no longer exposes importable data
- New search implementations outside the current Postgres-first provider/category/search model
- Automatic media downloading/storage changes unless the existing provider image contract already accepts the source image URLs safely

## Context

Plan 047 established the approved import pattern for third-party provider ingestion in this repository: a pure parser, a CLI import script in `scripts/`, parser-first tests, service-role Supabase upserts, dry-run defaults, category resolution against live categories, duplicate suppression, and an import-bot identity in `user_created_id` to preserve provenance and bypass the provider outreach trigger.

The base provider schema in `supabase/migrations/0000_initial_core_schema.sql` already provides the canonical unique identifier pair:

- `id` as internal row UUID
- `provider_id` as the public/canonical provider UUID

The provider outreach trigger in `supabase/migrations/059_create_provider_outreach_trigger.sql` explicitly skips inserts where `user_created_id IS NOT NULL`, so imported rows must remain distinguishable from anonymous recommendations.

Source observations from muslimbusiness.de indicate a different acquisition shape than JoinHalal:

- `/datenbank` exposes many provider cards directly in the rendered directory output
- visible card content already includes provider name, location text, category text (`Branchen`), email, phone, social handle/link text, and often image/logo URLs
- the page is Next.js-rendered and includes filter controls for location/category sorting, but the importer should prefer stable rendered data payloads or hydration data over interactive UI scraping
- source-side duplicates and inconsistencies already exist, for example repeated brand names, blank location/category values, placeholder social values (`-`, `/`, `Nicht angegeben`), and marketing extras such as discounts/supporter labels that do not cleanly fit the current provider schema

That means Plan 052 should preserve the 047 operational workflow but change the extraction contract: implementation should target the most stable server-delivered source representation available on `/datenbank` such as hydration JSON or consistently rendered card markup, rather than forcing a sitemap/detail-page strategy that may not exist.

## Assumptions

- muslimbusiness.de exposes enough public, server-delivered directory data to import the required provider fields without authentication.
- The first release should prioritize a reliable manual import workflow over a recurring sync or headless-browser crawler.
- UFlow's current categories table can absorb most source `Branchen` values through main-category mapping, even when the source uses more granular business descriptors.
- Some source fields will require normalization or omission because the current provider schema does not have a safe destination for promo text, supporter badges, or arbitrary marketing metadata.
- The target environment provides the same Supabase service-role environment variables already used for admin operations.

## Decision Record

- [RESOLVED] Reuse the Plan 047 architecture shape for this release — it already matches repository conventions for admin-only import tooling and reduces implementation risk.
- [RESOLVED] Treat muslimbusiness.de as a Next.js directory source, not a sitemap/detail-page source by default — current public observations show rich provider card data on `/datenbank`, so the extractor should target stable server-delivered directory data first.
- [RESOLVED] Keep the import Germany-first and provider-focused — the source is primarily German-market provider coverage and directly supports the product objective of stronger city/category discovery.
- [RESOLVED] Do not create new main categories in this release — source `Branchen` values must map into existing UFlow main categories, preserving current browse/search taxonomy.
- [RESOLVED] Hidden or non-user-visible subcategory enrichment is allowed only if it fits existing schema/workflow with zero user-facing taxonomy impact; otherwise granular source labels must be reported, not silently turned into new public categories.
- [RESOLVED] Imported rows must use a dedicated non-null import identity in `user_created_id` — this is required both for provenance and for bypassing the outreach trigger that only fires when both ownership fields are null.
- [RESOLVED] The importer must guarantee operational idempotency through a deterministic duplicate/upsert strategy independent of freshly generated `provider_id` values — database-generated UUIDs satisfy uniqueness on insert, but repeated imports still need stable source-to-target matching.
- [RESOLVED] Parser coverage is release-critical — the source contains inconsistent placeholder values and repeated/partial records, so pure parser tests with representative fixtures are mandatory rather than optional.
- [DEFERRED: Product/Operations + requires confirmed hidden-taxonomy workflow + target follow-up after this release] Expand source `Branchen` into persistent hidden subcategory/filter metadata if the current product model later formalizes non-public taxonomy layers.

## Plan

### Milestone 1 — Define the MuslimBusiness Source Contract and Extraction Boundary

**Objective**: Lock down the most stable public source representation before implementation begins.

**Acceptance Criteria**:

- The implementation identifies the authoritative public source representation used for import, prioritizing Next.js hydration/server-delivered data over brittle visual-selector scraping.
- The source contract explicitly documents the minimum provider fields available on `/datenbank` and whether any secondary page fetches are actually needed.
- Required, optional, and unsupported fields are classified before write-path logic is finalized.
- The importer boundary is explicit that it is a manual/admin CLI workflow only and not part of runtime application paths.

**Dependencies**: None

---

### Milestone 2 — Build a Pure MuslimBusiness Parser and Normalization Layer

**Objective**: Convert raw muslimbusiness.de directory output into normalized provider-shaped records without network or database side effects.

**Acceptance Criteria**:

- A new parser utility is planned under `src/utils/muslimbusiness-parser.ts` with side-effect-free extraction and normalization functions.
- Parser responsibilities cover provider name extraction, locations parsing, category/`Branchen` splitting, email/phone/social normalization, placeholder cleanup, and any stable image/logo URL extraction that fits the current schema.
- Normalization rules explicitly handle placeholder tokens such as `-`, `/`, `Nicht angegeben`, blank values, duplicate whitespace, repeated city text, and mixed social formats (`@handle`, raw handle, Instagram URL, LinkedIn URL, plain site text).
- Representative tests are planned under `src/__tests__/utils/` using captured HTML or payload fragments from muslimbusiness.de so future source regressions fail at the parser boundary rather than during import runs.

**Dependencies**: Milestone 1

---

### Milestone 3 — Map Source Fields into the Existing Provider Schema and Taxonomy

**Objective**: Ensure all source information that cleanly fits the current provider model is mapped without widening the product taxonomy.

**Acceptance Criteria**:

- The field map covers, where available and schema-compatible: `provider_name`, `provider_description` when the source has real descriptive text, `category_id`, `address_city`, `address_country`, `address_street`, `address_zip`, `contact_email`, `contact_phone`, `social_website`, `social_instagram`, `provider_images` if compatible, and moderation/provenance fields.
- Source `Branchen` values are mapped to existing UFlow categories only; no new main categories are introduced.
- Granular source labels that cannot map cleanly are surfaced in reporting for future taxonomy review.
- If hidden subcategory storage is not already supported cleanly, the release proceeds without creating new taxonomy rows and documents the omission explicitly.
- Unsupported source metadata such as supporter labels, discount campaigns, and promo copy is either intentionally omitted or preserved only in operator reporting, never squeezed into unrelated provider columns.

**Dependencies**: Milestone 2

---

### Milestone 4 — Define Unique Identity, Deduplication, and Upsert Semantics

**Objective**: Guarantee that imported providers receive unique database IDs while repeated imports update the same logical business instead of creating uncontrolled duplicates.

**Acceptance Criteria**:

- The plan defines the distinction between database uniqueness and source identity: new inserts receive unique `provider_id` values from the existing schema, while reruns use a deterministic source-matching key for upsert/update behavior.
- Duplicate detection considers source inconsistencies such as repeated business names, multi-location records, and duplicated cards already visible in the source dataset.
- The chosen matching strategy is explicit, deterministic, and operator-auditable, using stable source attributes rather than fragile runtime-only ordering.
- Dry-run output makes it clear which rows would be inserted, updated, skipped as duplicates, or left unresolved due to ambiguous matches.
- Imported rows remain queryable as an operational cohort via the agreed provenance marker so rollback and audits do not depend on timestamps alone.

**Dependencies**: Milestone 3

---

### Milestone 5 — Implement Safe CLI Import Flow with Service-Role Upsert Behavior

**Objective**: Provide the operator-facing workflow that fetches, parses, previews, and optionally writes import batches safely.

**Acceptance Criteria**:

- A new script is planned at `scripts/import-muslimbusiness.ts` and follows the same operational model as Plan 047: dry-run by default, explicit write mode, limit/sample controls, and clear console reporting.
- The script uses service-role/admin Supabase access only and fails loudly when required environment variables are missing.
- The write path uses batched upsert/create-or-update behavior rather than ad hoc row-by-row interactive writes.
- Imported providers default to `review_status = 'pending'` and remain compatible with the existing admin moderation flow.
- The import-bot identity is created or verified idempotently before provider writes so `user_created_id` remains non-null and the outreach trigger is bypassed.
- Operational reporting includes counts and representative samples for inserts, updates, duplicates, unmapped categories, and parser failures.

**Dependencies**: Milestone 4

---

### Milestone 6 — Add Operator Documentation, Validation Hooks, and Release Artifacts

**Objective**: Make the workflow maintainable and release-ready.

**Acceptance Criteria**:

- Operator-facing usage documentation is added or updated where maintainers expect import workflow instructions.
- Validation expectations cover parser tests, TypeScript correctness, linting of changed parser/test files, and a constrained dry-run smoke path.
- `package.json` and `CHANGELOG.md` are updated only after DevOps Stage 1 confirms the exact non-colliding release number.
- Release artifacts remain consistent with the final confirmed target release.

**Dependencies**: Milestone 5

## Testing Strategy

- Unit-level validation for parser extraction, placeholder cleanup, category splitting, location normalization, social/contact normalization, and duplicate-key generation
- Fixture-based parser validation using representative muslimbusiness.de directory fragments so structural source changes are caught early
- Integration-level validation for service-role write behavior, import-bot creation/verification, pending-review defaults, and repeated-run idempotency
- Standard repository gates for changed TypeScript/script files, including type-checking and linting
- Manual operator smoke validation of a constrained dry-run first, followed by a small write sample in a non-production environment before any larger execution

## Validation (Non-QA)

- Confirm the workflow lives in `scripts/` and parser utilities/tests only, with no runtime request-path coupling.
- Confirm the extraction strategy targets a stable server-delivered muslimbusiness.de representation rather than brittle UI-interaction logic.
- Confirm the importer reports enough detail for an operator to answer: what would insert, update, skip, fail parsing, or fail category mapping.
- Confirm imported rows are traceable through the chosen provenance mechanism and do not trigger provider-owner outreach inserts.
- Confirm repeated execution against the same source sample does not create uncontrolled duplicates.
- Confirm mapped records remain compatible with existing provider search/category/city flows by writing only to established provider columns.

## Risks

- **Source structure drift**: Next.js hydration shape or card markup may change without notice; mitigate with parser isolation, representative fixtures, and explicit failure reporting.
- **Taxonomy mismatch**: muslimbusiness.de uses very granular `Branchen` labels that may not align 1:1 with UFlow categories; mitigate with conservative main-category mapping and unmapped reporting.
- **Source-side duplicates**: repeated businesses or partial duplicates already appear in the public directory; mitigate with deterministic matching and visible duplicate reporting.
- **Dirty field values**: placeholder socials, blank locations, promo copy, and supporter badges can pollute provider fields if not normalized; mitigate with parser cleanup rules and explicit omission rules.
- **Moderation bypass risk**: service-role writes could expose scraped data if defaults are wrong; mitigate by enforcing `pending` review status.
- **Version collision risk**: `origin/main` and git tags are currently out of sync (`0.8.15` vs existing `v0.8.16` tag); mitigate by deferring the exact patch number to DevOps Stage 1.

## Handoff Notes

- Mirror the proven JoinHalal workflow shape, but do not mirror its source-acquisition assumptions blindly.
- Prefer the most stable server-delivered directory payload on muslimbusiness.de before resorting to selector-dependent markup extraction.
- Treat category mapping, provenance, and idempotency as release-critical acceptance conditions.
- Use the existing provider schema as the contract authority; if an attractive source field does not fit safely, omit it and report it rather than widening scope implicitly.
- If implementation proves that public server-delivered data is insufficient without browser automation, escalate before widening the acquisition approach.

## Duration Estimates

- Analysis: 0.5–1.0h
- Planning: 0.5h
- Implementation: 5–9h
- Code Review: 0.5–1.0h
- QA: 1–2h
- UAT: 0.5–1.0h
- DevOps: 0.5h

**Uncertainty drivers**: stability of the muslimbusiness.de data payload, breadth of `Branchen` mapping needed, source-side duplicates, and whether existing schema can safely absorb any image/logo fields without extra adaptation.