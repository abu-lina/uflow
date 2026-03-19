---
ID: 047
Origin: 047
UUID: 6c8f14ab
Status: Active
---

# Open Actions 047: Deferred Post-Deploy Follow-ups

## Summary

The UAT report for Plan 047 deferred a live staging smoke test to DevOps/operator because no live Supabase environment was available during the agent-driven UAT review. The import pipeline (`scripts/import-joinhalal.ts`) has not been run against a real Supabase instance yet. This must be validated before the `--write` flag is used against production.

Release context: v0.8.4 — JoinHalal provider data ingestion pipeline.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| Live staging dry-run: `npx tsx scripts/import-joinhalal.ts --dry-run --limit 20` against staging Supabase | DevOps / operator executing first import | Before `--write` is run against production | Console output showing: "Loaded N existing providers" line (DB dedup active), parsed record count, at least one sample record with valid name + city + category, no crash/error | Open |
| Live staging write: `npx tsx scripts/import-joinhalal.ts --write --limit 5` against staging Supabase | DevOps / operator | After staging dry-run passes | SQL output from `SELECT provider_name, review_status, user_created_id FROM providers WHERE user_created_id = '00000000-0000-0000-0000-000047000001' LIMIT 5;` confirming rows present with `review_status='pending'` | Open |
| Idempotency re-run: re-run `--write --limit 5` after above | DevOps / operator | Same session as above | Console shows "Skipped (duplicate): 5" (or similar) with no new rows inserted | Open |
| Confirm import-bot user creation: check bot UUID exists | DevOps / operator | After first write run | `SELECT id, email FROM auth.users WHERE id = '00000000-0000-0000-0000-000047000001';` returns one row | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-19T16:00Z | devops | Created tracker from deferred UAT validations in Plan 047 UAT report |
