-- Migration 154: city population + default-order RPC (#953)
--
-- The default list with no city (/food, stores, ummah) was newest-first, so one
-- chain's bulk import filled the first screen. get_default_order_providers
-- returns provider ids in the order the owner chose: city population desc,
-- then city name, provider name, provider_id (stable paging). The app applies the
-- page-1 brand cap and paginates over this list.
--
-- Join key: providers.address_city = cities.city_name (no FK exists).
-- Written against the live PROD schema (owner-run query, 2026-11-19; cities.population
-- absent, city_name text). Not run against prod; DEV/UAT parity is unverified.
-- Indexes: idx_cities_name (cities.city_name) and idx_providers_city
-- (providers.address_city) already exist from 001_baseline; none added here.
-- Idempotent: ADD COLUMN IF NOT EXISTS is metadata-only, CREATE OR REPLACE FUNCTION.
-- Population figures: Destatis 2023, rounded to nearest 1000. Cities missing
-- from the list keep NULL and sort last.

BEGIN;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS population integer;

COMMENT ON COLUMN public.cities.population IS
  'Approximate city population (Destatis 2023). Drives the default list order with no city filter (#953).';

UPDATE public.cities c
SET population = v.population
FROM (VALUES
  ('Berlin', 3645000),
  ('Hamburg', 1853000),
  ('München', 1488000),
  ('Köln', 1084000),
  ('Frankfurt', 773000),
  ('Stuttgart', 634000),
  ('Leipzig', 620000),
  ('Düsseldorf', 619000),
  ('Dortmund', 588000),
  ('Essen', 579000),
  ('Bremen', 563000),
  ('Dresden', 556000),
  ('Hannover', 537000),
  ('Nürnberg', 515000),
  ('Duisburg', 496000),
  ('Bochum', 365000),
  ('Wuppertal', 355000),
  ('Bielefeld', 334000),
  ('Bonn', 331000),
  ('Münster', 317000),
  ('Mannheim', 309000),
  ('Karlsruhe', 308000),
  ('Augsburg', 296000),
  ('Wiesbaden', 278000),
  ('Mönchengladbach', 261000),
  ('Gelsenkirchen', 260000),
  ('Braunschweig', 249000),
  ('Aachen', 249000),
  ('Chemnitz', 248000),
  ('Kiel', 242000),
  ('Halle', 238000),
  ('Magdeburg', 232000),
  ('Freiburg', 231000),
  ('Krefeld', 227000),
  ('Mainz', 218000),
  ('Lübeck', 216000),
  ('Erfurt', 213000),
  ('Oberhausen', 211000),
  ('Rostock', 209000),
  ('Kassel', 202000),
  ('Hagen', 189000),
  ('Potsdam', 183000),
  ('Hamm', 180000),
  ('Saarbrücken', 177000),
  ('Ludwigshafen', 172000),
  ('Oldenburg', 171000),
  ('Mülheim', 170000),
  ('Osnabrück', 165000),
  ('Leverkusen', 163000),
  ('Heidelberg', 160000),
  ('Darmstadt', 157000),
  ('Solingen', 155000),
  ('Regensburg', 155000),
  ('Herne', 155000),
  ('Paderborn', 151000),
  ('Neuss', 151000),
  ('Ingolstadt', 141000),
  ('Offenbach', 130000),
  ('Fürth', 130000),
  ('Würzburg', 127000),
  ('Ulm', 126000),
  ('Pforzheim', 125000),
  ('Heilbronn', 124000),
  ('Wolfsburg', 124000),
  ('Göttingen', 119000),
  ('Bottrop', 117000),
  ('Reutlingen', 115000),
  ('Bremerhaven', 115000),
  ('Recklinghausen', 115000),
  ('Koblenz', 114000),
  ('Erlangen', 113000),
  ('Trier', 112000),
  ('Remscheid', 110000),
  ('Jena', 108000),
  ('Salzgitter', 103000),
  ('Frankfurt am Main', 773000),
  ('Halle (Saale)', 238000),
  ('Mülheim an der Ruhr', 170000)
) AS v(city_name, population)
WHERE c.city_name = v.city_name;

CREATE OR REPLACE FUNCTION public.get_default_order_providers(
  section_filter text DEFAULT NULL,
  review_status_filter text DEFAULT 'approved'
)
RETURNS TABLE (provider_id uuid, provider_name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.provider_id, p.provider_name
  FROM public.providers p
  LEFT JOIN (
    SELECT city_name, max(population) AS population
    FROM public.cities
    GROUP BY city_name
  ) c ON c.city_name = p.address_city
  WHERE (section_filter IS NULL OR p.listing_type::text = section_filter)
    AND (review_status_filter = 'all' OR p.review_status::text = review_status_filter)
  ORDER BY c.population DESC NULLS LAST, p.address_city ASC, p.provider_name ASC, p.provider_id ASC;
$$;

REVOKE ALL ON FUNCTION public.get_default_order_providers(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_default_order_providers(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_default_order_providers(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_order_providers(text, text) TO service_role;

COMMIT;
