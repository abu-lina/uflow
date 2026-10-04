---
ID: 148
Origin: 148
UUID: 6507aea1
Status: Active
---

# Plan 148: Fix NOT NULL violation in admin_update_provider RPC

## Summary
The `admin_update_provider` RPC uses `NULLIF(v_providers->>'verification_method', '')` for both `food_providers` and `store_providers` INSERT blocks. When the JSONB payload doesn't include `verification_method` (key is absent), `->>` returns NULL, `NULLIF(NULL, '')` returns NULL, and the NOT NULL constraint on `verification_method` fires. Fix by wrapping in `COALESCE(..., 'online')` to provide a default.

## Fix
Migration `098_plan_148_fix_rpc_verification_method_not_null.sql`:
- `CREATE OR REPLACE FUNCTION public.admin_update_provider`
- Change line 172: `NULLIF(v_food_providers->>'verification_method', '')` → `COALESCE(NULLIF(v_food_providers->>'verification_method', ''), 'online')`
- Change line 197: `NULLIF(v_store_providers->>'verification_method', '')` → `COALESCE(NULLIF(v_store_providers->>'verification_method', ''), 'online')`

## Impact
- Fixes the 500 error when editing providers that triggers first-time extension table writes
- No schema changes, no data migration
- Backward compatible — existing rows are unaffected

## Verification
1. Apply migration 098 to UAT
2. Edit a provider (especially changing listing_type or adding extension fields) — should succeed
3. Verify no regression on food provider edits
