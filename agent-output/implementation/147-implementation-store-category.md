---
ID: 147
Origin: 147
UUID: 6507aea0
Status: Active
---

# Implementation 147: Add Store Category "Lebensmittel"

## Summary
Created migration to add "Lebensmittel" (Groceries) category under the Store section.

## Files
- `supabase/migrations/097_plan_147_add_store_category_lebensmittel.sql` — Idempotent migration (INSERT + UPDATE)

## Pattern
Follows the same approach as `089_add_food_category_american.sql`:
- Idempotent INSERT with WHERE NOT EXISTS (checks UUID, name_de, name_en)
- UPDATE to normalize after insert
- Single transaction (BEGIN/COMMIT)

## Verification
- Category UUID: `6507aea0-cff2-4804-82c6-422e57fbeaaa`
- German name: "Lebensmittel"
- English name: "Groceries"
- Section: `store`

## TDD Compliance
N/A — Database migration, no application code to test.
