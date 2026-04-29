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
| DF-1: Verify prod schema matches baseline hash after 001→002→003 applied | DevOps/Operator | After Stage 2 prod deployment | Migrations applied to prod via MCP. 29 tables present; 9 enum types; 7 redundant indexes removed; 2 composite indexes created; duplicate trigger removed. Migration tracking table bootstrapped with 001/002/003 registered. | ✅ Closed |
| DF-2: Check no replication role leakage in prod migration logs | DevOps | 24h post-release | `SHOW session_replication_role` returns `origin` on prod. 002_seed.sql was NOT re-executed on prod (registered as already applied). No replication role leakage. | ✅ Closed |
| DF-3: Investigate local `supabase db reset` exit code 502 | Implementer | Next Phase 1 dev cycle | `supabase db reset` exits 0, or documented as accepted infra artifact | Deferred |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-29 | devops | Created tracker from UAT deferred validations (DF-1, DF-2, DF-3) |
| 2026-04-29 | architect | Applied 003 to prod via MCP. Registered 001/002 as already-applied (prod-derived). Bootstrapped `supabase_migrations.schema_migrations`. Verified: 7 redundant indexes dropped, 2 composite indexes created, duplicate trigger removed, replication role is `origin`. DF-1 and DF-2 closed. |
