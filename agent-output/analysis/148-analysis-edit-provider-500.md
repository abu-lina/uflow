---
ID: 148
Origin: 148
UUID: 6507aea1
Status: Active
---

# Analysis 148: PATCH /api/admin/edit-provider 500 Error

**Confidence Level**: Proven (Level 1 — code path traced end-to-end)

## Symptom
- HTTP 500 on PATCH `/api/admin/edit-provider`
- Error: "Error updating provider: Error: Failed to update provider"
- Provider ID: `7c87ce78-e905-4c3c-8df3-63b37112faf7`

## Root Cause

**NOT NULL constraint violation in `admin_update_provider` RPC** when upserting into `store_providers` (or `food_providers`) extension table.

### The Bug Path

1. User edits a provider and sends form data. The form may include `noGambling`, `listingType`, etc. but may **not** include `verificationMethod`.

2. `buildExtensionFieldsPayload()` (providerEdit.ts:85-119) checks if any extension field has changed. If `noGambling` is set but `verificationMethod` is not, the function still returns `{ store_providers: { no_gambling: true } }` — **without** `verification_method`.

3. The RPC receives this payload and executes:
   ```sql
   INSERT INTO public.store_providers (
     provider_id, verification_method, has_certificate, ...
   ) VALUES (
     p_provider_id,
     NULLIF(v_store_providers->>'verification_method', ''),  -- NULL (key not in JSONB)
     ...
   )
   ```

4. `v_store_providers->>'verification_method'` returns `NULL` (key doesn't exist in JSONB).

5. `NULLIF(NULL, '')` returns `NULL` (PostgreSQL: `NULL` ≠ `''`, so `NULLIF` returns the first arg = `NULL`).

6. `verification_method` is `NOT NULL` on `store_providers` (set in migration 091).  
   The INSERT fails with: `null value in column "verification_method" violates not-null constraint`.

7. If the row already exists, the `ON CONFLICT DO UPDATE` runs instead, which uses `COALESCE(NULLIF(...), store_providers.verification_method)` — keeping the existing value. So the bug only surfaces when **no row exists yet** (first-time extension table write).

### When This Triggers

Any scenario where the RPC writes to an extension table (`store_providers` or `food_providers`) for the first time without explicitly including `verificationMethod`:

- Changing a provider's `listing_type` from `'food'` to `'store'` (or vice versa)
- Adding extension fields to a provider that was created before the extension table split (migration 083)
- A provider whose extension row was deleted or never created

### Same Bug Exists for `food_providers`

The RPC uses the same `NULLIF(v_food_providers->>'verification_method', '')` pattern for food_providers. Same failure mode.

## Affected Code

**File**: `supabase/migrations/094_plan_145_provider_edit_page.sql` (lines 167-188 for food, 192-209 for store)
**RPC**: `public.admin_update_provider(UUID, JSONB)`

Both the `food_providers` and `store_providers` INSERT blocks have:
```sql
NULLIF(v_xxx_providers->>'verification_method', '')
```

Needs to become:
```sql
COALESCE(NULLIF(v_xxx_providers->>'verification_method', ''), 'online')
```

## Why It Passed Review
- The RPC was tested with payloads that **included** `verification_method` (e.g., from the provider edit form which always sends it when the user makes any extension-related change)
- The edge case of **not** sending `verification_method` while still triggering extension table writes wasn't covered
- Integration tests didn't cover the first-time write scenario

## Fix

Update the `admin_update_provider` RPC function to use `COALESCE` with a default for `verification_method` in both the `food_providers` and `store_providers` INSERT blocks.
