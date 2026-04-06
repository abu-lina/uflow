---
ID: 083
Origin: 082
UUID: d7f2a41c
Status: Active
---

# Open Actions 083 — Admin Community Service Edit Page

## Deferred Items

| ID | Decision | Description | Owner | Risk Acceptance | Trigger |
|----|----------|-------------|-------|-----------------|---------|
| OA-1 | D-IMPL-4 | **M8 Sub-page routes deferred**: The approved plan includes 5 sub-pages under `/dashboard/community-services/[id]/edit/{category,offers,needs,images,social}/page.tsx`. These mirror provider admin edit sub-pages and each require ~1 day of implementation scope. Core admin edit/review workflow (M1-M7) is independently deliverable and provides the primary value stated in the plan. Sub-pages extend functionality but are not required for approve/reject/edit operations. **Risk**: Admin users cannot navigate into sub-page edit flows for category, offers, needs, images, or social links from the CS edit page. These fields can still be edited via the main edit form (category, social fields present in form). **Risk accepted by**: User/Planner for this release. | User/Planner | Accepted: M1–M7 core workflow delivers primary value; M8 sub-pages are extension scope deferred to a follow-on plan. Approver: User (acknowledged in code review fix pass 2026-04-06). | When admin sub-page editing for CS is prioritized in a follow-on plan. |

## Manual UAT Workflows (from Plan 083)

| ID | Workflow | Status |
|----|----------|--------|
| MW-1 | Admin navigates to `/dashboard/community-services/[id]/edit` → sees CS edit form with all editable fields populated | Pending QA/UAT |
| MW-2 | Admin edits CS fields (name, description, address, contact, social) and saves → changes persist, success toast shown | Pending QA/UAT |
| MW-3 | Admin clicks Genehmigen (Approve) → review_status updated to `approved`, stale feedback cleared | Pending QA/UAT |
| MW-4 | Admin clicks Überarbeitung (Needs Revision) → review_status updated to `needs_revision`, feedback cleared | Pending QA/UAT |
| MW-5 | Admin clicks Ablehnen (Reject) → modal opens requiring feedback → on submit, review_status updated to `rejected` with feedback | Pending QA/UAT |
| MW-6 | Non-admin navigates to edit page → 403 from API; page shows error | Pending QA/UAT |
