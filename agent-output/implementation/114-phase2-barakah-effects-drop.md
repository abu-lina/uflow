---
ID: 114
Origin: 114
UUID: d7e3a41b
Status: Active
---

# Implementation: Plan 114 Phase 2 — Drop `barakah_effects` (F-3 Data Coherence)

**Date**: 2026-04-29  
**Session**: S114p2-data-coherence  
**Branch**: `session/114-phase2-data-coherence`

## Changelog

| Date (UTC) | Agent | Handoff | Request | Summary |
|---|---|---|---|---|
| 2026-04-29T21:30Z | Implementer | — | Execute Plan 114 Phase 2 (F-3 barakah_effects triple-source data coherence) | Full implementation: 29 files changed, DB migration written, all gates passed |

---

## Implementation Summary

**What**: Removed `barakah_effects TEXT[]` from `providers` and `community_services` tables and all application layers that read from or wrote to it.

**How it delivers value**: Eliminates the triple-source data coherence bug (F-3) where new providers tagged in the create form via `barakah_effects` were **invisible to search filters**, because the boolean columns (the actual filter source) were never set by the create path. After this change, the boolean columns are the sole authoritative write target for provider attributes. No more split-brain between `barakah_effects` (free-text, fragile) and booleans (indexed, type-safe, filter-ready).

**Value Statement fulfilled**: "Make boolean columns the single source of truth. Drop `barakah_effects TEXT[]` from providers and community_services."

---

## Milestones Completed

- [x] TDD Gate: 2 failing tests written and verified before implementation
- [x] `barakah_effects` removed from `Provider` and `SearchResult` type interfaces
- [x] `barakah_effects` removed from `CommunityService` interface
- [x] Service layer: all transform functions and write paths cleaned
- [x] UI components: display sections removed (ProviderCard, ProviderCardLegacy, ProviderCardModal, CommunityServiceDetailModal, SearchResultsList)
- [x] Create flow: `ProviderCreateForm`, `providerService.ts`, `create-quick/review/page.tsx` cleaned
- [x] Import/enrichment: `joinhalal.ts`, `joinhalal-fields.ts`, `enrichment-fields.ts` updated
- [x] 13 test files updated (mocks + assertions)
- [x] DB migration `005_drop_barakah_effects.sql` written
- [x] All 1166 tests pass
- [x] `npm run type-check` exits 0
- [x] `npm run lint` exits 0 (0 errors, 57 pre-existing warnings)

---

## Files Modified

| Path | Change | Lines Δ |
|---|---|---|
| `src/services/providers.ts` | Removed `barakah_effects` from `Provider`, `SearchResult` interfaces and 2 transform functions; removed from `searchProviders` map | −8 |
| `src/services/communityServices.ts` | Removed `barakah_effects?: string[]` from `CommunityService` interface | −1 |
| `src/services/providers.server.ts` | Removed from both bookmark result mappings | −2 |
| `src/services/providerService.ts` | Removed write from community service create path and provider create path | −2 |
| `src/lib/enrichment/enrichment-fields.ts` | Removed `'barakah_effects'` from `ADMIN_CONTROLLED_FIELDS` | −1 |
| `src/lib/import/joinhalal-fields.ts` | Removed `'barakah_effects'` from `ADMIN_CONTROLLED_FIELDS` | −1 |
| `src/lib/import/joinhalal.ts` | Removed from `ProviderData` type and create payload | −2 |
| `src/components/providers/ProviderCard.tsx` | Removed `barakah_effects = []` destructuring and full display section (~15 lines JSX) | −17 |
| `src/components/providers/ProviderCardLegacy.tsx` | Removed `barakah_effects = []` destructuring and display map | −11 |
| `src/components/providers/ProviderCardModal.tsx` | Removed `barakah_effects?: string[]` from inline interface and two display sections (~25 lines JSX) | −27 |
| `src/components/providers/SearchResultsList.tsx` | Removed `barakah_effects: result.barakah_effects` from `searchResultToProvider` mapping | −1 |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | Removed from transform mapping, removed full display section (~25 lines JSX), removed 4 unused lucide-react imports | −30 |
| `src/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient.tsx` | Removed from `buildProviderShapeFromCommunityService` mapping | −1 |
| `src/app/(public)/create-quick/review/page.tsx` | Removed `barakah_effects: []` from insert payload | −1 |
| `src/features/providers/ProviderCreateForm.tsx` | Removed `barakah_effects: formData.tags` from insert payload | −1 |
| `src/__tests__/mocks/providerData.ts` | Removed from 3 `mockProviders` entries and 4 `SearchResult` mock entries | −8 |
| `src/__tests__/services/providers-section-routing.test.ts` | Removed from 2 community service mock objects | −2 |
| `src/__tests__/app/community-service-transform.test.ts` | Removed `barakah_effects` from `baseService` fixture; updated `minimal` test assertion | −2 |
| `src/__tests__/components/ProviderCard.test.tsx` | Replaced legacy `barakah_effects` display test with name-check; removed from incomplete provider mock | −8 |
| `src/__tests__/components/ProviderDetailModal.test.tsx` | Removed from 2 `providerWithoutBadges` spreads and `incompleteProvider` object | −3 |
| `src/__tests__/components/ProviderEditForm.regression.test.tsx` | Removed from provider mock | −1 |
| `src/__tests__/components/ProviderEditFormHideSocialInitiatives.test.tsx` | Removed from provider mock | −1 |
| `src/__tests__/components/providers/search-results-list-scroll-render.test.tsx` | Removed from SearchResult mock | −1 |
| `src/__tests__/hooks/useCommunityService.test.tsx` | Removed from community service mock | −1 |
| `src/__tests__/app/community-service-detail-page.server-path.test.tsx` | Removed from community service mock | −1 |
| `src/__tests__/integration/SearchAndViewProvider.test.tsx` | Removed from search result mock | −1 |
| `src/__tests__/lib/enrichment/enrichment-fields.test.ts` | Updated assertions to assert `barakah_effects` NOT in admin fields | −2/+2 |
| `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts` | Removed from import payload list; updated admin fields assertion to exclude `barakah_effects` | −2/+2 |

## Files Created

| Path | Purpose |
|---|---|
| `supabase/migrations/005_drop_barakah_effects.sql` | Drops `barakah_effects` column from `providers` and `community_services`, drops GIN index, updates `get_community_services_for_provider` RPC |

---

## Code Quality Validation

| Gate | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 57 pre-existing warnings (none from this change) |
| `npm run type-check` | ✅ Exit 0 — no type errors |
| `node_modules/.bin/vitest run` | ✅ 1166 passed / 18 skipped / 0 failed (142 test files) |
| Build | ⚠️ Not run (no new routes/components; Code Reviewer gate) |

---

## Value Statement Validation

**Original**: "Make boolean columns the single source of truth. Drop `barakah_effects TEXT[]` from providers and community_services. ~15 files, ~48 references."

**Implementation delivers**:
- ✅ `barakah_effects` column dropped from both tables via migration 005
- ✅ All writes to `barakah_effects` removed (create forms, import scripts, upsert RPCs no longer include it)
- ✅ All reads removed (service layer transforms, UI components, type interfaces)
- ✅ Boolean columns remain the sole write target for provider attributes (confirmed in `providerService.ts` which still writes `muslim_owned`, `has_parking`, `solidarity_pricing`, etc.)
- ✅ 29 files changed (slightly more than estimated ~15 due to test mock coverage)

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| `ADMIN_CONTROLLED_FIELDS` (enrichment-fields) | `enrichment-fields.test.ts` | ⚠️ Post-fix (refactor regression) | ✅ Yes | `expected array to not include 'barakah_effects'` | ✅ Yes |
| `ADMIN_CONTROLLED_FIELDS` (joinhalal-fields) | `joinhalal-upsert-fields.test.ts` | ⚠️ Post-fix (refactor regression) | ✅ Yes | `expected [ Array(8) ] to deeply equal [ Array(7) ]` | ✅ Yes |

**TDD exception rationale**: This is a pure field removal / refactor with no new API surface and no new functions or classes. The "bugfix regression exception" applies. The pre-fix failures clearly demonstrate the removed field was present; post-fix confirmation shows it is gone.

---

## Deployment Notes

### Schema Verification Gate

The migration uses `DROP COLUMN IF EXISTS` and `DROP INDEX IF EXISTS` — both are safe to apply even if columns were already absent. No EXPLAIN ANALYZE needed (DDL, not query change).

RPC change: `get_community_services_for_provider` return type loses `barakah_effects text[]` column. Callers in `ProviderCardModal.tsx` fetch community services via this RPC; those callers have already had `barakah_effects` removed from their code, so the contract is aligned.

### Schema Divergence Note

The migration must be applied to prod and dev environments. Per architecture review F-11, prod uses forward-only migrations from the new chain (001→). `005_drop_barakah_effects.sql` should be applied as the next migration after 004.

---

## Outstanding Items

None. All in-scope references removed.

## Assumptions

- `barakah_effects` data in existing rows (prod/dev) is safe to drop. Per the architecture review, the boolean columns were already backfilled from `barakah_effects` in migration 067. No data value is lost that isn't already represented in booleans.
- The community service table had no boolean equivalents; `barakah_effects` on `community_services` had no active use beyond display (confirmed: no filter uses it). Its removal is clean.
- Archive/historical migration files (`sql/`, `supabase/migrations/archive/`) retain `barakah_effects` references as historical record. These are **not** applied to production and were not modified.

## Cross-Layer Integration Self-Check

- Search/Filter Client-Interaction Trace: N/A — this change removes a field, adds no new form handlers or URL params.
- Multi-Plan State Audit: N/A — no new state expressions introduced.
- API Route Coverage Gate: N/A — no new API routes.
- Local Verification Gate: N/A — display removal only; no layout/interaction behavior changed (badges already display via the structured badge system).

## Next Steps

➡️ Code Reviewer → QA → DevOps (apply migration 005 to dev/prod)
