---
ID: 083
Origin: 083
UUID: f7a2d8c3
Status: Active
---

# 083 — Community Services Edit UI — Implementation

## Plan Reference
Plan: `agent-output/planning/083-community-edit-ui-plan.md`

## Date
2026-04-06

## Changelog

| Date | Agent | Handoff From | Summary |
|------|-------|-------------|---------|
| 2026-04-06T15:00Z | Implementer | Critic (APPROVED) | Initial implementation — all 5 milestones complete |

---

## Implementation Summary

Implemented the community services admin edit UI (Plan 083) using the adapter pattern: `ProviderEditForm` is reused via wrapper page + converted data, with three new admin API endpoints, a service layer, new Zod schemas, four CS edit sub-pages, and a navigation entry point.

**Value delivered**: Admins and moderators can now edit community services using the exact same rich form as providers — same 4-section accordion layout (Basics, Standort, Kontakt, Media), same Approve/Reject footer, same sub-page navigation for category/offers/needs/images. 

Key architectural decisions respected:
- Adapter pattern (D2): `ProviderEditForm` reused without generalization
- Image format conversion (D3): CS `TEXT[]` ↔ JSON string at adapter boundary, no schema migration
- `hideSocialInitiatives` prop (D9): backward-compatible single conditional on form; all existing provider edit flows unaffected
- Sub-page isolation (M3): new CS sub-pages query `community_services` table + use `admin_cs_edit_*` localStorage prefix
- `logAdminAction` uses `'provider'` target type (CS are provider-like entities; extending the audit type union would require a DB migration)

---

## Baseline & Measurements
N/A — no performance targets specified in this plan.

---

## Milestones Completed

- [x] M1 — Admin API Layer (GET, PATCH edit, PATCH review + service layer + Zod schemas)
- [x] M2 — Admin Community Service Edit Page (adapter + `hideSocialInitiatives` prop)
- [x] M3 — Edit Sub-Pages (category, offers, needs, images)
- [x] M4 — Navigation Entry Point (AdminCommunityServiceDetailButtons + CommunityServiceDetailModal customActionButtons prop)
- [x] M5 — Version and Release Artifacts (v0.10.12 preliminary, CHANGELOG entry)

---

## Files Modified

| Path | Changes | Lines |
|------|---------|-------|
| `src/lib/validations/adminSchemas.ts` | Added `communityServiceEditUpdateSchema` and `communityServiceReviewUpdateSchema` | +55 |
| `src/components/providers/ProviderEditForm.tsx` | Added `hideSocialInitiatives?: boolean` prop; conditional render of Soziale Initiativen button (D9) | +8 |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | Added `customActionButtons?: React.ReactNode` prop; renders near close button in desktop modal | +7 |
| `src/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient.tsx` | Added `useIsAdmin` + `AdminCommunityServiceDetailButtons` imports; passes admin edit button to both modal and page | +15 |
| `package.json` | Version bump: `0.10.8` → `0.10.12` (preliminary) | +1 |
| `package-lock.json` | Lockfile alignment after version bump | auto |
| `CHANGELOG.md` | Added v0.10.12 entry documenting all Plan 083 additions | +20 |

---

## Files Created

| Path | Purpose |
|------|---------|
| `src/services/admin/communityServiceEdit.ts` | Service layer: `getCommunityServiceForAdmin`, `updateCommunityServiceFields`, `updateCommunityServiceReview` |
| `src/app/api/admin/community-services/[id]/route.ts` | GET endpoint — fetch CS for admin edit |
| `src/app/api/admin/edit-community-service/route.ts` | PATCH endpoint — update CS fields (auth, rate-limit, Zod, audit) |
| `src/app/api/admin/review-community-service/route.ts` | PATCH endpoint — set CS review status (auth, rate-limit, Zod, audit) |
| `src/app/(dashboard)/dashboard/community-services/[id]/edit/page.tsx` | Admin CS edit page (adapter: CS → Provider shape, image conversion, review buttons) |
| `src/app/(dashboard)/dashboard/community-services/[id]/edit/category/page.tsx` | Category sub-page (queries `community_services`, `admin_cs_edit_category_${id}` key) |
| `src/app/(dashboard)/dashboard/community-services/[id]/edit/offers/page.tsx` | Offers sub-page (queries `community_services`, `admin_cs_edit_offers_${id}` key) |
| `src/app/(dashboard)/dashboard/community-services/[id]/edit/needs/page.tsx` | Needs sub-page (queries `community_services`, `admin_cs_edit_needs_${id}` key) |
| `src/app/(dashboard)/dashboard/community-services/[id]/edit/images/page.tsx` | Images sub-page (reads `community_service_images` as TEXT[] directly — no JSON.parse) |
| `src/features/admin/components/AdminCommunityServiceDetailButtons.tsx` | "Service bearbeiten" button component (mobile footer + desktop inline) |
| `src/__tests__/services/community-service-edit.test.ts` | Unit tests: `getCommunityServiceForAdmin`, `updateCommunityServiceFields`, `updateCommunityServiceReview` |
| `src/__tests__/services/community-service-schemas.test.ts` | Unit tests: `communityServiceEditUpdateSchema`, `communityServiceReviewUpdateSchema` |
| `src/__tests__/api/admin/community-services-get.test.ts` | Route tests: `GET /api/admin/community-services/[id]` |
| `src/__tests__/api/admin/edit-community-service.test.ts` | Route tests: `PATCH /api/admin/edit-community-service` |
| `src/__tests__/components/ProviderEditFormHideSocialInitiatives.test.tsx` | Component tests: `hideSocialInitiatives` prop behavior |

---

## Code Quality Validation

- [x] `npm run type-check` exits 0 (0 errors)
- [x] `npm run lint` exits 0 (0 errors, 18 pre-existing warnings in unmodified files)
- [x] `node_modules/.bin/vitest run` — 819 tests passed, 0 failed
- [x] Lockfile aligned: `package-lock.json` shows `"version": "0.10.12"` matching `package.json`

---

## Value Statement Validation

**Original**: "As an admin/moderator, I want to edit community services using the same rich, sectioned form used for providers, so that I can manage community service content with the same quality and consistency as provider content, without falling back to Supabase Studio."

**Implementation delivers**:
- ✅ Same 4-section accordion form (Basics/Standort/Kontakt/Media) via ProviderEditForm adapter
- ✅ Same Approve/Reject footer footer buttons wired to CS review API
- ✅ Admin navigation: "Service bearbeiten" button on CS detail (mobile footer, desktop modal header)
- ✅ All fields editable: title, description, category, address, contact, website, images, offers, needs
- ✅ Writing via service-role bypasses RLS (confirmed migration 034 admin UPDATE policy)
- ✅ Image round-trip integrity: `TEXT[]` → JSON string → form → JSON string → `TEXT[]`

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `getCommunityServiceForAdmin` | `community-service-edit.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/services/admin/communityServiceEdit"` | ✅ Yes |
| `updateCommunityServiceFields` | `community-service-edit.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/services/admin/communityServiceEdit"` | ✅ Yes |
| `updateCommunityServiceReview` | `community-service-edit.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "@/services/admin/communityServiceEdit"` | ✅ Yes |
| `communityServiceEditUpdateSchema` | `community-service-schemas.test.ts` | ✅ Yes | ✅ Yes | `TypeError: Cannot read properties of undefined (reading 'parse')` | ✅ Yes |
| `communityServiceReviewUpdateSchema` | `community-service-schemas.test.ts` | ✅ Yes | ✅ Yes | `TypeError: Cannot read properties of undefined (reading 'parse')` | ✅ Yes |
| `GET /api/admin/community-services/[id]` | `community-services-get.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "…/community-services/[id]/route"` | ✅ Yes |
| `PATCH /api/admin/edit-community-service` | `edit-community-service.test.ts` | ✅ Yes | ✅ Yes | `Failed to resolve import "…/edit-community-service/route"` | ✅ Yes |
| `hideSocialInitiatives` prop (ProviderEditForm) | `ProviderEditFormHideSocialInitiatives.test.tsx` | ✅ Yes | ✅ Yes | `AssertionError: expected document not to contain element, found <span>Soziale Initiativen</span>` | ✅ Yes |

---

## Test Coverage

**Unit tests**:
- `community-service-edit.test.ts`: 12 tests — service functions (table targeting, image array format, conflict detection, error paths)
- `community-service-schemas.test.ts`: 12 tests — Zod schema validation (UUID, email, URL, array format, rejection feedback requirement)

**Route tests**:
- `community-services-get.test.ts`: 5 tests — auth 401/403, UUID validation 400, 404, 200 happy path
- `edit-community-service.test.ts`: 5 tests — auth 401/403, validation 400, 200 success, 409 conflict

**Component tests**:
- `ProviderEditFormHideSocialInitiatives.test.tsx`: 3 tests — pre-fix FAILS / post-fix PASSES / default shows button

---

## Test Execution Results

```
node_modules/.bin/vitest run

Test Files  81 passed | 1 skipped (82)
Tests  819 passed | 18 skipped (837)
Duration  ~12s
```

All 37 new tests pass. No pre-existing tests broken.

---

## Local Verification Gate

`Local verification: ⚠️ Blocked` — Missing `.env.local` (Supabase credentials not available in worktree). This is expected for worktree sessions.

Manual browser verification is QA/UAT responsibility. Validation steps per plan:
1. Navigate to CS detail as admin → "Service bearbeiten" button visible
2. Click edit → form renders with all 4 sections
3. Edit fields, navigate to sub-pages → state persists in `admin_cs_edit_*` keys
4. Approve/Reject → review_status updated
5. Image round-trip intact
6. Non-admin cannot see edit button or access route (403)
7. Provider edit flow unchanged (regression)

---

## Version Bump

Version bumped to **0.10.12** (preliminary — final version confirmed at DevOps Stage 1).
`package.json` and `package-lock.json` both show `"version": "0.10.12"`.

---

## Outstanding Items

| Item | Type | Notes |
|------|------|-------|
| `logAdminAction` uses `'provider'` target type for CS audits | Known limitation | Changing to `'community_service'` requires DB migration (enum constraint in `admin_audit_logs`). Action string `community_service_edit` / `community_service_review_approved` etc. remain fully distinguishable in audit queries. Track as OA for future DB migration. |
| `admin_cs_edit_*` localStorage keys not cleared on save/approve/reject | Known limitation | Matches existing provider edit behavior. Tracked as 060-OA-1. Not in scope for this plan. |
| Desktop modal admin button placement | Minor | Button appears at `right-24 top-10` — exact pixel alignment may need UAT verification. Mobile footer button is primary admin UX. |
| `PATCH /api/admin/review-community-service` route test | Partial | Route test for review endpoint omitted (review endpoint follows identical pattern to `edit-community-service` which is tested). Can be added in QA remediation if required. |

---

## Next Steps

1. **Code Review** → review verdict must be APPROVED or APPROVED_WITH_COMMENTS
2. **QA** → verify visual parity with provider edit, data integrity (especially image round-trip), sub-page pre-population, admin auth enforcement, provider edit regression
3. **UAT** → visual parity sign-off
4. **DevOps** → merge, confirm version, deploy
