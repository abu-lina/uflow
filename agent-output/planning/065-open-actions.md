---
ID: 065
Origin: 065
UUID: a7b3c941
Status: Active
---

# Open Actions 065: Deferred Post-Deploy Follow-ups

## Summary

- Plan 065 is committed locally for release `v0.10.0`, but UAT recorded deferred post-deploy validations that must remain visible after the plan/UAT docs move to `closed/`.
- These items are release-adjacent operational gates, not implementation blockers. `DF-2` remains mandatory before any production deploy.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
| --- | --- | --- | --- | --- |
| DF-1: CLI dry-run timing < 60s for 20 providers | DevOps / operator | Within 24h of release; first UAT dry-run | Logged wall-clock timing from `scripts/enrich-providers.ts --dry-run --source joinhalal --limit 20` | Open |
| DF-2: Migration 066 reset + admin smoke | DevOps / UAT operator | Before production deploy | `supabase db reset --debug` success log plus admin GET/POST 200 on seeded candidate | Open |
| DF-3: Atomic approve RPC | Planner / Implementer (M4) | Before M4 scheduling goes live | Migration + RPC + service update replacing sequential writes | Open |
| DF-4: Filter stale claimed-provider candidates | Planner / Implementer (M4) | Before M4 scheduling goes live | `getPendingCandidates()` joins `providers.provider_owner_id IS NULL` or equivalent stale-candidate purge path | Open |

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-29T14:50Z | devops | Created tracker from deferred UAT validations and accepted M4 follow-up items |