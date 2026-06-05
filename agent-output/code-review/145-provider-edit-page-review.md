# Code Review — Plan 145: Provider Edit Page Rebuild

**Reviewer**: Code Reviewer
**Date**: 2026-06-05
**Plan**: `agent-output/planning/145-provider-edit-page-plan.md`
**Architect**: `agent-output/architecture/145-architect-review.md`

---

## 1. Verdict

**APPROVED_WITH_COMMENTS** — Implementation is fundamentally sound and architect findings are well-addressed. Two regression risks and one code duplication issue should be resolved before closing.

---

## 2. Architecture Alignment

**ALIGNED** — All 3 HIGH findings from the architecture review are resolved:
- **HIGH-1** (multi-table transaction): `admin_update_provider` RPC wraps all writes atomically
- **HIGH-2** (storage bucket RLS): Bucket is private, service-role only, no public policies
- **HIGH-3** (extension table joins): `getProviderForAdmin` now left-joins `food_providers`, `store_providers`, `food_menu`, `provider_delivery_links`

MEDIUM findings:
- **MEDIUM-4** (type casting): Partially resolved — `AdminProviderWithExtensions` type exists but `getProviderForAdmin` still returns `Record<string, unknown>`, and `ProviderEditForm` still casts through `(provider as unknown as Record<string, unknown>)`
- **MEDIUM-5** (client-side queries): Resolved — admin API endpoints for menu and delivery-links created
- **MEDIUM-6** (god function): Resolved — `updateProviderFields` refactored into focused `build*` functions

LOW findings:
- **LOW-8** (updated_at on extension tables): Resolved — RPC sets `v_updated_at` on all upserts
- **LOW-9** (delivery links PK): Documented via SQL comment

---

## 3. TDD Compliance

**PARTIALLY_COMPLIANT** — Tests exist for the critical paths but have gaps:

| Area | Coverage | Assessment |
|------|----------|------------|
| Service layer payload builders | `providerEdit.test.ts` — 5 `describe` blocks, 12+ test cases | GOOD — all builder functions tested individually and in RPC integration |
| Admin API route | `admin-edit-provider.test.ts` — auth guards, validation, error paths, 073 regression | GOOD — comprehensive |
| Menu API route | `menu.test.ts` — auth, UUID validation, ordering, empty state | GOOD |
| Delivery-links API route | `delivery-links.test.ts` — auth, UUID validation, ordering, empty state | GOOD |
| Upload certificate API | `upload-certificate.test.ts` — auth, MIME types, size validation, upload path | GOOD |
| Schema validation | `adminSchemas.test.ts` — new fields, rejects invalid values | GOOD |
| Provider query with joins | `providers.test.ts` — extension table joins, food_menu, delivery_links | GOOD |
| ProviderEditForm | No tests for the new sections, localStorage sync, or submission flow | MISSING |
| Sub-pages (6) | No tests for menu/halal/delivery/hours/values/enrichment pages | MISSING |
| Enrichment review panel | No tests for `providerId` prop filtering | MISSING |
| RPC function | No integration tests for `admin_update_provider` | MISSING |

---

## 4. Findings

### HIGH-1: Community service relationships silently dropped in admin edit flow

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **Location** | `src/services/admin/providerEdit.ts:15-59` (interface at line 29), RPC function |
| **File** | `src/services/admin/providerEdit.ts` — `buildRpcPayload` never includes `communityServiceIds` |

**Issue**: The `AdminProviderEditData` interface includes `communityServiceIds`, and the admin edit page sends them in the request body (`src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:112`). But `buildRpcPayload` ignores `communityServiceIds` entirely — it doesn't map to any RPC payload key. The `admin_update_provider` RPC function also doesn't handle `provider_engagements`. Result: community service relationship updates are silently dropped when an admin edits a provider through the admin flow.

The owner-self-edit path (`ProviderEditForm.handleSubmit`) handles community services via direct Supabase writes, so the bug only affects admin/moderator edits.

**Recommendation**: Either:
1. Add `provider_engagements` handling to the RPC function (DELETE + INSERT based on `community_service_ids`), or
2. Remove `communityServiceIds` from the edit-provider API flow and create a separate endpoint for community service relationship management, then remove it from `AdminProviderEditData`.

---

### HIGH-2: Halal, Hours, and Values sub-pages show empty state on first visit

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **Location** | `src/app/(dashboard)/dashboard/providers/[id]/edit/halal/page.tsx:56-64` |
| | `src/app/(dashboard)/dashboard/providers/[id]/edit/hours/page.tsx:30-38` |
| | `src/app/(dashboard)/dashboard/providers/[id]/edit/values/page.tsx:67-74` |

**Issue**: These sub-pages only read from localStorage on mount. On first visit (no localStorage entry), they show empty/default state instead of the provider's current data. The `ProviderEditForm` parent does not persist form state to localStorage before navigating to these sub-pages. The plan specifies "DB load on mount" as the fallback (Section 7.4: `SELECT opening_hours FROM providers`), but it was not implemented for halal, hours, or values.

Menu and Delivery sub-pages correctly implement the DB-fallback pattern via `fetch('/api/admin/providers/[id]/menu')` and `fetch('/api/admin/providers/[id]/delivery-links')`.

**Recommendation**: Add API fetch fallbacks to these sub-pages:
- Halal: Fetch from `/api/admin/providers/${id}` (extension table data)
- Hours: Fetch from `/api/admin/providers/${id}` (opening_hours field)
- Values: Fetch from `/api/admin/providers/${id}` (amenity booleans + extension booleans)

---

### MEDIUM-1: Enrichment per-provider page duplicates component code

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **Location** | `src/app/(dashboard)/dashboard/providers/[id]/edit/enrichment/page.tsx` (~179 lines) |

**Issue**: The per-provider enrichment page duplicates ~150 lines of enrichment candidate display logic (fetch, group, approve/reject UI, pagination, error/loading/empty states) instead of embedding `EnrichmentReviewPanel` with `providerId` prop. The `EnrichmentReviewPanel` was specifically refactored (per plan Section 7.6) to accept an optional `providerId` prop for this exact use case. The standalone enrichment page (`dashboard/enrichment/page.tsx`) correctly uses `EnrichmentReviewPanel`.

**Recommendation**: Replace the duplicated logic with:
```tsx
<main className="...">
  <EnrichmentReviewPanel providerId={id} />
</main>
<FooterAction primaryButton={{ label: 'Back to Edit', onClick: () => router.back() }} />
```

---

### MEDIUM-2: `getProviderForAdmin` return type still untyped

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **Location** | `src/services/admin/providers.ts:164` — return type `Record<string, unknown> \| null` |
| **Type** | `src/types/adminProvider.ts:35` — `AdminProviderWithExtensions` exists |

**Issue**: The architect (MEDIUM-4) requested a proper return type to eliminate `as any`/`as unknown as Record<string, unknown>` casts. The `AdminProviderWithExtensions` type exists in `src/types/adminProvider.ts` but `getProviderForAdmin` still returns `Record<string, unknown>`. The `ProviderEditForm` initialization still uses `(provider as unknown as Record<string, unknown>).xxx as type` patterns (lines 140, 157-171). The type exists — update the service signature.

**Recommendation**:
```typescript
export async function getProviderForAdmin(
  providerId: string
): Promise<AdminProviderWithExtensions | null> {
```
Then update the ProviderEditForm to use the typed accessors instead of casts.

---

### MEDIUM-3: Missing RPC integration tests

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **Location** | `src/__tests__/services/admin/providerEdit.test.ts:235-298` |

**Issue**: The `admin_update_provider` RPC is tested only via mocked Supabase `rpc()` calls. There are no integration tests that verify the RPC function's SQL logic (transaction safety, COALESCE behavior, optional field handling). The RPC is the most critical piece — it's the transaction boundary for 5+ table writes.

**Recommendation**: Add a migration integration test (following the pattern in `src/__tests__/migrations/`) that creates test data in a transaction and verifies:
1. All tables updated atomically
2. Rollback on constraint violation
3. Partial payloads don't overwrite existing fields
4. Menu items and delivery links are fully replaced

---

### LOW-1: `openingHours` uses `z.any()` in validation schema

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **Location** | `src/lib/validations/adminSchemas.ts:84` |

**Issue**: `openingHours` is typed as `z.any()` instead of a proper schema matching `OpeningHours` from `src/types/openingHours.ts`. This bypasses Zod validation for the hours structure.

**Recommendation**: Define a proper Zod schema matching the `OpeningHours` type:
```typescript
const daySchema = z.object({ open: z.string(), close: z.string() }).nullable();
openingHours: z.object({
  monday: daySchema.optional(),
  tuesday: daySchema.optional(),
  // ... through sunday
}).nullable().optional(),
```

---

### LOW-2: Menu page hardcodes German categories

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **Location** | `src/app/(dashboard)/dashboard/providers/[id]/edit/menu/page.tsx:18` |

**Issue**: `CATEGORIES` is hardcoded as `['Hauptgerichte', 'Getränke', 'Vorspeisen', 'Desserts']`. If categories need to be configured per-installation or localized, this will require a code change.

**Recommendation**: Consider sourcing categories from a DB table or making them configurable. Acceptable for MVP — document as planned technical debt.

---

### LOW-3: `_adminUserId` parameter unused in `updateProviderFields`

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **Location** | `src/services/admin/providerEdit.ts:186` |

**Issue**: The `_adminUserId` parameter is passed by the API route but unused by the function. This was part of the original interface and wasn't removed during refactoring.

**Recommendation**: Either remove the parameter or use it for audit logging within the service (currently audit logging happens in the API route).

---

### INFO-1: Namespace inconsistency — `buildRpcPayload` merges amenities into `providers` sub-object

| Field | Value |
|-------|-------|
| **Severity** | **INFO** |
| **Location** | `src/services/admin/providerEdit.ts:145-177` |

**Observation**: Amenity booleans and basic fields are merged into a single `providers` key in the RPC payload, while extension fields get their own keys (`food_providers`, `store_providers`). This is correct because both map to the `providers` table, but the splitting/merging logic adds complexity. Acceptable in current form.

---

### INFO-2: `AdminProviderWithExtensions` still has `[key: string]: unknown` fallback

| Field | Value |
|-------|-------|
| **Severity** | **INFO** |
| **Location** | `src/types/adminProvider.ts:70` |

**Issue**: The type includes `[key: string]: unknown` which undermines strict typing. It's there because the Supabase `.select('*')` returns extra fields like `category` (the joined object). This is a pragmatic choice given Supabase's dynamic return type.

**Recommendation**: Document why this fallback exists. Acceptable as-is.

---

## 5. Positive Observations

1. **RPC-based transaction boundary**: The `admin_update_provider` RPC is well-constructed — uses COALESCE for partial updates, includes `updated_at` on all writes, wraps everything atomically. The SECURITY DEFINER + service_role-only EXECUTE pattern is correct.

2. **Storage security**: The `provider-certificates` bucket is private (`public: false`), has no RLS policies, and all access goes through the service-role admin client. The API route validates file type (4 MIME types), size (5MB), UUID format, and admin role — excellent defense-in-depth.

3. **Clean removal of offers/needs**: Both sub-page files are deleted, the Zod schemas have offersIds/needsIds removed from both `providerEditUpdateSchema` and `communityServiceEditUpdateSchema`, and the `ProviderEditForm` has no references to them.

4. **Payload builder pattern**: The refactored `buildRpcPayload` with focused sub-functions (`buildBasicFieldsPayload`, `buildExtensionFieldsPayload`, `buildAmenitiesPayload`, `buildMenuPayload`, `buildDeliveryLinksPayload`) is clean, independently testable, and mirrors the SQL structure.

5. **Admin API endpoints for sub-page data**: The `GET /api/admin/providers/:id/menu` and `GET /api/admin/providers/:id/delivery-links` routes follow a consistent pattern with auth guards, UUID validation, and service-role queries. Tests are comprehensive.

6. **Sub-page UI consistency**: All 6 new sub-pages follow the exact layout pattern (PageHeader + main scroll + FooterAction), matching existing category/images/social pages. Reduces cognitive overhead for admins.

7. **Halal tier mapping**: Bronze/Silver/Gold maps to existing columns with no schema change — pragmatic design.

8. **Existing migration merge**: The `delivery_platform_links` migration content was merged into the Plan 145 migration rather than creating a separate unapplied migration. This keeps migration history coherent.

9. **Test coverage for payload builders**: Builder functions have thorough unit tests covering partial payloads, boundary cases, and listing-type-specific behavior.

---

## 6. Required Actions

### Before closing

| # | Severity | Action | Owner |
|---|----------|--------|-------|
| 1 | HIGH | Fix community service relationship drops in admin edit flow (HIGH-1) | Implementer |
| 2 | HIGH | Add DB-fetch fallbacks to halal, hours, values sub-pages (HIGH-2) | Implementer |
| 3 | MEDIUM | Replace duplicated enrichment page with `EnrichmentReviewPanel` embedding (MEDIUM-1) | Implementer |
| 4 | MEDIUM | Update `getProviderForAdmin` return type to `AdminProviderWithExtensions` (MEDIUM-2) | Implementer |
| 5 | MEDIUM | Add RPC integration test with real SQL execution (MEDIUM-3) | Implementer |

### Deferred / Low Priority

| # | Severity | Action | Owner |
|---|----------|--------|-------|
| 6 | LOW | Define proper Zod schema for `openingHours` | Future |
| 7 | LOW | Consider making menu categories configurable | Future |
| 8 | LOW | Remove unused `_adminUserId` or use it for audit | Cleanup |

---

## 7. Architect Finding Resolution Verification

| Finding | Resolution | Status |
|---------|-----------|--------|
| HIGH-1: Multi-table writes | RPC function `admin_update_provider` | ✓ RESOLVED |
| HIGH-2: Storage bucket RLS | Private bucket, service-role only | ✓ RESOLVED |
| HIGH-3: Extension table joins | Left-joins in `getProviderForAdmin` | ✓ RESOLVED |
| MEDIUM-4: Type casting | Type exists, but return type not updated | ⚠ PARTIAL |
| MEDIUM-5: Client-side queries | Admin API endpoints created | ✓ RESOLVED |
| MEDIUM-6: God function | Refactored into focused builders | ✓ RESOLVED |
| LOW-8: updated_at on extensions | Handled in RPC | ✓ RESOLVED |
| LOW-9: Delivery links PK | Documented in SQL comment | ✓ RESOLVED |
