-- Plan 150: Category Taxonomy Redesign -- Phase 1
-- Date: 2026-06-06
-- Changes:
--   1. Add category_type_enum and category_type column
--   2. Fix Balkan- name (trailing dash)
--   3. Insert new food categories (cuisines, dish types, dietary, meals)
--   4. Insert new store categories
--   5. Rescope legacy store categories (Gesundheit & Sport, Kleidung & Mode)
--   6. Set category_type on Lebensmittel

BEGIN;

-- =============================================================================
-- Step 1: Add category_type_enum and category_type column
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.category_type_enum AS ENUM (
    'cuisine', 'dish_type', 'dietary', 'meal', 'store_type'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS category_type public.category_type_enum;

-- =============================================================================
-- Step 2: Fix Balkan- name (trailing dash)
-- =============================================================================
UPDATE public.categories
SET name_de = 'Balkan', name_en = 'Balkan', updated_at = now()
WHERE category_id = 'd2cef2bf-bd0b-4b54-8606-ac371a1e1588'::uuid;

-- =============================================================================
-- Step 3: Insert new food categories — CUISINES (9)
-- =============================================================================

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Französisch', 'French', 'Französische Küche – halal zubereitet', 'French cuisine – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'french' OR lower(coalesce(name_de, '')) = 'französisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Italienisch', 'Italian', 'Pizza, Pasta und italienische Spezialitäten – halal zubereitet', 'Pizza, pasta and Italian specialties – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'italian' OR lower(coalesce(name_de, '')) = 'italienisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Griechisch', 'Greek', 'Griechische Spezialitäten – halal zubereitet', 'Greek specialties – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'greek' OR lower(coalesce(name_de, '')) = 'griechisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Chinesisch', 'Chinese', 'Chinesische Küche – halal zubereitet', 'Chinese cuisine – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'chinese' OR lower(coalesce(name_de, '')) = 'chinesisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Japanisch', 'Japanese', 'Japanische Küche – Sushi, Ramen und mehr', 'Japanese cuisine – sushi, ramen and more', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'japanese' OR lower(coalesce(name_de, '')) = 'japanisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Thailändisch', 'Thai', 'Thailändische Küche – halal zubereitet', 'Thai cuisine – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'thai' OR lower(coalesce(name_de, '')) = 'thailändisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Mediterran', 'Mediterranean', 'Mediterrane Küche – halal zubereitet', 'Mediterranean cuisine – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'mediterranean' OR lower(coalesce(name_de, '')) = 'mediterran');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Indisch', 'Indian', 'Indische Currys, Biryani und Gewürzvielfalt', 'Indian curries, biryani and rich spice diversity', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'indian' OR lower(coalesce(name_de, '')) = 'indisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Pakistanisch', 'Pakistani', 'Pakistanische Küche – halal zubereitet', 'Pakistani cuisine – prepared the halal way', 'food', 'cuisine'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'pakistani' OR lower(coalesce(name_de, '')) = 'pakistanisch' OR (lower(coalesce(name_en, '')) = 'indian-pakistani'));

-- =============================================================================
-- Step 3b: Insert new food categories — DISH TYPES (12)
-- =============================================================================

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Pizza', 'Pizza', 'Frisch zubereitete Pizza – halal belegt', 'Freshly prepared pizza – halal topped', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'pizza' OR lower(coalesce(name_de, '')) = 'pizza');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Burger', 'Burger', 'Saftige Burger – halal vom Grill', 'Juicy burgers – halal grilled', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'burger' OR lower(coalesce(name_de, '')) = 'burger');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Sushi', 'Sushi', 'Frisches Sushi – halal zubereitet', 'Fresh sushi – halal prepared', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'sushi' OR lower(coalesce(name_de, '')) = 'sushi');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Kebab / Döner', 'Kebab / Döner', 'Kebab, Döner und mehr – halal vom Spieß', 'Kebab, döner and more – halal from the spit', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) LIKE '%kebab%' OR lower(coalesce(name_de, '')) LIKE '%kebab%' OR lower(coalesce(name_de, '')) LIKE '%döner%' OR lower(coalesce(name_de, '')) LIKE '%doener%');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Pasta / Nudeln', 'Pasta', 'Pasta und Nudelgerichte – halal zubereitet', 'Pasta and noodle dishes – prepared the halal way', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'pasta' OR lower(coalesce(name_de, '')) = 'pasta' OR lower(coalesce(name_de, '')) = 'pasta / nudeln');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Tacos / Wraps', 'Tacos / Wraps', 'Tacos, Wraps und Burritos – halal gefüllt', 'Tacos, wraps and burritos – halal filled', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'tacos / wraps' OR lower(coalesce(name_de, '')) = 'tacos / wraps' OR lower(coalesce(name_en, '')) = 'tacos');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'BBQ / Grill', 'BBQ / Grill', 'Grillspezialitäten – halal vom Rost', 'BBQ specialties – halal grilled', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'bbq / grill' OR lower(coalesce(name_de, '')) = 'bbq / grill' OR lower(coalesce(name_en, '')) = 'bbq');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Fried Chicken', 'Fried Chicken', 'Knuspriges Fried Chicken – halal paniert', 'Crispy fried chicken – halal breaded', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'fried chicken' OR lower(coalesce(name_de, '')) = 'fried chicken');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Suppen', 'Soups', 'Herzhafte Suppen – halal gekocht', 'Hearty soups – halal cooked', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'soups' OR lower(coalesce(name_de, '')) = 'suppen');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Bowl', 'Bowls', 'Bowl-Gerichte – gesund und halal', 'Bowl dishes – healthy and halal', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'bowls' OR lower(coalesce(name_de, '')) = 'bowl');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Sandwiches', 'Sandwiches', 'Sandwiches und belegte Brötchen – halal', 'Sandwiches and filled rolls – halal', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'sandwiches' OR lower(coalesce(name_de, '')) = 'sandwiches');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Nudelsuppe (Pho/Ramen)', 'Noodle Soup', 'Pho, Ramen und asiatische Nudelsuppen', 'Pho, ramen and Asian noodle soups', 'food', 'dish_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'noodle soup' OR lower(coalesce(name_de, '')) = 'nudelsuppe (pho/ramen)' OR lower(coalesce(name_de, '')) LIKE '%nudelsuppe%');

-- =============================================================================
-- Step 3c: Insert new food categories — DIETARY (2)
-- =============================================================================

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Vegetarisch', 'Vegetarian', 'Vegetarische Gerichte – halal und fleischlos', 'Vegetarian dishes – halal and meat-free', 'food', 'dietary'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'vegetarian' OR lower(coalesce(name_de, '')) = 'vegetarisch');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Vegan', 'Vegan', 'Vegane Gerichte – halal und pflanzlich', 'Vegan dishes – halal and plant-based', 'food', 'dietary'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'vegan' OR lower(coalesce(name_de, '')) = 'vegan');

-- =============================================================================
-- Step 3d: Insert new food categories — MEAL TYPES (4)
-- =============================================================================

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Frühstück / Brunch', 'Breakfast / Brunch', 'Frühstück und Brunch – halal', 'Breakfast and brunch – halal', 'food', 'meal'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'breakfast / brunch' OR lower(coalesce(name_de, '')) = 'frühstück / brunch' OR lower(coalesce(name_en, '')) = 'breakfast');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Desserts / Eis', 'Desserts / Ice Cream', 'Süße Desserts und Eis – halal', 'Sweet desserts and ice cream – halal', 'food', 'meal'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'desserts / ice cream' OR lower(coalesce(name_de, '')) = 'desserts / eis' OR lower(coalesce(name_de, '')) = 'desserts');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Salate', 'Salads', 'Frische Salate – halal zubereitet', 'Fresh salads – prepared the halal way', 'food', 'meal'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'salads' OR lower(coalesce(name_de, '')) = 'salate');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Kuchen / Café', 'Cake / Café', 'Kuchen, Café und Backwaren', 'Cake, café and baked goods', 'food', 'meal'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'cake / café' OR lower(coalesce(name_de, '')) = 'kuchen / café' OR lower(coalesce(name_de, '')) = 'kuchen');

-- =============================================================================
-- Step 4: Insert new store categories (7 new store types)
-- =============================================================================

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Elektronik', 'Electronics', 'Elektronik und Technik – halal konform', 'Electronics and technology – halal compliant', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'electronics' OR lower(coalesce(name_de, '')) = 'elektronik');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Haushalt & Wohnen', 'Household & Living', 'Haushaltswaren und Wohnaccessoires', 'Household items and living accessories', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'household & living' OR lower(coalesce(name_de, '')) = 'haushalt & wohnen');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Kosmetik & Pflege', 'Cosmetics & Care', 'Halal-Kosmetik und Körperpflege', 'Halal cosmetics and personal care', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'cosmetics & care' OR lower(coalesce(name_de, '')) = 'kosmetik & pflege');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Bücher & Medien', 'Books & Media', 'Bücher, Medien und mehr', 'Books, media and more', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'books & media' OR lower(coalesce(name_de, '')) = 'bücher & medien');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Geschenke & Deko', 'Gifts & Decor', 'Geschenkartikel und Dekoration', 'Gift items and decoration', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'gifts & decor' OR lower(coalesce(name_de, '')) = 'geschenke & deko');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Baby & Kind', 'Baby & Child', 'Baby- und Kinderartikel', 'Baby and child products', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'baby & child' OR lower(coalesce(name_de, '')) = 'baby & kind');

INSERT INTO public.categories (category_id, name_de, name_en, description_de, description_en, applicable_section, category_type)
SELECT gen_random_uuid(), 'Schreibwaren & Büro', 'Stationery & Office', 'Schreibwaren und Bürobedarf', 'Stationery and office supplies', 'store', 'store_type'::public.category_type_enum
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE lower(coalesce(name_en, '')) = 'stationery & office' OR lower(coalesce(name_de, '')) = 'schreibwaren & büro');

-- =============================================================================
-- Step 5: Rescope legacy store categories + set category_type on Lebensmittel
-- =============================================================================

-- Gesundheit & Sport and Kleidung & Mode: set applicable_section and category_type
UPDATE public.categories
SET applicable_section = 'store',
    category_type = 'store_type'::public.category_type_enum,
    updated_at = now()
WHERE category_id IN ('df8e549d-54c4-48ef-8e0b-c5a6646fcb7d'::uuid, '49563bf0-6962-4fd8-9147-5e68e9310eb1'::uuid);

-- Set category_type on existing Lebensmittel (Groceries) category
UPDATE public.categories
SET category_type = 'store_type'::public.category_type_enum,
    updated_at = now()
WHERE category_id = '6507aea0-cff2-4804-82c6-422e57fbeaaa'::uuid;

COMMIT;
