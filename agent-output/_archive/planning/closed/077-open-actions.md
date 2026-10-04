---
ID: 077
Origin: 077
UUID: d4e8a1f2
Status: Released
---

# Open Actions 077: Deferred Post-Deploy Follow-ups

## Summary

Deferred iOS manual runtime checks were accepted at UAT as controlled follow-ups for a CSS-only fix. User has now confirmed UAT/device validation is done and the fix is working, so all deferred items are closed.

Release context: Target release `v0.10.6` for Plan 077 mobile header overlap bugfix.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| Notch iPhone visual validation on `/providers` (first card fully visible under header) | QA/UAT operator | Completed 2026-04-04 | User-confirmed UAT validation: fix working on UAT | Closed |
| Non-notch iPhone regression check (spacing unchanged) | QA/UAT operator | Completed 2026-04-04 | User-confirmed UAT validation: fix working on UAT | Closed |
| Admin notch validation (`AdminStatusFilter` visible below header) | QA/UAT operator | Completed 2026-04-04 | User-confirmed UAT validation: fix working on UAT | Closed |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-04T08:37Z | DevOps | Created deferred validation tracker from UAT conditional approval and QA deferred runtime checks. |
| 2026-04-04T08:49Z | DevOps | User confirmed UAT validation complete and fix working on UAT; all deferred actions closed and tracker Status → Released. |
