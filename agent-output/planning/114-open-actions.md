---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Active
---

# Open Actions 114: Deferred Post-Deploy Follow-ups

## Summary

Three items deferred from Plan 114 Phase 0-prime UAT report. Release proceeded because these are post-deployment verifications, not pre-deployment blockers.  
Release context: v0.10.43 (patch, infrastructure-only, migration baseline squash).

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Verify prod schema matches baseline hash after 001→002→003 applied | DevOps/Operator | After Stage 2 prod deployment | Normalized SHA-256 of prod dump matches `27f92676c2c252df898489010cd692e91901766a929ba3baf69563a0d690c7a6` | Open |
| DF-2: Check no replication role leakage in prod migration logs | DevOps | 24h post-release | Prod migration logs show `session_replication_role` restored to `origin`; no FK bypass errors | Open |
| DF-3: Investigate local `supabase db reset` exit code 502 | Implementer | Next Phase 1 dev cycle | `supabase db reset` exits 0, or documented as accepted infra artifact | Deferred |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-29 | devops | Created tracker from UAT deferred validations (DF-1, DF-2, DF-3) |
