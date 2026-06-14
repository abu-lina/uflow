-- Migration 109: Enhanced search RPC for chatbot
-- Plan 176: Chatbot Feature
-- Supports boolean flag filtering + halal_level via LEFT JOIN to food_providers

CREATE OR REPLACE FUNCTION search_providers_chat(
    search_query      TEXT DEFAULT '',
    category_filter   UUID DEFAULT NULL,
    city_filter       TEXT DEFAULT NULL,
    listing_type_filter TEXT DEFAULT NULL,
    muslim_owned      BOOLEAN DEFAULT NULL,
    has_prayer_space  BOOLEAN DEFAULT NULL,
    family_friendly   BOOLEAN DEFAULT NULL,
    women_friendly    BOOLEAN DEFAULT NULL,
    children_friendly BOOLEAN DEFAULT NULL,
    has_parking       BOOLEAN DEFAULT NULL,
    economic_solidarity BOOLEAN DEFAULT NULL,
    makes_donations   BOOLEAN DEFAULT NULL,
    halal_level_min   SMALLINT DEFAULT NULL,
    limit_count       INTEGER DEFAULT 5,
    offset_count      INTEGER DEFAULT 0
)
RETURNS TABLE(
    provider_id          UUID,
    provider_name        TEXT,
    provider_description TEXT,
    address_city         TEXT,
    category_name        TEXT,
    listing_type         TEXT,
    muslim_owned         BOOLEAN,
    has_prayer_space     BOOLEAN,
    family_friendly      BOOLEAN,
    women_friendly       BOOLEAN,
    children_friendly    BOOLEAN,
    has_parking          BOOLEAN,
    economic_solidarity  BOOLEAN,
    makes_donations      BOOLEAN,
    rank                 REAL
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.provider_id,
        p.provider_name,
        p.provider_description,
        p.address_city,
        c.name_de AS category_name,
        p.listing_type::TEXT,
        p.muslim_owned,
        p.has_prayer_space,
        p.family_friendly,
        p.women_friendly,
        p.children_friendly,
        p.has_parking,
        p.economic_solidarity,
        p.makes_donations,
        CASE
            WHEN search_query = '' THEN 0.0
            ELSE ts_rank(
                to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
                plainto_tsquery('german', search_query)
            )
        END AS rank
    FROM public.providers p
    LEFT JOIN public.categories c ON p.category_id = c.category_id
    LEFT JOIN public.food_providers fp ON p.provider_id = fp.provider_id
    WHERE p.review_status = 'approved'
      AND (
          search_query = ''
          OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, ''))
             @@ plainto_tsquery('german', search_query)
      )
      AND (category_filter IS NULL OR p.category_id = category_filter)
      AND (city_filter IS NULL OR p.address_city = city_filter)
      AND (listing_type_filter IS NULL OR p.listing_type::TEXT = listing_type_filter)
      AND (muslim_owned IS NULL OR p.muslim_owned = muslim_owned)
      AND (has_prayer_space IS NULL OR p.has_prayer_space = has_prayer_space)
      AND (family_friendly IS NULL OR p.family_friendly = family_friendly)
      AND (women_friendly IS NULL OR p.women_friendly = women_friendly)
      AND (children_friendly IS NULL OR p.children_friendly = children_friendly)
      AND (has_parking IS NULL OR p.has_parking = has_parking)
      AND (economic_solidarity IS NULL OR p.economic_solidarity = economic_solidarity)
      AND (makes_donations IS NULL OR p.makes_donations = makes_donations)
      AND (
          halal_level_min IS NULL
          OR (fp.halal_level IS NOT NULL AND fp.halal_level >= halal_level_min)
      )
    ORDER BY
        CASE WHEN search_query = '' THEN 0.0 ELSE 1.0 END,
        rank DESC,
        p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;
