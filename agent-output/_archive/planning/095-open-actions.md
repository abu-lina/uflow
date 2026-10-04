---
ID: 095
Origin: 095
UUID: a7c3e91f
Status: Active
---

# Open Actions 095: Deferred Post-Deploy Follow-ups

## Summary

- **Why deferred**: `supabase db reset --local` fails at migration 061 (pre-existing `category_images` column missing from `categories`). Same blocker as Plan 094. Cannot apply migration 069 to local Supabase instance; blocks all DB runtime validation.
- **Release context**: Plan 095 released in v0.10.22. Automated gates (tests 2/2, type-check, lint, build) all pass. Deferred items are incremental validation only — not blocking correctness or release.
- **Related tracker**: `agent-output/planning/094-open-actions.md` (same blocker — migration 061 drift)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| **DF-1a**: Resolve migration 061 bootstrap drift | QA/DevOps | Within 24h of release | `supabase db reset --local` completes successfully through migration 069 | Open |
| **DF-1b**: RLS enforcement validation (community_projects) | QA | After DF-1a | Non-owner INSERT denied; owner INSERT succeeds | Open |
| **DF-1c**: CHECK constraint validation | QA | After DF-1a | Invalid project_type, negative prices, max_attendees=0, reversed dates — all rejected (SQLSTATE 23514) | Open |
| **DF-1d**: `search_community_projects` RPC runtime tests | QA | After DF-1a | RPC returns correct rows; ts_rank ordering verified; filter composition works | Open |
| **DF-1e**: `provider_stats.community_project_count` accuracy | QA | After DF-1a | `SELECT community_project_count FROM provider_stats` = actual count of `community_projects WHERE is_active=true` | Open |
| **DF-1f**: EXPLAIN plan baseline for RLS 2-hop join + GIN search | QA/DevOps | After DF-1a | EXPLAIN ANALYZE captured for `search_community_projects('')` and owner INSERT path | Open |

## Resolution Path for DF-1a

Candidate fixes for migration 061 bootstrap drift:

1. **Option A**: Add `IF EXISTS` guard to the `category_images` column reference in migration 061 so it is safely skipped if the column doesn't exist
2. **Option B**: Verify and fix the migration ordering — `category_images` was supposed to be created in an earlier migration; if so, find the missing migration and restore it

**Recommended**: Option A (minimal change, idempotent, unblocks local resets without touching production schema).

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-20T17:18Z | devops | Created tracker from deferred QA/UAT validations (migration 061 blocker, Plan 095 v0.10.22) |
