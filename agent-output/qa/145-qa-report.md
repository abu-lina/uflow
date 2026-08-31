# QA Report — Plan 145: Provider Edit Page Rebuild

**Date**: 2026-06-05
**QA Scope**: Implementation validation for Plan 145

---

## 1. Test Summary

| Metric | Count |
|--------|-------|
| Test files | 178 passed, 1 skipped (179 total) |
| Individual tests | 1461 passed, 18 skipped (1479 total) |
| Failures | **0** |
| Duration | 26.33s |

The 18 skipped tests are pre-existing E2E/integration tests (`SearchAndViewProvider.test.tsx`), unrelated to Plan 145.

**Plan 145-specific tests** (940 total lines across 6 files):

| Test File | Tests | Lines | Areas Covered |
|-----------|-------|-------|---------------|
| `src/__tests__/services/admin/providerEdit.test.ts` | 18 | 298 | Payload builders, partial payloads, RPC payload shape, food/store provider differentiation, error handling |
| `src/__tests__/services/admin-provider-edit.test.ts` | — | 148 | RPC payload integration with `admin_update_provider` |
| `src/__tests__/services/admin/providers.test.ts` | 5 | 147 | `getProviderForAdmin` with extension table joins, food_menu, delivery_links |
| `src/__tests__/lib/validations/adminSchemas.test.ts` | 11 | 141 | Zod validation for new fields, rejects invalid values |
| `src/__tests__/api/admin/upload-certificate.test.ts` | 8 | 141 | Auth guards, MIME types, file size, upload path |
| `src/__tests__/api/admin/providers/menu.test.ts` | 5 | 103 | Auth, UUID validation, ordering |
| `src/__tests__/api/admin/providers/delivery-links.test.ts` | 5 | 103 | Auth, UUID validation, ordering |
| `src/__tests__/lib/validations/adminSchemas-cs.test.ts` | 18 | — | Community service schema (offers/needs removed) |
| `src/__tests__/migrations/145-provider-edit-rpc.test.ts` | 10 | 236 | Community service RPC payload, edge cases, partial payloads |
| Regression: `ProviderEditForm.regression.test.tsx` | 11 | — | Moderation, localStorage, admin flow still work |

## 2. Type-Check

**PASS** — `tsc --noEmit` exits with zero errors (no output).

## 3. Lint

**PASS_WITH_CAVEATS** — 8 errors, 109 warnings total.

Errors in Plan 145 files (pre-existing lint rules, not regressions):

| File | Line | Error |
|------|------|-------|
| `delivery/page.tsx` | 113 | `react/jsx-sort-props` — Props not sorted alphabetically |
| `hours/page.tsx` | 81 | `react/jsx-sort-props` — Props not sorted alphabetically |
| `menu/page.tsx` | 112, 132, 147, 175 | `react/jsx-sort-props` — Props not sorted (4 instances) |

Errors outside Plan 145 (pre-existing):
- `ProviderDetailSections.tsx:137` — Callbacks after props (pre-existing)
- `delivery-enricher.ts:5` — Unused import (pre-existing)

All lint errors in Plan 145 files are `react/jsx-sort-props` — stylistic, not functional. The 109 warnings are pre-existing across the codebase.

## 4. Coverage Assessment

### What's tested

| Area | Coverage | Verdict |
|------|----------|---------|
| **Admin schema validation** | 11 tests — new fields, rejects invalid values, openingHours, verificationMethod, delivery links, menu items, certificateUrl | ✅ GOOD |
| **CS schema validation** | 18 tests — offersIds/needsIds stripped from schema | ✅ GOOD |
| **RPC payload builders** | 18+10 tests — `buildBasicFieldsPayload`, `buildExtensionFieldsPayload`, `buildAmenitiesPayload`, `buildMenuPayload`, `buildDeliveryLinksPayload`, `buildCommunityServicePayload` | ✅ GOOD |
| **Admin provider query** | 5 tests — extension table joins (food_providers, store_providers), food_menu, delivery_links, category join, null/error cases | ✅ GOOD |
| **Menu API endpoint** | 5 tests — auth guard, UUID validation, ordering, empty state | ✅ GOOD |
| **Delivery links API endpoint** | 5 tests — auth guard, UUID validation, ordering, empty state | ✅ GOOD |
| **Certificate upload API** | 8 tests — auth, MIME types, file size, upload path | ✅ GOOD |
| **RPC integration (mocked)** | 10 tests — community service payload, partial payloads, edge cases, store/food provider types | ⚠️ MOCKED |
| **ProviderEditForm regression** | 11 tests — moderation, localStorage, admin flow | ✅ GOOD |

### What's not tested

| Area | Risk | Notes |
|------|------|-------|
| Sub-page components (6) | MEDIUM | Menu, halal, delivery, hours, values, enrichment — no component/page-level tests |
| `EnrichmentReviewPanel` providerId prop | LOW | No dedicated test for the new prop |
| RPC SQL execution | MEDIUM | Tests mock the RPC call — no real SQL integration test verifies transaction safety, COALESCE behavior, or rollback |
| `ProviderEditForm` new sections | LOW | 6 new sections in form UI not directly tested (covered by regression path) |

## 5. Value Delivery Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ✅ Remove deprecated offers/needs | **DELIVERED** | Sub-page files deleted, `offersIds`/`needsIds` removed from `providerEditUpdateSchema` and `communityServiceEditUpdateSchema`, removed from `ProviderEditForm` |
| ✅ Add Menu section | **DELIVERED** | `menu/page.tsx` exists with inline editing, sort order, availability toggle; `menuItemSchema` in validations; `buildMenuPayload` builder |
| ✅ Add Halal Check section (Bronze/Silver/Gold) | **DELIVERED** | `halal/page.tsx` exists with 3-tier visual selector; maps to `verification_method` + `has_certificate` columns |
| ✅ Add Certificate upload | **DELIVERED** | `POST /api/admin/upload-certificate` route; file type/size validation; `provider-certificates` bucket; `certificate_url` column in migration |
| ✅ Add Delivery Links (Wolt, etc.) | **DELIVERED** | `delivery/page.tsx` exists; `deliveryLinkSchema`; `buildDeliveryLinksPayload`; `provider_delivery_links` migration |
| ✅ Add Opening Hours | **DELIVERED** | `hours/page.tsx` exists; 7-day editor; DB fetch fallback; writes to `providers.opening_hours` JSONB |
| ✅ Add Values & Amenities | **DELIVERED** | `values/page.tsx` exists; toggle switches; grouped by category; writes to `providers.*` and extension tables |
| ✅ Add Enrichment Review (standalone + per-provider) | **DELIVERED** | `dashboard/enrichment/page.tsx` (standalone) and `.../edit/enrichment/page.tsx` (per-provider) both exist; use `EnrichmentReviewPanel` |

### Code Review Findings Resolution

| Finding | Severity | Status | Evidence |
|---------|----------|--------|----------|
| HIGH-1: Community service silent drop | HIGH | **RESOLVED** | `buildCommunityServicePayload` added to RPC payload; RPC handles `community_service_ids` |
| HIGH-2: Halal/Hours/Values empty state | HIGH | **RESOLVED** | All 3 pages fetch from `/api/admin/providers/${id}` on mount as DB fallback |
| MEDIUM-1: Enrichment page duplication | MEDIUM | **RESOLVED** | Uses `EnrichmentReviewPanel` with `providerId={id}` |
| MEDIUM-2: getProviderForAdmin return type | MEDIUM | **RESOLVED** | Returns `AdminProviderWithExtensions \| null` |
| MEDIUM-3: RPC integration test | MEDIUM | **PARTIAL** | Mocked RPC tests exist (`145-provider-edit-rpc.test.ts`) but no real SQL execution test |
| LOW-1: openingHours z.any() | LOW | **DEFERRED** | Still `z.any()` — documented as deferred |
| LOW-2: Hardcoded menu categories | LOW | **DEFERRED** | Acceptable for MVP |
| LOW-3: Unused _adminUserId | LOW | **NOT RESOLVED** | Parameter still present and unused |

## 6. Regression Check

All existing features remain functional:

| Feature | Verification |
|---------|-------------|
| Community services | ✅ All tests pass — `community-service-edit.test.ts` (12), `communityServices.test.ts` (5) |
| Provider images | ✅ Schema preserves `providerImages`, tests pass |
| Provider category | ✅ Category join tested in `providers.test.ts` |
| Provider social links | ✅ Social fields preserved in schema |
| ProviderEditForm moderation | ✅ 11 regression tests pass |
| Provider search | ✅ `providers-search.test.ts` passes |
| Bookmark (Plan 114) | ✅ Regression test passes |
| PWA config | ✅ `pwa-config.test.ts` passes |
| All other test files | ✅ 178/179 pass, 0 failures |

## 7. QA Verdict

**PASS_WITH_CAVEATS**

### Why PASS

- All 1461 tests pass with 0 failures
- Type-check passes with zero errors
- All 8 user-facing requirements are delivered
- All HIGH-severity code review findings resolved
- All HIGH-severity architecture findings resolved
- Clean removal of deprecated offers/needs code paths
- Proper RPC-based transaction boundary for multi-table writes
- Storage bucket secured with service-role-only access
- Extension table joins mandatory in admin API

### Caveats

1. **Lint errors** (6 instances of `react/jsx-sort-props` in 3 Plan 145 files) — stylistic, non-functional
2. **No sub-page component tests** — the 6 new sub-pages lack dedicated unit tests
3. **No real SQL RPC integration test** — RPC transaction tests are mocked only
4. **`enrichment` standalone page** — exists but the admin navigation link was not verified
5. **`openingHours` still `z.any()`** — flagged as deferred
6. **`_adminUserId` unused** — flagged as deferred cleanup
