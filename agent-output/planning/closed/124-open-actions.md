---
ID: 124
Origin: 124
UUID: 7f6a8e3b
Status: Committed for Release v0.12.8
---

# Open Actions 124: Deferred Post-Deploy Follow-ups

## Summary

Manual browser verification was deferred from the UAT phase because the local worktree lacks the Supabase environment variables needed to serve a working `/providers` page. All automated quality gates have passed. This item requires a real browser session against the UAT or production environment.

Release/version context: v0.12.7

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
| --- | --- | --- | --- | --- |
| Manual browser verification — `/providers` location selector shows no "Everywhere" option | QA/UAT | Within 24h of production deployment | Screenshot confirming no "Everywhere"/"Überall" option in dropdown | Open |
| Verify city selection still works (e.g., `?location=Berlin`) | QA/UAT | Within 24h of production deployment | Confirmation that Berlin filter updates results | Open |
| Desktop viewport check (1920px) | QA/UAT | Within 24h of production deployment | Selector visible and functional | Open |
| Mobile viewport check (375px) | QA/UAT | Within 24h of production deployment | Selector visible and functional on small screen | Open |
| Legacy URL backward compatibility (`?location=Everywhere`) | QA/UAT | Within 24h of production deployment | Page resolves without error; all-locations results shown | Open |

## Closure Criteria

All five items above must be confirmed (or the relevant items confirmed and any N/A items documented) before this tracker can be closed.

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-05-04T11:15Z | devops | Created tracker from UAT DF-1 deferred validations for Plan 124 / v0.12.7 |
| 2026-05-04T12:45Z | uat | UAT Complete: Implementation approved for release; location field removal verified; no blocking issues |
