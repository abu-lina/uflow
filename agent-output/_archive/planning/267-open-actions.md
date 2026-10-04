---
ID: 267
Origin: 267
UUID: ed174b2e
Status: Active
---

# Open Actions 267: Deferred Post-Deploy Follow-ups

## Summary

- Post-deploy obligations and deferred scope items resulting from Plan 267 (Admin "All" Status Scope on Food Search).
- Target release: v0.15.21

## Open Actions

| Item                                                                                  | Owner                | Trigger/Due                                                       | Evidence to close                                                                                                                                                                                                                                    | Status |
| ------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **MIG-135**: Apply Migration 135 to shared UAT/PROD database (`rdtdtcfntopcxcigkqoq`) | DevOps               | Prior to container deployment in Stage 2 release                  | Migration 135 applied cleanly via MCP `mcp_supabase_apply_migration` or Supabase SQL Editor; verification SQL passes                                                                                                                                 | Open   |
| **DF-1**: Live UAT Admin Browser Validation                                           | DevOps / QA Operator | Immediately after applying Migration 135 and deploying app to UAT | Real admin browser session on UAT (`https://uat.ummahflow.com`): `/food?q=Munchies` shows Munchies labeled "Pending" without buttons; Pending tab shows Approve/Reject; non-admin search returns 0 results; API `status=all` returns 403 anonymously | Open   |
| **DF-2**: Map / Near-Me / Home "All" Status Alignment (FU-1 / D8)                     | Planner              | When control window allocates new Plan ID for FU-1                | Separate data paths (`getMapLocations`, `search_food_near_me`, `useAdminSearch`) updated to support admin All status scope                                                                                                                           | Open   |
| **DF-3**: GitHub Issue #435 Body Refresh (N3)                                         | DevOps               | At DevOps Stage 1/2 artifact preparation                          | Issue #435 description on GitHub updated to reflect four-status set on food & store                                                                                                                                                                  | Open   |

## Changelog

| Date (UTC) | Agent  | Change                                                                                    |
| ---------- | ------ | ----------------------------------------------------------------------------------------- |
| 2026-09-28 | devops | Created open actions tracker for Plan 267 deferred follow-ups (MIG-135, DF-1, DF-2, DF-3) |
