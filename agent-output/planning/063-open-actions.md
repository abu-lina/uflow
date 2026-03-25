---
ID: 063
Origin: 063
UUID: b7e3a1d9
Status: Active
---

# Open Actions 063: Deferred Post-Deploy Follow-ups

## Summary

- UAT approved Plan 063 for release, but physical iOS rendering evidence could not be captured in this environment because `env(safe-area-inset-top)` behavior cannot be trusted in jsdom.
- DevOps Stage 2 also requires a valid environment configuration so the production build can complete without the pre-existing `NEXT_PUBLIC_SUPABASE_URL` failure.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| Manual notch / Dynamic Island validation on provider detail page | DevOps / QA operator | Before or within 24 hours of production release tag | Screenshot showing hero + back button below status area on a notch/Dynamic Island iPhone (for example iPhone 15 Pro) | Open |
| Manual non-notch regression validation on provider detail page | DevOps / QA operator | Before or within 24 hours of production release tag | Screenshot showing top spacing unchanged on a non-notch iPhone viewport (for example iPhone SE) | Open |
| Loading skeleton safe-area flash check | DevOps / QA operator | Same validation session as device checks | Screenshot or operator note confirming the loading skeleton does not flash under the status area | Open |
| Production build environment readiness (`NEXT_PUBLIC_SUPABASE_URL`) | DevOps / Operator | Before Stage 2 release execution | `npm run build` exits 0 in the release environment with valid env vars present | Open |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-03-25T21:46Z | DevOps | Created tracker from UAT deferred iOS validation and pre-existing build-environment dependency |
