-- ============================================================
-- Migration: Plan 169 — Fix search_food_categories stop word crash
-- Date: 2026-06-13
-- Fixes 400 error when German stop words (e.g. "alle") are
-- queried. The `:*` prefix modifier on an empty tsvector from
-- stop words causes to_tsquery to throw a syntax error.
-- Added `AND to_tsvector('german', token) != ''` filter.
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."search_food_categories"("search_query" "text" DEFAULT ''::"text", "limit_count" integer DEFAULT 8) RETURNS TABLE("category_id" "uuid", "name_de" "text", "name_en" "text", "description_de" "text", "description_en" "text", "category_images" "text", "provider_count" bigint)
    LANGUAGE "sql"
    AS $_$
  WITH query_input AS (
    SELECT
      btrim(COALESCE(search_query, '')) AS normalized,
      NULLIF(
        array_to_string(
          ARRAY(
            SELECT token || ':*'
            FROM unnest(
              regexp_split_to_array(
                regexp_replace(lower(btrim(COALESCE(search_query, ''))), '[^[:alnum:]\s]+', ' ', 'g'),
                '\\s+'
              )
            ) AS token
            WHERE token <> '' AND to_tsvector('german', token) != ''
          ),
          ' & '
        ),
        ''
      ) AS prefix_query_str
  ),
  query_terms AS (
    SELECT
      normalized,
      CASE WHEN prefix_query_str IS NULL THEN NULL ELSE to_tsquery('german', prefix_query_str) END AS german_prefix_query,
      CASE WHEN prefix_query_str IS NULL THEN NULL ELSE to_tsquery('english', prefix_query_str) END AS english_prefix_query
    FROM query_input
  ),
  matched_categories AS (
    SELECT
      c.category_id,
      CASE
        WHEN c.name_de IS NULL THEN NULL
        ELSE regexp_replace(
          regexp_replace(c.name_de, '\\s*Küche\\s*$', '', 'i'),
          'ische$',
          'isch',
          'i'
        )
      END AS name_de,
      c.name_en,
      c.description_de,
      c.description_en,
      c.category_images::TEXT AS category_images,
      CASE
        WHEN qt.normalized = '' THEN 0::REAL
        ELSE GREATEST(
          ts_rank(
            to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')),
            plainto_tsquery('german', qt.normalized)
          ),
          ts_rank(
            to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')),
            plainto_tsquery('english', qt.normalized)
          ),
          CASE
            WHEN qt.german_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')),
              qt.german_prefix_query
            )
          END,
          CASE
            WHEN qt.english_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')),
              qt.english_prefix_query
            )
          END
        )
      END AS rank
    FROM public.categories c
    CROSS JOIN query_terms qt
    WHERE
      c.applicable_section = 'food'
      AND (
        qt.normalized = ''
        OR to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')) @@ plainto_tsquery('german', qt.normalized)
        OR to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')) @@ plainto_tsquery('english', qt.normalized)
        OR (qt.german_prefix_query IS NOT NULL AND to_tsvector('german', COALESCE(c.name_de, '') || ' ' || COALESCE(c.description_de, '')) @@ qt.german_prefix_query)
        OR (qt.english_prefix_query IS NOT NULL AND to_tsvector('english', COALESCE(c.name_en, '') || ' ' || COALESCE(c.description_en, '')) @@ qt.english_prefix_query)
      )
  )
  SELECT
    mc.category_id,
    mc.name_de,
    mc.name_en,
    mc.description_de,
    mc.description_en,
    mc.category_images,
    COUNT(DISTINCT p.provider_id) AS provider_count
  FROM matched_categories mc
  LEFT JOIN public.providers p
    ON p.category_id = mc.category_id
   AND p.listing_type = 'food'
   AND p.review_status = 'approved'
  GROUP BY
    mc.category_id, mc.name_de, mc.name_en,
    mc.description_de, mc.description_en,
    mc.category_images, mc.rank
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN COUNT(DISTINCT p.provider_id) END DESC NULLS LAST,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN mc.rank END DESC NULLS LAST,
    COUNT(DISTINCT p.provider_id) DESC,
    mc.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$_$;
