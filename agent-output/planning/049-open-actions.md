---
ID: 049
Origin: 049
UUID: b7e4a92c
Status: Active
---

# Open Actions 049: Deferred Post-Deploy Follow-ups

## Summary

These validations could not be executed prior to the v0.8.10 commit because they require the application to be deployed to the UAT environment (live Nginx + Next.js container). The automated test suite covers the exact bug path and route contract; live execution confirms the full operator value story.

Release/version context: v0.8.10 (Plan 049 — JoinHalal Dry-Run Timeout Hardening)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Live browser UAT validation — navigate to `/dashboard/import` on UAT, run dry-run with `limit=10`, confirm: (a) on success: `timing.totalMs > 0` visible in devtools response; (b) on timeout: response body is `{ error: 'Dry-run timed out', detail: '...90s...' }` with status 504 — NOT opaque Cloudflare/Nginx 504 | DevOps | First UAT deployment of v0.8.10 | Browser devtools screenshot or logged response; 504 body confirmed if timeout occurs | Open |
| DF-2: Timing baseline recorded on UAT — compare `timing.totalMs` for `limit=10` to Analysis 049 baseline (~6.5s); note if significantly higher | DevOps | First UAT deployment of v0.8.10 | `timing.totalMs` value logged in deployment session notes | Open |

## Rollback Trigger (DF-1)

If live UAT yields **opaque Cloudflare/Nginx 504** (not app-owned `{ error: 'Dry-run timed out' }`) on two consecutive runs:
- Roll back to v0.8.8 immediately
- Escalate to Planner (SAME-DAY severity)
- Open a new plan scope to investigate

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-22T11:45Z | devops | Created tracker from deferred UAT validations (UAT doc, Scenarios 5 + Performance Timing Gate) |
