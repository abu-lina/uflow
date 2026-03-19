---
ID: 046
Origin: 046
UUID: 3a7f1c2e
Status: Active
---

# Open Actions 046: Deferred Post-Deploy Follow-ups

## Summary

- Deferred because no browser-backed environment or `.env.local` was available in the agent workspace; browser/PWA validation requires a live deployed instance
- Release context: v0.8.6 standalone patch — Iconify icon rendering fix on `/providers/[id]` under active PWA service worker
- Note: original target was v0.8.4; bumped to v0.8.5 then v0.8.6 (v0.8.4 taken by Plan 045, v0.8.5 claimed by flatted security fix on origin/main)

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Browser-backed icon rendering on `/providers/[id]` with SW active (⚠️ **MUST close before production**) | DevOps / QA | First UAT deploy of v0.8.4 (same cycle) | DevTools → Application → Service Workers shows SW active; all 4 icons (`lucide:share-2`, `mdi:instagram`, `mdi:internet`, `entypo:old-phone`) render; browser console clear of `Error Response to FetchEvent.respondWith()` for Iconify CDN origins; rollback trigger: re-open investigate if icons still fail with SW active | Open |
| DF-2: Provider image CacheFirst regression check | DevOps / QA | First UAT deploy of v0.8.4 (same cycle) | Provider avatars/banners visible on detail pages; no 4xx errors for Supabase Storage CDN in network tab | Open |
| DF-3: Push notification handler smoke test | QA | Within 1 sprint of v0.8.4 UAT deploy | Push subscription completes; test notification received in browser; console confirms `sw-push-handler.js` executed | Open |
| DF-4: Full production build with valid env vars (CI) | DevOps | CI run triggered by merge or release tag for v0.8.4 | CI build exits 0; `public/sw.js` present in build output; no page-data collection errors for `/api/admin/badges/verify` or other API routes | Open |
| DF-5: Roadmap version bookkeeping (Current Version v0.8.2 → v0.8.4) | DevOps / Planner | Release preparation for v0.8.4 | `agent-output/roadmap/product-roadmap.md` `Current Version` updated to `v0.8.4`; `Current Working Release` reflects current development state | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-19T11:35Z | devops | Created tracker from 5 deferred UAT validations (DF-1 through DF-5 from `agent-output/uat/closed/046-iconify-pwa-fix-uat.md`) |
