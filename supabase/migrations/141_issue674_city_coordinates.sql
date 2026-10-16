-- Migration 141: city coordinates and nearest-city lookup (#674)
--
-- Onboarding lands on the map of the picked city when it has at least 6
-- approved providers (stage 2). Below that, "Explore UmmahFlow" opens the map
-- of the nearest city that has. Both need a position per city, and the
-- provider locations can't give one: on UAT only 4 of the 12 cities with
-- 6+ approved providers have any located pin. So cities get a center.
--
-- Coordinates were geocoded once with scripts/geocode-cities.ts (Nominatim,
-- city + country, settlements only) for the 20 listed cities and the 156
-- catalog rows from migration 140. Regions and countries in the catalog
-- (NRW, USA, Schleswig-Holstein, Österreich) are not settlements and stay
-- NULL. The UPDATE matches by name, so it is a no-op for rows that don't
-- exist yet: apply 140 before 141, or catalog rows seeded later stay NULL.
--
-- Doesn't read the directory-listing flag added in 140, so it applies with
-- or without 140 (UAT and dev don't have 140 yet).
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.get_nearest_city_with_providers(text, integer, numeric, numeric);
--   ALTER TABLE public.cities DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS longitude;

BEGIN;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

COMMENT ON COLUMN public.cities.latitude IS 'City center latitude (WGS84). NULL when unknown (#674).';
COMMENT ON COLUMN public.cities.longitude IS 'City center longitude (WGS84). NULL when unknown (#674).';

UPDATE public.cities AS c
SET latitude = v.latitude,
    longitude = v.longitude,
    updated_at = now()
FROM (VALUES
  ('Aachen', 50.77635, 6.08386),
  ('Aalen', 48.83756, 10.09296),
  ('Alfter', 50.73707, 7.00937),
  ('Altenstadt', 47.82366, 10.87346),
  ('Arnsberg', 51.40024, 8.06059),
  ('Augsburg', 48.36903, 10.89795),
  ('Bad Homburg', 50.22838, 8.61301),
  ('Bad Oeynhausen', 52.20144, 8.79812),
  ('Bad Rappenau', 49.23930, 9.10127),
  ('Baesweiler', 50.90746, 6.18263),
  ('Bedburg', 50.99722, 6.57676),
  ('Beirut', 33.89592, 35.47843),
  ('Bergheim', 50.95405, 6.64100),
  ('Bergisch Gladbach', 50.99293, 7.12774),
  ('Bergkamen', 51.61494, 7.63629),
  ('Berlin', 52.51739, 13.39513),
  ('Bielefeld', 52.01910, 8.53101),
  ('Bietigheim-Bissingen', 48.94932, 9.13642),
  ('Bochum', 51.48181, 7.21966),
  ('Bonn', 50.73526, 7.10246),
  ('Bottrop', 51.52158, 6.92920),
  ('Brackenheim', 49.07842, 9.06744),
  ('Braunschweig', 52.26466, 10.52361),
  ('Bremen', 53.07582, 8.80716),
  ('Bruchköbel', 50.18450, 8.93690),
  ('Burbach', 50.10644, 6.51772),
  ('Böblingen', 48.68497, 9.01134),
  ('Chemnitz', 50.83235, 12.91891),
  ('Cologne', 50.93836, 6.95997),
  ('Dachau', 48.25951, 11.43467),
  ('Darmstadt', 49.87277, 8.65118),
  ('Datteln', 51.65147, 7.33859),
  ('Dietzenbach', 50.01719, 8.78428),
  ('Dortmund', 51.51423, 7.46528),
  ('Dresden', 51.04933, 13.73814),
  ('Dubai', 25.26472, 55.29241),
  ('Duisburg', 51.43500, 6.75956),
  ('Düsseldorf', 51.22540, 6.77631),
  ('Ebersbach an der Fils', 48.71491, 9.52592),
  ('Emmendingen', 48.12066, 7.85099),
  ('Erfurt', 50.97780, 11.02874),
  ('Erkelenz', 51.08099, 6.31607),
  ('Essen', 51.45822, 7.01582),
  ('Euskirchen', 50.66129, 6.78717),
  ('Frankfurt am Main', 50.11064, 8.68209),
  ('Frechen', 50.90962, 6.80819),
  ('Freiburg', 47.99609, 7.84940),
  ('Freiburg im Breisgau', 47.99609, 7.84940),
  ('Freising', 48.40083, 11.74396),
  ('Gelsenkirchen', 51.51103, 7.09601),
  ('Germering', 48.13736, 11.36143),
  ('Gießen', 50.58621, 8.67423),
  ('Grevenbroich', 51.08625, 6.58489),
  ('Gröbenzell', 48.19423, 11.37091),
  ('Gärtringen', 48.64194, 8.90264),
  ('Göttingen', 51.53283, 9.93518),
  ('Güstrow', 53.79359, 12.17649),
  ('Hagen', 51.35829, 7.47330),
  ('Hainburg', 50.07159, 8.95241),
  ('Hamburg', 53.55017, 10.00132),
  ('Hanau', 50.13288, 8.91698),
  ('Hannover', 52.37448, 9.73855),
  ('Hanover', 52.37448, 9.73855),
  ('Heidelberg', 49.40936, 8.69472),
  ('Heilbronn', 49.14229, 9.21866),
  ('Herford', 52.11522, 8.67111),
  ('Herne', 51.53804, 7.21999),
  ('Hofheim am Taunus', 50.08663, 8.44705),
  ('Ingolstadt', 48.76302, 11.42504),
  ('Istanbul', 41.00638, 28.97587),
  ('Karlsruhe', 49.00687, 8.40342),
  ('Kassel', 51.31578, 9.49785),
  ('Kerpen', 50.30976, 6.72933),
  ('Kiel', 54.32271, 10.13556),
  ('Kirchheim unter Teck', 48.64805, 9.45102),
  ('Kitzingen', 49.74739, 10.15383),
  ('Krefeld', 51.33312, 6.56233),
  ('Köln', 50.93836, 6.95997),
  ('Langen', 49.99151, 8.66670),
  ('Lauf an der Pegnitz', 49.52045, 11.28295),
  ('Leinfelden', 48.69652, 9.14146),
  ('Leipzig', 51.34063, 12.37473),
  ('Leonberg', 48.80130, 9.01500),
  ('Leverkusen', 51.03247, 6.98812),
  ('Limburg an der Lahn', 50.38804, 8.06353),
  ('Lindau', 47.57287, 9.69619),
  ('London', 51.50745, -0.12777),
  ('Los Angeles', 34.05369, -118.24277),
  ('Ludwigsburg', 48.89539, 9.18951),
  ('Ludwigshafen', 49.47041, 8.43816),
  ('Ludwigshafen am Rhein', 49.47041, 8.43816),
  ('Lübeck', 53.86644, 10.68474),
  ('Magdeburg', 52.13148, 11.64008),
  ('Maintal', 50.14387, 8.83713),
  ('Mainz', 49.99952, 8.27363),
  ('Mannheim', 49.48929, 8.46731),
  ('Marburg', 50.80901, 8.77047),
  ('Medina', 24.47115, 39.61112),
  ('Meerbusch', 51.26522, 6.67610),
  ('Metzingen', 48.53972, 9.28312),
  ('Monheim am Rhein', 51.09095, 6.88124),
  ('Munich', 48.13711, 11.57538),
  ('Mönchengladbach', 51.19471, 6.43538),
  ('Mülheim an der Ruhr', 51.42729, 6.88292),
  ('München', 48.13711, 11.57538),
  ('Münster', 51.96251, 7.62519),
  ('Neuss', 51.19818, 6.69165),
  ('New York', 40.71273, -74.00602),
  ('Nuremberg', 49.45387, 11.07730),
  ('Nürnberg', 49.45387, 11.07730),
  ('Oberhaching', 48.02618, 11.59625),
  ('Oberhausen', 51.46961, 6.85144),
  ('Offenbach', 50.10550, 8.76107),
  ('Offenbach am Main', 50.10550, 8.76107),
  ('Offheim', 50.41512, 8.06127),
  ('Oldenburg', 53.13898, 8.21460),
  ('Osnabrück', 52.27196, 8.04763),
  ('Ottobrunn', 48.06484, 11.66478),
  ('Paderborn', 51.71770, 8.75265),
  ('Potsdam', 52.40093, 13.05914),
  ('Ravensburg', 47.78110, 9.61247),
  ('Recklinghausen', 51.61438, 7.19785),
  ('Reutlingen', 48.49195, 9.21141),
  ('Rostock', 54.08867, 12.14002),
  ('Rudersberg', 48.88498, 9.52947),
  ('Rüdesheim', 49.84579, 7.81533),
  ('Salzhausen', 53.22437, 10.16938),
  ('Schorndorf', 48.80552, 9.52727),
  ('Schweinfurt', 50.04515, 10.23406),
  ('Siegburg', 50.79283, 7.20708),
  ('Sindelfingen', 48.70842, 9.00355),
  ('Singen', 47.76175, 8.83487),
  ('Solingen', 51.17216, 7.08459),
  ('Stuttgart', 48.77845, 9.18001),
  ('Sulzbach (Taunus)', 50.13261, 8.52795),
  ('Ulm', 48.39850, 9.99125),
  ('Villingen', 48.05966, 8.45990),
  ('Villingen Schwenningen', 48.06315, 8.49296),
  ('Waiblingen', 48.83257, 9.31638),
  ('Waldbach', 49.16355, 9.40764),
  ('Weißenthurm', 50.41452, 7.45575),
  ('Werl', 51.55335, 7.91556),
  ('Werne', 51.66268, 7.63551),
  ('Wien', 48.20835, 16.37250),
  ('Wiesbaden', 50.08204, 8.24166),
  ('Wiesloch', 49.29426, 8.69871),
  ('Winsen', 53.36365, 10.20592),
  ('Witten', 51.43702, 7.33512),
  ('Wolfsburg', 52.42056, 10.78617),
  ('Wuppertal', 51.26402, 7.17804),
  ('Wöllstadt', 50.28260, 8.75989),
  ('Würzburg', 49.79337, 9.93098),
  ('Frankfurt', 50.11064, 8.68209)
) AS v(city_name, latitude, longitude)
WHERE LOWER(TRIM(c.city_name)) = LOWER(TRIM(v.city_name))
  AND c.latitude IS NULL;

-- Nearest city with at least p_min_providers approved providers.
-- Origin: (p_lat, p_lon) when both are given, else the center of p_city_name.
-- Providers are matched to cities case- and whitespace-insensitively, as in
-- get_provider_count_by_city. The origin city itself is never returned.
CREATE OR REPLACE FUNCTION public.get_nearest_city_with_providers(
  p_city_name text,
  p_min_providers integer DEFAULT 6,
  p_lat numeric DEFAULT NULL,
  p_lon numeric DEFAULT NULL
)
RETURNS TABLE (
  city_name text,
  provider_count integer,
  latitude numeric,
  longitude numeric,
  distance_km numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT
      COALESCE(p_lat, c.latitude) AS lat,
      COALESCE(p_lon, c.longitude) AS lon
    FROM (SELECT 1) AS one
    LEFT JOIN public.cities c
      ON LOWER(TRIM(c.city_name)) = LOWER(TRIM(p_city_name))
    LIMIT 1
  ),
  provider_counts AS (
    SELECT LOWER(TRIM(p.address_city)) AS city_key, COUNT(*)::integer AS provider_count
    FROM public.providers p
    WHERE p.review_status = 'approved'::public.review_status
      AND p.address_city IS NOT NULL
    GROUP BY LOWER(TRIM(p.address_city))
  ),
  candidates AS (
    SELECT
      c.city_name,
      pc.provider_count,
      c.latitude,
      c.longitude,
      -- Haversine distance in km; acos argument clamped against rounding (see 093)
      6371 * acos(GREATEST(-1, LEAST(1,
        sin(radians(o.lat)) * sin(radians(c.latitude))
        + cos(radians(o.lat)) * cos(radians(c.latitude))
        * cos(radians(c.longitude - o.lon))
      ))) AS distance_km
    FROM public.cities c
    JOIN provider_counts pc ON pc.city_key = LOWER(TRIM(c.city_name))
    CROSS JOIN origin o
    WHERE o.lat IS NOT NULL
      AND o.lon IS NOT NULL
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      AND pc.provider_count >= p_min_providers
      AND LOWER(TRIM(c.city_name)) <> LOWER(TRIM(COALESCE(p_city_name, '')))
  )
  SELECT
    candidates.city_name,
    candidates.provider_count,
    candidates.latitude,
    candidates.longitude,
    ROUND(candidates.distance_km::numeric, 2) AS distance_km
  FROM candidates
  ORDER BY candidates.distance_km ASC, candidates.provider_count DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_nearest_city_with_providers(text, integer, numeric, numeric) IS
  'Nearest city (by city center) with at least p_min_providers approved providers. Origin is (p_lat, p_lon) or the center of p_city_name (#674).';

REVOKE ALL ON FUNCTION public.get_nearest_city_with_providers(text, integer, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearest_city_with_providers(text, integer, numeric, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.get_nearest_city_with_providers(text, integer, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearest_city_with_providers(text, integer, numeric, numeric) TO service_role;

COMMIT;
