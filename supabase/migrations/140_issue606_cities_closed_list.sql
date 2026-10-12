-- Migration 140: closed city list for provider recommendations (#606)
--
-- The recommend form used to accept any free-text city. The maintainer
-- decision at the #606 gate: cities become a closed list — the `cities`
-- table is seeded from the normalised distinct prod city values and the
-- recommend path enforces selection from it server-side.
--
-- `cities` doubles as the directory source for public surfaces
-- (CitySelectionModal, /city/[cityName], findCityBySlug, /api/cities), so
-- the seed must not leak into those surfaces: this adds `is_listed`, true
-- for the original rows (the DEFAULT keeps the existing 20 untouched) and
-- false for every catalog row seeded below. App-level reads and the two
-- public SECURITY DEFINER RPCs filter on it.
--
-- The RLS SELECT policy stays USING (true) on purpose: the recommend form
-- needs to read catalog rows for its closed-list suggestions, and hiding
-- them would break exactly the flow the seed exists for. Visibility is a
-- query concern here, not a row-security one.

BEGIN;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.cities.is_listed IS
  'Whether the city appears in public city surfaces (selection modal, /city pages, search validation, /api/cities). Catalog rows seeded for recommendation validation (#606) are false.';

-- Public RPC: only listed cities reach the city-selection surface.
CREATE OR REPLACE FUNCTION "public"."get_cities_with_counts"() RETURNS TABLE("id" "uuid", "city_name" "text", "country" "text", "is_unlocked" boolean, "provider_count" bigint, "interest_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.city_name,
    c.country,
    c.is_unlocked,
    COALESCE(p.count, 0)::BIGINT as provider_count,
    COALESCE(w.count, 0)::BIGINT as interest_count
  FROM cities c
  LEFT JOIN (
    SELECT
      LOWER(TRIM(address_city)) as city_name_lower,
      COUNT(*)::BIGINT as count
    FROM providers
    WHERE review_status = 'approved'
      AND address_city IS NOT NULL
    GROUP BY LOWER(TRIM(address_city))
  ) p ON LOWER(TRIM(c.city_name)) = p.city_name_lower
  LEFT JOIN (
    SELECT
      selected_city,
      COUNT(*)::BIGINT as count
    FROM waitlist
    WHERE selected_city IS NOT NULL
    GROUP BY selected_city
  ) w ON c.city_name = w.selected_city
  WHERE c.is_listed
  ORDER BY COALESCE(p.count, 0) DESC, c.city_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_city_interest_counts"() RETURNS TABLE("city_name" "text", "interest_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.city_name,
    COUNT(w.id)::BIGINT as interest_count
  FROM cities c
  LEFT JOIN waitlist w ON w.selected_city = c.city_name
  WHERE c.is_listed
  GROUP BY c.city_name
  ORDER BY interest_count DESC, c.city_name ASC;
END;
$$;

-- Seed the closed recommend list from normalised distinct prod city values
-- (providers.address_city + locations.address_city, case/accent/alias
-- normalised). Junk value 'Neu' (incomplete entry) dropped; 'Sulzbach
-- (Taunus)' kept — a real city in the dataset. All seeded rows stay
-- invisible to the directory surfaces (is_listed = false).
INSERT INTO public.cities (city_name, country, is_listed)
VALUES
	('Aachen', 'Germany', false),
	('Aalen', 'Germany', false),
	('Alfter', 'Germany', false),
	('Altenstadt', 'Germany', false),
	('Arnsberg', 'Germany', false),
	('Augsburg', 'Germany', false),
	('Bad Homburg', 'Germany', false),
	('Bad Oeynhausen', 'Germany', false),
	('Bad Rappenau', 'Germany', false),
	('Baesweiler', 'Germany', false),
	('Bedburg', 'Germany', false),
	('Beirut', 'Lebanon', false),
	('Bergheim', 'Germany', false),
	('Bergisch Gladbach', 'Germany', false),
	('Bergkamen', 'Germany', false),
	('Berlin', 'Germany', false),
	('Bielefeld', 'Germany', false),
	('Bietigheim-Bissingen', 'Germany', false),
	('Bochum', 'Germany', false),
	('Bonn', 'Germany', false),
	('Bottrop', 'Germany', false),
	('Brackenheim', 'Germany', false),
	('Braunschweig', 'Germany', false),
	('Bremen', 'Germany', false),
	('Bruchköbel', 'Germany', false),
	('Burbach', 'Germany', false),
	('Böblingen', 'Germany', false),
	('Chemnitz', 'Germany', false),
	('Cologne', 'Germany', false),
	('Dachau', 'Germany', false),
	('Darmstadt', 'Germany', false),
	('Datteln', 'Germany', false),
	('Dietzenbach', 'Germany', false),
	('Dortmund', 'Germany', false),
	('Dresden', 'Germany', false),
	('Dubai', 'United Arab Emirates', false),
	('Duisburg', 'Germany', false),
	('Düsseldorf', 'Germany', false),
	('Ebersbach an der Fils', 'Germany', false),
	('Emmendingen', 'Germany', false),
	('Erfurt', 'Germany', false),
	('Erkelenz', 'Germany', false),
	('Essen', 'Germany', false),
	('Euskirchen', 'Germany', false),
	('Frankfurt am Main', 'Germany', false),
	('Frechen', 'Germany', false),
	('Freiburg', 'Germany', false),
	('Freiburg im Breisgau', 'Germany', false),
	('Freising', 'Germany', false),
	('Gelsenkirchen', 'Germany', false),
	('Germering', 'Germany', false),
	('Gießen', 'Germany', false),
	('Grevenbroich', 'Germany', false),
	('Gröbenzell', 'Germany', false),
	('Gärtringen', 'Germany', false),
	('Göttingen', 'Germany', false),
	('Güstrow', 'Germany', false),
	('Hagen', 'Germany', false),
	('Hainburg', 'Germany', false),
	('Hamburg', 'Germany', false),
	('Hanau', 'Germany', false),
	('Hannover', 'Germany', false),
	('Hanover', 'Germany', false),
	('Heidelberg', 'Germany', false),
	('Heilbronn', 'Germany', false),
	('Herford', 'Germany', false),
	('Herne', 'Germany', false),
	('Hofheim am Taunus', 'Germany', false),
	('Ingolstadt', 'Germany', false),
	('Istanbul', 'Turkey', false),
	('Karlsruhe', 'Germany', false),
	('Kassel', 'Germany', false),
	('Kerpen', 'Germany', false),
	('Kiel', 'Germany', false),
	('Kirchheim unter Teck', 'Germany', false),
	('Kitzingen', 'Germany', false),
	('Krefeld', 'Germany', false),
	('Köln', 'Germany', false),
	('Langen', 'Germany', false),
	('Lauf an der Pegnitz', 'Germany', false),
	('Leinfelden', 'Germany', false),
	('Leipzig', 'Germany', false),
	('Leonberg', 'Germany', false),
	('Leverkusen', 'Germany', false),
	('Limburg an der Lahn', 'Germany', false),
	('Lindau', 'Germany', false),
	('London', 'United Kingdom', false),
	('Los Angeles', 'United States', false),
	('Ludwigsburg', 'Germany', false),
	('Ludwigshafen', 'Germany', false),
	('Ludwigshafen am Rhein', 'Germany', false),
	('Lübeck', 'Germany', false),
	('Magdeburg', 'Germany', false),
	('Maintal', 'Germany', false),
	('Mainz', 'Germany', false),
	('Mannheim', 'Germany', false),
	('Marburg', 'Germany', false),
	('Medina', 'Saudi Arabia', false),
	('Meerbusch', 'Germany', false),
	('Metzingen', 'Germany', false),
	('Monheim am Rhein', 'Germany', false),
	('Munich', 'Germany', false),
	('Mönchengladbach', 'Germany', false),
	('Mülheim an der Ruhr', 'Germany', false),
	('München', 'Germany', false),
	('Münster', 'Germany', false),
	('NRW', 'Germany', false),
	('Neuss', 'Germany', false),
	('New York', 'United States', false),
	('Nuremberg', 'Germany', false),
	('Nürnberg', 'Germany', false),
	('Oberhaching', 'Germany', false),
	('Oberhausen', 'Germany', false),
	('Offenbach', 'Germany', false),
	('Offenbach am Main', 'Germany', false),
	('Offheim', 'Germany', false),
	('Oldenburg', 'Germany', false),
	('Osnabrück', 'Germany', false),
	('Ottobrunn', 'Germany', false),
	('Paderborn', 'Germany', false),
	('Potsdam', 'Germany', false),
	('Ravensburg', 'Germany', false),
	('Recklinghausen', 'Germany', false),
	('Reutlingen', 'Germany', false),
	('Rostock', 'Germany', false),
	('Rudersberg', 'Germany', false),
	('Rüdesheim', 'Germany', false),
	('Salzhausen', 'Germany', false),
	('Schleswig-Holstein', 'Germany', false),
	('Schorndorf', 'Germany', false),
	('Schweinfurt', 'Germany', false),
	('Siegburg', 'Germany', false),
	('Sindelfingen', 'Germany', false),
	('Singen', 'Germany', false),
	('Solingen', 'Germany', false),
	('Stuttgart', 'Germany', false),
	('Sulzbach (Taunus)', 'Germany', false),
	('USA', 'United States', false),
	('Ulm', 'Germany', false),
	('Villingen', 'Germany', false),
	('Villingen Schwenningen', 'Germany', false),
	('Waiblingen', 'Germany', false),
	('Waldbach', 'Germany', false),
	('Weißenthurm', 'Germany', false),
	('Werl', 'Germany', false),
	('Werne', 'Germany', false),
	('Wien', 'Austria', false),
	('Wiesbaden', 'Germany', false),
	('Wiesloch', 'Germany', false),
	('Winsen', 'Germany', false),
	('Witten', 'Germany', false),
	('Wolfsburg', 'Germany', false),
	('Wuppertal', 'Germany', false),
	('Wöllstadt', 'Germany', false),
	('Würzburg', 'Germany', false),
	('Österreich', 'Austria', false)
ON CONFLICT (city_name) DO NOTHING;

COMMIT;
