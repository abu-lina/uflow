---
ID: 082
Origin: 081
UUID: b4e91f3a
Status: Active
---

# Open Actions 082 — Community Service Detail Page Parity

## Deferred Items

| ID | Decision | Description | Owner | Trigger |
|----|----------|-------------|-------|---------|
| DF-1 | D8 | Investigate RLS edge case: recommendation-mode community services with `user_created_id = NULL` are invisible to non-admin users even when the owner navigates to the detail page. If not `review_status = 'approved'` and `user_created_id = NULL`, no auth context resolves the RLS condition in migration 046. Requires DB-level investigation to determine if this affects any real services in UAT/production. | User | After Plan 082 UAT confirms parity; or if UAT re-surfaces "Service nicht gefunden" specifically for recommendation-mode services (`user_created_id = NULL`). |
| OA-1 | D7/CR fix | ~~Admin community service edit route `/dashboard/community-services/[id]/edit` does not exist yet.~~ **RESOLVED**: Route implemented by Plan 083 (`feat(083)` commit `6bf86d8c`). `AdminCommunityServiceDetailButtons` now routes to a live edit page. | ~~User/Planner~~ Resolved | When Plan 083 ships to production. |

## Manual UAT Workflows (from Plan 082)

| ID | Workflow | Status |
|----|----------|--------|
| MW-1 | Owner opens their own non-approved community service from Profile → page renders with correct content and design | Pending UAT |
| MW-2 | Anonymous user opens approved community service → same design quality as provider detail (desktop + mobile) | Pending UAT |
| MW-3 | Admin user opens any community service → admin action button visible; clicking routes to `/dashboard/community-services/[id]/edit` (✅ route built by Plan 083) | Pending UAT |
| MW-4 | Bookmark a community service on the detail page → persists correctly as `community_service` type (not `provider`) | Pending UAT |
