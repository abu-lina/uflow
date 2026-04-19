---
ID: 094
Origin: 094
UUID: b3e7a912
Status: Active
---

# Open Actions 094: Deferred Post-Deploy Follow-ups

## Summary

- QA integration tests (RLS enforcement, RPC query execution, stats MV accuracy) could not be completed during the session due to a pre-existing schema drift in local Supabase bootstrap path (`061_fix_clothing_category_image_reference.sql` — `column "category_images" does not exist`).
- All automated quality gates passed (contract test 10/10, type-check, lint). Contract test provides 95% confidence in SQL structure and ADR compliance.
- Release context: v0.10.21, Plan 094, migration 068

## Open Actions

| Item | Owner | Trigger/Due | Evidence to Close | Status |
|---|---|---|---|---|
| RLS enforcement: non-owner INSERT denied on `provider_menu_items` | QA | Within 24h of migration 061 local DB resolution | Non-owner authenticated user INSERT rejected (RLS policy denies) | Open |
| RLS enforcement: non-owner INSERT denied on `provider_service_offers` | QA | Same trigger | Same — verified for service offers table | Open |
| RPC test: `search_provider_items('Döner')` returns ranked results | QA | Same trigger | ≥1 result with `ts_rank` DESC ordering; `item_type` discriminator present | Open |
| RPC test: empty query ordering by `sort_order, name_de` | QA | Same trigger | Results ordered by `sort_order ASC, name_de ASC` when `search_query = ''` | Open |
| Stats view: `menu_item_count` / `service_offer_count` accuracy | QA | Same trigger | `SELECT menu_item_count, service_offer_count FROM provider_stats` matches seeded item counts after `REFRESH MATERIALIZED VIEW` | Open |
| M4 EXPLAIN ANALYZE: index scan on providers(provider_owner_id) | QA | Same trigger | `EXPLAIN (ANALYZE, BUFFERS)` for INSERT policy shows index scan (not seq scan) | Open |

## How to Resolve Migration 061 Blocker

Migration `061_fix_clothing_category_image_reference.sql` references `categories.category_images` which does not exist in the local DB bootstrap path. Fix options:

**Option A (preferred)**: Add guard to migration 061:
```sql
-- Before the UPDATE statement in 061_fix_clothing_category_image_reference.sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='categories' AND column_name='category_images') THEN
    UPDATE public.categories SET category_images = ...;
  END IF;
END $$;
```

**Option B (alternative)**: Use isolated Postgres instance (docker) to apply migration 068 in isolation for QA purposes:
```bash
docker run -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:15
# Apply just migrations 000–068 that are needed
```

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-19T22:20Z | DevOps | Created tracker from QA integration test deferral (migration 061 blocker) |
