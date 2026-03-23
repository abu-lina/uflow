---
ID: 052
Origin: 052
UUID: b4e91c3f
Status: Active
---

# Open Actions 052: Deferred Post-Deploy Follow-ups

## Summary

- Plan 052 adds a PostgreSQL RPC function (`upsert_joinhalal_providers`) that performs safe conflict updates preserving admin-controlled fields. No automated test exercises the live RPC execution path against a real Supabase instance.
- Before the first production `--write` run after migration 063 is applied, staging verification is required to confirm admin fields are not overwritten on conflict updates.

## Open Actions

| Item                                                         | Owner       | Trigger/Due                                     | Evidence to close                                                                                              | Status |
| ------------------------------------------------------------ | ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| Staging RPC admin-field preservation verification            | Operator    | Before first production `--write` post-migration 063 | SQL query showing `review_status`, `barakah_effects`, `needs_ids`, `show_address` unchanged on conflict rows   | Open   |

### Staging Verification Steps

1. Apply migrations 062 and 063 to staging Supabase instance
2. If no existing JoinHalal providers: run `--write --limit 10` to create baseline
3. Manually set `review_status = 'approved'` on one imported provider
4. Re-run `--write --limit 10` against same sitemap subset
5. Verify via `SELECT review_status, barakah_effects, needs_ids, show_address FROM providers WHERE import_source = 'joinhalal' LIMIT 5` that admin fields are unchanged
6. Expected: `review_status` remains `'approved'` (not reset to `'pending'`)

### Rollback

If admin fields are overwritten: roll back by running the inverse migration (`ALTER TABLE providers DROP COLUMN import_source, import_source_id`); re-investigate 063 function deployment.

## Changelog

| Date (UTC)        | Agent  | Change                                                        |
| ----------------- | ------ | ------------------------------------------------------------- |
| 2026-03-22T18:24Z | devops | Created tracker from UAT deferred staging verification gate   |
