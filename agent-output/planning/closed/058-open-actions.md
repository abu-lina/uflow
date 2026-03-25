---
ID: 058
Origin: 058
UUID: f8cb0a9c
Status: Closed
---

# Open Actions 058: Deferred Post-Deploy Follow-ups

## Summary

- Plan 058 is committed for release `v0.8.27`, but the operator-facing runtime actions still need to be executed in a Supabase-connected environment.
- These items are required to complete the real-world provenance recovery and alcohol-backfill remediation after deploy.
- **All items completed via GitHub Actions workflow on 2026-03-25.**

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
| --- | --- | --- | --- | --- |
| Run `--audit-stale-clone` against production and save the overlap report | DevOps operator / Admin | Immediately after deployment of `v0.8.27`, before any provenance write run | Terminal output or saved report showing exact duplicates / partial overlaps / unique rows and the recommendation block | ✅ Closed (2026-03-25) |
| Run `--recover-provenance --dry-run` and review coverage counts | DevOps operator / Admin | After migration `065_add_import_source_url_column.sql` is applied | Terminal output showing matched / ambiguous / unmatched / skipped counts | ✅ Closed (2026-03-25) |
| Run `--recover-provenance --write` after stale-clone findings are reviewed | DevOps operator / Admin | After the stale-clone audit is accepted and any duplicate handling is complete | Terminal output showing `Successfully persisted > 0` and `Failed = 0` | ✅ Closed (2026-03-25) |
| Run `--backfill-alcohol --dry-run` and confirm legacy rejection candidates exist | DevOps operator / Admin | After provenance write completes | Terminal output showing `Would reject` count and candidate list review | ✅ Closed (2026-03-25) |

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-03-24T14:17Z | devops | Created tracker from UAT deferred validations before Stage 1 closure |
| 2026-03-25T00:00Z | devops | All items closed — recover-provenance + backfill-alcohol executed on prod via GitHub Actions |