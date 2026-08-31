-- =====================================================
-- CATEGORIZE EXISTING OFFERS
-- =====================================================
-- This migration assigns categories to existing offers based on their names
-- Uses ONLY existing categories (no new categories created)
-- =====================================================

-- Available categories:
-- '20c10efe-404b-4a39-bb81-5089a0332d78' - Essen & Trinken (Food & Drink)
-- '21e8a577-f42c-499d-a277-0b8ba327c00b' - Bildung & Lernen (Education)
-- '49563bf0-6962-4fd8-9147-5e68e9310eb1' - Kleidung & Mode (Clothing & Fashion)
-- 'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d' - Gesundheit & Sport (Health & Sports)
-- 'b43ba9ba-965e-46f8-a97e-c76d352c2ff0' - Handwerk & Reparatur (Crafts & Repair)
-- '1288f269-2cdb-47e8-bd8e-9d552ff25e83' - Dienstleistungen (Services)
-- '4470c3e0-458f-40a6-a96e-ca0fbdf145d7' - Gemeinschaft & Spenden (Community Support)
-- '5e5d910d-d790-4184-a061-9cd74d0950e8' - Sonstiges (Other) - Default

-- FOOD & BEVERAGES (Essen & Trinken)
UPDATE public.offers
SET category_id = '20c10efe-404b-4a39-bb81-5089a0332d78'
WHERE category_id IS NULL
AND (
  LOWER(name_de) IN ('kuchen', 'kaffee', 'kaffe', 'geback', 'gegrilltes', 'döner', 'burger', 'pide/pizza', 'pommes', 'essen', 'frühstück', 'brunch', 'mittagessen', 'mittagstisch', 'abendessen', 'catering', 'buffet', 'metzgerei (halal)', 'obst/gemüse', 'geback')
  OR LOWER(name_de) LIKE '%kuchen%'
  OR LOWER(name_de) LIKE '%kaffee%'
  OR LOWER(name_de) LIKE '%kaffe%'
  OR LOWER(name_de) LIKE '%geback%'
  OR LOWER(name_de) LIKE '%gegrilltes%'
  OR LOWER(name_de) LIKE '%döner%'
  OR LOWER(name_de) LIKE '%burger%'
  OR LOWER(name_de) LIKE '%pide%'
  OR LOWER(name_de) LIKE '%pizza%'
  OR LOWER(name_de) LIKE '%pommes%'
  OR LOWER(name_de) = 'essen'
  OR LOWER(name_de) LIKE '%frühstück%'
  OR LOWER(name_de) LIKE '%brunch%'
  OR LOWER(name_de) LIKE '%mittagessen%'
  OR LOWER(name_de) LIKE '%mittagstisch%'
  OR LOWER(name_de) LIKE '%abendessen%'
  OR LOWER(name_de) LIKE '%catering%'
  OR LOWER(name_de) LIKE '%buffet%'
  OR LOWER(name_de) LIKE '%metzgerei%'
  OR LOWER(name_de) LIKE '%obst%'
  OR LOWER(name_de) LIKE '%gemüse%'
);

-- HEALTH & SPORTS (Gesundheit & Sport)
UPDATE public.offers
SET category_id = 'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d'
WHERE category_id IS NULL
AND (
  LOWER(name_de) LIKE '%massage%'
  OR LOWER(name_de) LIKE '%ernährung%'
  OR LOWER(name_de) LIKE '%hijama%'
  OR LOWER(name_de) LIKE '%schröpfen%'
  OR LOWER(name_de) LIKE '%heilpraktiker%'
  OR LOWER(name_de) LIKE '%chiropraktiker%'
  OR LOWER(name_de) LIKE '%physiotherapie%'
  OR LOWER(name_de) LIKE '%therapie%'
  OR LOWER(name_de) LIKE '%behandlung%'
  OR LOWER(name_de) LIKE '%alternative medizin%'
  OR LOWER(name_de) LIKE '%wellness%'
  OR LOWER(name_de) LIKE '%fitness%'
  OR LOWER(name_de) LIKE '%vorsorge%'
  OR LOWER(name_de) LIKE '%diagnostik%'
);

-- EDUCATION (Bildung & Lernen)
UPDATE public.offers
SET category_id = '21e8a577-f42c-499d-a277-0b8ba327c00b'
WHERE category_id IS NULL
AND (
  LOWER(name_de) LIKE '%quran%'
  OR LOWER(name_de) LIKE '%gebete%'
  OR LOWER(name_de) LIKE '%beten%'
  OR LOWER(name_de) LIKE '%dhikr%'
);

-- CLOTHING & FASHION (Kleidung & Mode)
UPDATE public.offers
SET category_id = '49563bf0-6962-4fd8-9147-5e68e9310eb1'
WHERE category_id IS NULL
AND (
  LOWER(name_de) LIKE '%kleidung%'
  OR LOWER(name_de) LIKE '%mode%'
  OR LOWER(name_de) LIKE '%styling%'
  OR LOWER(name_de) LIKE '%maßanfertigung%'
  OR LOWER(name_de) LIKE '%änderung%'
  OR LOWER(name_de) LIKE '%modestrecken%'
);

-- CRAFTS & REPAIR (Handwerk & Reparatur)
UPDATE public.offers
SET category_id = 'b43ba9ba-965e-46f8-a97e-c76d352c2ff0'
WHERE category_id IS NULL
AND (
  LOWER(name_de) LIKE '%renovierung%'
  OR LOWER(name_de) LIKE '%wartung%'
  OR LOWER(name_de) LIKE '%installation%'
  OR LOWER(name_de) LIKE '%reparatur%'
  OR LOWER(name_de) LIKE '%rolläden%'
  OR LOWER(name_de) LIKE '%fenster%'
  OR LOWER(name_de) LIKE '%türen%'
  OR LOWER(name_de) LIKE '%austausch%'
);

-- SERVICES (Dienstleistungen) - catch-all for services, tech, transport, real estate, etc.
UPDATE public.offers
SET category_id = '1288f269-2cdb-47e8-bd8e-9d552ff25e83'
WHERE category_id IS NULL
AND (
  -- General services
  LOWER(name_de) LIKE '%dienstleistung%'
  OR LOWER(name_de) LIKE '%support%'
  OR LOWER(name_de) LIKE '%verkauf%'
  OR LOWER(name_de) = 'sales'
  OR LOWER(name_de) LIKE '%events%'
  OR LOWER(name_de) LIKE '%notdienst%'
  OR LOWER(name_de) LIKE '%finanzierung%'
  -- Technology
  OR LOWER(name_de) LIKE '%datenanalyse%'
  OR LOWER(name_de) LIKE '%cybersecurity%'
  OR LOWER(name_de) LIKE '%it-support%'
  OR LOWER(name_de) LIKE '%cloud%'
  OR LOWER(name_de) LIKE '%software%'
  OR LOWER(name_de) LIKE '%app-entwicklung%'
  OR LOWER(name_de) LIKE '%webentwicklung%'
  OR LOWER(name_de) LIKE '%hosting%'
  OR LOWER(name_de) LIKE '%logo-design%'
  OR LOWER(name_de) LIKE '%web-design%'
  -- Transport
  OR LOWER(name_de) LIKE '%transport%'
  OR LOWER(name_de) LIKE '%lieferung%'
  OR LOWER(name_de) LIKE '%lieferservice%'
  OR LOWER(name_de) LIKE '%expressversand%'
  OR LOWER(name_de) LIKE '%kurier%'
  OR LOWER(name_de) LIKE '%möbeltransport%'
  OR LOWER(name_de) LIKE '%umzüge%'
  OR LOWER(name_de) LIKE '%lagerhaltung%'
  -- Real Estate
  OR LOWER(name_de) LIKE '%immobilien%'
  OR LOWER(name_de) LIKE '%vermieter%'
  OR LOWER(name_de) LIKE '%makler%'
  OR LOWER(name_de) LIKE '%hausverwaltung%'
  OR LOWER(name_de) LIKE '%bewertung%'
);

-- COMMUNITY & CHARITY (Gemeinschaft & Spenden)
UPDATE public.offers
SET category_id = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7'
WHERE category_id IS NULL
AND (
  LOWER(name_de) LIKE '%palestine%'
  OR LOWER(name_de) LIKE '%postkarten%'
  OR LOWER(name_de) LIKE '%wohltätigkeitsprojekt%'
  OR LOWER(name_de) LIKE '%spendensammlung%'
  OR LOWER(name_de) LIKE '%infrastrukturprojekt%'
  OR LOWER(name_de) LIKE '%bildungsprojekt%'
  OR LOWER(name_de) LIKE '%humanitäre%'
  OR LOWER(name_de) LIKE '%hilfe%'
  OR LOWER(name_de) LIKE '%gesundheitsprojekt%'
);

-- DEFAULT: Assign remaining NULL offers to "Sonstiges" (Other)
UPDATE public.offers
SET category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8'
WHERE category_id IS NULL;

-- Verify all offers now have a category_id (should return 0)
-- SELECT COUNT(*) as uncategorized_offers FROM public.offers WHERE category_id IS NULL;
