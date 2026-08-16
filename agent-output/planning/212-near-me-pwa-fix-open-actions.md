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
| **DF-3: On-device iPhone SE PWA validation** — Tap Near Me on Safari standalone PWA, verify map pans to device location within 10s, chip shows prompting pulse then green, denied state on permission revoke, no centroid snap-back on deactivate | UAT operator (human, device access required) | Before first real-world user promotion to PROD; due 2026-08-17 EOD | Video/screenshot: (A) happy path — map pans within 10s + chip sequence; (B) denied — chip reverts with inline message + iOS/Android recovery hint text (Plan 209 v0.15.15); (C) deactivate — map stays at local position, no centroid snap-back | Partial — Plan 209 (v0.15.15) delivers denied-state recovery hint; happy-path map pan + deactivate snap-back validation still open |
| **DF-1: CI build verification** — Confirm `npm run build` exits 0 in GitHub Actions build job (blocked locally by missing Supabase env vars in worktree) | DevOps / CI pipeline | PR merge (CI validates automatically) | GitHub Actions build job link showing exit 0 | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-08-16T14:40Z | devops | Created tracker from DF-3 deferred validation and DF-1 build gate |
| 2026-08-16T18:00Z | devops | DF-3 partially addressed: Plan 209 (v0.15.15) adds denied-state recovery guidance (iOS/Android/fallback). Happy-path map pan + deactivate still require on-device validation. |
