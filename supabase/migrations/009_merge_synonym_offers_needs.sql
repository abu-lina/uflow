-- =====================================================
-- MERGE SYNONYM OFFERS AND NEEDS
-- =====================================================
-- This migration identifies and merges synonym entries
-- (e.g., "Kaffe" vs "Kaffee", plural/singular variations)
-- Keeps the more standard form and updates all references
-- =====================================================

-- Create helper function to check synonyms (same logic as TypeScript areSynonyms)
CREATE OR REPLACE FUNCTION are_offer_synonyms(name1 TEXT, name2 TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
    s1 TEXT;
    s2 TEXT;
    base1 TEXT;
    base2 TEXT;
    length_diff INTEGER;
BEGIN
    -- Normalize: lowercase, remove special chars (simplified)
    s1 := LOWER(REGEXP_REPLACE(name1, '[^\w\s]', '', 'g'));
    s2 := LOWER(REGEXP_REPLACE(name2, '[^\w\s]', '', 'g'));
    
    IF s1 = s2 THEN RETURN TRUE; END IF;
    
    -- Check plural/singular: remove endings (en, er, e, n, s)
    base1 := REGEXP_REPLACE(s1, '(en|er|e|n|s)$', '');
    base2 := REGEXP_REPLACE(s2, '(en|er|e|n|s)$', '');
    
    IF base1 = base2 AND LENGTH(base1) >= 3 THEN
        length_diff := ABS(LENGTH(s1) - LENGTH(s2));
        IF length_diff <= 4 THEN
            RETURN TRUE; -- Plural/singular match
        END IF;
    END IF;
    
    -- Check typos in short words (≤6 chars, 1 character difference)
    -- This catches "Kaffe" vs "Kaffee", "Kaff" vs "Kaffe", etc.
    IF LENGTH(s1) <= 6 AND LENGTH(s2) <= 6 THEN
        length_diff := ABS(LENGTH(s1) - LENGTH(s2));
        IF length_diff <= 1 THEN
            -- Check if one is a prefix/suffix of the other (accounting for 1 char difference)
            IF LENGTH(s1) < LENGTH(s2) THEN
                -- s1 is shorter: check if s1 matches start of s2
                IF s2 LIKE s1 || '%' OR s2 LIKE '%' || s1 THEN
                    RETURN TRUE;
                END IF;
            ELSIF LENGTH(s2) < LENGTH(s1) THEN
                -- s2 is shorter: check if s2 matches start of s1
                IF s1 LIKE s2 || '%' OR s1 LIKE '%' || s2 THEN
                    RETURN TRUE;
                END IF;
            ELSE
                -- Same length: check if they differ by only 1 character (typo)
                -- Count differences
                DECLARE
                    diff_count INTEGER := 0;
                    i INTEGER;
                BEGIN
                    FOR i IN 1..LEAST(LENGTH(s1), LENGTH(s2)) LOOP
                        IF SUBSTRING(s1 FROM i FOR 1) != SUBSTRING(s2 FROM i FOR 1) THEN
                            diff_count := diff_count + 1;
                        END IF;
                    END LOOP;
                    IF diff_count <= 1 THEN
                        RETURN TRUE;
                    END IF;
                END;
            END IF;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 1: Find and merge synonym offers
-- =====================================================

-- Create temp table to track synonym pairs
CREATE TEMP TABLE synonym_pairs (
    keep_id UUID,
    remove_id UUID,
    keep_name TEXT,
    remove_name TEXT
);

-- Identify synonym pairs (keep the one with more references or longer name)
INSERT INTO synonym_pairs (keep_id, remove_id, keep_name, remove_name)
SELECT DISTINCT
    -- Keep: more references, or longer name, or earlier creation
    CASE 
        WHEN refs1 > refs2 THEN o1.offer_id
        WHEN refs2 > refs1 THEN o2.offer_id
        WHEN LENGTH(o1.name_de) >= LENGTH(o2.name_de) THEN o1.offer_id
        ELSE o2.offer_id
    END as keep_id,
    CASE 
        WHEN refs1 > refs2 THEN o2.offer_id
        WHEN refs2 > refs1 THEN o1.offer_id
        WHEN LENGTH(o1.name_de) >= LENGTH(o2.name_de) THEN o2.offer_id
        ELSE o1.offer_id
    END as remove_id,
    CASE 
        WHEN refs1 > refs2 THEN o1.name_de
        WHEN refs2 > refs1 THEN o2.name_de
        WHEN LENGTH(o1.name_de) >= LENGTH(o2.name_de) THEN o1.name_de
        ELSE o2.name_de
    END as keep_name,
    CASE 
        WHEN refs1 > refs2 THEN o2.name_de
        WHEN refs2 > refs1 THEN o1.name_de
        WHEN LENGTH(o1.name_de) >= LENGTH(o2.name_de) THEN o2.name_de
        ELSE o1.name_de
    END as remove_name
FROM public.offers o1
JOIN public.offers o2 ON o1.offer_id < o2.offer_id
CROSS JOIN LATERAL (
    SELECT 
        (SELECT COUNT(*) FROM public.providers WHERE o1.offer_id = ANY(offers_ids)) as refs1,
        (SELECT COUNT(*) FROM public.providers WHERE o2.offer_id = ANY(offers_ids)) as refs2
) refs
WHERE are_offer_synonyms(o1.name_de, o2.name_de)
AND NOT EXISTS (
    -- Avoid processing same pair twice
    SELECT 1 FROM synonym_pairs sp
    WHERE (sp.keep_id = o1.offer_id AND sp.remove_id = o2.offer_id)
       OR (sp.keep_id = o2.offer_id AND sp.remove_id = o1.offer_id)
);

-- =====================================================
-- STEP 2: Update providers.offers_ids
-- =====================================================

UPDATE public.providers p
SET offers_ids = ARRAY(
    SELECT DISTINCT CASE 
        WHEN unnest = sp.remove_id THEN sp.keep_id
        ELSE unnest
    END
    FROM UNNEST(p.offers_ids) AS unnest
    LEFT JOIN synonym_pairs sp ON unnest = sp.remove_id
)
WHERE EXISTS (
    SELECT 1 FROM synonym_pairs sp
    WHERE sp.remove_id = ANY(p.offers_ids)
);

-- =====================================================
-- STEP 3: Update category_suggested_offers
-- =====================================================

-- Update references (only if keep_id doesn't already exist for that category)
UPDATE public.category_suggested_offers cso
SET offer_id = sp.keep_id
FROM synonym_pairs sp
WHERE cso.offer_id = sp.remove_id
AND NOT EXISTS (
    SELECT 1 FROM public.category_suggested_offers
    WHERE category_id = cso.category_id
    AND offer_id = sp.keep_id
);

-- Delete entries where keep_id already exists for that category
DELETE FROM public.category_suggested_offers cso
USING synonym_pairs sp
WHERE cso.offer_id = sp.remove_id
AND EXISTS (
    SELECT 1 FROM public.category_suggested_offers
    WHERE category_id = cso.category_id
    AND offer_id = sp.keep_id
);

-- =====================================================
-- STEP 4: Delete synonym offers
-- =====================================================

-- Show what will be deleted (for logging)
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Merging offers:';
    FOR rec IN SELECT keep_name, remove_name FROM synonym_pairs ORDER BY keep_name
    LOOP
        RAISE NOTICE '  "%" -> "%" (keeping "%", removing "%")', 
            rec.remove_name, rec.keep_name, rec.keep_name, rec.remove_name;
    END LOOP;
END $$;

DELETE FROM public.offers
WHERE offer_id IN (SELECT remove_id FROM synonym_pairs);

-- =====================================================
-- STEP 5: Repeat for needs
-- =====================================================

-- Clear and repopulate synonym pairs for needs
DELETE FROM synonym_pairs;

INSERT INTO synonym_pairs (keep_id, remove_id, keep_name, remove_name)
SELECT DISTINCT
    CASE 
        WHEN refs1 > refs2 THEN n1.need_id
        WHEN refs2 > refs1 THEN n2.need_id
        WHEN LENGTH(n1.name_de) >= LENGTH(n2.name_de) THEN n1.need_id
        ELSE n2.need_id
    END as keep_id,
    CASE 
        WHEN refs1 > refs2 THEN n2.need_id
        WHEN refs2 > refs1 THEN n1.need_id
        WHEN LENGTH(n1.name_de) >= LENGTH(n2.name_de) THEN n2.need_id
        ELSE n1.need_id
    END as remove_id,
    CASE 
        WHEN refs1 > refs2 THEN n1.name_de
        WHEN refs2 > refs1 THEN n2.name_de
        WHEN LENGTH(n1.name_de) >= LENGTH(n2.name_de) THEN n1.name_de
        ELSE n2.name_de
    END as keep_name,
    CASE 
        WHEN refs1 > refs2 THEN n2.name_de
        WHEN refs2 > refs1 THEN n1.name_de
        WHEN LENGTH(n1.name_de) >= LENGTH(n2.name_de) THEN n2.name_de
        ELSE n1.name_de
    END as remove_name
FROM public.needs n1
JOIN public.needs n2 ON n1.need_id < n2.need_id
CROSS JOIN LATERAL (
    SELECT 
        (SELECT COUNT(*) FROM public.providers WHERE n1.need_id = ANY(needs_ids)) as refs1,
        (SELECT COUNT(*) FROM public.providers WHERE n2.need_id = ANY(needs_ids)) as refs2
) refs
WHERE are_offer_synonyms(n1.name_de, n2.name_de)
AND NOT EXISTS (
    SELECT 1 FROM synonym_pairs sp
    WHERE (sp.keep_id = n1.need_id AND sp.remove_id = n2.need_id)
       OR (sp.keep_id = n2.need_id AND sp.remove_id = n1.need_id)
);

-- Update providers.needs_ids
UPDATE public.providers p
SET needs_ids = ARRAY(
    SELECT DISTINCT CASE 
        WHEN unnest = sp.remove_id THEN sp.keep_id
        ELSE unnest
    END
    FROM UNNEST(p.needs_ids) AS unnest
    LEFT JOIN synonym_pairs sp ON unnest = sp.remove_id
)
WHERE EXISTS (
    SELECT 1 FROM synonym_pairs sp
    WHERE sp.remove_id = ANY(p.needs_ids)
);

-- Update category_suggested_needs
UPDATE public.category_suggested_needs csn
SET need_id = sp.keep_id
FROM synonym_pairs sp
WHERE csn.need_id = sp.remove_id
AND NOT EXISTS (
    SELECT 1 FROM public.category_suggested_needs
    WHERE category_id = csn.category_id
    AND need_id = sp.keep_id
);

DELETE FROM public.category_suggested_needs csn
USING synonym_pairs sp
WHERE csn.need_id = sp.remove_id
AND EXISTS (
    SELECT 1 FROM public.category_suggested_needs
    WHERE category_id = csn.category_id
    AND need_id = sp.keep_id
);

-- Delete synonym needs
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Merging needs:';
    FOR rec IN SELECT keep_name, remove_name FROM synonym_pairs ORDER BY keep_name
    LOOP
        RAISE NOTICE '  "%" -> "%" (keeping "%", removing "%")', 
            rec.remove_name, rec.keep_name, rec.keep_name, rec.remove_name;
    END LOOP;
END $$;

DELETE FROM public.needs
WHERE need_id IN (SELECT remove_id FROM synonym_pairs);

-- =====================================================
-- CLEANUP
-- =====================================================

DROP FUNCTION IF EXISTS are_offer_synonyms(TEXT, TEXT);

-- =====================================================
-- VERIFICATION QUERIES (Optional - uncomment to run)
-- =====================================================

-- Check for remaining potential synonyms (should return 0 or very few)
-- SELECT o1.offer_id, o1.name_de, o2.offer_id, o2.name_de
-- FROM public.offers o1
-- JOIN public.offers o2 ON o1.offer_id < o2.offer_id
-- WHERE are_offer_synonyms(o1.name_de, o2.name_de)
-- ORDER BY o1.name_de;

-- Count remaining offers/needs
-- SELECT COUNT(*) as total_offers FROM public.offers;
-- SELECT COUNT(*) as total_needs FROM public.needs;
