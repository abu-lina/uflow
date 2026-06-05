# UAT Report — Plan 145: Provider Edit Page Rebuild

**Date**: 2026-06-05
**Role**: UAT — Value Delivery Verification

---

## 1. Value Statement

Provider edit page is now the single place to manage all provider data including Menu, Halal Check, Delivery Links, Opening Hours, Values & Amenities, and Enrichment Review.

---

## 2. Requirement Coverage

| Requirement | Implementation | Test Coverage | Status |
|---|---|---|---|
| Remove deprecated offers/needs | Sub-pages `offers/` and `needs/` deleted; `offersIds`/`needsIds` removed from `providerEditUpdateSchema`, `communityServiceEditUpdateSchema`, `ProviderEditForm.tsx` | 18 CS schema tests verify removal; regression tests confirm no breakage | ✅ |
| Menu section (food providers) | `menu/page.tsx` — inline editing, sort order, availability toggle, category grouping | `menu.test.ts` (5 tests), `providerEdit.test.ts` payload builders | ✅ |
| Halal Check (3-tier Bronze/Silver/Gold) | `halal/page.tsx` — visual tier selector mapping to `verification_method` + `has_certificate` | `providerEdit.test.ts` halal payload tests | ✅ |
| Certificate upload | `POST /api/admin/upload-certificate` route; `provider-certificates` storage bucket; `certificate_url` column in migration | `upload-certificate.test.ts` (8 tests — auth, MIME, size, path) | ✅ |
| Delivery Links (Wolt/Lieferando/UberEats) | `delivery/page.tsx` — platform selector, URL, slug, active toggle | `delivery-links.test.ts` (5 tests), `providerEdit.test.ts` payload builders | ✅ |
| Opening Hours (7-day editor) | `hours/page.tsx` — day toggle, open/close time inputs, copy-from-previous-day | `adminSchemas.test.ts` openingHours validation (11 tests) | ✅ |
| Values & Amenities | `values/page.tsx` — toggle switches grouped by category; writes to `providers.*` and extension table booleans | `providerEdit.test.ts` amenities/builders (18 tests) | ✅ |
| Enrichment Review (standalone + per-provider) | `dashboard/enrichment/page.tsx` (standalone) + `.../edit/enrichment/page.tsx` (per-provider); both use `EnrichmentReviewPanel` with `providerId` prop | Existing enrichment tests pass | ✅ |

### Architecture & Code Review Findings

| Finding | Severity | Resolution | Status |
|---|---|---|---|
| HIGH-1: Multi-table writes → RPC transaction | HIGH | `admin_update_provider` RPC wraps all writes atomically | ✅ RESOLVED |
| HIGH-2: Storage bucket RLS → service-role | HIGH | Upload API uses `getSupabaseAdmin()`; bucket has no public RLS policies | ✅ RESOLVED |
| HIGH-3: Extension table joins → mandatory | HIGH | `getProviderForAdmin()` left-joins `food_providers`/`store_providers` | ✅ RESOLVED |
| MEDIUM-4: Type casting → proper return type | MEDIUM | `AdminProviderWithExtensions` type eliminates `(as any)` casts | ✅ RESOLVED |
| MEDIUM-5: Client-side Supabase → admin API | MEDIUM | `GET /api/admin/providers/:id/menu` and `.../delivery-links` endpoints created | ✅ RESOLVED |
| MEDIUM-6: God function → focused sub-functions | MEDIUM | `buildBasicFieldsPayload`, `buildExtensionFieldsPayload`, `buildAmenitiesPayload`, etc. | ✅ RESOLVED |
| HIGH-1: Community service silent drop | HIGH | `buildCommunityServicePayload` added to RPC | ✅ RESOLVED |
| HIGH-2: Halal/Hours/Values empty state | HIGH | All 3 pages fetch from `/api/admin/providers/${id}` on mount | ✅ RESOLVED |

---

## 3. Test Evidence Summary

| Gate | Result | Details |
|------|--------|---------|
| `vitest` (all) | **PASS** | 1461 passed, 18 skipped (pre-existing E2E), **0 failures**, 26.33s |
| `tsc --noEmit` | **PASS** | Zero errors |
| `npm run lint` | **PASS_WITH_CAVEATS** | 6 `react/jsx-sort-props` errors in Plan 145 files (stylistic, non-functional); 109 pre-existing warnings |
| Plan 145-specific tests | **PASS** | 7 test files, ~1200 lines covering schema validation, RPC payloads, API endpoints, regression |
| Regression | **PASS** | Community services, images, categories, provider search, bookmarks, PWA — all existing tests pass |

### Caveats (non-blocking)

1. 6 lint errors (`react/jsx-sort-props` in 3 sub-page files) — stylistic only
2. No dedicated sub-page component unit tests (6 new pages tested via integration only)
3. RPC transaction tests are mocked — no real SQL integration test for rollback behavior
4. `openingHours` Zod validation uses `z.any()` — deferred
5. `_adminUserId` unused parameter — deferred cleanup

---

## 4. UAT Verdict

**APPROVED_FOR_RELEASE**

All 8 user-facing requirements are delivered. All HIGH-severity architecture and code review findings are resolved. Zero test failures. Type-check passes. No regression in existing functionality. Caveats are stylistic or documented deferrals — none block release.

---

## 5. What can the user do now that they couldn't before?

- **Manage food menu items** — Add, edit, reorder, and toggle availability of dishes with names, descriptions, prices, and categories, directly from the provider edit page
- **Set halal verification tier** — Choose Bronze (online), Silver (onsite), or Gold (certified) with a visual 3-tier selector, replacing the invisible backend-only fields
- **Upload halal certificates** — Upload PDF or image certificate files (max 5MB) and attach them to a provider's Gold halal tier, stored securely in Supabase Storage
- **Manage delivery platform links** — Add, edit, and toggle Wolt, Lieferando, and Uber Eats links per provider, with platform icon and slug support
- **Set opening hours** — Configure 7-day opening hours with open/close times, closed-all-day toggles, and a copy-from-previous-day convenience button
- **Configure values & amenities** — Toggle muslim_owned, prayer space, family-friendly, women-friendly, children-friendly, donations, parking, economic solidarity, and food/store-specific booleans (no_alcohol, no_pork, no_gambling)
- **Review enrichment candidates per provider** — See and approve/reject data and image enrichment suggestions filtered to a single provider, without leaving the edit flow
- **Access a standalone enrichment dashboard** — Review all pending enrichment candidates across all providers from a single `/dashboard/enrichment` page
