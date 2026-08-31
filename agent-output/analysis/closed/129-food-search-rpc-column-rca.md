---
ID: 129
Origin: 129
UUID: c7e3a91f
Status: Committed
---

# 129 — Root Cause Analysis: `search_food_concepts` RPC Column Error

## Changelog

| Date       | Event                                      |
| ---------- | ------------------------------------------ |
| 2026-05-12 | RCA created by Analyst. Root cause proven. |

## Value Statement and Business Objective

Production `/search?section=food` is completely broken for all users. Every search query returns HTTP 400 with Postgres error 42703 (`column p.offers_ids does not exist`). This is a P0 outage of the food search feature.

## Root Cause (L1 — Proven)

**Migration `006_phase3_referential_integrity.sql` dropped the `providers.offers_ids` column (replacing it with a `provider_offers` junction table), but the `search_food_concepts` RPC function was never updated to use the new junction table.**

The function still references `p.offers_ids @> ARRAY[mo.offer_id]` — a column that no longer exists on the `providers` table.

## Affected Files and Lines

### Primary: Function definition in baseline

- [supabase/migrations/001_baseline.sql](supabase/migrations/001_baseline.sql#L916) — line 916:
  ```sql
  ON p.offers_ids @> ARRAY[mo.offer_id]
  ```

### Origin of the broken reference

- [supabase/migrations/archive/077_food_search_prefix_matching.sql](supabase/migrations/archive/077_food_search_prefix_matching.sql#L107) — line 107:
  ```sql
  ON p.offers_ids @> ARRAY[mo.offer_id]
  ```
  This migration rewrote `search_food_concepts` with prefix matching support but used the old array-based join. It was folded into the baseline.

### Migration that broke the contract

- [supabase/migrations/006_phase3_referential_integrity.sql](supabase/migrations/006_phase3_referential_integrity.sql#L323) — line 323:
  ```sql
  DROP COLUMN IF EXISTS offers_ids,
  ```
  This migration created `provider_offers(provider_id, offer_id)` as a junction table replacement and dropped `providers.offers_ids`. It migrated data correctly but did NOT update any RPC functions that referenced the old column.

### Client-side caller

- [src/services/offers.ts](src/services/offers.ts#L156) — line 156:
  ```typescript
  const { data, error } = await supabase.rpc('search_food_concepts', {
  ```

## Correct Column / Join Pattern

The `providers.offers_ids` uuid[] column no longer exists. The relationship is now modeled via the `provider_offers` junction table created in migration 006:

```sql
-- provider_offers schema (from migration 006, line 12)
CREATE TABLE IF NOT EXISTS public.provider_offers (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, offer_id)
);
```

The broken join:
```sql
-- BROKEN (column dropped)
INNER JOIN public.providers p
  ON p.offers_ids @> ARRAY[mo.offer_id]
 AND p.listing_type = 'food'
 AND p.review_status = 'approved'
```

Should become:
```sql
-- CORRECT (junction table)
INNER JOIN public.provider_offers po
  ON po.offer_id = mo.offer_id
INNER JOIN public.providers p
  ON p.provider_id = po.provider_id
 AND p.listing_type = 'food'
 AND p.review_status = 'approved'
```

## Scope of Impact

| Function                  | Uses `offers_ids`? | Broken? |
| ------------------------- | ------------------ | ------- |
| `search_food_concepts`    | Yes (line 916)     | **YES** |
| `search_food_categories`  | No (uses `category_id`) | No  |
| `search_food_menu_items`  | No (uses `provider_id`) | No  |

Only `search_food_concepts` is affected. The other two food search RPCs join on different columns that still exist.

## Timeline of the Drift

1. **Migration 070** (archived): Created `search_food_concepts` with `p.offers_ids @> ARRAY[...]`
2. **Migration 077** (archived): Rewrote `search_food_concepts` with prefix matching, kept the same `p.offers_ids` join
3. **Baseline consolidation**: Migrations 070+077 folded into `001_baseline.sql`
4. **Migration 006**: Replaced `providers.offers_ids` uuid[] with `provider_offers` junction table, dropped the column — but did NOT update `search_food_concepts`
5. **Result**: Function compiles (SQL functions are parsed lazily in Postgres) but fails at runtime with error 42703

## Proposed Fix Approach

**New migration** (not an in-place edit of the baseline or archived migrations):

1. Create a new migration file (e.g., `089_fix_search_food_concepts_junction.sql`)
2. `DROP FUNCTION IF EXISTS public.search_food_concepts(TEXT, INTEGER);`
3. `CREATE OR REPLACE FUNCTION public.search_food_concepts(...)` with the corrected junction table join
4. Preserve all existing GRANT/REVOKE permissions
5. Keep function signature (input params + return type) identical — no client-side changes needed

## Risk Assessment

| Factor                  | Assessment                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| **Safety**              | Safe — function replacement is atomic, no data changes            |
| **Rollback**            | Easy — re-deploy old function definition (though it would still be broken since the column is gone) |
| **Client impact**       | None — function signature unchanged, only internal join changes   |
| **Performance**         | Equal or better — junction table join with indexed FKs vs array containment check |
| **Data integrity**      | Improved — junction table has FK constraints; old array had none  |
| **Blast radius**        | Minimal — only `search_food_concepts` is touched                  |

This is a **safe in-place fix**. The function is currently 100% broken, so there is zero regression risk from changing the join pattern.

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| — | None    | —       | Root cause fully proven. | — |

All unknowns resolved. Root cause is L1 Proven by direct code inspection: the column `p.offers_ids` was dropped in migration 006 and the function was never updated.
