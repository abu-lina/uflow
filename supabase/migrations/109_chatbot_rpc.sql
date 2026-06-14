-- Migration 109: Enhanced search RPC for chatbot (fixed)
-- Plan 176: Chatbot Feature
-- Fixed: prefixed parameters with p_ to avoid collision with RETURN TABLE columns

CREATE OR REPLACE FUNCTION search_providers_chat(
    p_search_query      TEXT DEFAULT '',
    p_category_filter   UUID DEFAULT NULL,
    p_city_filter       TEXT DEFAULT NULL,
    p_listing_type_filter TEXT DEFAULT NULL,
    p_muslim_owned      BOOLEAN DEFAULT NULL,
    p_has_prayer_space  BOOLEAN DEFAULT NULL,
    p_family_friendly   BOOLEAN DEFAULT NULL,
    p_women_friendly    BOOLEAN DEFAULT NULL,
    p_children_friendly BOOLEAN DEFAULT NULL,
    p_has_parking       BOOLEAN DEFAULT NULL,
    p_economic_solidarity BOOLEAN DEFAULT NULL,
    p_makes_donations   BOOLEAN DEFAULT NULL,
    p_halal_level_min   SMALLINT DEFAULT NULL,
    p_limit_count       INTEGER DEFAULT 5,
    p_offset_count      INTEGER DEFAULT 0
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
            WHEN p_search_query = '' THEN 0.0
            ELSE ts_rank(
                to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
                plainto_tsquery('german', p_search_query)
            )
        END AS rank
    FROM public.providers p
    LEFT JOIN public.categories c ON p.category_id = c.category_id
    LEFT JOIN public.food_providers fp ON p.provider_id = fp.provider_id
    WHERE p.review_status = 'approved'
      AND (
          p_search_query = ''
          OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, ''))
             @@ plainto_tsquery('german', p_search_query)
      )
      AND (p_category_filter IS NULL OR p.category_id = p_category_filter)
      AND (p_city_filter IS NULL OR p.address_city = p_city_filter)
      AND (p_listing_type_filter IS NULL OR p.listing_type::TEXT = p_listing_type_filter)
      AND (p_muslim_owned IS NULL OR p.muslim_owned = p.muslim_owned)
      AND (p_has_prayer_space IS NULL OR p.has_prayer_space = p_has_prayer_space)
      AND (p_family_friendly IS NULL OR p.family_friendly = p_family_friendly)
      AND (p_women_friendly IS NULL OR p.women_friendly = p_women_friendly)
      AND (p_children_friendly IS NULL OR p.children_friendly = p_children_friendly)
      AND (p_has_parking IS NULL OR p.has_parking = p_has_parking)
      AND (p_economic_solidarity IS NULL OR p.economic_solidarity = p_economic_solidarity)
      AND (p_makes_donations IS NULL OR p.makes_donations = p_makes_donations)
      AND (
          p_halal_level_min IS NULL
          OR (fp.halal_level IS NOT NULL AND fp.halal_level >= p_halal_level_min)
      )
    ORDER BY
        CASE WHEN p_search_query = '' THEN 0.0 ELSE 1.0 END,
        rank DESC,
        p.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

-- Update the tool executor to use the new parameter names
COMMENT ON FUNCTION search_providers_chat IS 'Chatbot search with boolean flag filtering. Parameters prefixed with p_ for parameter/column name safety.';
