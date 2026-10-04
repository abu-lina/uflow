# Architecture Review — Plan 145: Provider Edit Page Rebuild

**Reviewer**: Architect
**Date**: 2026-06-05
**Plan**: `agent-output/planning/145-provider-edit-page-plan.md`
**Analysis**: `agent-output/analysis/145-provider-edit-page-analysis.md`

---

## Verdict

**APPROVED_WITH_CHANGES** — 3 HIGH and 3 MEDIUM items must be addressed before implementation begins.

---

## Summary

The plan is architecturally sound and follows existing patterns well (sub-page layout, localStorage sync, PATCH API flow, service-role writes). The data model decisions are pragmatic — reusing the existing `food_menu` table, mapping halal tiers to existing columns, and applying the existing delivery_links migration. However, three HIGH issues require attention: the multi-table write path lacks transaction safety, the storage bucket RLS is too permissive, and the admin API doesn't load extension table data needed by the halal check sub-page.

---

## Findings

### HIGH-1: Multi-table writes lack transaction safety

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Plan ref** | Section 4.2, Data Flow diagram (lines 27-39) |
| **File** | `src/services/admin/providerEdit.ts` — `updateProviderFields` |

**Issue**: The plan adds writes to `providers`, `food_providers`/`store_providers`, `food_menu`, and `provider_delivery_links` within a single function but without wrapping them in a database transaction. If the `providers` update succeeds but the `food_menu` array replacement fails (e.g., a constraint violation), the provider will have stale menu references. The plan inherits this pattern from the existing offers/needs/engagements writes, but adding 4+ independent table operations makes the problem acute.

**Recommended fix**: Use one of these approaches:

1. **Supabase RPC (plpgsql function)** — Wrap all writes in a single `BEGIN ... COMMIT`/`ROLLBACK` block called via `supabase.rpc()`. This is the most robust approach.
2. **Manual rollback** — Track successful operations and reverse on failure. More complex but works with the existing JS client.
3. **At minimum** — Restructure the write order so the main `providers` update happens last (so if ancillary writes fail, the provider isn't updated), and document the inconsistency window.

---

### HIGH-2: Storage bucket RLS policy too permissive

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Plan ref** | Section 3.2, item 4 (lines 81-88) |
| **File** | `supabase/migrations/094_plan_145_provider_edit_page.sql` — lines 809-815 |

**Issue**: The `Authenticated insert` policy on the `provider-certificates` bucket allows any authenticated user to upload files with only a `bucket_id` check — no ownership verification. While the plan notes this is "handled at the API level," this violates defense-in-depth. If a bug in the API route or a misconfiguration removes the ownership check, any authenticated user could upload arbitrary files to the bucket.

```sql
CREATE POLICY "Authenticated insert for provider-certificates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-certificates'
  );
```

**Recommended fix**: Either:

1. Remove this policy entirely and make all uploads go through the service-role client (matching the edit-provider API pattern). The API route already validates admin/moderator status — it can use `getSupabaseAdmin()` for the storage upload.
2. Add an ownership check that verifies the uploader owns the provider referenced in the path:
   ```sql
   WITH CHECK (
     bucket_id = 'provider-certificates'
     AND (storage.foldername(name))[1] IN (
       SELECT provider_id::text FROM providers WHERE provider_owner_id = auth.uid()
     )
   );
   ```

---

### HIGH-3: Extension table fields not loaded by admin API

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Plan ref** | Section 5.2 (lines 312-315) |
| **File** | `src/services/admin/providers.ts` — `getProviderForAdmin` (line 162) |

**Issue**: The plan initializes halal check fields from the provider object:
```
verificationMethod: provider.verification_method || null,
hasCertificate: provider.has_certificate || false,
certificateUrl: (provider as any).certificate_url || null,
```

But `getProviderForAdmin` only queries the `providers` table (joined to `categories`) — it does **not** join `food_providers` or `store_providers`. These values will be `undefined` at form init, causing the halal check sub-page to show no current state. The plan marks extending `getProviderForAdmin` as "optionally" (section 10, providers.ts row) — this should be **mandatory**.

**Recommended fix**: Extend `getProviderForAdmin` to left-join to `food_providers` and `store_providers` so the admin API returns extension table fields. The response type should be updated accordingly (see MEDIUM-4).

---

### MEDIUM-4: `(provider as any)` type casting indicates untyped data flow

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Plan ref** | Section 5.2 (lines 315, 319-321) |
| **Files** | `src/services/admin/providers.ts` — Provider interface; `ProviderEditForm.tsx` |

**Issue**: The plan uses `(provider as any).certificate_url`, `(provider as any).no_alcohol`, etc. This works because the `Provider` interface in `services/admin/providers.ts` has `[key: string]: unknown`, but it bypasses type checking and documentation. Any field accessed this way is invisible to refactoring tools.

**Recommended fix**: After extending `getProviderForAdmin` (HIGH-3), create a proper return type for the admin provider edit endpoint that includes extension table fields. Alternatively, create a dedicated `AdminProviderEditData` type that mirrors the Zod schema and is the authoritative shape for the edit form.

---

### MEDIUM-5: Client-side Supabase queries in admin context

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Plan ref** | Section 5.3 (lines 327-346) |
| **File** | `ProviderEditForm.tsx` — `useEffect` in initial form setup |

**Issue**: The plan loads menu items and delivery links using the client-side Supabase client (`supabase.from('food_menu').select(...)`). The rest of the admin edit flow consistently uses admin API endpoints (with service-role client) to bypass RLS. Relying on public RLS policies for these reads introduces a potential inconsistency — if RLS policies change, the admin edit form could break differently than the public-facing pages.

**Recommended fix**: Either:
1. Create admin API endpoints for fetching menu items and delivery links (e.g., `GET /api/admin/providers/:id/menu` and `GET /api/admin/providers/:id/delivery-links`).
2. Or at minimum, document that the public RLS policies for these tables must remain in place for admin editing to work, and add tests that verify this.

---

### MEDIUM-6: `updateProviderFields` god function growth

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Plan ref** | Section 4.2 (lines 216-228) |
| **File** | `src/services/admin/providerEdit.ts` — `updateProviderFields` |

**Issue**: The plan adds 7 new write operations to a function that already handles ~5 distinct data domains (basic fields, address, contact, images, community services). The function currently handles 3 junction-table writes (offers, needs, engagements) inline. Adding 4+ more (menu delete/insert, delivery link delete/insert, extension table upsert, opening_hours, booleans) will push it past 300+ lines with deeply nested conditionals.

**Recommended fix**: Refactor `updateProviderFields` to delegate to focused functions:

```typescript
async function updateMenuItems(providerId: string, items: MenuItemInput[])
async function updateDeliveryLinks(providerId: string, links: DeliveryLinkInput[])
async function updateExtensionTable(providerId: string, listingType: string, data: ExtensionInput[])
```

This makes each write path independently testable and testable in isolation (see plan's testing section in the file list).

---

### LOW-7: Provider type needs extension for `offers_ids`/`needs_ids`

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Plan ref** | Section 5.2 (line 123-125 removed) |
| **File** | `ProviderEditForm.tsx` |

**Issue**: The existing `ProviderEditForm` initializes `selectedOfferIds: provider.offers_ids || []` and `selectedNeedIds: provider.needs_ids || []`. The analysis confirms these columns were dropped from the live DB (section 1.1, "Notable absences"). This means the existing code already has dead initializations and will always be empty arrays. The plan correctly removes these fields, but note this is a bug fix, not just a cleanup — the existing form has been silently passing empty arrays.

No action needed — the plan's removal is correct.

---

### LOW-8: No `updated_at` update for extension tables

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Plan ref** | Section 4.2, item 5 (extension table booleans) |
| **File** | `src/services/admin/providerEdit.ts` — new write path |

**Issue**: Both `food_providers` and `store_providers` have `updated_at` columns, but the plan doesn't mention setting them during upsert. The migration adds `certificate_url` to these tables but doesn't add a trigger for automatic `updated_at` updates (unlike the `providers` table which is handled by the service).

**Recommended fix**: In the upsert payload, include `updated_at: new Date().toISOString()`, or add an `ON UPDATE` trigger to the migration.

---

### LOW-9: Delivery links PK constraint limits multi-link per platform

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Plan ref** | Section 3.1 (line 60) |
| **File** | `supabase/migrations/20260604120000_delivery_platform_links.sql` — line 10 |

**Issue**: The `provider_delivery_links` table uses `PRIMARY KEY (provider_id, platform)`, which prevents a provider from having multiple links on the same platform (e.g., two Wolt links for different locations). This is from the existing migration, not the plan, but the plan should document this constraint as a design decision. If clients request multi-link per platform support later, this will require a migration to a synthetic PK.

**Recommended fix**: Document this in code comments on the migration or in the plan's rationale section. The array-replacement write approach in the plan is consistent with this constraint.

---

### LOW-10: Community service schema removal — verify consumers

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Plan ref** | Section 4.1 (lines 209-214) |
| **File** | `src/lib/validations/adminSchemas.ts` — `communityServiceEditUpdateSchema` |

**Issue**: The plan removes `offersIds`/`needsIds` from `communityServiceEditUpdateSchema`. The analysis confirms these columns don't exist in the live DB, and removing them from the schema is correct. However, verify there isn't any API consumer sending these fields in community service PATCH requests. Zod will silently strip unknown fields by default (`.strip()` mode), so this won't break anything — it's safe.

No action needed.

---

## Positive Observations

1. **Correct table reuse**: Using the existing `food_menu` table (originally `provider_menu_items` → `provider_menu` → `food_menu`) instead of creating a new `menu_items` table avoids schema bloat and preserves existing data and search function references.

2. **Halal tier mapping without schema change**: The Bronze/Silver/Gold mapping to existing `verification_method` + `has_certificate` columns is pragmatic — 3 UX tiers from 2 columns + 1 boolean. No migration needed for the core logic.

3. **Consistent sub-page pattern**: All 6 new sub-pages follow the exact pattern from existing sub-pages (category, images, social) — `'use client'`, localStorage read on mount + write on change, `visibilitychange` sync, FooterAction. This minimizes cognitive overhead.

4. **Existing migration reuse**: Running `20260604120000_delivery_platform_links.sql` (never applied) rather than re-creating it ensures the migration history stays coherent.

5. **Enrichment API already supports providerId filtering**: The `GET /api/admin/enrichment/candidates?providerId=...` query param already exists in the API route (`src/app/api/admin/enrichment/candidates/route.ts:51`). The plan's per-provider enrichment sub-page only needs the UI component refactor.

6. **No premature abstraction**: The plan keeps each sub-page as its own file, mirroring the existing structure. No shared form components that would introduce coupling between distinct domains.

7. **Certificate upload validation**: File type (PDF, image) and size (5MB) validation at both the API level and the storage bucket level (`allowed_mime_types`) — good defense-in-depth.

---

## Recommendations

1. **Wrap multi-table writes in a transaction** — Supabase RPC (plpgsql) is the preferred approach. This is the highest-impact architectural improvement.

2. **Strengthen storage RLS** — Either remove the permissive authenticated-insert policy and use service-role exclusively (matching the edit-provider API), or add an ownership check to the policy.

3. **Make extension table joins mandatory** — Extend `getProviderForAdmin` to left-join `food_providers` and `store_providers`. The halal check sub-page cannot function without this data.

4. **Create a proper return type for extension table data** — Replace `[key: string]: unknown` and `as any` casts with a typed interface, e.g. `AdminProviderWithExtensions`.

5. **Refactor `updateProviderFields` into focused sub-functions** — One function per table type, each independently testable. This is a natural refactoring boundary.

6. **Use admin API for sub-page data fetches** — Create dedicated endpoints for menu items and delivery links in the admin context, or document why the direct client query is acceptable.

7. **Add `updated_at` to extension table upserts** — Include in the write payload to maintain consistency with the `providers` table pattern.

8. **Document the PK constraint on delivery links** — Add a brief comment about why `(provider_id, platform)` is the natural key and what scenarios aren't supported.

---

## Affected File Quality Check

| File | Risk | Verdict |
|------|------|---------|
| `supabase/migrations/094_plan_145_provider_edit_page.sql` | LOW | Schema changes look correct |
| `src/services/admin/providerEdit.ts` | HIGH | Needs transaction + refactoring |
| `src/services/admin/providers.ts` | HIGH | Must add extension table joins |
| `src/lib/validations/adminSchemas.ts` | LOW | Schema additions are correct |
| `src/components/providers/ProviderEditForm.tsx` | MEDIUM | Client-side queries need review |
| `src/features/admin/components/EnrichmentReviewPanel.tsx` | LOW | Adding `providerId` prop is straightforward |
| Certificate upload API (new) | MEDIUM | RLS + validation need hardening |
| 6 new sub-pages | LOW | Pattern is well-established |
