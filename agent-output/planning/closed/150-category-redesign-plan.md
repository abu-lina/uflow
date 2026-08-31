---
ID: 150
Origin: 150
Status: Committed
---

# Plan 150: Category Taxonomy Redesign

## Changelog
| Date | Agent | Description |
|------|-------|-------------|
| 2026-06-06 | Planner | Initial plan |
| 2026-06-06 | DevOps | Document closed | Status: Committed |

## Value Statement

Solve the provider category taxonomy gap: add dish types, dietary labels, meal types, and store categories so every provider can find a fit. Currently 12 food categories (all cuisine-based) and 2 store categories force providers like O'Tacos (French-style tacos) into mismatched buckets.

## Problem Analysis

1. **Ethnicity-only model** — All 12 food categories are nationality/ethnicity-based cuisines. No dish types (Pizza, Burger, Sushi), no dietary (Vegetarian, Vegan), no meal types (Breakfast, Desserts).
2. **O'Tacos** — Serves French-style wrapped tacos. No "French" cuisine, no "Tacos" dish type. Only option is "Amerikanisch" or nothing.
3. **"Indisch-Pakistanisch"** — Merges two distinct cuisines with different flavor profiles.
4. **"Balkan-"** — Trailing dash.
5. **Store categories** — Only "Lebensmittel" (Groceries) + generic legacy categories (Kleidung & Mode, Gesundheit & Sport) that lack proper `applicable_section` scoping.
6. **Legacy NULL-section categories** — 8 categories from the original seed (Bildung & Lernen, Sonstiges, Gemeinschaft & Spenden, etc.) have `applicable_section = NULL` and are catch-all buckets used by old providers.
7. **Single category per provider** — `providers.category_id` is a single FK. No junction table for multi-category.

## Recommendations

### Decision 1: Flat tag system (no hierarchy)

**Recommendation: Keep flat for now, add `category_type` metadata column.**

- The schema has no hierarchy support (no `parent_id`, no pivot table). Adding hierarchy is a larger schema migration.
- Each provider has exactly one `category_id`. A flat list is simpler for selection UX.
- Add `category_type` enum to enable UI filtering/sectioning without hierarchy.
- *Future:* If multi-category support is needed, add a `provider_categories` junction table (Plan 150+ follow-up).

### Decision 2: Category count — target ~48 food + ~10 store

- **Food cuisines**: 20 (12 existing + 8 new)
- **Food dish types**: 12 (new)
- **Food dietary**: 2 (new)
- **Food meals**: 4 (new)
- **Store types**: 10 (2 existing + 8 new)
- **Total food**: ~38, **Total store**: ~10, **Total**: ~48 new DB rows

### Decision 3: O'Tacos — Add French cuisine + Tacos dish type

O'Tacos is a French chain serving wrapped tortillas. Adding "Französisch" (French) cuisine solves it directly. Adding "Tacos" as a dish type solves it for the generic tacos/casual segment. Either works as a primary category.

### Decision 4: Split Indisch-Pakistanisch → Indisch + Pakistanisch

**Yes, split.** Keep the merged category as legacy (existing providers keep it). Add two new categories so new providers can choose the correct one.

### Decision 5: Store category expansion

Add scoped store categories: Lebensmittel, Gesundheit & Sport, Bekleidung, Elektronik, Haushalt, Geschenke, Bücher, Kosmetik, Baby, Schreibwaren.

### Decision 6: Migration — Additive only

All existing categories remain. New categories inserted via idempotent SQL. Editors reassign providers manually or via admin bulk update. No provider loses its current category.

## Proposed Taxonomy

### `category_type` enum

Add a new column `category_type` to `public.categories`:

```sql
CREATE TYPE public.category_type_enum AS ENUM (
  'cuisine',       -- nationality/regional cuisine
  'dish_type',     -- specific dish category (Pizza, Burger, Sushi)
  'dietary',       -- diet-focused (Vegetarian, Vegan)
  'meal',          -- meal time (Breakfast, Desserts)
  'store_type'     -- store category (Groceries, Electronics)
);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS category_type public.category_type_enum;
```

This enables:
- UI to group "Cuisine types" vs "Dish types" vs "Dietary" in the provider creation dropdown
- Search filtering: "only show cuisine categories" vs "all food categories"
- Future: custom sort order per type

### Updated `applicable_section` constraint

-- Note: The applicable_section CHECK constraint already allows 'store'.
-- Migration 083 (M5a) replaced 'business' with 'store' in the constraint.
-- No change needed here.

## Category Table

### Food — Cuisines (20)

| name_de | name_en | section | category_type | notes |
|---------|---------|---------|---------------|-------|
| Nordafrikanisch | North African | food | cuisine | Existing. Keep as-is. |
| Afghanisch | Afghan | food | cuisine | Existing. |
| Persisch | Persian | food | cuisine | Existing. |
| Balkan | Balkan | food | cuisine | **Rename** from "Balkan-" — fix trailing dash |
| Arabisch | Arabic | food | cuisine | Existing. |
| Indisch | Indian | food | cuisine | **New.** Split from Indisch-Pakistanisch |
| Pakistanisch | Pakistani | food | cuisine | **New.** Split from Indisch-Pakistanisch |
| Ostafrikanisch | East African | food | cuisine | Existing. |
| Südostasiatisch | Southeast Asian | food | cuisine | Existing. |
| Türkisch | Turkish | food | cuisine | Existing. |
| Deutsche Küche (Halal) | German Cuisine (Halal) | food | cuisine | Existing. |
| Westafrikanisch | West African | food | cuisine | Existing. |
| Amerikanisch | American | food | cuisine | Existing. |
| Französisch | French | food | cuisine | **New.** Solves O'Tacos |
| Italienisch | Italian | food | cuisine | **New.** Pizza, Pasta restaurants |
| Griechisch | Greek | food | cuisine | **New.** |
| Chinesisch | Chinese | food | cuisine | **New.** |
| Japanisch | Japanese | food | cuisine | **New.** Sushi, Ramen |
| Thailändisch | Thai | food | cuisine | **New.** |
| Mediterran | Mediterranean | food | cuisine | **New.** Catch-all for Eastern Med |

### Food — Dish Types (12)

| name_de | name_en | section | category_type | notes |
|---------|---------|---------|---------------|-------|
| Pizza | Pizza | food | dish_type | **New.** |
| Burger | Burger | food | dish_type | **New.** |
| Sushi | Sushi | food | dish_type | **New.** |
| Kebab / Döner | Kebab / Döner | food | dish_type | **New.** |
| Pasta / Nudeln | Pasta | food | dish_type | **New.** |
| Tacos | Tacos / Wraps | food | dish_type | **New.** Covers O'Tacos, wraps, burritos |
| BBQ / Grill | BBQ / Grill | food | dish_type | **New.** |
| Fried Chicken | Fried Chicken | food | dish_type | **New.** |
| Suppen | Soups | food | dish_type | **New.** |
| Bowl | Bowls | food | dish_type | **New.** |
| Sandwiches | Sandwiches | food | dish_type | **New.** |
| Nudelsuppe (Pho/Ramen) | Noodle Soup | food | dish_type | **New.** |

### Food — Dietary (2)

| name_de | name_en | section | category_type | notes |
|---------|---------|---------|---------------|-------|
| Vegetarisch | Vegetarian | food | dietary | **New.** |
| Vegan | Vegan | food | dietary | **New.** |

### Food — Meal Types (4)

| name_de | name_en | section | category_type | notes |
|---------|---------|---------|---------------|-------|
| Frühstück / Brunch | Breakfast / Brunch | food | meal | **New.** |
| Desserts / Eis | Desserts / Ice Cream | food | meal | **New.** |
| Salate | Salads | food | meal | **New.** |
| Kuchen / Café | Cake / Café | food | meal | **New.** |

### Store — Store Types (10)

| name_de | name_en | section | category_type | notes |
|---------|---------|---------|---------------|-------|
| Lebensmittel | Groceries | store | store_type | Existing. |
| Gesundheit & Sport | Health & Sports | store | store_type | **Rescoped.** Set `applicable_section = 'store'` |
| Bekleidung & Mode | Clothing & Fashion | store | store_type | **Rescoped.** Set `applicable_section = 'store'` |
| Elektronik | Electronics | store | store_type | **New.** |
| Haushalt & Wohnen | Household & Living | store | store_type | **New.** |
| Kosmetik & Pflege | Cosmetics & Care | store | store_type | **New.** |
| Bücher & Medien | Books & Media | store | store_type | **New.** |
| Geschenke & Deko | Gifts & Decor | store | store_type | **New.** |
| Baby & Kind | Baby & Child | store | store_type | **New.** |
| Schreibwaren & Büro | Stationery & Office | store | store_type | **New.** |

### Legacy NULL-section categories (unchanged — backward compat)

| name_de | name_en | section | category_type | notes |
|---------|---------|---------|---------------|-------|
| Bildung & Lernen | Education | NULL | NULL | Unchanged. |
| Sonstiges | Other | NULL | NULL | Unchanged. |
| Gemeinschaft & Spenden | Community Support | NULL | NULL | Unchanged. |
| Essen & Trinken | Food & Drink | NULL | NULL | Unchanged. |
| Dienstleistungen | Services | NULL | NULL | Unchanged. |
| Handwerk & Reparatur | Crafts & Repair | NULL | NULL | Unchanged. |

## DB Migration Plan

### Migration 1: Schema changes

`supabase/migrations/100_plan_150_category_type_and_store_section.sql`

```sql
BEGIN;

-- 1. Add category_type enum
DO $$ BEGIN
  CREATE TYPE public.category_type_enum AS ENUM (
    'cuisine', 'dish_type', 'dietary', 'meal', 'store_type'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add category_type column
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS category_type public.category_type_enum;

-- 3. Note: applicable_section CHECK constraint already allows 'store'.
-- Migration 083 (M5a) replaced 'business' with 'store'.
-- No constraint change needed here.

COMMIT;
```

### Migration 2: Fix "Balkan-" name

```sql
UPDATE public.categories
SET name_de = 'Balkan', name_en = 'Balkan', updated_at = now()
WHERE category_id = 'd2cef2bf-bd0b-4b54-8606-ac371a1e1588'::uuid;
```

### Migration 3: New food categories (38 INSERT rows)

Follow the idempotent pattern from `097_plan_147_add_store_category_lebensmittel.sql`:

```sql
INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT 'GENERATED_UUID_1'::uuid, 'Französisch', 'French', 'Französische Küche – halal zubereitet', 'French cuisine – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'french');
```

38 new categories — generate fresh UUIDs for each. Use one migration file with all INSERTs wrapped in a single transaction.

### Migration 4: New store categories (8 INSERT rows)

Same idempotent pattern.

### Migration 5: Rescope legacy store categories

Set `applicable_section = 'store'` for Gesundheit & Sport and Kleidung & Mode:

```sql
UPDATE public.categories
SET applicable_section = 'store',
    category_type = 'store_type'::public.category_type_enum,
    updated_at = now()
WHERE category_id IN ('df8e549d-54c4-48ef-8e0b-c5a6646fcb7d'::uuid, '49563bf0-6962-4fd8-9147-5e68e9310eb1'::uuid);
```

## UI Changes

### Provider creation/edit — Category selector

**File**: `src/app/(dashboard)/dashboard/providers/[id]/edit/category/page.tsx`

- Group categories in the `<select>` dropdown by `category_type`:
  ```
  ── Cuisines ──
  Afghanisch
  Arabisch
  ...
  ── Dish Types ──
  Pizza
  Burger
  ...
  ── Dietary ──
  Vegetarisch
  Vegan
  ── Meal Types ──
  Frühstück / Brunch
  Desserts / Eis
  ```
- Add `category_type` to the fetched Category interface
- Use `<optgroup>` or a custom grouped list UI
- Filter by `applicable_section` matching the provider's `listing_type`

### Public search — Category filter

**File**: `src/app/(public)/providers/page.tsx` (and search components)

- Keep flat category list in search filter (grouping adds complexity)
- In future: add a `type` radio toggle above the filter: "All" | "Cuisine" | "Dish Type"

## Provider Migration

### Manual reassignment (Phase 1)

- Existing providers under "Indisch-Pakistanisch" → editor assigns to "Indisch" or "Pakistanisch" per-provider
- Existing providers under "Balkan-" → automatically fixed by the rename SQL
- No automatic remapping (avoids wrong assignments)

### Admin bulk action (Phase 2, optional)

- Add a "Reassign category" admin bulk action for migrating groups of providers
- Low priority — manual reassignment for current provider count is manageable

## i18n Updates

No new translation files needed — `name_de` and `name_en` are stored in DB, not in `next-intl` message files. The category picker reads directly from the DB.

If a category filter label like "Cuisine types" / "Dish types" is shown in the UI, add two i18n keys:

```json
{
  "categories.type.cuisine": "Cuisine Types",
  "categories.type.dish_type": "Dish Types",
  "categories.type.dietary": "Dietary",
  "categories.type.meal": "Meal Types",
  "categories.type.store_type": "Store Types"
}
```

## Phasing

### Phase 1 (Plan 150 core) — Schema + Seed Data
- Migration 1: Schema changes (category_type column, constraint update)
- Add `category_type` field to TypeScript Category interface in `src/services/categories.ts` — do this in Phase 1, not Phase 2, since the column exists in the DB immediately after Migration 1
- Update `PROVIDER_CATEGORY_SECTION_SCOPES` in `src/services/categories.ts` from `['food', 'store', 'business', 'all']` to `['food', 'store', 'all']` (remove the stale `'business'` entry)
- Migration 2: Fix Balkan- name
- Migration 3: New food categories (38 rows)
- Migration 4: New store categories (8 rows)
- Migration 5: Rescope legacy store categories
- Total: 5 migration files

### Phase 2 — UI Grouping
- Update category selector to group by `category_type`
- Add i18n keys for group labels
- Update `getCategoriesForSection` to return `category_type`

### Phase 3 — Provider Reassignment
- Manual reassignment by editors (ongoing)
- Bulk admin tool if needed

## Open Questions

1. **Multi-category per provider?** — Currently each provider has one `category_id`. Should a provider be able to select e.g. "Italienisch" + "Pizza" + "Vegetarisch"? If yes, this needs a `provider_categories` junction table. Defer to post-150.
2. **Should old legacy NULL-section categories be deprecated?** — They're still used by some providers. Keep them as-is, don't show them in new creation flows for food/store.
3. **"Essen & Trinken" (legacy) vs new food categories** — Some old providers use this. Keep it but don't show it in the food section's creation flow.
4. **"Kebab / Döner" overlap with "Türkisch"** — A Döner shop could fit under either. The dish type is for specialized Döner/Kebab shops; cuisine is for full Turkish restaurants. Editorial guidance needed.
5. **Should dietary categories (Vegetarian, Vegan) be food-only?** — Yes, they're food section categories. A store could be "health food store" under "Lebensmittel".
6. **Category images for new categories?** — Existing pattern stores images in `category_images` JSONB. New categories can be added without images initially.
