-- Migration 154: add population to cities for default-order sorting (#953)
--
-- The default /food list ordered newest-first surfaced one chain's bulk-import
-- rows on the first screen. The fix sorts by city population DESC so Berlin
-- and Hamburg providers lead. The column is nullable; unknown cities sort last
-- in-app via the CITY_POPULATION constant in src/constants/cityPopulations.ts.
--
-- Population figures: Destatis 2023, rounded to nearest 1000.

BEGIN;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS population integer;

COMMENT ON COLUMN public.cities.population IS
  'Approximate city population (Destatis 2023). Used for default listing order on /food with no city filter (#953).';

-- Seed major German cities that appear in providers.address_city
UPDATE public.cities SET population = 3645000 WHERE city_name = 'Berlin';
UPDATE public.cities SET population = 1853000 WHERE city_name = 'Hamburg';
UPDATE public.cities SET population = 1488000 WHERE city_name = 'München';
UPDATE public.cities SET population = 1084000 WHERE city_name = 'Köln';
UPDATE public.cities SET population =  773000 WHERE city_name = 'Frankfurt';
UPDATE public.cities SET population =  634000 WHERE city_name = 'Stuttgart';
UPDATE public.cities SET population =  620000 WHERE city_name = 'Leipzig';
UPDATE public.cities SET population =  619000 WHERE city_name = 'Düsseldorf';
UPDATE public.cities SET population =  588000 WHERE city_name = 'Dortmund';
UPDATE public.cities SET population =  579000 WHERE city_name = 'Essen';
UPDATE public.cities SET population =  563000 WHERE city_name = 'Bremen';
UPDATE public.cities SET population =  556000 WHERE city_name = 'Dresden';
UPDATE public.cities SET population =  537000 WHERE city_name = 'Hannover';
UPDATE public.cities SET population =  515000 WHERE city_name = 'Nürnberg';
UPDATE public.cities SET population =  496000 WHERE city_name = 'Duisburg';
UPDATE public.cities SET population =  365000 WHERE city_name = 'Bochum';
UPDATE public.cities SET population =  355000 WHERE city_name = 'Wuppertal';
UPDATE public.cities SET population =  334000 WHERE city_name = 'Bielefeld';
UPDATE public.cities SET population =  331000 WHERE city_name = 'Bonn';
UPDATE public.cities SET population =  317000 WHERE city_name = 'Münster';
UPDATE public.cities SET population =  309000 WHERE city_name = 'Mannheim';
UPDATE public.cities SET population =  308000 WHERE city_name = 'Karlsruhe';
UPDATE public.cities SET population =  296000 WHERE city_name = 'Augsburg';
UPDATE public.cities SET population =  278000 WHERE city_name = 'Wiesbaden';
UPDATE public.cities SET population =  261000 WHERE city_name = 'Mönchengladbach';
UPDATE public.cities SET population =  260000 WHERE city_name = 'Gelsenkirchen';
UPDATE public.cities SET population =  249000 WHERE city_name = 'Braunschweig';
UPDATE public.cities SET population =  249000 WHERE city_name = 'Aachen';
UPDATE public.cities SET population =  248000 WHERE city_name = 'Chemnitz';
UPDATE public.cities SET population =  242000 WHERE city_name = 'Kiel';
UPDATE public.cities SET population =  238000 WHERE city_name = 'Halle';
UPDATE public.cities SET population =  232000 WHERE city_name = 'Magdeburg';
UPDATE public.cities SET population =  231000 WHERE city_name = 'Freiburg';
UPDATE public.cities SET population =  227000 WHERE city_name = 'Krefeld';
UPDATE public.cities SET population =  218000 WHERE city_name = 'Mainz';
UPDATE public.cities SET population =  216000 WHERE city_name = 'Lübeck';
UPDATE public.cities SET population =  213000 WHERE city_name = 'Erfurt';
UPDATE public.cities SET population =  211000 WHERE city_name = 'Oberhausen';
UPDATE public.cities SET population =  209000 WHERE city_name = 'Rostock';
UPDATE public.cities SET population =  202000 WHERE city_name = 'Kassel';
UPDATE public.cities SET population =  189000 WHERE city_name = 'Hagen';
UPDATE public.cities SET population =  183000 WHERE city_name = 'Potsdam';
UPDATE public.cities SET population =  180000 WHERE city_name = 'Hamm';
UPDATE public.cities SET population =  177000 WHERE city_name = 'Saarbrücken';
UPDATE public.cities SET population =  172000 WHERE city_name = 'Ludwigshafen';
UPDATE public.cities SET population =  171000 WHERE city_name = 'Oldenburg';
UPDATE public.cities SET population =  170000 WHERE city_name = 'Mülheim';
UPDATE public.cities SET population =  165000 WHERE city_name = 'Osnabrück';
UPDATE public.cities SET population =  163000 WHERE city_name = 'Leverkusen';
UPDATE public.cities SET population =  160000 WHERE city_name = 'Heidelberg';
UPDATE public.cities SET population =  157000 WHERE city_name = 'Darmstadt';
UPDATE public.cities SET population =  155000 WHERE city_name = 'Solingen';
UPDATE public.cities SET population =  155000 WHERE city_name = 'Regensburg';
UPDATE public.cities SET population =  155000 WHERE city_name = 'Herne';
UPDATE public.cities SET population =  151000 WHERE city_name = 'Paderborn';
UPDATE public.cities SET population =  151000 WHERE city_name = 'Neuss';
UPDATE public.cities SET population =  141000 WHERE city_name = 'Ingolstadt';
UPDATE public.cities SET population =  130000 WHERE city_name = 'Offenbach';
UPDATE public.cities SET population =  130000 WHERE city_name = 'Fürth';
UPDATE public.cities SET population =  127000 WHERE city_name = 'Würzburg';
UPDATE public.cities SET population =  126000 WHERE city_name = 'Ulm';
UPDATE public.cities SET population =  125000 WHERE city_name = 'Pforzheim';
UPDATE public.cities SET population =  124000 WHERE city_name = 'Heilbronn';
UPDATE public.cities SET population =  124000 WHERE city_name = 'Wolfsburg';
UPDATE public.cities SET population =  119000 WHERE city_name = 'Göttingen';
UPDATE public.cities SET population =  117000 WHERE city_name = 'Bottrop';
UPDATE public.cities SET population =  115000 WHERE city_name = 'Reutlingen';
UPDATE public.cities SET population =  115000 WHERE city_name = 'Bremerhaven';
UPDATE public.cities SET population =  115000 WHERE city_name = 'Recklinghausen';
UPDATE public.cities SET population =  114000 WHERE city_name = 'Koblenz';
UPDATE public.cities SET population =  113000 WHERE city_name = 'Erlangen';
UPDATE public.cities SET population =  112000 WHERE city_name = 'Trier';
UPDATE public.cities SET population =  110000 WHERE city_name = 'Remscheid';
UPDATE public.cities SET population =  108000 WHERE city_name = 'Jena';
UPDATE public.cities SET population =  103000 WHERE city_name = 'Salzgitter';

COMMIT;
