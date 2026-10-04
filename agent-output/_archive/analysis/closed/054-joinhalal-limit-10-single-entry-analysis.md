---
ID: 054
Origin: 054
UUID: c4e81a2f
Status: Planned
---

# Analysis 054 — JoinHalal Limit-10 Single-Entry Import

## Value Statement and Business Objective

As an operator running the JoinHalal importer,
I want a selected limit such as 10 to produce 10 real location pages in the import candidate set,
so that staging and production validation reflect actual provider ingestion behavior rather than a misleading mix of listing pages and partial persistence.

## Objective

Determine why a JoinHalal import run selected with limit 10 produced only one inserted row, and why that row is the generic `joinhalal` listing record instead of 10 provider entries.

## Context

User-reported observed row:

- `provider_name = "joinhalal"`
- `social_website = "https://joinhalal.com"`
- `contact_email = "info@joinhalal.com"`
- `import_source = null`
- `import_source_id = null`
- only one row inserted despite selecting 10 entries

Relevant code paths:

- `src/lib/import/joinhalal.ts` — shared dry-run collector and transform pipeline
- `scripts/import-joinhalal.ts` — write-mode collector and persistence split
- `src/utils/joinhalal-parser.ts` — sitemap URL extraction and page parsing
- `supabase/migrations/063_upsert_joinhalal_provider_rpc.sql` — required RPC for write-mode upsert path

## Methodology

1. Read the limit selector UI and dry-run route to verify whether the selected limit is transmitted correctly.
2. Read both dry-run and write-mode sitemap collectors to inspect how URLs are gathered and sliced.
3. Fetch live JoinHalal sitemap XML (`locations-sitemap1.xml`, `locations-sitemap2.xml`) to compare real sitemap contents with parser assumptions.
4. Fetch one real location page and the generic `/locations/` page to compare `current_post` availability and therefore persistence path.
5. Compare the observed inserted row shape against the script's insert-only vs RPC-upsert branches.

## Findings

### Verified

1. **The limit selector itself is wired correctly.**
   - `ImportDryRunPageContent.tsx` posts `body: JSON.stringify({ limit })` to `/api/admin/import-joinhalal/dry-run`.
   - `buildCliWriteCommand(limit)` emits `npx tsx scripts/import-joinhalal.ts --write --limit 10` for a limit of 10.
   - `scripts/import-joinhalal.ts` parses `--limit 10` correctly and sets `limit` to numeric `10`.
   - Conclusion: the chosen limit is not being lost in the UI or CLI argument parser.

2. **Both collectors include the generic JoinHalal listing page from `locations-sitemap1.xml`.**
   - `extractUrlsFromSitemapXml()` returns every `<loc>` entry without filtering.
   - `collectLocationUrls()` in both `src/lib/import/joinhalal.ts` and `scripts/import-joinhalal.ts` appends all extracted URLs and only slices after collection.
   - Live sitemap evidence from `https://joinhalal.com/locations-sitemap1.xml` shows the first URL is:
     - `https://joinhalal.com/locations/`
   - Therefore a limit of 10 includes the generic listing page as candidate #1.

3. **The generic `/locations/` page matches the bad row the user observed.**
   - Live page `/locations/` does not expose a `current_post` block in the fetched HTML.
   - The real location page `https://joinhalal.com/locations/restaurant/echte-baerliner-augsburg-oberhausen-26548/` does expose:
     - `"current_post":{"exists":true,"id":26548,...}`
   - In `transformPageToProvider()`, absence of `current_post.id` produces:
     - `import_source = null`
     - `import_source_id = null`
   - The user-reported row has exactly that shape and also carries the JoinHalal site-level contact fields.
   - Conclusion: the one inserted row is the generic listing page being treated as a provider.

4. **Write mode uses two different persistence paths.**
   - If `record.import_source_id` exists, the record goes into `toUpsert` and is persisted only through RPC `upsert_joinhalal_providers`.
   - If `record.import_source_id` is null, the record goes into `toInsertOnly` and is persisted through a plain `.insert()` call.
   - This split is explicit in `scripts/import-joinhalal.ts`.

### High-confidence inference

1. **The "only one inserted row" outcome is most consistent with the RPC upsert path failing while the insert-only fallback row still succeeds.**
   Evidence chain:
   - The first limited URL is the generic `/locations/` page and therefore enters the insert-only path.
   - The first real provider pages in the same limited set do carry `current_post.id`, so they enter the RPC upsert path.
   - The user observed exactly one inserted row, and that row is the only one that would bypass the RPC function.
   - `scripts/import-joinhalal.ts` persists `toUpsert` records only via:
     - `supabase.rpc('upsert_joinhalal_providers', { p_providers: cleanBatch })`
   - Migration `063_upsert_joinhalal_provider_rpc.sql` defines that function, and prior release notes/open actions explicitly called out that live environments must have migration 063 applied before safe write runs.

   Fastest disconfirming test:
   - Re-run the same write command and inspect terminal output for a batch error mentioning `upsert_joinhalal_providers`.
   - Or query the target database for function existence:
     - `select proname from pg_proc where proname = 'upsert_joinhalal_providers';`

   Missing telemetry that would make this provable immediately:
   - persisted import logs or terminal transcript from the failed write run
   - target-environment migration state / function existence check
   - write-run counts for `toUpsert.length` vs successful RPC inserted/updated counts

### Hypotheses

1. **Hypothesis: migration 063 is missing in the target environment.**
   - Confidence: High
   - Why it fits: real provider pages require RPC; exactly one non-RPC row inserted
   - Fastest disconfirming test: query function existence or read the write-run error output
   - Missing telemetry: database migration state and RPC invocation result

2. **Hypothesis: the RPC exists, but the upsert batch is failing for another environment-specific reason (schema drift, permissions, bad payload).**
   - Confidence: Medium
   - Why it fits: would still leave only the insert-only listing row persisted
   - Fastest disconfirming test: inspect terminal output from the run for the exact RPC error message
   - Missing telemetry: terminal stderr from the write run and target DB error text

## Root Cause

### Verified root cause

The importer currently treats the generic `https://joinhalal.com/locations/` listing page as a provider candidate because sitemap extraction does not filter non-detail URLs. That page becomes a bogus provider row named `joinhalal` with null source identity.

### Likely co-occurring root cause

The observed "exactly one row inserted" behavior strongly indicates the real provider pages in the same limited batch were routed into the RPC upsert path and did not persist, most likely because the target environment could not execute `upsert_joinhalal_providers`.

## System Weaknesses

### Code weakness

- Sitemap extraction accepts every `<loc>` URL without validating that it is a provider detail page (`/locations/{category}/{slug-id}/`).
- This allows listing pages and other non-detail location URLs into the import candidate set.

### Process weakness

- Stage 2 release smoke checks validated public routes but did not validate a real post-release import write run against the target environment.
- The live-RPC write-path dependency introduced in Plan 052 remained operationally deferred; this left a release path where code could be published while target-environment migration state still blocked real imports.

### Test weakness

- Existing parser tests cover extraction mechanics but not exclusion of generic `/locations/` sitemap entries.
- No automated test currently models the exact live first-entry shape from `locations-sitemap1.xml`.

## Instrumentation Gaps

### Normal telemetry needed

- Import run summary should distinguish:
  - candidate URLs collected
  - detail-page URLs accepted
  - non-detail URLs filtered out
  - insert-only records count
  - RPC-upsert records count
  - RPC-upsert batch failures count
- This should be always-on, low-volume, and emitted in structured CLI/report output.

### Debug telemetry needed

- For failed write runs, emit the first N URLs in the limited batch and their classification:
  - detail vs non-detail
  - has `current_post.id` vs missing
  - selected persistence path (`insert-only` vs `rpc-upsert`)
- This should be opt-in because it is higher-volume and mostly useful during incident investigation.

## Analysis Recommendations

1. Confirm whether the target database contains function `upsert_joinhalal_providers` before any further write run.
2. Capture the exact terminal output from the failing `--write --limit 10` run, especially any RPC batch error line.
3. Compare the first 10 collected URLs against provider-detail URL shape to confirm how many candidates are non-detail pages.
4. Add a focused regression check that uses the real `locations-sitemap1.xml` first-entry shape and proves `/locations/` is excluded from import candidates.

## Open Questions

1. Was migration 063 applied to the exact Supabase environment where this write run was executed?
2. What did the terminal print for the first upsert batch in that run?
3. Did the dry-run preview already show the bogus `joinhalal` sample row before the write command was copied?
4. Was the run executed against the default sitemap set or a custom `--sitemap` argument?
