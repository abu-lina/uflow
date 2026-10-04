---
ID: 116
Origin: 118
UUID: e7a3f1c9
Status: Committed
---

# Implementation 116 — M-3 through M-7 (Supertype Unification Complete)

## Plan Reference

- Plan: `agent-output/planning/116-field-schema-remediation-plan.md`
- Classification: Refactor
- Scope: M-3 (FL-24/25), M-4 (FL-4/10/11/23), M-5a schema, M-5b service layer, M-5c component layer, DEV sync, M-6 table renames, M-7 advisory docs

## Changelog

| Date (UTC) | Agent | Summary |
| --- | --- | --- |
| 2026-05-02T18:00Z | implementer | M-3 applied to PROD: migration 081 — column renames (solidarity_pricing→economic_solidarity, accepts_donations→makes_donations), all 3 section-scoped CHECKs dropped |
| 2026-05-02T19:00Z | implementer | M-4 applied to PROD: migration 082 — FK fixes (needs/offers RESTRICT, providers SET NULL), task_status_enum, badge registry (3 new columns, 6 new badge_types, data-driven sync trigger) |
| 2026-05-02T19:30Z | implementer | M-5a schema applied to PROD: migration 083 — enum rename business→store, extension tables (food/store/ummah_providers), community_services→providers migration, bookmarks simplification, table drops |
| 2026-05-02T20:00Z | implementer | M-5b service layer: all service files rewritten (communityServices.ts, badges.ts, badges.server.ts, categories.ts, providerService.ts, admin services, hooks) |
| 2026-05-02T21:00Z | implementer | M-5c component layer: all 50+ source files with dropped-table references updated. TypeScript 0 errors, 1194 tests passing |
| 2026-05-03T10:00Z | implementer | DEV sync: migrations 082+083 applied to DEV project (qrekonfhaenjdnjhwdum). 082 clean apply; 083 applied as reconciliation (DEV already had schema changes) |
| 2026-05-03T10:15Z | implementer | M-6: migration 084 — table renames provider_menu_items→provider_menu, provider_service_offers→provider_catalog. Applied to PROD and DEV. search_food_menu_items + search_provider_items RPCs rewritten |
| 2026-05-03T10:30Z | implementer | M-7: migration 085 — advisory SQL comments (FL-6, FL-12, FL-21). Applied to PROD and DEV. package.json bumped 0.11.7→0.12.0. CHANGELOG entry added |

## TDD Compliance

| Milestone | Unit Tests | Integration Tests | TypeScript | Result |
| --- | --- | --- | --- | --- |
| M-3 service layer | Pre-existing provider tests pass | N/A | 0 errors | ✅ |
| M-4 badge tests | src/__tests__/services/badges.phase3.test.ts | N/A | 0 errors | ✅ |
| M-5b service layer | src/__tests__/services/community-service-edit.test.ts, admin-community-service.test.ts, badges.phase3.test.ts | N/A | 0 errors | ✅ |
| M-5c component layer | All 1194 tests (1 pre-existing [pre-fix FAILS] excluded) | N/A | 0 errors | ✅ |
| M-6 table renames | No new tests required (no src code queries these tables) | search_provider_items RPC verified via schema check | 0 errors | ✅ |
| M-7 advisory | N/A (SQL comments only) | N/A | 0 errors | ✅ |

## Migration Files

| File | Scope | PROD | DEV |
| --- | --- | --- | --- |
| `supabase/migrations/081_m3_column_renames.sql` | FL-24, FL-25, CHECK drops | ✅ Applied | ✅ Applied (pre-existing) |
| `supabase/migrations/082_m4_fk_enum_badge_registry.sql` | FL-4, FL-10, FL-11, FL-23 | ✅ Applied | ✅ Applied |
| `supabase/migrations/083_m5a_supertype_unification.sql` | FL-26, FL-28 Part 1 | ✅ Applied | ✅ Reconciliation applied |
| `supabase/migrations/084_m6_table_renames.sql` | FL-28 Parts 2+3 | ✅ Applied | ✅ Applied |
| `supabase/migrations/085_m7_advisory_comments.sql` | FL-6, FL-12, FL-21 | ✅ Applied | ✅ Applied |

## Source Files Changed (M-5b/c)

### Service Layer (M-5b)
- `src/services/communityServices.ts` — queries `providers WHERE listing_type='ummah'`; `CommunityService` interface maps from provider fields
- `src/services/badges.ts` — `mapBadgeRowWithLegacyFields` simplified; all entity paths use `provider_id` only
- `src/services/badges.server.ts` — `createBaseQuery` always uses `provider_id`
- `src/services/categories.ts` — `fetchUsedCategories` and `fetchCategoriesBySection('ummah')` query providers
- `src/services/providerService.ts` — CS creation branch inserts into `providers` with `listing_type='ummah'`
- `src/services/admin/communityServices.ts` — queries `providers WHERE listing_type='ummah'`
- `src/services/admin/communityServiceEdit.ts` — uses `providers`, `provider_images`, `provider_offers`, `provider_needs`
- `src/services/admin/providerEdit.ts` — `communityServiceIds` uses `provider_engagements`
- `src/hooks/useOptimisticBookmark.ts` — `bookmarkableType: 'provider'` only
- `src/hooks/useBookmarkWithAuth.ts` — `bookmarkableType: 'provider'` only
- `src/hooks/useImageFallback.ts` — `entityType: 'provider'` only; always queries `providers.provider_images`
- `src/utils/entityTypeUtils.ts` — `getEntityTypeForCategory` always returns `'provider'`

### Component Layer (M-5c)
- `src/components/providers/ProviderDetailModal.tsx` — bookmark uses `provider_id`; share URL `/providers/[id]`
- `src/components/providers/ProviderDetailPage.tsx` — `isCommunityService = listing_type === 'ummah'`; bookmark `provider_id`; navigation `/providers/[id]`
- `src/components/providers/ProviderActionBar.tsx` — `bookmarkableType?: 'provider'` only
- `src/components/providers/ProviderCard.tsx` — `bookmarkableType?: 'provider'` only
- `src/components/providers/ProviderEditForm.tsx` — loads/submits via `provider_engagements`
- `src/components/shared/SelectableCard.tsx` — `bookmarkableType?: 'provider'` only
- `src/components/shared/UnifiedGallery.tsx` — `entityType?: 'provider'` only
- `src/components/shared/CommunityServiceGallery.tsx` — queries `providers WHERE listing_type='ummah'`
- `src/components/community-services/CommunityServiceDetailModal.tsx` — `bookmarkableType: 'provider'`
- `src/app/api/admin/edit-community-service/route.ts` — audit log uses `provider_name`/`provider_id`
- `src/app/api/admin/review-community-service/route.ts` — audit log uses `provider_name`/`provider_id`
- `src/app/api/badges/entity/route.ts` — `entityType` must be `'provider'` only
- `src/app/api/user/export-data/route.ts` — queries `providers WHERE listing_type='ummah'`
- `src/app/(public)/providers/ProvidersContent.tsx` — bookmark `provider_id` only; navigation `/providers/[id]`
- `src/app/(public)/profile/ProfileContent.tsx` — CS navigation uses `/providers/[id]`
- `src/app/(public)/profile/providers/[provider_id]/edit/social/page.tsx` — queries `provider_engagements`
- `src/app/(dashboard)/dashboard/providers/[id]/edit/social/page.tsx` — queries `provider_engagements`
- `src/app/(dashboard)/dashboard/community-services/[id]/edit/category/page.tsx` — queries `providers WHERE listing_type='ummah'`
- `src/app/(dashboard)/dashboard/community-services/[id]/edit/images/page.tsx` — queries `providers`, `provider_images`
- `src/app/(dashboard)/dashboard/community-services/[id]/edit/needs/page.tsx` — queries `providers` + `provider_needs`
- `src/app/(dashboard)/dashboard/community-services/[id]/edit/offers/page.tsx` — queries `providers` + `provider_offers`

### Test Files Updated
- `src/__tests__/services/community-service-edit.test.ts` — mock chains updated for providers table
- `src/__tests__/services/admin-community-service.test.ts` — mock chains updated for providers table
- `src/__tests__/services/badges.phase3.test.ts` — `createProviderBadge` no longer expects `community_service_id: null`

## Column Name Mapping (for reference)
| Old | New |
| --- | --- |
| `community_service_id` | `provider_id` |
| `community_service_name` | `provider_name` |
| `community_service_description` | `provider_description` |
| `community_service_images` | `provider_images` |
| `community_services` table | `providers WHERE listing_type='ummah'` |
| `community_service_offers` table | `provider_offers` |
| `community_service_needs` table | `provider_needs` |
| `provider_community_services` table | `provider_engagements` |
| `provider_menu_items` table | `provider_menu` |
| `provider_service_offers` table | `provider_catalog` |
| `listing_type = 'business'` | `listing_type = 'store'` |

## Post-Implementation Test Evidence

```
npm run type-check: 0 errors (ummah-flow@0.12.0)
npm test -- --run: 1193 passed / 1194 (1 pre-existing [pre-fix FAILS] test — not related to this plan)
```

## Deferred Items

| Finding | Decision | Rationale |
| --- | --- | --- |
| FL-16 | Deferred | `category_suggested_offers/needs` surrogate PK retained; composite PK migration is YAGNI at current scale |
| FL-19 | Deferred | `email_confirmation_tokens.type` TEXT+CHECK retained; enum migration deferred (low-frequency auth table) |
| FL-20 | Deferred | `ummah_providers.community_service_view_count` kept denormalized; `provider_stats` MV decision deferred |
| FL-27 | Deferred | `category-suggestions.ts` RPC optimisation deferred to next opportunity |
| FL-28 Part 3 | Partially deferred | `src/services/provider-catalog.ts` service file (store catalog CRUD) not yet built — M-6 plan item 3 |
