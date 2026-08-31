---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Active
---

# Open Actions 114: Deferred Post-Deploy Follow-ups

## Summary

Two items were deferred from Plan 114 Phase 5 UAT and are non-blocking for the v0.11.7 release:

1. **EXPLAIN ANALYZE benchmarks**: Query performance validation for the 4 tables affected by PK consolidation. Smoke tests showed no regression signals; formal benchmark deferred to post-deploy (accepted per original plan criteria: >10% regression triggers rollback).

2. **Migration 005 local reset blocker** (pre-existing, unrelated to Phase 5): `supabase db reset --local` fails at migration 005 due to a function return-type change. Workaround used: targeted 007–010 apply on dev. Tracked separately.

**Release/version context**: v0.11.7, Plan 114 Phase 5, released 2026-04-30.

---

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| EXPLAIN ANALYZE query benchmarks on 4 Phase 5 tables | QA / DevOps | Within 7 days of prod deploy (due 2026-05-07), or before next schema migration on these tables | EXPLAIN ANALYZE output for `categories`, `users`, `community_services`, `providers` on PROD (`rdtdtcfntopcxcigkqoq`) — each query ≤10% regression vs pre-Phase-5 baseline | Open |
| Migration 005 local-reset blocker | Planner / Implementer | Next schema refactor session (separate ticket) | `supabase db reset --local` succeeds through all migrations including 005 | Open |

---

## Environment Reference

| Environment | Supabase Project | Migrations Status |
|-------------|-----------------|------------------|
| DEV | `qrekonfhaenjdnjhwdum` | ✅ Applied via CLI |
| PROD (UAT+Prod combined) | `rdtdtcfntopcxcigkqoq` | ✅ Applied via MCP tools 2026-04-30 |

---

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-30 | devops | Created tracker from deferred UAT validations and pre-existing migration blocker |
| 2026-04-30 | devops | Confirmed environment mapping: PROD=`rdtdtcfntopcxcigkqoq` (UAT+Prod combined). Both envs migrated. Updated due date for DF-1 to 2026-05-07. |
