---
ID: 45
Origin: 45
UUID: 3f9a2c1d
Status: Active
---

# Open Actions 045: Deferred Post-Deploy Follow-ups

## Summary

- All automated gates passed; two follow-up items were deferred from UAT as non-blocking (live browser validation and E2E test coverage)
- A pre-existing npm HIGH vulnerability (`flatted`) should be fixed in the next maintenance release
- Release: v0.8.4 (2026-03-19)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| Live UAT validation — direct URL nav, SPA A→B nav, Arabic no-category browse | QA Lead / DevOps | Post-deploy to UAT/Production env | Manual browser test notes or screenshot | Open |
| Live UAT validation — page-2 pagination under category filter | QA Lead | Same session as above | Confirmed 2nd page loads with correct category | Open |
| `flatted` npm HIGH vulnerability fix (`npm audit fix`) | Implementer | Next maintenance window / before v0.8.5 | `npm audit --audit-level=high` returns 0 HIGH | Open |
| E2E browser tests for category filter (Playwright/Cypress) | QA / Implementer | Next sprint planning | Test file added covering direct URL nav + SPA nav + back-button | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-19T09:48Z | devops | Created tracker from deferred UAT validations and pre-existing audit finding |
