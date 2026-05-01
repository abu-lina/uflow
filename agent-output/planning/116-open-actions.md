---
ID: 116
Origin: 118
UUID: e7a3f1c9
Status: Active
---

# Open Actions 116: Deferred Post-Deploy Follow-ups

## Summary

Plan 116 (v0.12.0) resolved all 28 field-level schema findings from Architecture 118. Four items
were deferred from UAT as non-blocking post-release follow-ups. None are required for platform
operation — they are validation completeness and code quality improvements.

Release context: v0.12.0 deployed to PROD on session/118-field-schema-review branch.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| **DF-1**: Manual browser validation — store category picker, ummah bookmark star, `?section=business` redirect, food/store search RPCs | QA / UAT | Within 24h of PROD deployment; **rollback trigger** if failures found | Browser session: Chrome + mobile simulator. Record: route, browser, observed outcome for each of 4 scenario types | Open |
| **DF-2**: Documentation drift — M8 addendum missing from implementation doc + deployment doc | Implementer | Within 1 week post-release (low priority) | Add M8 section to `agent-output/implementation/closed/116-field-schema-remediation-m3-to-m7-implementation.md` and `agent-output/deployment/116-v0.12.0-stage1.md`; record M8 artifacts (migration 086, service renames, test evidence) | Open |
| **DF-3**: Food menu service test gap — `src/services/food-menu.ts` has no dedicated unit test for `getProviderMenu()` query path | Implementer | Before next release touching food-menu service | Add `src/__tests__/services/food-menu.test.ts` mirroring `store-catalog.test.ts` structure; test `.from('food_menu')` table reference, filtering, error handling | Open |
| **DF-4**: Orphaned function — `public.get_community_services_for_provider(uuid)` not dropped in migrations 079–086; references dropped tables; causes local `supabase db push` failure at migration 005 (function body return-type conflict) | DevOps / Implementer | Next schema maintenance window | Add migration `087_cleanup_orphaned_functions.sql`: `DROP FUNCTION IF EXISTS public.get_community_services_for_provider(uuid);` then verify `supabase db push --local` exits 0 | Open |

## Notes

### DF-1 Risk Escalation Path
If browser validation reveals failures, the rollback path is:
- DB side: no rollback needed — PROD migrations applied successfully; app failures would be code-side
- App side: revert commit on `session/118-field-schema-review`; push reverted branch; coordinate with DevOps for hotfix

### DF-4 Context
The local DB push failure is an **emulator-only** issue caused by migration 005 attempting `CREATE OR REPLACE FUNCTION` with a changed return type. PostgreSQL rejects this with `42P13: cannot change return type of existing function`. PROD and DEV databases have this function applied in its current state and are operating normally. The fix is a follow-on DROP migration.

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-05-02T01:30Z | devops | Created tracker from UAT DF-1 through DF-4 deferred validations |
