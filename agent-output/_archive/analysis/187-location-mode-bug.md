---
ID: 187
Origin: 187
UUID: b7f3d8a2
Status: Active
---

# Analysis: Provider Edit — Location Incorrectly Shows "Online"

**Plan ID**: 187
**Phase**: 1 of 6 — Analyst (Complete)
**Date**: 2026-06-18

---

## Bug Summary

Editing a provider via the admin edit page (`/dashboard/providers/[id]/edit`) causes the provider overview to display "Online" as the location, even though the provider has a physical address and the user did not select "Online Business".

---

## Root Cause

**Primary Bug**: The admin edit page unconditionally sends `locations: formData.locations` in the PATCH request body. The `ProviderEditForm` initializes `locations: []` (empty array) because the `Provider` type doesn't include a `locations` field. This empty array reaches the `admin_update_provider` RPC, causing it to delete ALL locations for the provider.

**Trigger chain**:

1. Admin opens edit page → provider data loaded via admin API (includes locations)
2. `ProviderEditForm` initializes `formData.locations = []` (line 169, type mismatch — Provider type has no `locations`)
3. User changes some fields (e.g., category) and saves
4. `page.tsx` line 121 sends `locations: []` → PATCH /api/admin/edit-provider
5. `buildLocationsPayload` returns `{ locations: [] }` (defined, not undefined)
6. RPC `admin_update_provider` enters locations block (key exists in payload)
7. `jsonb_array_length([]) = 0` → no locations processed → `v_existing_ids` stays empty
8. RPC deletes ALL locations: `DELETE FROM locations WHERE location_id <> ALL(ARRAY[]::uuid[])`
9. Trigger `trg_sync_primary_city` fires on DELETE of primary location (migration 101)
10. Trigger sets `providers.address_city = NULL` on the provider
11. Overview page (`ProviderDetailPage` line 384) checks `provider.address_city` → NULL → shows "Online"

**Secondary Bug**: `showAddress` uses `??` instead of `||` in `syncFromLocalStorage` (line 279 of ProviderEditForm.tsx). The `??` operator preserves stale `false` from localStorage even when DB has `show_address: true`. Fix already applied in PR #265.

---

## Key Files

| File | Line | Role |
|------|------|------|
| `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx` | 121 | **Bug**: sends `locations: formData.locations` (always `[]`) |
| `src/components/providers/ProviderEditForm.tsx` | 169 | Initializes `locations: []` — type mismatch |
| `src/services/admin/providerEdit.ts` | 170-173 | `buildLocationsPayload` returns `{ locations: [] }` when array is empty |
| `supabase/migrations/106_plan_165_show_address_admin_edit.sql` | 180-238 | RPC enters locations block when key exists, deletes all on empty array |
| `supabase/migrations/101_plan_151_multi_location.sql` | 33-57 | Sync trigger `trg_sync_primary_city` — sets `address_city = NULL` when location deleted |
| `src/app/(public)/providers/[provider_id]/page.tsx` | 14-31 | SSR fetch via `getProviderById` |
| `src/components/providers/ProviderDetailPage.tsx` | 384 | Shows "Online" when `address_city` is NULL |
| `src/components/providers/ProviderCard.tsx` | 160-171 | Shows "Online" when `address_city` is NULL |

---

## Fix Applied

In `page.tsx`, line 121:
```
- locations: formData.locations,
+ locations: formData.locations && formData.locations.length > 0 ? formData.locations : undefined,
```

Also fixed similar fields with the same pattern:
- `communityServiceIds: formData.selectedCommunityServiceIds` → only include if non-empty
- `menuItems: formData.menuItems` → only include if non-empty
- `deliveryLinks: formData.deliveryLinks` → only include if non-empty

---

## Also Fixed (PR #265)

`ProviderEditForm.tsx:279` — Changed `??` to `||` for `showAddress` in `syncFromLocalStorage`:
```
- showAddress: parsed.showAddress ?? prev.showAddress,
+ showAddress: parsed.showAddress || prev.showAddress,
```

This prevents stale `showAddress: false` from localStorage overriding the DB's `show_address: true`.

---

## Confidence

**Level 1 (Proven)** — Bug chain fully verified by code reading:
- RPC deletes locations with `WHERE location_id <> ALL(ARRAY[]::uuid[])` → matches ALL rows
- Trigger `sync_primary_location_city()` on DELETE sets `address_city = NULL`
- Form initializes `locations: []` unconditionally
- `page.tsx` sends `locations: formData.locations` unconditionally

---

## Prevention

1. RPC should be more defensive: only process locations block when array is non-empty
2. Form should load locations from provider data when available
3. Trigger should not null `address_city` on location deletion without a fallback
