---
ID: 077
Origin: 077
UUID: d4e8a1f2
Status: Active
---

# Open Actions 077: Deferred Post-Deploy Follow-ups

## Summary

Deferred iOS manual runtime checks were accepted at UAT as controlled follow-ups for a CSS-only fix. These checks remain required evidence for final closure confidence.

Release context: Target release `v0.10.6` for Plan 077 mobile header overlap bugfix.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| Notch iPhone visual validation on `/providers` (first card fully visible under header) | QA/UAT operator | Before release, or within 24h post-release fallback | Screenshot/video from notch iPhone on `/providers` | Open |
| Non-notch iPhone regression check (spacing unchanged) | QA/UAT operator | Before release, or within 24h post-release fallback | Screenshot/video from non-notch iPhone showing unchanged top spacing | Open |
| Admin notch validation (`AdminStatusFilter` visible below header) | QA/UAT operator | Before release, or within 24h post-release fallback | Screenshot/video with admin account on notch iPhone | Open |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-04T08:37Z | DevOps | Created deferred validation tracker from UAT conditional approval and QA deferred runtime checks. |
