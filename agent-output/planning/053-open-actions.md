---
ID: 053
Origin: 053
UUID: b7e4a1c9
Status: Active
---

# Open Actions 053: Deferred Post-Deploy Follow-ups

## Summary

Plan 053 is approved for release, but one operational validation remains intentionally deferred because it requires a Supabase-connected staging environment and real JoinHalal data.

This tracker keeps the post-deploy validation visible after the core Plan 053 documents move to `closed/` during DevOps Stage 1.

## Open Actions

| Item                                                                                  | Owner             | Trigger/Due                                                                               | Evidence to close                                                                                                                                                                                                | Status |
| ------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Live staging import validation for corrected JoinHalal parser and offer auto-creation | DevOps / Operator | Before first corrected production import run; execute during Stage 2 readiness validation | Evidence that at least one imported provider has non-null `import_source_id`, at least one missing Speisen value created a new `offers` row, and at least one affected provider persisted non-empty `offers_ids` | Open   |

## Changelog

| Date (UTC)        | Agent       | Change                                                              |
| ----------------- | ----------- | ------------------------------------------------------------------- |
| 2026-03-22T20:24Z | devops      | Created tracker from deferred UAT/QA staging validation requirement |
| 2026-03-22T22:52Z | implementer | Plan 054 fixes code-level blockers; added validation runbook        |

## Validation Runbook (added by Plan 054)

Plan 054 fixes the two code-level blockers that prevented 053-OA-1 evidence collection:

1. **Sitemap filter** — non-detail listing pages (e.g., `/locations/`) are now excluded from the candidate set before the numeric limit is applied.
2. **RPC exit code** — the write script now exits non-zero if any `upsert_joinhalal_providers` batch fails, making missing-migration failures immediately obvious.

### Steps to close this open action

1. Confirm migrations 063 and 064 (`upsert_joinhalal_providers`) are applied to the staging database:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'upsert_joinhalal_providers';
   -- Function should exist after migration 063; migration 064 fixes provider_description drift (Plan 055)
   ```
2. Run the import in write mode against staging:
   ```bash
   npx tsx scripts/import-joinhalal.ts --write --limit 10
   ```
3. Verify evidence:
   - At least one provider has non-null `import_source_id`
   - At least one new `offers` row was auto-created for an unmatched Speisen value
   - At least one provider has non-empty `offers_ids`
4. Record evidence in this document and mark the open action as **Closed**.
