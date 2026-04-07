---
ID: 085
Origin: 085
UUID: c7b4e2a9
Status: Active
---

# Open Actions 085: Deferred Post-Deploy Follow-ups

## Summary

Manual browser validation of admin/owner visibility on CS detail pages was deferred from
UAT because the fix is validated entirely through automated tests and a proven architectural
pattern (resilient fetch — ProviderDetailPageClient, Plan 081). Rollback available via v0.10.15
if post-deploy issues arise.

Release context: v0.10.16, 2026-04-07

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| Manual browser: admin views non-approved CS by direct URL on UAT env | QA team | Within 24h of v0.10.16 deploy to UAT | Screenshot or note confirming CS detail page loads (not "Service nicht gefunden") | Open |
| Manual browser: owner views own pending CS by direct URL on UAT env | QA team | Within 24h of v0.10.16 deploy to UAT | Screenshot or note confirming CS detail page loads for owned pending submission | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-07T06:40Z | devops | Created tracker from UAT deferred validations |
