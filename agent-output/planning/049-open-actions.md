---
ID: 49
Origin: 49
UUID: 7dfe4b10
Status: Active
---

# Open Actions 049: Deferred Post-Deploy Follow-ups

## Summary

Two items from Plan 049 UAT were deferred as non-blocking but require post-deploy follow-up:

1. Interactive browser validation — code contract verified by QA automated tests, but interactive UX not tested pre-release
2. `check-email-exists` local rate limit Map — pre-existing tech debt identified during code review (INFO finding I1); not introduced by Plan 049

Release/version context: Plan 049, target v0.8.16.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to Close | Status |
|---|---|---|---|---|
| Browser validation: confirmed-user login via `/login`; unconfirmed-user login; confirmed-user forgot-password via `/forgot-password`; resend confirmation via login modal / saved page | QA Lead | Within 24h of production deploy of v0.8.16 | Manual test notes or recording confirming expected UX flows and messaging | Open |
| `check-email-exists` local rate limit Map → migrate to shared `checkRateLimit()` from `@/lib/rate-limit` | Implementer | Next sprint (non-blocking) | PR updating `src/app/api/check-email-exists/route.ts` to use shared utility; tests passing | Open |
| Add `ADMIN_DEBUG_KEY` (and optionally `UAT_ADMIN_DEBUG_KEY`) to GitHub repository secrets | Ops | Before first deploy of v0.8.16 | Confirmed in GitHub repo Settings → Secrets | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-23T00:00Z | devops | Created tracker from UAT deferred validations and Code Review INFO finding I1 |
