---
ID: 212
Origin: 212
UUID: 4c9e1a7d
Status: Active
---

# Open Actions 212: Deferred Post-Deploy Follow-ups

## Summary

- Plan 212 was released to production without on-device iPhone SE PWA validation (DF-3) because the timing measurement gate requires physical device access not available in the terminal-only development environment.
- Release context: v0.15.14 patch, 2026-08-16

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| **DF-3: On-device iPhone SE PWA validation** — ✅ **CLOSED** | UAT operator (user, device access) | CLOSED 2026-08-16 | User validated on-device (iPhone SE PWA, Plan 215 v0.15.16 M6 scenarios A–F): hang→guidance terminal state < 15 s with iOS Settings hint; happy-path map pan zoom 14; denied immediate state; deactivate no centroid snap-back; Q3/Q4/Q5 answered; `geolocation_outcome` log verified. Shipped in v0.15.16 (PR #324 squash 3b8c8a72, tag v0.15.16, PROD deploy run 31975012863) | ✅ CLOSED |
| **DF-1: CI build verification** — Confirm `npm run build` exits 0 in GitHub Actions build job (blocked locally by missing Supabase env vars in worktree) | DevOps / CI pipeline | PR merge (CI validates automatically) | GitHub Actions build job link showing exit 0 | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-08-16T14:40Z | devops | Created tracker from DF-3 deferred validation and DF-1 build gate |
| 2026-08-16T18:00Z | devops | DF-3 partially addressed: Plan 209 (v0.15.15) adds denied-state recovery guidance (iOS/Android/fallback). Happy-path map pan + deactivate still require on-device validation. |
| 2026-08-16T22:04Z | devops | **DF-3 CLOSED** — user validated Plan 215 v0.15.16 on-device (iPhone SE PWA, M6 scenarios A–F); release shipped (PR #324 squash 3b8c8a72, tag v0.15.16, PROD deploy run 31975012863) |
| 2026-08-16T23:50Z | devops | Plan 215 (v0.15.16) delivers the DF-3 fix: 12 s client-side geolocation hang watchdog in `useGeolocation` — standalone hang → `denied` (surfaces Plan 209 iOS hint), non-standalone hang → `timeout`; outcome logging `{ status, errorCode?, standalone, elapsedMs }`. On-device validation tracked via Plan 215 M6 (scenarios A–F), owner = UAT operator (user iPhone SE), due 2026-08-17 EOD. DF-3 closure after evidence recorded (DevOps/QA). |
