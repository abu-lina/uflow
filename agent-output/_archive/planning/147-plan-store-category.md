---
ID: 147
Origin: 147
UUID: 6507aea0
Status: Active
---

# Plan 147: Add "Lebensmittel" (Groceries) Store Category

## Changelog
| Date | Note |
|------|------|
| 2026-06-05 | Initial plan |

## Summary

Add a new "Lebensmittel" (Groceries) category scoped to the `store` section. YOLLA (a food/grocery provider currently categorized under `food`) will use this category to list their grocery offerings. The migration is idempotent: it inserts the row if missing, then normalizes it via UPDATE.

## Migration SQL

File: `supabase/migrations/097_plan_147_add_store_category_lebensmittel.sql`

```sql
-- Plan 147: Add "Lebensmittel" (Groceries) category for store section.
-- YOLLA and other grocery providers will use this to list pantry/daily essentials.

BEGIN;

INSERT INTO public.categories (
  category_id,
  name_de,
  name_en,
  description_de,
  description_en,
  applicable_section
)
SELECT
  '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid,
  'Lebensmittel',
  'Groceries',
  'Halal-Lebensmittel und Vorräte für die wöchentliche Versorgung',
  'Halal groceries and pantry essentials for your weekly needs',
  'store'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid
     OR lower(coalesce(c.name_en, '')) = 'groceries'
     OR lower(coalesce(c.name_de, '')) = 'lebensmittel'
);

UPDATE public.categories
SET
  name_de = 'Lebensmittel',
  name_en = 'Groceries',
  description_de = 'Halal-Lebensmittel und Vorräte für die wöchentliche Versorgung',
  description_en = 'Halal groceries and pantry essentials for your weekly needs',
  applicable_section = 'store',
  updated_at = now()
WHERE category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid
   OR lower(coalesce(name_en, '')) = 'groceries'
   OR lower(coalesce(name_de, '')) = 'lebensmittel';

COMMIT;
```

## Provider Registration for YOLLA

YOLLA (`e4ab54d4-ed4f-43cc-9d6a-d3fce6f3a9ea`) is currently set to `listing_type = 'food'` with a food-related `category_id`. To register them under the new "Lebensmittel" category:

1. **Via dashboard** — Navigate to provider edit for YOLLA, change `category_id` to `6507aea0-cff2-4804-82c6-422e57fbeaaa` and set `listing_type` to `store`. The dashboard should handle the `applicable_section` → `listing_type` alignment automatically.
2. **Via direct SQL** (if needed for backfill):
   ```sql
   UPDATE public.providers
   SET
     category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid,
     listing_type = 'store'::public.listing_type_enum,
     updated_at = now()
   WHERE provider_id = 'e4ab54d4-ed4f-43cc-9d6a-d3fce6f3a9ea';
   ```

## Verification Steps

1. **Migration applies cleanly** — Run the migration via Supabase or CLI. Verify no errors.
2. **Row exists** — `SELECT * FROM public.categories WHERE category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa';` returns one row with correct values.
3. **Idempotency** — Run the migration SQL again. Verify the row is unchanged (no duplicate, no error).
4. **Store section filtering** — Query categories scoped to store: `SELECT * FROM public.categories WHERE applicable_section = 'store';` should include the new row.
5. **YOLLA registration** — After updating YOLLA's category, verify the provider page renders correctly under the Store section with "Lebensmittel" as the category badge.

## Rollback

```sql
DELETE FROM public.categories WHERE category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid;
```
