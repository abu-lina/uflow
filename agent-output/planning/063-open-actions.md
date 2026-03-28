---
ID: 063
Origin: 063
UUID: a7e4f3b2
Status: Active
---

# Open Actions 063: Deferred Post-Deploy Follow-ups

## Summary

Plan 063 was approved for release based on automated evidence (701 tests, TDD compliance). Real-device iOS tap confirmation requires the branch to be merged to `main` first (UAT deploys from `main`). These actions must be completed within the DevOps release window.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Fresh-user iOS Safari tap at `/` → `/login` | DevOps | Within 1h of merge+deploy to UAT | Screen recording: cleared-storage session at `/` showing CityEarlyAccessNavbar + Profile tap → `/login` | Open |
| DF-2: Returning logged-out iOS Safari tap confirmation | DevOps | Same window as DF-1 | Tap on Profile with localStorage retained after logout → `/login` navigation confirmed | Open |
| DF-3: 320px layout spot-check | DevOps | Same window; LOW priority | Screenshot or DevTools at 320px showing bottom navbar intact | Open |
| DF-4: `hasCompletedOnboarding()` / `skipWaitlist` latent debt | Product / Future Planner | Before next onboarding flow change | New plan created and fixed | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-26 | devops | Created tracker from UAT deferred validations |
