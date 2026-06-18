# Fix: Empty Locations Array Causes Address to Become "Online"

**ID**: 187-locations-fix
**Date**: 2026-06-18
**Status**: merged

## The Bug

`ProviderEditForm` initializes `locations: []` (the `Provider` type has no `locations` field). The admin edit page always included `locations: formData.locations` in the request body, so every save sent `locations: []` unless the user visited the locations sub-page.

When `[]` reached the RPC `admin_update_provider`:
1. The locations block executed because the key existed
2. No locations were processed (empty array)
3. The DELETE clause `WHERE location_id <> ALL(ARRAY[]::uuid[])` deleted all locations
4. The trigger `trg_sync_primary_city` synced NULL to `providers.address_city`
5. The provider detail page showed "Online" because `address_city` was NULL

## The Fix

In `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx`, changed 4 fields to omit empty arrays from the payload:

```diff
-      communityServiceIds: formData.selectedCommunityServiceIds,
+      communityServiceIds: formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0 ? formData.selectedCommunityServiceIds : undefined,

-      menuItems: formData.menuItems,
+      menuItems: formData.menuItems && formData.menuItems.length > 0 ? formData.menuItems : undefined,

-      deliveryLinks: formData.deliveryLinks,
+      deliveryLinks: formData.deliveryLinks && formData.deliveryLinks.length > 0 ? formData.deliveryLinks : undefined,

-      locations: formData.locations,
+      locations: formData.locations && formData.locations.length > 0 ? formData.locations : undefined,
```

When the array is empty, the key is omitted (`undefined`), so the RPC doesn't touch those tables. When the user has managed data (from sub-pages), it's sent correctly.

## Test Results

- 214 test files passed | 2 skipped
- 1758 tests passed | 22 skipped
- No regressions
