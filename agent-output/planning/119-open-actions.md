---
ID: 119
Origin: 119
UUID: e5c1d7a4
Status: Active
---

# Open Actions 119: Deferred Post-Deploy Follow-ups

## Summary

Three items were deferred from Plan 119 Stage 1 due to worktree environment constraints and scope boundaries. All are non-blocking for release. Migration apply and Unsplash live run must be completed before the enrichment workflow can be used in production.

Release context: v0.12.4, branch `session/119-provider-image-ux` (squash-merged to `main`)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
| --- | --- | --- | --- | --- |
| Apply migration 088 (`088_plan_119_image_enrichment_columns.sql`) to PROD | DevOps Stage 2 | Immediately after Stage 2 push + merge | `mcp_supabase_apply_migration` success confirmed; `public.enrichment_candidates` verified with `enrichment_type`, `image_url`, `source_service`, `source_category`, `attribution` | Closed (2026-05-03T17:16Z) |
| Run Unsplash curate/assign in PROD environment (`npm run enrich:images -- --curate --write`) | Operator | Post-release, using production credentials (UNSPLASH_ACCESS_KEY) | `provider-images/enrichment/stock/` bucket populated; pool-manifest.json uploaded | Open |
| Attribution credits page (M4 scope) | Product/Design | Future plan (Plan 120 or similar) | Design mockup + implementation + QA sign-off | Open |

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-05-03T16:24Z | devops | Created tracker from deferred validations at Stage 1 closure |
| 2026-05-03T17:16Z | devops | Updated release context to v0.12.4 and closed migration 088 action after successful PROD apply + schema verification |
