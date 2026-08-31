---
ID: 148
Origin: 148
UUID: 6507aea1
Status: Active
---

# Implementation 148: Fix NOT NULL violation in admin_update_provider RPC

## Summary
Replaced `NULLIF(v_providers->>'verification_method', '')` with `COALESCE(NULLIF(v_providers->>'verification_method', ''), 'online')` in both `food_providers` and `store_providers` INSERT blocks of the RPC.

## Files
- `supabase/migrations/098_plan_148_fix_rpc_verification_method_not_null.sql` — `CREATE OR REPLACE FUNCTION` with fixed INSERT blocks

## Changes Made
- **Line 172** (food_providers INSERT): `NULLIF(v_food_providers->>'verification_method', '')` → `COALESCE(NULLIF(v_food_providers->>'verification_method', ''), 'online')`
- **Line 197** (store_providers INSERT): `NULLIF(v_store_providers->>'verification_method', '')` → `COALESCE(NULLIF(v_store_providers->>'verification_method', ''), 'online')`

No other changes — the rest of the RPC function is identical to the original in migration 094.

## TDD Compliance
N/A — Database function fix, tested via integration against UAT.
