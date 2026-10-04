---
ID: 264
Origin: 264
UUID: 90270baf
Status: Active
---

# Open Actions 264: Deferred Session-Auth Follow-ups

## Summary

- Plan 264 fixes only `POST /api/providers`. The routes below carry the same latent defect: they authenticate with `createSupabaseServerClient().auth.getUser()`, which cannot see this app's `sb-access-token` session. Analysis F6, W1, and W2 in [264-admin-recommend-401-analysis.md](../analysis/closed/264-admin-recommend-401-analysis.md) cover the details.
- Deferred per Plan 264 decision D3.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| **OA-1: F6 variant routes**: `/api/instagram/scrape`, `/api/badges/[badgeId]/confirm`, `/api/badges/[badgeId]/revoke`, `/api/badges/entity`, `/api/admin/badges/verify`, `/api/admin/badges/unverify`, `/api/push/subscribe` (POST + DELETE), `/api/push/send`, `/api/city-interest/subscribe`, `/api/outreach/claim` | Planner (control window; allocates plan ID) | **Whichever comes first**: (a) Plan 264 reaches UAT-approved, or (b) any user report of a 401 from a listed route | Follow-up plan ID linked here. Each route either migrated to the working session helper with a cookie-contract regression test, or confirmed unreachable/intentionally anonymous | Open |
| **OA-2: Dual session model (W1/W2)**: the browser uses a `localStorage` session plus custom cookie sync, while `@supabase/ssr` is configured with no-op cookie writes. Also covers the refresh-token write-back and rotation risk in `getUserFromCookie()` (Plan 264 Risks, Critique L3) | Architect | Before OA-1 planning starts: the architecture decision determines OA-1's approach | ADR or architecture findings doc in `agent-output/architecture/` choosing a single server-auth path | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-09-26T16:55Z | Planner | Created from Plan 264 D3 in response to Critique 264 M1 |
