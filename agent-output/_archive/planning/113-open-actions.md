---
ID: 113
Origin: 113
UUID: 7e2f4a91
Status: Active
---

# Open Actions 113: Deferred Post-Deploy Follow-ups

## Summary

Plan 113 delivered 9 provider detail features including open status, 6 accordion sections, Halal trust messaging, and scroll/gesture fixes. The following items were accepted as deferred during UAT and DevOps Stage 1. These items are non-blocking for production release but must be tracked and closed.

Release: v0.11.0 (2026-04-29)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|-------------|-------------------|--------|
| DF-1: Performance baseline (LCP, bundle delta) | DevOps/Analytics | 1–7 days post-deploy | Lighthouse LCP delta <10%, bundle delta <15 kB gzipped | Open |
| DF-2: Nearby providers V2 — distance-based ranking (PostGIS/Haversine) | Planner/Implementer | After v0.11.0 stabilises in prod (2–4 weeks) | Follow-up plan created and approved | Open |
| DF-3: Halal info page at `/halal` route | Product/Content | Before or alongside next release | Content page accessible at `/halal`; link in banner/popup resolves successfully | Open |
| DF-4: `vite` HIGH vulnerability remediation | Implementer | Next planned sprint | `npm audit --audit-level=high` reports 0 HIGH vulns for vite package | Open |
| DF-5: Build gate verification (CI) | DevOps/CI | On PR merge to main | CI build job for PR #187 exits 0 (has SUPABASE_URL configured) | Open |

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-04-29T10:00Z | DevOps | Created tracker from deferred validations recorded in UAT and Stage 1 deployment doc |
