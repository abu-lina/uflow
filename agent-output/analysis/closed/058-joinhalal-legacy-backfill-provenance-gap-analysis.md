---
ID: 058
Origin: 058
UUID: f8cb0a9c
Status: Planned
---

# Analysis 058 — JoinHalal Legacy Backfill Provenance Gap

## Changelog

| Date (UTC) | Handoff | Summary |
| --- | --- | --- |
| 2026-03-24T12:10Z | User → Analyst | Investigated why released Plan 057 backfill reports zero alcohol rejections against legacy JoinHalal rows despite known alcohol-selling providers |
| 2026-03-24T12:22Z | Analyst → Planner | Verified that legacy rows lack usable JoinHalal listing provenance; current backfill can enumerate legacy rows but cannot evaluate alcohol badges from restaurant websites |
| 2026-03-24T12:23Z | Planner → Planner | Closed analysis (Status: Planned) | Plan 058 created; analysis chain advanced to planning phase |

## Value Statement and Business Objective

As an operator trying to remediate the pre-Plan-057 JoinHalal dataset,
I need to know whether the released alcohol backfill is evaluating the right source pages,
so remediation planning can target the real provenance gap instead of falsely concluding there are no alcohol-selling legacy providers.

## Objective

Determine why the released `--backfill-alcohol` path returns `Would reject: 0` against the legacy JoinHalal import population and whether the failure is caused by:

1. an empty target dataset,
2. broken backfill CLI flag routing,
3. missing release code on `main`, or
4. a data-provenance mismatch between what the backfill expects and what the legacy rows actually store.

## Context

- Plan 057 shipped in `v0.8.23` to add visible HTML badge fallback plus a one-time alcohol backfill.
- The first attempted operator run executed from a stale clone (`/Users/NARAFIQ/Projects/uflow` at `59036f7`) and ran the normal importer instead of the backfill path.
- After syncing local `main` to `origin/main`, the released backfill path became available and was rerun successfully.
- The rerun reported:
  - `914 legacy import-bot rows`
  - `911 pending`
  - `3 already reviewed`
  - `Would reject: 0`
  - `No URL (skipped): 282`
  - `Fetch/parse errors: 607`
- Representative failures include invalid URLs (`https://Nicht%20vorhanden`, phone-number strings rendered as URLs), dead restaurant websites, and blocked external domains (`403`, `404`, `500`, `521`, `525`, timeout).

## Methodology

- Verified release presence on `origin/main` and local `main` using git ancestry, version, changelog, and CLI marker inspection.
- Traced the current `runBackfillAlcohol()` query and fetch path in `scripts/import-joinhalal.ts`.
- Compared the released importer transform against the older importer revision (`59036f7`) that produced the legacy rows.
- Ran targeted CLI regression tests after adding a legacy-row fallback to prove the modern query path and the legacy import-bot fallback both execute as expected.
- Interpreted the operator dry-run output as evidence of the stored URL/provenance contract in the legacy dataset.

## Findings

### 1. Verified: the released backfill code is present on `origin/main` and local `main`

Evidence:

- `origin/main` contains `scripts/import-joinhalal.ts` markers for `--backfill-alcohol`, `runBackfillAlcohol()`, and `const isBackfill = args.includes('--backfill-alcohol')`.
- `origin/main:package.json` reports version `0.8.23`.
- `origin/main:CHANGELOG.md` contains the Plan 057 `v0.8.23` entry.
- Local `/Users/NARAFIQ/Projects/uflow` was fast-forwarded from `59036f7` to `943d4fa`, after which the backfill markers were present locally.

Implication:

- The final zero-candidate result is not caused by missing release code on `main`.

### 2. Verified: the original zero-result before sync was an execution-context mistake, not a backfill result

Evidence:

- The first operator run from the stale clone printed sitemap collection, page processing across 915 URLs, and `Inserted 864` records.
- That output matches the normal importer path, not the alcohol backfill path.
- The stale file at `59036f7` had no `--backfill-alcohol` handling in `main()`.

Implication:

- The first apparent backfill failure was a stale-checkout execution problem.

### 3. Verified: the released backfill can now enumerate the legacy JoinHalal dataset, but only via import-bot provenance fallback

Evidence:

- Current `runBackfillAlcohol()` originally queried only `WHERE import_source = 'joinhalal'`.
- The operator dry run showed `No JoinHalal providers found`, proving the current DB rows did not satisfy that modern provenance query.
- A targeted fix added a fallback query on `user_created_id = IMPORT_BOT_UUID` and deduped the union of modern + legacy rows.
- After that change, the dry run reported `No import_source='joinhalal' rows found; using 914 legacy import-bot rows.`

Implication:

- The released/legacy production-shaped data is not modern JoinHalal provenance data. It is a legacy import-bot population lacking `import_source='joinhalal'` markers.

### 4. Verified: legacy rows do not preserve the JoinHalal listing URL needed for alcohol-badge evaluation

Evidence:

- In both the older importer revision (`59036f7`) and the released transform path, `social_website` is assigned from `schema.url`, stored in a local variable named `website`.
- `schema.url` is the merchant's external site, not the JoinHalal detail page URL.
- The current transform also computes `import_source_url: url`, but later strips `import_source_url` before writing because it is not a database column.
- The backfill fetch loop uses `provider.social_website` as the page to re-fetch.
- The operator dry-run failures are overwhelmingly external merchant sites or malformed non-JoinHalal values, not JoinHalal listing URLs.

Implication:

- The legacy rows do not carry a persisted JoinHalal source URL. The backfill is therefore evaluating the wrong source pages for legacy records.

### 5. Verified: `Would reject: 0` is a provenance failure result, not evidence that no legacy providers sell alcohol

Evidence:

- The known positive exemplar `dakju-korean-chicken-25247` still exists as a JoinHalal alcohol-selling page.
- The dry run reported `607` fetch/parse failures and `282` rows with no usable URL before any badge evaluation could happen.
- The badge extraction logic itself is already validated by parser/import tests and by the backfill CLI tests using JoinHalal-shaped HTML.

Implication:

- The legacy remediation objective remains unmet. The current result cannot support the conclusion that the 914 legacy rows contain zero alcohol sellers.

### 6. Verified: Plan 057 contained a false operational assumption about legacy row provenance

Evidence:

- The released Plan 057 Milestone 4 states that backfill should query JoinHalal providers and read the full source URL from the `social_website` column, asserting that it stores the JoinHalal listing URL.
- The critique revision marked MEDIUM-002 resolved on the same assumption.
- Source inspection contradicts that assumption: `social_website` is populated from `schema.url`, while `import_source_url` is transient and not persisted.

Implication:

- The implementation satisfied the plan as written, but the plan's persisted-provenance model was incorrect for the legacy dataset.

## Root Cause

### Verified Root Cause

The legacy JoinHalal rows that need remediation do not store a usable JoinHalal listing URL in the database.

- `social_website` holds the merchant's own website (or invalid/free-text variants), not the JoinHalal detail page.
- `import_source_url` was computed during import but stripped before database writes because it is not a real DB column.
- Many legacy rows also lack `import_source='joinhalal'`, so the modern provenance query misses them unless a legacy import-bot fallback is used.

As a result, the released backfill can locate the legacy population but cannot re-fetch the authoritative JoinHalal HTML needed to evaluate visible alcohol badges. The observed zero-candidate result is therefore a provenance/data-contract failure, not a successful negative scan.

## System Weaknesses

1. Source provenance was treated as transient import-time data rather than persisted remediation data.
   - Risk mechanism: operator follow-up tasks assume the source page can be re-fetched later, but the DB retains only merchant websites.

2. Release validation used synthetic backfill fixtures with JoinHalal URLs in `social_website`, not production-shaped legacy rows.
   - Risk mechanism: tests proved the control flow, but not the actual field contract of pre-existing data.

3. Plan and critique both inherited an incorrect assumption about what `social_website` stores.
   - Risk mechanism: planning closed MEDIUM-002 based on a belief contradicted by the actual importer transform.

4. Legacy and modern JoinHalal provenance models now coexist without explicit versioning.
   - Risk mechanism: modern backfill logic expects `import_source='joinhalal'`, while legacy rows are discoverable only via `user_created_id = IMPORT_BOT_UUID`.

## Instrumentation Gaps

### Normal telemetry needed

1. Import runs should emit structured counts for provenance quality at write time:
   - rows with `import_source='joinhalal'`
   - rows with missing/invalid `schema.url`
   - rows where persisted merchant website differs from JoinHalal detail URL

2. Backfill runs should classify failure causes explicitly:
   - `legacy_no_joinhalal_url`
   - `invalid_social_website`
   - `merchant_site_http_error`
   - `merchant_site_timeout`

3. Operator output should distinguish:
   - modern JoinHalal rows with authoritative source provenance
   - legacy import-bot rows with only merchant-site provenance

### Debug telemetry needed

1. Optional debug sample output of matched provider identity fields (provider name, city, stored website) for any provenance-recovery workflow.
2. Optional debug counters for JoinHalal sitemap match rates vs. unmatched legacy rows.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
| --- | --- | --- | --- | --- |
| 1 | How reliably legacy rows can be matched back to current JoinHalal detail pages using existing fields (name, city, merchant website, phone, email) | Yes | Quantify possible match keys and false-match risk against current sitemap/detail data | Planner / Analyst |
| 2 | Whether all 914 legacy rows still exist on JoinHalal today | Yes | Measure current sitemap coverage relative to the legacy import-bot population | Planner / Analyst |
| 3 | Whether the 864 old importer inserts the user ran from the stale clone should be retained, deduplicated, or cleaned up before any provenance-recovery remediation | Yes | Inspect overlap between the stale-clone insert batch and existing legacy rows | Planner / DevOps |
| 4 | Whether a durable DB field should persist JoinHalal detail URLs for future reprocessing or whether remediation should remain one-time and external | No | Product/technical decision during planning | Planner |

## Analysis Recommendations

1. Planner should treat the current legacy alcohol remediation as a new provenance-recovery problem, not as a simple extension of the released backfill loop.
2. Before selecting a remediation design, quantify how many of the 914 legacy rows can be confidently matched to current JoinHalal detail pages using existing stable fields.
3. Audit the stale-clone write run (`Inserted 864`) as a separate operational concern so any future remediation does not compound duplicate or mixed-provenance rows.
4. Preserve the current backfill behavior for modern rows, but plan legacy remediation separately because the source-contract differs materially.

## Open Questions

1. What combination of fields yields the safest JoinHalal detail-page match for legacy rows: normalized provider name + city, provider name + merchant website, or a broader identity heuristic?
2. How many legacy rows can be matched deterministically enough to permit automated moderation changes without manual review?
3. Should unmatched legacy rows remain pending indefinitely, be queued for manual review, or be excluded from automated remediation scope?
