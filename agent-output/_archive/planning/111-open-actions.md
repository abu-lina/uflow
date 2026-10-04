---
ID: 111
Origin: 111
UUID: c4a8e7f2
Status: Active
---

# Open Actions 111: Deferred Post-Deploy Validations

## Summary

Plan 111 (Canonical Section Routes & City-Selection Bugfixes) is committed for release v0.11.3.
Manual browser validation (12 scenarios) was deferred from QA phase due to environment constraints.
All automated gates pass (vitest 1152/1170, lint 0 errors, type-check 0 errors, build OK).

**Risk Level**: LOW — automation gates comprehensive; UX validation is supplementary.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Manual browser validation — 12 scenarios (city-selection redirect desktop/mobile, locale-prefixed city-selection, canonical `/food`/`/stores`/`/ummah`, locale `/de/food`, cross-section nav, search submit, legacy `/providers`, browser back-button, mobile canonical routes) | Post-release verification team | Within 24h of production deployment | All 12 checklist items checked PASS in QA report | Open |
| DF-3: `npm run build` verification | CI/CD pipeline (GitHub Actions) | On merge to main / PR merge | GitHub Actions build job exits 0 on PR | Open |

## Scenario Reference

Full 12-scenario checklist is documented in:  
`agent-output/qa/closed/111-canonical-routes-city-selection-qa.md` → **Manual Browser Validation** section

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-29T10:30Z | devops | Created tracker from deferred validations in QA and UAT reports |
