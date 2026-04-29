


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."enrichment_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'applied'
);


ALTER TYPE "public"."enrichment_status" OWNER TO "postgres";


CREATE TYPE "public"."entity_type" AS ENUM (
    'provider',
    'community_service'
);


ALTER TYPE "public"."entity_type" OWNER TO "postgres";


CREATE TYPE "public"."listing_type_enum" AS ENUM (
    'food',
    'business'
);


ALTER TYPE "public"."listing_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."outreach_channel" AS ENUM (
    'email',
    'phone',
    'instagram'
);


ALTER TYPE "public"."outreach_channel" OWNER TO "postgres";


CREATE TYPE "public"."outreach_status" AS ENUM (
    'pending_approval',
    'approved',
    'pending_dispatch',
    'dispatched',
    'failed',
    'claimed',
    'removed',
    'kept',
    'expired'
);


ALTER TYPE "public"."outreach_status" OWNER TO "postgres";


CREATE TYPE "public"."review_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'needs_revision',
    'removed_by_owner'
);


ALTER TYPE "public"."review_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."review_status" IS 'Provider/community service review status. Values: pending, approved, rejected, needs_revision, removed_by_owner';



CREATE TYPE "public"."token_action_scope" AS ENUM (
    'decision',
    'claim',
    'remove'
);


ALTER TYPE "public"."token_action_scope" OWNER TO "postgres";


CREATE TYPE "public"."trust_level" AS ENUM (
    'SELF_DECLARED',
    'COMMUNITY_CONFIRMED',
    'UMMAH_FLOW_VERIFIED'
);


ALTER TYPE "public"."trust_level" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'owner',
    'admin',
    'moderator'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_delete_need"("p_need_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.needs
    WHERE need_id = p_need_id
      AND created_by = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.providers 
        WHERE p_need_id = ANY(needs_ids)
      )
  );
END;
$$;


ALTER FUNCTION "public"."can_delete_need"("p_need_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_delete_need"("p_need_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user can delete a need (must be creator and need must be unused)';



CREATE OR REPLACE FUNCTION "public"."can_delete_offer"("p_offer_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.offers
    WHERE offer_id = p_offer_id
      AND created_by = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.providers 
        WHERE p_offer_id = ANY(offers_ids)
      )
  );
END;
$$;


ALTER FUNCTION "public"."can_delete_offer"("p_offer_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_delete_offer"("p_offer_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user can delete an offer (must be creator and offer must be unused)';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tokens"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.email_confirmation_tokens 
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_orphaned_files"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  FOR file_record IN 
    SELECT name FROM storage.objects 
    WHERE bucket_id = 'provider-images'
    AND NOT EXISTS (
      SELECT 1 FROM public.providers 
      WHERE provider_images::text LIKE '%' || name || '%'
    )
  LOOP
    DELETE FROM storage.objects WHERE name = file_record.name;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  FOR file_record IN 
    SELECT name FROM storage.objects 
    WHERE bucket_id = 'community-service-images'
    AND NOT EXISTS (
      SELECT 1 FROM public.community_services 
      WHERE community_service_images::text LIKE '%' || name || '%'
    )
  LOOP
    DELETE FROM storage.objects WHERE name = file_record.name;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphaned_files"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.providers WHERE provider_owner_id = delete_user_account.user_id;
  DELETE FROM public.bookmarks WHERE bookmarks.user_id = delete_user_account.user_id;
  DELETE FROM public.users WHERE users.user_id = delete_user_account.user_id;
  DELETE FROM auth.users WHERE auth.users.id = delete_user_account.user_id;
  
  -- Log the deletion if deletion_logs table exists (optional)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deletion_logs') THEN
    INSERT INTO public.deletion_logs (user_id, deleted_at, reason)
    VALUES (delete_user_account.user_id, NOW(), 'User requested account deletion');
  END IF;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_provider_outreach"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_has_contact BOOLEAN;
  v_selected_channel outreach_channel;
BEGIN
  -- Only process unclaimed providers (recommendation mode)
  IF NEW.provider_owner_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Also skip if user_created_id is set (user-created providers)
  -- Recommendation mode = both NULL
  IF NEW.user_created_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if at least one contact channel exists
  v_has_contact := (
    (NEW.contact_email IS NOT NULL AND NEW.contact_email <> '') OR
    (NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '') OR
    (NEW.social_instagram IS NOT NULL AND NEW.social_instagram <> '')
  );
  
  IF NOT v_has_contact THEN
    RETURN NEW;
  END IF;
  
  -- Determine primary channel (email preferred)
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
    v_selected_channel := 'email';
  ELSIF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    v_selected_channel := 'phone';
  ELSE
    v_selected_channel := 'instagram';
  END IF;
  
  -- Insert outreach record (idempotent: unique constraint prevents duplicates)
  INSERT INTO public.provider_owner_outreach (
    provider_id,
    candidate_email,
    candidate_phone,
    candidate_instagram,
    selected_channel,
    language,
    status,
    dispatch_after
  )
  VALUES (
    NEW.provider_id,
    NULLIF(TRIM(NEW.contact_email), ''),
    NULLIF(TRIM(NEW.contact_phone), ''),
    NULLIF(TRIM(NEW.social_instagram), ''),
    v_selected_channel,
    'de',  -- MVP: German
    'pending_approval',  -- Requires operator approval
    NOW() + INTERVAL '24 hours'  -- Delay gate
  )
  ON CONFLICT DO NOTHING;  -- Idempotent: skip if already exists
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enqueue_provider_outreach"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_provider_outreach"() IS 'Auto-enqueues outreach for unclaimed providers (recommendation mode) with contact info. 
   Fires on INSERT, selects email as primary channel, sets 24h delay, and requires approval.';



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
  ORDER BY COALESCE(p.count, 0) DESC, c.city_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_cities_with_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cities_with_counts"() IS 'Returns all cities with real-time provider and interest counts. Combines 3 queries into 1 for better performance. Uses case-insensitive matching for provider counts. Accessible to all users.';



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
  GROUP BY c.city_name
  ORDER BY interest_count DESC, c.city_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_city_interest_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_city_interest_counts"() IS 'Returns aggregated city interest counts. No PII exposed. Uses SECURITY DEFINER to bypass RLS for counting.';



CREATE OR REPLACE FUNCTION "public"."get_community_services_for_provider"("provider_uuid" "uuid") RETURNS TABLE("community_service_id" "uuid", "community_service_name" "text", "community_service_description" "text", "community_service_images" "text"[], "donation_count" integer, "category_name_de" "text", "barakah_effects" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.community_service_id,
    cs.community_service_name,
    cs.community_service_description,
    cs.community_service_images,
    cs.donation_count,
    c.name_de as category_name_de,
    cs.barakah_effects
  FROM public.provider_community_services pcs
  JOIN public.community_services cs ON pcs.community_service_id = cs.community_service_id
  LEFT JOIN public.categories c ON cs.category_id = c.category_id
  WHERE pcs.provider_id = provider_uuid
  AND cs.review_status = 'approved'
  ORDER BY cs.community_service_name;
END;
$$;


ALTER FUNCTION "public"."get_community_services_for_provider"("provider_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_community_services_for_provider"("provider_uuid" "uuid") IS 'Returns all community services supported by a specific provider';



CREATE OR REPLACE FUNCTION "public"."get_filtered_category_ids_by_search"("search_query" "text" DEFAULT ''::"text", "location_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("category_id" "uuid")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.category_id
  FROM public.providers p
  WHERE p.review_status = 'approved'
    AND p.category_id IS NOT NULL
    AND (search_query = '' OR search_query IS NULL OR
         to_tsvector('german', p.provider_name)
         @@ plainto_tsquery('german', search_query))
    AND (location_filter IS NULL OR location_filter = 'Überall' OR p.address_city = location_filter)
  ORDER BY p.category_id;
END;
$$;


ALTER FUNCTION "public"."get_filtered_category_ids_by_search"("search_query" "text", "location_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_filtered_cities_by_search"("search_query" "text" DEFAULT ''::"text", "category_filter" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("city" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT sub.address_city
  FROM (
    -- Provider cities
    SELECT p.address_city
    FROM public.providers p
    WHERE p.review_status = 'approved'
      AND p.address_city IS NOT NULL
      AND p.address_city != ''
      AND (search_query = '' OR search_query IS NULL OR
           to_tsvector('german', p.provider_name)
           @@ plainto_tsquery('german', search_query))
      AND (category_filter IS NULL OR p.category_id = category_filter)

    UNION

    -- Community service cities
    SELECT cs.address_city
    FROM public.community_services cs
    WHERE cs.review_status = 'approved'
      AND cs.address_city IS NOT NULL
      AND cs.address_city != ''
      AND (search_query = '' OR search_query IS NULL OR
           to_tsvector('german', cs.community_service_name || ' ' || COALESCE(cs.community_service_description, ''))
           @@ plainto_tsquery('german', search_query))
      AND (category_filter IS NULL OR cs.category_id = category_filter)
  ) sub
  ORDER BY sub.address_city;
END;
$$;


ALTER FUNCTION "public"."get_filtered_cities_by_search"("search_query" "text", "category_filter" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_provider_count_by_city"("city_name" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  provider_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO provider_count
  FROM providers
  WHERE review_status = 'approved'
    AND LOWER(TRIM(address_city)) = LOWER(TRIM(city_name));
  
  RETURN COALESCE(provider_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_provider_count_by_city"("city_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provider_count_by_city"("city_name" "text") IS 'Returns count of approved providers for a specific city. Uses case-insensitive matching. Accessible to all users.';



CREATE OR REPLACE FUNCTION "public"."get_providers_for_community_service"("service_uuid" "uuid") RETURNS TABLE("provider_id" "uuid", "provider_name" "text", "address_city" "text", "category_name_de" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.address_city,
    c.name_de as category_name_de
  FROM public.provider_community_services pcs
  JOIN public.providers p ON pcs.provider_id = p.provider_id
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE pcs.community_service_id = service_uuid
  AND p.review_status = 'approved'
  ORDER BY p.provider_name;
END;
$$;


ALTER FUNCTION "public"."get_providers_for_community_service"("service_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_providers_for_community_service"("service_uuid" "uuid") IS 'Returns all providers supporting a specific community service';



CREATE OR REPLACE FUNCTION "public"."get_public_url"("bucket_name" "text", "file_path" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN CONCAT(
    'https://',
    (SELECT value FROM settings WHERE key = 'project_ref'),
    '.supabase.co/storage/v1/object/public/',
    bucket_name,
    '/',
    file_path
  );
END;
$$;


ALTER FUNCTION "public"."get_public_url"("bucket_name" "text", "file_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_suggested_needs_for_category"("p_category_id" "uuid") RETURNS TABLE("need_id" "uuid", "name_de" "text", "name_en" "text", "priority" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.need_id,
    n.name_de,
    n.name_en,
    csn.priority
  FROM public.category_suggested_needs csn
  JOIN public.needs n ON csn.need_id = n.need_id
  WHERE csn.category_id = p_category_id
  ORDER BY csn.priority DESC, n.name_de ASC;
END;
$$;


ALTER FUNCTION "public"."get_suggested_needs_for_category"("p_category_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_suggested_needs_for_category"("p_category_id" "uuid") IS 'Returns all suggested needs for a given category, ordered by priority and name';



CREATE OR REPLACE FUNCTION "public"."get_suggested_offers_for_category"("p_category_id" "uuid") RETURNS TABLE("offer_id" "uuid", "name_de" "text", "name_en" "text", "priority" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.offer_id,
    o.name_de,
    o.name_en,
    cso.priority
  FROM public.category_suggested_offers cso
  JOIN public.offers o ON cso.offer_id = o.offer_id
  WHERE cso.category_id = p_category_id
  ORDER BY cso.priority DESC, o.name_de ASC;
END;
$$;


ALTER FUNCTION "public"."get_suggested_offers_for_category"("p_category_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_suggested_offers_for_category"("p_category_id" "uuid") IS 'Returns all suggested offers for a given category, ordered by priority and name';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_community_projects"("search_query" "text" DEFAULT ''::"text", "community_service_id_filter" "uuid" DEFAULT NULL::"uuid", "project_type_filter" "text" DEFAULT NULL::"text", "active_only" boolean DEFAULT true, "limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("project_id" "uuid", "community_service_id" "uuid", "project_type" "text", "name_de" "text", "name_en" "text", "ticket_price_cents" integer, "donation_goal_cents" integer, "is_active" boolean, "start_date" timestamp with time zone, "end_date" timestamp with time zone, "image_path" "text", "rank" real)
    LANGUAGE "sql"
    AS $$
  SELECT
    cp.id AS project_id,
    cp.community_service_id,
    cp.project_type,
    cp.name_de,
    cp.name_en,
    cp.ticket_price_cents,
    cp.donation_goal_cents,
    cp.is_active,
    cp.start_date,
    cp.end_date,
    cp.image_path,
    CASE
      WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
      ELSE ts_rank(cp.search_vector, plainto_tsquery('german', search_query))
    END AS rank
  FROM public.community_projects cp
  WHERE
    (
      active_only = false
      OR cp.is_active = true
    )
    AND (
      community_service_id_filter IS NULL
      OR cp.community_service_id = community_service_id_filter
    )
    AND (
      project_type_filter IS NULL
      OR cp.project_type = project_type_filter
    )
    AND (
      btrim(COALESCE(search_query, '')) = ''
      OR cp.search_vector @@ plainto_tsquery('german', search_query)
    )
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN cp.sort_order END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN cp.name_de END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN ts_rank(cp.search_vector, plainto_tsquery('german', search_query)) END DESC,
    cp.name_de ASC
  LIMIT GREATEST(limit_count, 0)
  OFFSET GREATEST(offset_count, 0);
$$;


ALTER FUNCTION "public"."search_community_projects"("search_query" "text", "community_service_id_filter" "uuid", "project_type_filter" "text", "active_only" boolean, "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_community_projects"("search_query" "text", "community_service_id_filter" "uuid", "project_type_filter" "text", "active_only" boolean, "limit_count" integer, "offset_count" integer) IS 'Full-text search across community projects with service, type, and active filters.';



CREATE OR REPLACE FUNCTION "public"."search_community_services_enhanced"("search_query" "text" DEFAULT ''::"text", "category_filter" "uuid" DEFAULT NULL::"uuid", "city_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0) RETURNS TABLE("community_service_id" "uuid", "community_service_name" "text", "community_service_description" "text", "address_city" "text", "category_id" "uuid", "category_name" "text", "rank" real)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.community_service_id,
    cs.community_service_name,
    cs.community_service_description,
    cs.address_city,
    cs.category_id,
    c.name_de as category_name,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', cs.community_service_name || ' ' || COALESCE(cs.community_service_description, '')),
        plainto_tsquery('german', search_query)
      )
    END as rank
  FROM public.community_services cs
  LEFT JOIN public.categories c ON cs.category_id = c.category_id
  WHERE 
    cs.review_status = 'approved'
    AND (search_query = '' OR to_tsvector('german', cs.community_service_name || ' ' || COALESCE(cs.community_service_description, '')) @@ plainto_tsquery('german', search_query))
    AND (category_filter IS NULL OR cs.category_id = category_filter)
    AND (city_filter IS NULL OR cs.address_city = city_filter)
  ORDER BY 
    CASE WHEN search_query = '' THEN cs.created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    cs.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."search_community_services_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


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
            WHERE token <> ''
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


ALTER FUNCTION "public"."search_food_categories"("search_query" "text", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_food_categories"("search_query" "text", "limit_count" integer) IS 'Searches food cuisine categories with exact and prefix text matching, returns display-normalized German names, category_images, and approved food-provider count.';



CREATE OR REPLACE FUNCTION "public"."search_food_concepts"("search_query" "text" DEFAULT ''::"text", "limit_count" integer DEFAULT 10) RETURNS TABLE("offer_id" "uuid", "name_de" "text", "name_en" "text", "provider_count" bigint)
    LANGUAGE "sql"
    AS $$
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
            WHERE token <> ''
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
  matched_offers AS (
    SELECT
      o.offer_id,
      o.name_de,
      o.name_en,
      CASE
        WHEN qt.normalized = '' THEN 0::REAL
        ELSE GREATEST(
          ts_rank(
            to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
            plainto_tsquery('german', qt.normalized)
          ),
          ts_rank(
            to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
            plainto_tsquery('english', qt.normalized)
          ),
          CASE
            WHEN qt.german_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
              qt.german_prefix_query
            )
          END,
          CASE
            WHEN qt.english_prefix_query IS NULL THEN 0::REAL
            ELSE ts_rank(
              to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
              qt.english_prefix_query
            )
          END
        )
      END AS rank
    FROM public.offers o
    CROSS JOIN query_terms qt
    WHERE
      qt.normalized = ''
      OR to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')) @@ plainto_tsquery('german', qt.normalized)
      OR to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')) @@ plainto_tsquery('english', qt.normalized)
      OR (qt.german_prefix_query IS NOT NULL AND to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')) @@ qt.german_prefix_query)
      OR (qt.english_prefix_query IS NOT NULL AND to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')) @@ qt.english_prefix_query)
  )
  SELECT
    mo.offer_id,
    mo.name_de,
    mo.name_en,
    COUNT(DISTINCT p.provider_id) AS provider_count
  FROM matched_offers mo
  INNER JOIN public.providers p
    ON p.offers_ids @> ARRAY[mo.offer_id]
   AND p.listing_type = 'food'
   AND p.review_status = 'approved'
  GROUP BY mo.offer_id, mo.name_de, mo.name_en, mo.rank
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN COUNT(DISTINCT p.provider_id) END DESC,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN mo.rank END DESC,
    COUNT(DISTINCT p.provider_id) DESC,
    mo.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$$;


ALTER FUNCTION "public"."search_food_concepts"("search_query" "text", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_food_concepts"("search_query" "text", "limit_count" integer) IS 'Searches canonical food concepts (offers) with exact and prefix text matching and returns approved food-provider counts.';



CREATE OR REPLACE FUNCTION "public"."search_food_menu_items"("search_query" "text" DEFAULT ''::"text", "limit_count" integer DEFAULT 10) RETURNS TABLE("name_de" "text", "name_en" "text", "provider_count" bigint)
    LANGUAGE "sql"
    AS $$
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
            WHERE token <> ''
          ),
          ' & '
        ),
        ''
      ) AS prefix_query_str
  ),
  query_terms AS (
    SELECT
      normalized,
      CASE WHEN prefix_query_str IS NULL THEN NULL ELSE to_tsquery('german', prefix_query_str) END AS german_prefix_query
    FROM query_input
  )
  SELECT
    mi.name_de,
    MAX(mi.name_en) AS name_en,
    COUNT(DISTINCT p.provider_id) AS provider_count
  FROM public.provider_menu_items mi
  INNER JOIN public.providers p
    ON p.provider_id = mi.provider_id
   AND p.listing_type = 'food'
   AND p.review_status = 'approved'
  CROSS JOIN query_terms qt
  WHERE
    qt.normalized <> ''
    AND mi.is_available = true
    AND (
      mi.search_vector @@ plainto_tsquery('german', qt.normalized)
      OR (qt.german_prefix_query IS NOT NULL AND mi.search_vector @@ qt.german_prefix_query)
    )
  GROUP BY
    mi.name_de
  ORDER BY
    MAX(
      GREATEST(
        ts_rank(to_tsvector('german', mi.name_de), plainto_tsquery('german', qt.normalized)),
        CASE
          WHEN qt.german_prefix_query IS NULL THEN 0::REAL
          ELSE ts_rank(to_tsvector('german', mi.name_de), qt.german_prefix_query)
        END
      )
    ) DESC,
    COUNT(DISTINCT p.provider_id) DESC,
    mi.name_de ASC
  LIMIT GREATEST(limit_count, 0);
$$;


ALTER FUNCTION "public"."search_food_menu_items"("search_query" "text", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_food_menu_items"("search_query" "text", "limit_count" integer) IS 'Searches provider menu items with exact and prefix text matching and returns deduplicated dish names with approved food-provider counts.';



CREATE OR REPLACE FUNCTION "public"."search_needs"("search_query" "text" DEFAULT ''::"text", "limit_count" integer DEFAULT 100, "offset_count" integer DEFAULT 0) RETURNS TABLE("need_id" "uuid", "name_de" "text", "name_en" "text", "category_id" "uuid", "created_by" "uuid", "created_at" timestamp with time zone, "rank" real)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.need_id,
    n.name_de,
    n.name_en,
    n.category_id,
    n.created_by,
    n.created_at,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', COALESCE(n.name_de, '') || ' ' || COALESCE(n.name_en, '')),
        plainto_tsquery('german', search_query)
      ) + ts_rank(
        to_tsvector('english', COALESCE(n.name_en, '') || ' ' || COALESCE(n.name_de, '')),
        plainto_tsquery('english', search_query)
      )
    END as rank
  FROM public.needs n
  WHERE 
    search_query = '' OR 
    to_tsvector('german', COALESCE(n.name_de, '') || ' ' || COALESCE(n.name_en, '')) @@ plainto_tsquery('german', search_query) OR
    to_tsvector('english', COALESCE(n.name_en, '') || ' ' || COALESCE(n.name_de, '')) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    CASE WHEN search_query = '' THEN created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    name_de ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."search_needs"("search_query" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_offers"("search_query" "text" DEFAULT ''::"text", "limit_count" integer DEFAULT 100, "offset_count" integer DEFAULT 0) RETURNS TABLE("offer_id" "uuid", "name_de" "text", "name_en" "text", "category_id" "uuid", "created_by" "uuid", "created_at" timestamp with time zone, "rank" real)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.offer_id,
    o.name_de,
    o.name_en,
    o.category_id,
    o.created_by,
    o.created_at,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')),
        plainto_tsquery('german', search_query)
      ) + ts_rank(
        to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')),
        plainto_tsquery('english', search_query)
      )
    END as rank
  FROM public.offers o
  WHERE 
    search_query = '' OR 
    to_tsvector('german', COALESCE(o.name_de, '') || ' ' || COALESCE(o.name_en, '')) @@ plainto_tsquery('german', search_query) OR
    to_tsvector('english', COALESCE(o.name_en, '') || ' ' || COALESCE(o.name_de, '')) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    CASE WHEN search_query = '' THEN created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    name_de ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."search_offers"("search_query" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_provider_ids_by_name"("search_query" "text" DEFAULT ''::"text") RETURNS TABLE("provider_id" "uuid")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  IF search_query = '' OR search_query IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.provider_id
  FROM public.providers p
  WHERE p.review_status = 'approved'
    AND to_tsvector('german', p.provider_name)
        @@ plainto_tsquery('german', search_query)
  LIMIT 500; -- Safety cap for provider ID lookup — well above expected provider count; prevents runaway scans
END;
$$;


ALTER FUNCTION "public"."search_provider_ids_by_name"("search_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_provider_items"("search_query" "text" DEFAULT ''::"text", "listing_type_filter" "text" DEFAULT NULL::"text", "provider_id_filter" "uuid" DEFAULT NULL::"uuid", "limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("item_id" "uuid", "provider_id" "uuid", "item_type" "text", "name_de" "text", "name_en" "text", "price_cents" integer, "is_available" boolean, "rank" real)
    LANGUAGE "sql"
    AS $$
  WITH menu_rows AS (
    SELECT
      m.id AS item_id,
      m.provider_id,
      'menu_item'::TEXT AS item_type,
      m.name_de,
      m.name_en,
      m.price_cents,
      m.is_available,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE ts_rank(m.search_vector, plainto_tsquery('german', search_query))
      END AS rank,
      m.sort_order,
      p.listing_type::TEXT AS listing_type
    FROM public.provider_menu_items m
    JOIN public.providers p ON p.provider_id = m.provider_id
    WHERE
      m.is_available = true
      AND (
        provider_id_filter IS NULL
        OR m.provider_id = provider_id_filter
      )
      AND (
        listing_type_filter IS NULL
        OR p.listing_type::TEXT = listing_type_filter
      )
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR m.search_vector @@ plainto_tsquery('german', search_query)
      )
  ),
  service_rows AS (
    SELECT
      s.id AS item_id,
      s.provider_id,
      'service_offer'::TEXT AS item_type,
      s.name_de,
      s.name_en,
      s.price_cents,
      s.is_available,
      CASE
        WHEN btrim(COALESCE(search_query, '')) = '' THEN 0::REAL
        ELSE ts_rank(s.search_vector, plainto_tsquery('german', search_query))
      END AS rank,
      s.sort_order,
      p.listing_type::TEXT AS listing_type
    FROM public.provider_service_offers s
    JOIN public.providers p ON p.provider_id = s.provider_id
    WHERE
      s.is_available = true
      AND (
        provider_id_filter IS NULL
        OR s.provider_id = provider_id_filter
      )
      AND (
        listing_type_filter IS NULL
        OR p.listing_type::TEXT = listing_type_filter
      )
      AND (
        btrim(COALESCE(search_query, '')) = ''
        OR s.search_vector @@ plainto_tsquery('german', search_query)
      )
  )
  SELECT
    u.item_id,
    u.provider_id,
    u.item_type,
    u.name_de,
    u.name_en,
    u.price_cents,
    u.is_available,
    u.rank
  FROM (
    SELECT * FROM menu_rows
    UNION ALL
    SELECT * FROM service_rows
  ) u
  ORDER BY
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN u.sort_order END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) = '' THEN u.name_de END ASC,
    CASE WHEN btrim(COALESCE(search_query, '')) <> '' THEN u.rank END DESC,
    u.name_de ASC
  LIMIT GREATEST(limit_count, 0)
  OFFSET GREATEST(offset_count, 0);
$$;


ALTER FUNCTION "public"."search_provider_items"("search_query" "text", "listing_type_filter" "text", "provider_id_filter" "uuid", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_provider_items"("search_query" "text", "listing_type_filter" "text", "provider_id_filter" "uuid", "limit_count" integer, "offset_count" integer) IS 'Unified item search across provider_menu_items and provider_service_offers with listing_type/provider filters.';



CREATE OR REPLACE FUNCTION "public"."search_providers"("search_query" "text" DEFAULT ''::"text", "category_filter" "uuid" DEFAULT NULL::"uuid", "city_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0) RETURNS TABLE("provider_id" "uuid", "provider_name" "text", "provider_description" "text", "address_city" "text", "category_name" "text", "rank" real)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.provider_description,
    p.address_city,
    c.name_de as category_name,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
        plainto_tsquery('german', search_query)
      )
    END as rank
  FROM public.providers p
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE 
    p.review_status = 'approved'
    AND (search_query = '' OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')) @@ plainto_tsquery('german', search_query))
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (city_filter IS NULL OR p.address_city = city_filter)
  ORDER BY 
    CASE WHEN search_query = '' THEN p.created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."search_providers"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_providers_enhanced"("search_query" "text" DEFAULT ''::"text", "category_filter" "uuid" DEFAULT NULL::"uuid", "city_filter" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0) RETURNS TABLE("provider_id" "uuid", "provider_name" "text", "provider_description" "text", "address_city" "text", "category_id" "uuid", "category_name" "text", "rank" real)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.provider_id,
    p.provider_name,
    p.provider_description,
    p.address_city,
    p.category_id,
    c.name_de as category_name,
    CASE 
      WHEN search_query = '' THEN 0.0
      ELSE ts_rank(
        to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
        plainto_tsquery('german', search_query)
      )
    END as rank
  FROM public.providers p
  LEFT JOIN public.categories c ON p.category_id = c.category_id
  WHERE 
    p.review_status = 'approved'
    AND (search_query = '' OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')) @@ plainto_tsquery('german', search_query))
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (city_filter IS NULL OR p.address_city = city_filter)
  ORDER BY 
    CASE WHEN search_query = '' THEN p.created_at END DESC,
    CASE WHEN search_query != '' THEN rank END DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."search_providers_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_providers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_providers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_provider_badge_to_boolean"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_entity_id UUID;
  v_entity_type entity_type;
  v_badge_type_id UUID;
  v_badge_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.entity_id;
    v_entity_type := NEW.entity_type;
    v_badge_type_id := NEW.badge_type_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.entity_id;
    v_entity_type := OLD.entity_type;
    v_badge_type_id := OLD.badge_type_id;
  ELSE
    RETURN NULL;
  END IF;

  -- Provider booleans only exist on public.providers.
  IF v_entity_type != 'provider' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT bt.badge_key
  INTO v_badge_key
  FROM public.badge_types bt
  WHERE bt.id = v_badge_type_id;

  IF v_badge_key IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    CASE v_badge_key
      WHEN 'MUSLIM_OWNED' THEN
        UPDATE public.providers SET muslim_owned = TRUE WHERE provider_id = v_entity_id;
      WHEN 'PRAYER_FRIENDLY' THEN
        UPDATE public.providers SET has_prayer_space = TRUE WHERE provider_id = v_entity_id;
      WHEN 'SUPPORTS_SADAQAH' THEN
        UPDATE public.providers SET accepts_donations = TRUE WHERE provider_id = v_entity_id;
      ELSE
        NULL;
    END CASE;

    RETURN NEW;
  END IF;

  -- DELETE path: only unset when this was the last badge row for the provider/type.
  IF NOT EXISTS (
    SELECT 1
    FROM public.provider_badges pb
    WHERE pb.entity_id = v_entity_id
      AND pb.entity_type = 'provider'
      AND pb.badge_type_id = v_badge_type_id
  ) THEN
    CASE v_badge_key
      WHEN 'MUSLIM_OWNED' THEN
        UPDATE public.providers SET muslim_owned = FALSE WHERE provider_id = v_entity_id;
      WHEN 'PRAYER_FRIENDLY' THEN
        UPDATE public.providers SET has_prayer_space = FALSE WHERE provider_id = v_entity_id;
      WHEN 'SUPPORTS_SADAQAH' THEN
        UPDATE public.providers SET accepts_donations = FALSE WHERE provider_id = v_entity_id;
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."sync_provider_badge_to_boolean"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_badge_trust_level"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  threshold INTEGER;
BEGIN
  SELECT (config_value->>'confirmation_threshold')::INTEGER
  INTO threshold
  FROM public.badge_system_config
  WHERE config_key = 'confirmation_threshold';
  
  IF threshold IS NULL THEN
    threshold := 5;
  END IF;
  
  IF NEW.trust_level = 'UMMAH_FLOW_VERIFIED' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.confirmation_count >= threshold THEN
    NEW.trust_level := 'COMMUNITY_CONFIRMED';
  ELSE
    NEW.trust_level := 'SELF_DECLARED';
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_badge_trust_level"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_confirmation_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.provider_badges
    SET 
      confirmation_count = confirmation_count + 1,
      updated_at = NOW()
    WHERE id = NEW.provider_badge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.provider_badges
    SET 
      confirmation_count = GREATEST(0, confirmation_count - 1),
      updated_at = NOW()
    WHERE id = OLD.provider_badge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_confirmation_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_push_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_push_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_waitlist_entry_with_token"("p_email" "text", "p_token" "text", "p_selected_city" "text" DEFAULT NULL::"text", "p_has_seen_early_access" boolean DEFAULT NULL::boolean, "p_skipped_early_access" boolean DEFAULT NULL::boolean) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Validate token and update
  -- Only updates if email and token match (security check)
  UPDATE waitlist
  SET 
    selected_city = CASE 
      WHEN p_selected_city IS NOT NULL THEN p_selected_city 
      ELSE selected_city 
    END,
    has_seen_early_access = CASE 
      WHEN p_has_seen_early_access IS NOT NULL THEN p_has_seen_early_access 
      ELSE has_seen_early_access 
    END,
    skipped_early_access = CASE 
      WHEN p_skipped_early_access IS NOT NULL THEN p_skipped_early_access 
      ELSE skipped_early_access 
    END
  WHERE email = LOWER(TRIM(p_email))
    AND waitlist_token = p_token;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid email or token',
      'updated', 0
    );
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'updated', v_updated_count
  );
END;
$$;


ALTER FUNCTION "public"."update_waitlist_entry_with_token"("p_email" "text", "p_token" "text", "p_selected_city" "text", "p_has_seen_early_access" boolean, "p_skipped_early_access" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_waitlist_entry_with_token"("p_email" "text", "p_token" "text", "p_selected_city" "text", "p_has_seen_early_access" boolean, "p_skipped_early_access" boolean) IS 'Updates waitlist entry with token validation. Bypasses RLS using SECURITY DEFINER but validates token for security.';



CREATE OR REPLACE FUNCTION "public"."upsert_joinhalal_providers"("p_providers" "jsonb") RETURNS TABLE("inserted_count" bigint, "updated_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_providers IS NULL OR jsonb_array_length(p_providers) = 0 THEN
    inserted_count := 0;
    updated_count := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH upserted AS (
    INSERT INTO public.providers (
      provider_name,
      category_id,
      address_street,
      address_zip,
      address_city,
      address_country,
      contact_email,
      contact_phone,
      social_website,
      social_instagram,
      offers_ids,
      review_status,
      user_created_id,
      provider_owner_id,
      show_address,
      needs_ids,
      barakah_effects,
      import_source,
      import_source_id,
      import_source_url,
      listing_type,
      no_alcohol,
      halal_level
    )
    SELECT
      elem->>'provider_name',
      (elem->>'category_id')::UUID,
      elem->>'address_street',
      elem->>'address_zip',
      elem->>'address_city',
      elem->>'address_country',
      elem->>'contact_email',
      elem->>'contact_phone',
      elem->>'social_website',
      elem->>'social_instagram',
      CASE
        WHEN elem->'offers_ids' IS NOT NULL
             AND jsonb_typeof(elem->'offers_ids') = 'array'
        THEN ARRAY(SELECT (jsonb_array_elements_text(elem->'offers_ids'))::UUID)
        ELSE '{}'::UUID[]
      END,
      COALESCE((elem->>'review_status')::review_status, 'pending'),
      (elem->>'user_created_id')::UUID,
      (elem->>'provider_owner_id')::UUID,
      COALESCE((elem->>'show_address')::BOOLEAN, true),
      CASE
        WHEN elem->'needs_ids' IS NOT NULL
             AND jsonb_typeof(elem->'needs_ids') = 'array'
        THEN ARRAY(SELECT (jsonb_array_elements_text(elem->'needs_ids'))::UUID)
        ELSE '{}'::UUID[]
      END,
      CASE
        WHEN elem->'barakah_effects' IS NOT NULL
             AND jsonb_typeof(elem->'barakah_effects') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(elem->'barakah_effects'))
        ELSE '{}'::TEXT[]
      END,
      elem->>'import_source',
      elem->>'import_source_id',
      elem->>'import_source_url',
      -- Plan 089: JoinHalal providers are always FOOD
      'food'::listing_type_enum,
      -- Plan 089: JoinHalal records passing this upsert have no alcohol
      -- (hasAlkoholverkauf() rejects alcohol records at app layer)
      TRUE,
      -- Plan 089: default halal_level = 1 (halal meat available)
      -- Higher levels require manual admin assessment
      COALESCE((elem->>'halal_level')::SMALLINT, 1)
    FROM jsonb_array_elements(p_providers) AS elem
    ON CONFLICT (import_source, import_source_id)
      WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL
    DO UPDATE SET
      provider_name       = EXCLUDED.provider_name,
      category_id         = EXCLUDED.category_id,
      address_street      = EXCLUDED.address_street,
      address_zip         = EXCLUDED.address_zip,
      address_city        = EXCLUDED.address_city,
      address_country     = EXCLUDED.address_country,
      contact_email       = EXCLUDED.contact_email,
      contact_phone       = EXCLUDED.contact_phone,
      social_website      = EXCLUDED.social_website,
      social_instagram    = EXCLUDED.social_instagram,
      offers_ids          = EXCLUDED.offers_ids,
      import_source_url   = EXCLUDED.import_source_url,
      -- Plan 089: update section fields on re-import too
      listing_type        = EXCLUDED.listing_type,
      no_alcohol          = EXCLUDED.no_alcohol,
      halal_level         = EXCLUDED.halal_level
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE was_insert), 0)      AS inserted_count,
    COALESCE(COUNT(*) FILTER (WHERE NOT was_insert), 0)  AS updated_count
  FROM upserted;
END;
$$;


ALTER FUNCTION "public"."upsert_joinhalal_providers"("p_providers" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_outreach_token"("p_token_hash" "text") RETURNS TABLE("is_valid" boolean, "provider_id" "uuid", "provider_name" "text", "action_scope" "public"."token_action_scope", "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Find token by hash
  SELECT 
    t.id,
    t.provider_id,
    t.provider_name_snapshot,
    t.action_scope,
    t.expires_at,
    t.consumed_at
  INTO v_token
  FROM public.provider_owner_action_tokens t
  WHERE t.token_hash = p_token_hash;
  
  -- Token not found
  IF v_token IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::token_action_scope,
      'Token not found'::TEXT;
    RETURN;
  END IF;
  
  -- Token already consumed
  IF v_token.consumed_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::token_action_scope,
      'Token already used'::TEXT;
    RETURN;
  END IF;
  
  -- Token expired
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::TEXT,
      NULL::token_action_scope,
      'Token expired'::TEXT;
    RETURN;
  END IF;
  
  -- Valid token
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    v_token.provider_id,
    v_token.provider_name_snapshot,
    v_token.action_scope,
    NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."validate_outreach_token"("p_token_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_outreach_token"("p_token_hash" "text") IS 'Validate an outreach token and return provider info for landing page.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_audit_logs_target_type_check" CHECK (("target_type" = ANY (ARRAY['provider'::"text", 'user'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_audit_logs" IS 'Audit log for admin actions. Tracks all administrative operations for compliance and security.';



CREATE TABLE IF NOT EXISTS "public"."badge_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_badge_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "confirmed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."badge_confirmations" OWNER TO "postgres";


COMMENT ON TABLE "public"."badge_confirmations" IS 'User confirmations for badges - tracks which users confirmed which badges';



CREATE TABLE IF NOT EXISTS "public"."badge_system_config" (
    "config_key" "text" NOT NULL,
    "config_value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."badge_system_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."badge_system_config" IS 'System configuration for badge thresholds and settings';



CREATE TABLE IF NOT EXISTS "public"."badge_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "badge_key" "text" NOT NULL,
    "labels" "jsonb" NOT NULL,
    "description" "text",
    "icon_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."badge_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."badge_types" IS 'Defines available badge types with labels, descriptions, and icons';



CREATE TABLE IF NOT EXISTS "public"."badge_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_badge_id" "uuid" NOT NULL,
    "verified_by_user_id" "uuid" NOT NULL,
    "reason" "text",
    "verified_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."badge_verifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."badge_verifications" IS 'Admin verification audit trail - tracks manual verifications by admins';



CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bookmarkable_id" "uuid" NOT NULL,
    "bookmarkable_type" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bookmarks_bookmarkable_type_check" CHECK (("bookmarkable_type" = ANY (ARRAY['provider'::"text", 'community_service'::"text"])))
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_de" "text",
    "name_en" "text",
    "description_de" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applicable_to" "text"[] DEFAULT '{provider,community_service}'::"text"[],
    "description_en" "text",
    "category_images" "jsonb",
    "applicable_section" "text",
    CONSTRAINT "categories_applicable_section_check" CHECK (("applicable_section" = ANY (ARRAY['food'::"text", 'business'::"text", 'ummah'::"text", 'all'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON COLUMN "public"."categories"."applicable_to" IS 'Array of entity types that can use this category. Options: provider, community_service';



COMMENT ON COLUMN "public"."categories"."applicable_section" IS 'Section scoping for category usage: food, business, ummah, all. NULL means legacy/unscoped.';



CREATE TABLE IF NOT EXISTS "public"."category_suggested_needs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "need_id" "uuid" NOT NULL,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."category_suggested_needs" OWNER TO "postgres";


COMMENT ON TABLE "public"."category_suggested_needs" IS 'Stores predefined need suggestions for each category to help users during provider creation';



CREATE TABLE IF NOT EXISTS "public"."category_suggested_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."category_suggested_offers" OWNER TO "postgres";


COMMENT ON TABLE "public"."category_suggested_offers" IS 'Stores predefined offer suggestions for each category to help users during provider creation';



CREATE TABLE IF NOT EXISTS "public"."cities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city_name" "text" NOT NULL,
    "country" "text" NOT NULL,
    "provider_count" integer DEFAULT 0,
    "trust_level" integer DEFAULT 0,
    "is_unlocked" boolean DEFAULT false,
    "unlocked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


COMMENT ON TABLE "public"."cities" IS 'Tracks cities and their unlock status for the Early Access feature';



COMMENT ON COLUMN "public"."cities"."city_name" IS 'Name of the city (unique)';



COMMENT ON COLUMN "public"."cities"."country" IS 'Country where the city is located';



COMMENT ON COLUMN "public"."cities"."provider_count" IS 'Number of active providers in this city';



COMMENT ON COLUMN "public"."cities"."trust_level" IS 'Calculated trust level (0-100) based on reviews and verification';



COMMENT ON COLUMN "public"."cities"."is_unlocked" IS 'Whether the city has met unlock criteria (min providers, trust level)';



COMMENT ON COLUMN "public"."cities"."unlocked_at" IS 'Timestamp when the city was unlocked';



CREATE TABLE IF NOT EXISTS "public"."community_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_service_id" "uuid" NOT NULL,
    "project_type" "text" NOT NULL,
    "name_de" "text" NOT NULL,
    "name_en" "text",
    "description_de" "text",
    "ticket_price_cents" integer,
    "donation_goal_cents" integer,
    "raised_cents" integer DEFAULT 0 NOT NULL,
    "max_attendees" integer,
    "price_currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "image_path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"german"'::"regconfig", ((((COALESCE("name_de", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text")) || ' '::"text") || COALESCE("description_de", ''::"text")))) STORED,
    CONSTRAINT "community_projects_date_order_check" CHECK ((("end_date" IS NULL) OR ("start_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "community_projects_donation_goal_non_negative" CHECK ((("donation_goal_cents" IS NULL) OR ("donation_goal_cents" >= 0))),
    CONSTRAINT "community_projects_max_attendees_positive" CHECK ((("max_attendees" IS NULL) OR ("max_attendees" > 0))),
    CONSTRAINT "community_projects_project_type_check" CHECK (("project_type" = ANY (ARRAY['event'::"text", 'donation'::"text", 'class'::"text", 'volunteer'::"text"]))),
    CONSTRAINT "community_projects_raised_non_negative" CHECK (("raised_cents" >= 0)),
    CONSTRAINT "community_projects_ticket_price_non_negative" CHECK ((("ticket_price_cents" IS NULL) OR ("ticket_price_cents" >= 0)))
);


ALTER TABLE "public"."community_projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."community_projects" IS 'Ummah item-level projects/events/campaigns under community services. Ordering-ready typed fields with full-text search support.';



CREATE TABLE IF NOT EXISTS "public"."community_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_service_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_service_name" "text" NOT NULL,
    "community_service_description" "text",
    "community_service_logo" "jsonb",
    "is_verified" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "community_service_view_count" integer DEFAULT 0,
    "donation_count" integer DEFAULT 0,
    "category_id" "uuid",
    "contact_email" "text",
    "contact_phone" "text",
    "social_website" "text",
    "social_instagram" "text",
    "address_street" "text",
    "address_zip" "text",
    "address_city" "text",
    "address_country" "text" DEFAULT 'DE'::"text",
    "location_latitude" numeric(10,8),
    "location_longitude" numeric(11,8),
    "review_status" "public"."review_status" DEFAULT 'pending'::"public"."review_status",
    "review_feedback" "text",
    "barakah_effects" "text"[] DEFAULT '{}'::"text"[],
    "provider_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "community_service_images" "jsonb",
    "offers_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "needs_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "show_address" boolean DEFAULT true,
    "user_created_id" "uuid",
    "recommender_email" "text"
);


ALTER TABLE "public"."community_services" OWNER TO "postgres";


COMMENT ON COLUMN "public"."community_services"."recommender_email" IS 'Email address of the person who recommended this service (for anonymous recommendations). Stored with user consent for GDPR compliance.';



CREATE TABLE IF NOT EXISTS "public"."deletion_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."deletion_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_confirmation_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "type" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_confirmation_tokens_type_check" CHECK (("type" = ANY (ARRAY['signup'::"text", 'password_reset'::"text", 'magic_link'::"text"])))
);


ALTER TABLE "public"."email_confirmation_tokens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_confirmation_tokens"."type" IS 'Token type: signup (email confirmation), password_reset (password reset), or magic_link (passwordless login)';



CREATE TABLE IF NOT EXISTS "public"."enrichment_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "source_url" "text",
    "field_name" "text" NOT NULL,
    "proposed_value" "jsonb" NOT NULL,
    "current_value" "jsonb",
    "status" "public"."enrichment_status" DEFAULT 'pending'::"public"."enrichment_status" NOT NULL,
    "enriched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewer_id" "uuid",
    "run_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enrichment_candidates" OWNER TO "postgres";


COMMENT ON TABLE "public"."enrichment_candidates" IS 'Staging inbox for automated provider enrichment proposals. Admin review required before application to providers (ADR-007).';



CREATE TABLE IF NOT EXISTS "public"."enrichment_run_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "triggered_by" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "providers_selected" integer DEFAULT 0 NOT NULL,
    "providers_processed" integer DEFAULT 0 NOT NULL,
    "candidates_created" integer DEFAULT 0 NOT NULL,
    "unchanged_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "circuit_breaker_triggered" boolean DEFAULT false NOT NULL,
    "debug_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enrichment_run_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."enrichment_run_logs" IS 'Telemetry for enrichment pipeline runs. One row per invocation, whether manual or scheduled.';



CREATE TABLE IF NOT EXISTS "public"."needs" (
    "need_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_de" "text" NOT NULL,
    "name_en" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."needs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."needs"."created_by" IS 'User who created this need. NULL means system/admin created.';



COMMENT ON COLUMN "public"."needs"."category_id" IS 'Primary category for this need. Used for categorization and filtering.';



CREATE TABLE IF NOT EXISTS "public"."offers" (
    "offer_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_de" "text" NOT NULL,
    "name_en" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."offers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."offers"."created_by" IS 'User who created this offer. NULL means system/admin created.';



COMMENT ON COLUMN "public"."offers"."category_id" IS 'Primary category for this offer. Used for categorization and filtering.';



CREATE TABLE IF NOT EXISTS "public"."provider_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "public"."entity_type" NOT NULL,
    "badge_type_id" "uuid" NOT NULL,
    "trust_level" "public"."trust_level" DEFAULT 'SELF_DECLARED'::"public"."trust_level" NOT NULL,
    "confirmation_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_badges" IS 'Badges assigned to providers or community services with trust levels';



COMMENT ON COLUMN "public"."provider_badges"."entity_id" IS 'UUID of the provider or community_service';



COMMENT ON COLUMN "public"."provider_badges"."entity_type" IS 'Type of entity: provider or community_service';



COMMENT ON COLUMN "public"."provider_badges"."trust_level" IS 'Current trust level: SELF_DECLARED, COMMUNITY_CONFIRMED, or UMMAH_FLOW_VERIFIED';



COMMENT ON COLUMN "public"."provider_badges"."confirmation_count" IS 'Number of user confirmations (updated automatically via trigger)';



CREATE TABLE IF NOT EXISTS "public"."provider_community_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "community_service_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_community_services" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_community_services" IS 'Many-to-many relationship between providers and community services (social projects)';



COMMENT ON COLUMN "public"."provider_community_services"."provider_id" IS 'Reference to the provider supporting the community service';



COMMENT ON COLUMN "public"."provider_community_services"."community_service_id" IS 'Reference to the community service being supported';



CREATE TABLE IF NOT EXISTS "public"."provider_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "offer_tag_id" "uuid",
    "name_de" "text" NOT NULL,
    "name_en" "text",
    "description_de" "text",
    "price_cents" integer,
    "price_currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "image_path" "text",
    "allergens" "text"[] DEFAULT '{}'::"text"[],
    "is_halal" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"german"'::"regconfig", ((((COALESCE("name_de", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text")) || ' '::"text") || COALESCE("description_de", ''::"text")))) STORED,
    CONSTRAINT "provider_menu_items_price_non_negative" CHECK ((("price_cents" IS NULL) OR ("price_cents" >= 0)))
);


ALTER TABLE "public"."provider_menu_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_menu_items" IS 'Provider-owned food menu items. Typed ordering-ready fields (price_cents, is_available).';



COMMENT ON COLUMN "public"."provider_menu_items"."offer_tag_id" IS 'Optional bridge to global offers vocabulary entry (public.offers.offer_id).';



CREATE TABLE IF NOT EXISTS "public"."provider_outreach_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "outreach_id" "uuid",
    "channel" "public"."outreach_channel" NOT NULL,
    "contact_value" "text" NOT NULL,
    "task_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "outcome_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "provider_outreach_tasks_task_status_check" CHECK (("task_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."provider_outreach_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_outreach_tasks" IS 'Manual outreach tasks for channels that cannot be automated (phone, Instagram).';



CREATE TABLE IF NOT EXISTS "public"."provider_owner_action_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_hash" "text" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "outreach_id" "uuid",
    "action_scope" "public"."token_action_scope" DEFAULT 'decision'::"public"."token_action_scope" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "consumed_at" timestamp with time zone,
    "provider_name_snapshot" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_owner_action_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_owner_action_tokens" IS 'Secure tokens for owner decision actions. Hash only stored, expires after 7 days.';



CREATE TABLE IF NOT EXISTS "public"."provider_owner_outreach" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "candidate_email" "text",
    "candidate_phone" "text",
    "candidate_instagram" "text",
    "selected_channel" "public"."outreach_channel" DEFAULT 'email'::"public"."outreach_channel" NOT NULL,
    "language" "text" DEFAULT 'de'::"text" NOT NULL,
    "status" "public"."outreach_status" DEFAULT 'pending_approval'::"public"."outreach_status" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "next_attempt_at" timestamp with time zone,
    "dispatch_error" "text",
    "dispatch_after" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval) NOT NULL,
    "outcome_at" timestamp with time zone,
    "outcome_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provider_owner_outreach" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_owner_outreach" IS 'Outreach queue for unclaimed providers. Tracks status, approval, and dispatch attempts.';



CREATE TABLE IF NOT EXISTS "public"."provider_service_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "offer_tag_id" "uuid",
    "name_de" "text" NOT NULL,
    "name_en" "text",
    "description_de" "text",
    "price_cents" integer,
    "price_currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "duration_minutes" integer,
    "booking_url" "text",
    "is_available" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"german"'::"regconfig", ((((COALESCE("name_de", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text")) || ' '::"text") || COALESCE("description_de", ''::"text")))) STORED,
    CONSTRAINT "provider_service_offers_duration_non_negative" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" >= 0))),
    CONSTRAINT "provider_service_offers_price_non_negative" CHECK ((("price_cents" IS NULL) OR ("price_cents" >= 0)))
);


ALTER TABLE "public"."provider_service_offers" OWNER TO "postgres";


COMMENT ON TABLE "public"."provider_service_offers" IS 'Provider-owned business service offers. Typed booking-ready fields (duration_minutes, booking_url).';



COMMENT ON COLUMN "public"."provider_service_offers"."offer_tag_id" IS 'Optional bridge to global offers vocabulary entry (public.offers.offer_id).';



CREATE TABLE IF NOT EXISTS "public"."providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_name" "text" NOT NULL,
    "provider_images" "jsonb",
    "category_id" "uuid",
    "address_street" "text",
    "address_zip" "text",
    "address_city" "text",
    "address_country" "text" DEFAULT 'DE'::"text",
    "location_latitude" numeric(10,8),
    "location_longitude" numeric(11,8),
    "contact_email" "text",
    "contact_phone" "text",
    "social_website" "text",
    "social_instagram" "text",
    "barakah_effects" "text"[] DEFAULT '{}'::"text"[],
    "provider_owner_id" "uuid",
    "review_status" "public"."review_status" DEFAULT 'pending'::"public"."review_status",
    "review_feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offers_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "needs_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "show_address" boolean DEFAULT true,
    "user_created_id" "uuid",
    "recommender_email" "text",
    "import_source" "text",
    "import_source_id" "text",
    "import_source_url" "text",
    "provider_description" "text",
    "last_enriched_at" timestamp with time zone,
    "enrichment_eligible" boolean DEFAULT true NOT NULL,
    "listing_type" "public"."listing_type_enum",
    "halal_level" smallint,
    "muslim_owned" boolean DEFAULT false NOT NULL,
    "no_alcohol" boolean DEFAULT false NOT NULL,
    "no_pork" boolean DEFAULT false NOT NULL,
    "no_gambling" boolean DEFAULT false NOT NULL,
    "has_prayer_space" boolean DEFAULT false NOT NULL,
    "family_friendly" boolean DEFAULT false NOT NULL,
    "women_friendly" boolean DEFAULT false NOT NULL,
    "children_friendly" boolean DEFAULT false NOT NULL,
    "accepts_donations" boolean DEFAULT false NOT NULL,
    "has_parking" boolean DEFAULT false NOT NULL,
    "solidarity_pricing" boolean DEFAULT false NOT NULL,
    CONSTRAINT "halal_level_range" CHECK ((("halal_level" >= 1) AND ("halal_level" <= 3)))
);


ALTER TABLE "public"."providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."providers" IS 'Providers table with array-based offers_ids and needs_ids for multiple selections';



COMMENT ON COLUMN "public"."providers"."barakah_effects" IS 'Array of tags/effects that this provider creates';



COMMENT ON COLUMN "public"."providers"."provider_owner_id" IS 'The actual business owner (only set when user creates their own business)';



COMMENT ON COLUMN "public"."providers"."offers_ids" IS 'Array of offer IDs that this provider offers';



COMMENT ON COLUMN "public"."providers"."needs_ids" IS 'Array of need IDs that this provider can fulfill';



COMMENT ON COLUMN "public"."providers"."show_address" IS 'Whether to show the provider address publicly or as "Online"';



COMMENT ON COLUMN "public"."providers"."user_created_id" IS 'The user who created this database entry (always set - tracks creator)';



COMMENT ON COLUMN "public"."providers"."recommender_email" IS 'Email address of the person who recommended this provider (for anonymous recommendations). Stored with user consent for GDPR compliance.';



COMMENT ON COLUMN "public"."providers"."last_enriched_at" IS 'Timestamp of the most recent enrichment run that processed this provider.';



COMMENT ON COLUMN "public"."providers"."enrichment_eligible" IS 'When false, this provider is excluded from automated enrichment runs.';



CREATE MATERIALIZED VIEW "public"."provider_stats" AS
 SELECT "count"(*) AS "total_providers",
    "count"(*) FILTER (WHERE ("review_status" = 'approved'::"public"."review_status")) AS "approved_count",
    "count"(*) FILTER (WHERE ("review_status" = 'pending'::"public"."review_status")) AS "pending_count",
    "count"(*) FILTER (WHERE ("review_status" = 'needs_revision'::"public"."review_status")) AS "needs_revision_count",
    "count"(*) FILTER (WHERE ("created_at" > ("now"() - '30 days'::interval))) AS "new_this_month",
    (COALESCE("avg"(EXTRACT(epoch FROM ("now"() - "created_at"))), (0)::numeric))::double precision AS "avg_age_seconds",
    ( SELECT COALESCE("count"(*), (0)::bigint) AS "coalesce"
           FROM "public"."provider_menu_items"
          WHERE ("provider_menu_items"."is_available" = true)) AS "menu_item_count",
    ( SELECT COALESCE("count"(*), (0)::bigint) AS "coalesce"
           FROM "public"."provider_service_offers"
          WHERE ("provider_service_offers"."is_available" = true)) AS "service_offer_count",
    ( SELECT COALESCE("count"(*), (0)::bigint) AS "coalesce"
           FROM "public"."community_projects"
          WHERE ("community_projects"."is_active" = true)) AS "community_project_count"
   FROM "public"."providers"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."provider_stats" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."provider_stats" IS 'Cached platform/provider aggregations; includes available menu, service, and community project totals.';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "keys" "jsonb" NOT NULL,
    "user_agent" "text",
    "device_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Stores push notification subscriptions for PWA users. Each user can have multiple subscriptions (one per device).';



COMMENT ON COLUMN "public"."push_subscriptions"."endpoint" IS 'The push service endpoint URL (unique per device/browser)';



COMMENT ON COLUMN "public"."push_subscriptions"."keys" IS 'Encryption keys for push messages (p256dh and auth)';



COMMENT ON COLUMN "public"."push_subscriptions"."user_agent" IS 'Browser user agent for debugging and analytics';



COMMENT ON COLUMN "public"."push_subscriptions"."device_info" IS 'Optional device information (platform, OS, etc.)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "is_provider" boolean,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "has_seen_early_access" boolean DEFAULT false,
    "selected_city" "text",
    "skipped_early_access" boolean DEFAULT false,
    "waitlist_token" "text"
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


COMMENT ON TABLE "public"."waitlist" IS 'Stores waitlist signups with email and provider status. Used for pre-launch user acquisition.';



COMMENT ON COLUMN "public"."waitlist"."email" IS 'User email address (unique)';



COMMENT ON COLUMN "public"."waitlist"."is_provider" IS 'Whether user is joining as a provider. NULL if user closed modal without selecting.';



COMMENT ON COLUMN "public"."waitlist"."ip_address" IS 'IP address from which signup occurred (for analytics and fraud prevention)';



COMMENT ON COLUMN "public"."waitlist"."user_agent" IS 'Browser user agent for analytics';



COMMENT ON COLUMN "public"."waitlist"."created_at" IS 'Timestamp when user joined waitlist';



COMMENT ON COLUMN "public"."waitlist"."confirmed_at" IS 'Timestamp when user confirmed email (if applicable)';



COMMENT ON COLUMN "public"."waitlist"."has_seen_early_access" IS 'Tracks if user has seen the early access screen';



COMMENT ON COLUMN "public"."waitlist"."selected_city" IS 'City the user is interested in (for future unlock notifications)';



COMMENT ON COLUMN "public"."waitlist"."skipped_early_access" IS 'Tracks if user explicitly skipped the early access flow';



COMMENT ON COLUMN "public"."waitlist"."waitlist_token" IS 'Unique token for secure waitlist entry updates (prevents unauthorized modifications)';



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badge_confirmations"
    ADD CONSTRAINT "badge_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badge_confirmations"
    ADD CONSTRAINT "badge_confirmations_provider_badge_id_user_id_key" UNIQUE ("provider_badge_id", "user_id");



ALTER TABLE ONLY "public"."badge_system_config"
    ADD CONSTRAINT "badge_system_config_pkey" PRIMARY KEY ("config_key");



ALTER TABLE ONLY "public"."badge_types"
    ADD CONSTRAINT "badge_types_badge_key_key" UNIQUE ("badge_key");



ALTER TABLE ONLY "public"."badge_types"
    ADD CONSTRAINT "badge_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badge_verifications"
    ADD CONSTRAINT "badge_verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_bookmarkable_id_bookmarkable_type_user_id_key" UNIQUE ("bookmarkable_id", "bookmarkable_type", "user_id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_category_id_key" UNIQUE ("category_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_suggested_needs"
    ADD CONSTRAINT "category_suggested_needs_category_id_need_id_key" UNIQUE ("category_id", "need_id");



ALTER TABLE ONLY "public"."category_suggested_needs"
    ADD CONSTRAINT "category_suggested_needs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_suggested_offers"
    ADD CONSTRAINT "category_suggested_offers_category_id_offer_id_key" UNIQUE ("category_id", "offer_id");



ALTER TABLE ONLY "public"."category_suggested_offers"
    ADD CONSTRAINT "category_suggested_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_city_name_key" UNIQUE ("city_name");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_projects"
    ADD CONSTRAINT "community_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_services"
    ADD CONSTRAINT "community_services_community_service_id_key" UNIQUE ("community_service_id");



ALTER TABLE ONLY "public"."community_services"
    ADD CONSTRAINT "community_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deletion_logs"
    ADD CONSTRAINT "deletion_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_confirmation_tokens"
    ADD CONSTRAINT "email_confirmation_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_confirmation_tokens"
    ADD CONSTRAINT "email_confirmation_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."enrichment_candidates"
    ADD CONSTRAINT "enrichment_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrichment_run_logs"
    ADD CONSTRAINT "enrichment_run_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."needs"
    ADD CONSTRAINT "needs_name_de_unique" UNIQUE ("name_de");



ALTER TABLE ONLY "public"."needs"
    ADD CONSTRAINT "needs_pkey" PRIMARY KEY ("need_id");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_name_de_unique" UNIQUE ("name_de");



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("offer_id");



ALTER TABLE ONLY "public"."provider_badges"
    ADD CONSTRAINT "provider_badges_entity_id_entity_type_badge_type_id_key" UNIQUE ("entity_id", "entity_type", "badge_type_id");



ALTER TABLE ONLY "public"."provider_badges"
    ADD CONSTRAINT "provider_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_community_services"
    ADD CONSTRAINT "provider_community_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_community_services"
    ADD CONSTRAINT "provider_community_services_provider_id_community_service_i_key" UNIQUE ("provider_id", "community_service_id");



ALTER TABLE ONLY "public"."provider_menu_items"
    ADD CONSTRAINT "provider_menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_outreach_tasks"
    ADD CONSTRAINT "provider_outreach_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_owner_action_tokens"
    ADD CONSTRAINT "provider_owner_action_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_owner_action_tokens"
    ADD CONSTRAINT "provider_owner_action_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."provider_owner_outreach"
    ADD CONSTRAINT "provider_owner_outreach_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_service_offers"
    ADD CONSTRAINT "provider_service_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_provider_id_key" UNIQUE ("provider_id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_waitlist_token_key" UNIQUE ("waitlist_token");



CREATE INDEX "idx_admin_audit_logs_action" ON "public"."admin_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_admin_audit_logs_admin_user_id" ON "public"."admin_audit_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_target_type_id" ON "public"."admin_audit_logs" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_badge_confirmations_badge" ON "public"."badge_confirmations" USING "btree" ("provider_badge_id");



CREATE INDEX "idx_badge_confirmations_confirmed_at" ON "public"."badge_confirmations" USING "btree" ("confirmed_at");



CREATE INDEX "idx_badge_confirmations_user" ON "public"."badge_confirmations" USING "btree" ("user_id");



CREATE INDEX "idx_badge_types_badge_key" ON "public"."badge_types" USING "btree" ("badge_key");



CREATE INDEX "idx_badge_types_is_active" ON "public"."badge_types" USING "btree" ("is_active");



CREATE INDEX "idx_badge_verifications_badge" ON "public"."badge_verifications" USING "btree" ("provider_badge_id");



CREATE INDEX "idx_badge_verifications_verified_by" ON "public"."badge_verifications" USING "btree" ("verified_by_user_id");



CREATE INDEX "idx_bookmarks_bookmarkable" ON "public"."bookmarks" USING "btree" ("bookmarkable_id", "bookmarkable_type");



CREATE INDEX "idx_bookmarks_type" ON "public"."bookmarks" USING "btree" ("bookmarkable_type");



CREATE INDEX "idx_bookmarks_user_entity" ON "public"."bookmarks" USING "btree" ("user_id", "bookmarkable_type", "bookmarkable_id");



COMMENT ON INDEX "public"."idx_bookmarks_user_entity" IS 'Composite index for bookmark lookups by user and entity (used in useOptimisticBookmark and bookmark lists)';



CREATE INDEX "idx_bookmarks_user_id" ON "public"."bookmarks" USING "btree" ("user_id");



CREATE INDEX "idx_categories_applicable_section" ON "public"."categories" USING "btree" ("applicable_section") WHERE ("applicable_section" IS NOT NULL);



CREATE INDEX "idx_categories_applicable_to" ON "public"."categories" USING "gin" ("applicable_to");



CREATE INDEX "idx_categories_category_id" ON "public"."categories" USING "btree" ("category_id");



CREATE INDEX "idx_category_suggested_needs_category" ON "public"."category_suggested_needs" USING "btree" ("category_id");



CREATE INDEX "idx_category_suggested_needs_need" ON "public"."category_suggested_needs" USING "btree" ("need_id");



CREATE INDEX "idx_category_suggested_needs_priority" ON "public"."category_suggested_needs" USING "btree" ("category_id", "priority" DESC);



CREATE INDEX "idx_category_suggested_offers_category" ON "public"."category_suggested_offers" USING "btree" ("category_id");



CREATE INDEX "idx_category_suggested_offers_offer" ON "public"."category_suggested_offers" USING "btree" ("offer_id");



CREATE INDEX "idx_category_suggested_offers_priority" ON "public"."category_suggested_offers" USING "btree" ("category_id", "priority" DESC);



CREATE INDEX "idx_cities_country" ON "public"."cities" USING "btree" ("country");



CREATE INDEX "idx_cities_name" ON "public"."cities" USING "btree" ("city_name");



CREATE INDEX "idx_cities_provider_count" ON "public"."cities" USING "btree" ("provider_count" DESC);



CREATE INDEX "idx_cities_unlocked" ON "public"."cities" USING "btree" ("is_unlocked") WHERE ("is_unlocked" = true);



CREATE INDEX "idx_community_projects_active_by_service" ON "public"."community_projects" USING "btree" ("community_service_id") WHERE ("is_active" = true);



CREATE INDEX "idx_community_projects_project_type" ON "public"."community_projects" USING "btree" ("project_type");



CREATE INDEX "idx_community_projects_search_vector" ON "public"."community_projects" USING "gin" ("search_vector");



CREATE INDEX "idx_community_projects_service_id" ON "public"."community_projects" USING "btree" ("community_service_id");



CREATE INDEX "idx_community_services_category_id" ON "public"."community_services" USING "btree" ("category_id");



CREATE INDEX "idx_community_services_community_service_id" ON "public"."community_services" USING "btree" ("community_service_id");



CREATE INDEX "idx_community_services_name_desc_search" ON "public"."community_services" USING "gin" ("to_tsvector"('"german"'::"regconfig", (("community_service_name" || ' '::"text") || COALESCE("community_service_description", ''::"text"))));



CREATE INDEX "idx_community_services_name_search" ON "public"."community_services" USING "gin" ("to_tsvector"('"german"'::"regconfig", "community_service_name"));



CREATE INDEX "idx_community_services_needs_ids" ON "public"."community_services" USING "gin" ("needs_ids");



CREATE INDEX "idx_community_services_offers_ids" ON "public"."community_services" USING "gin" ("offers_ids");



CREATE INDEX "idx_community_services_provider_id" ON "public"."community_services" USING "btree" ("provider_id");



CREATE INDEX "idx_community_services_recommender_email" ON "public"."community_services" USING "btree" ("recommender_email") WHERE ("recommender_email" IS NOT NULL);



CREATE INDEX "idx_community_services_review_status" ON "public"."community_services" USING "btree" ("review_status");



CREATE INDEX "idx_community_services_user_created_id" ON "public"."community_services" USING "btree" ("user_created_id");



CREATE INDEX "idx_community_services_verified" ON "public"."community_services" USING "btree" ("is_verified");



CREATE INDEX "idx_email_confirmation_tokens_email" ON "public"."email_confirmation_tokens" USING "btree" ("email");



CREATE INDEX "idx_email_confirmation_tokens_expires_at" ON "public"."email_confirmation_tokens" USING "btree" ("expires_at") WHERE ("used" = false);



CREATE INDEX "idx_email_confirmation_tokens_lookup" ON "public"."email_confirmation_tokens" USING "btree" ("token", "email", "type", "used");



CREATE INDEX "idx_email_confirmation_tokens_token" ON "public"."email_confirmation_tokens" USING "btree" ("token");



CREATE INDEX "idx_email_confirmation_tokens_type" ON "public"."email_confirmation_tokens" USING "btree" ("type");



CREATE INDEX "idx_email_confirmation_tokens_user_id" ON "public"."email_confirmation_tokens" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_enrichment_candidates_dedup" ON "public"."enrichment_candidates" USING "btree" ("provider_id", "field_name", "source") WHERE ("status" = 'pending'::"public"."enrichment_status");



CREATE INDEX "idx_enrichment_candidates_provider_status" ON "public"."enrichment_candidates" USING "btree" ("provider_id", "status");



CREATE INDEX "idx_enrichment_candidates_source" ON "public"."enrichment_candidates" USING "btree" ("source");



CREATE INDEX "idx_needs_category_id" ON "public"."needs" USING "btree" ("category_id");



CREATE INDEX "idx_needs_combined_search" ON "public"."needs" USING "gin" ("to_tsvector"('"german"'::"regconfig", ((COALESCE("name_de", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text"))));



CREATE INDEX "idx_needs_created_by" ON "public"."needs" USING "btree" ("created_by");



CREATE INDEX "idx_needs_name_de_search" ON "public"."needs" USING "gin" ("to_tsvector"('"german"'::"regconfig", "name_de"));



CREATE INDEX "idx_needs_name_en_search" ON "public"."needs" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name_en"));



CREATE INDEX "idx_offers_category_id" ON "public"."offers" USING "btree" ("category_id");



CREATE INDEX "idx_offers_combined_search" ON "public"."offers" USING "gin" ("to_tsvector"('"german"'::"regconfig", ((COALESCE("name_de", ''::"text") || ' '::"text") || COALESCE("name_en", ''::"text"))));



CREATE INDEX "idx_offers_created_by" ON "public"."offers" USING "btree" ("created_by");



CREATE INDEX "idx_offers_name_de_search" ON "public"."offers" USING "gin" ("to_tsvector"('"german"'::"regconfig", "name_de"));



CREATE INDEX "idx_offers_name_en_search" ON "public"."offers" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name_en"));



CREATE INDEX "idx_provider_badges_badge_type" ON "public"."provider_badges" USING "btree" ("badge_type_id");



CREATE INDEX "idx_provider_badges_created_at" ON "public"."provider_badges" USING "btree" ("created_at");



CREATE INDEX "idx_provider_badges_entity" ON "public"."provider_badges" USING "btree" ("entity_id", "entity_type");



CREATE INDEX "idx_provider_badges_trust_level" ON "public"."provider_badges" USING "btree" ("trust_level");



CREATE INDEX "idx_provider_community_services_community_service_id" ON "public"."provider_community_services" USING "btree" ("community_service_id");



CREATE INDEX "idx_provider_community_services_composite" ON "public"."provider_community_services" USING "btree" ("provider_id", "community_service_id");



CREATE INDEX "idx_provider_community_services_provider_id" ON "public"."provider_community_services" USING "btree" ("provider_id");



CREATE INDEX "idx_provider_menu_items_available_by_provider" ON "public"."provider_menu_items" USING "btree" ("provider_id") WHERE ("is_available" = true);



CREATE INDEX "idx_provider_menu_items_provider_id" ON "public"."provider_menu_items" USING "btree" ("provider_id");



CREATE INDEX "idx_provider_menu_items_search_vector" ON "public"."provider_menu_items" USING "gin" ("search_vector");



CREATE INDEX "idx_provider_outreach_tasks_pending" ON "public"."provider_outreach_tasks" USING "btree" ("task_status", "created_at") WHERE ("task_status" = 'pending'::"text");



CREATE INDEX "idx_provider_owner_action_tokens_hash" ON "public"."provider_owner_action_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_provider_owner_action_tokens_provider" ON "public"."provider_owner_action_tokens" USING "btree" ("provider_id", "expires_at") WHERE ("consumed_at" IS NULL);



CREATE UNIQUE INDEX "idx_provider_owner_outreach_active_provider" ON "public"."provider_owner_outreach" USING "btree" ("provider_id") WHERE ("status" <> ALL (ARRAY['claimed'::"public"."outreach_status", 'removed'::"public"."outreach_status", 'kept'::"public"."outreach_status", 'expired'::"public"."outreach_status", 'failed'::"public"."outreach_status"]));



CREATE INDEX "idx_provider_owner_outreach_pending" ON "public"."provider_owner_outreach" USING "btree" ("status", "dispatch_after", "next_attempt_at") WHERE ("status" = ANY (ARRAY['approved'::"public"."outreach_status", 'pending_dispatch'::"public"."outreach_status"]));



CREATE INDEX "idx_provider_owner_outreach_provider_id" ON "public"."provider_owner_outreach" USING "btree" ("provider_id");



CREATE INDEX "idx_provider_service_offers_available_by_provider" ON "public"."provider_service_offers" USING "btree" ("provider_id") WHERE ("is_available" = true);



CREATE INDEX "idx_provider_service_offers_provider_id" ON "public"."provider_service_offers" USING "btree" ("provider_id");



CREATE INDEX "idx_provider_service_offers_search_vector" ON "public"."provider_service_offers" USING "gin" ("search_vector");



CREATE UNIQUE INDEX "idx_provider_stats_singleton" ON "public"."provider_stats" USING "btree" ((true));



CREATE INDEX "idx_providers_barakah_effects" ON "public"."providers" USING "gin" ("barakah_effects");



CREATE INDEX "idx_providers_business_muslim_owned" ON "public"."providers" USING "btree" ("listing_type", "muslim_owned") WHERE ("listing_type" = 'business'::"public"."listing_type_enum");



CREATE INDEX "idx_providers_category_id" ON "public"."providers" USING "btree" ("category_id");



CREATE INDEX "idx_providers_city" ON "public"."providers" USING "btree" ("address_city");



CREATE INDEX "idx_providers_created_at" ON "public"."providers" USING "btree" ("created_at");



CREATE INDEX "idx_providers_food_muslim_owned" ON "public"."providers" USING "btree" ("listing_type", "muslim_owned") WHERE ("listing_type" = 'food'::"public"."listing_type_enum");



CREATE INDEX "idx_providers_halal_level" ON "public"."providers" USING "btree" ("halal_level") WHERE ("halal_level" IS NOT NULL);



CREATE UNIQUE INDEX "idx_providers_import_source_unique" ON "public"."providers" USING "btree" ("import_source", "import_source_id") WHERE (("import_source" IS NOT NULL) AND ("import_source_id" IS NOT NULL));



CREATE INDEX "idx_providers_listing_type" ON "public"."providers" USING "btree" ("listing_type");



CREATE INDEX "idx_providers_muslim_owned" ON "public"."providers" USING "btree" ("muslim_owned") WHERE ("muslim_owned" = true);



CREATE INDEX "idx_providers_name_search" ON "public"."providers" USING "gin" ("to_tsvector"('"german"'::"regconfig", "provider_name"));



CREATE INDEX "idx_providers_needs_ids" ON "public"."providers" USING "gin" ("needs_ids");



CREATE INDEX "idx_providers_offers_ids" ON "public"."providers" USING "gin" ("offers_ids");



CREATE INDEX "idx_providers_owner_id" ON "public"."providers" USING "btree" ("provider_owner_id");



CREATE INDEX "idx_providers_owner_lookup" ON "public"."providers" USING "btree" ("provider_owner_id") WHERE ("provider_owner_id" IS NOT NULL);



CREATE INDEX "idx_providers_provider_id" ON "public"."providers" USING "btree" ("provider_id");



CREATE INDEX "idx_providers_recommender_email" ON "public"."providers" USING "btree" ("recommender_email") WHERE ("recommender_email" IS NOT NULL);



CREATE INDEX "idx_providers_review_status" ON "public"."providers" USING "btree" ("review_status");



COMMENT ON INDEX "public"."idx_providers_review_status" IS 'Index for filtering providers by review status (used in admin panel)';



CREATE INDEX "idx_providers_review_status_created_at" ON "public"."providers" USING "btree" ("review_status", "created_at" DESC);



COMMENT ON INDEX "public"."idx_providers_review_status_created_at" IS 'Composite index for common admin query: status filter + date sorting';



CREATE INDEX "idx_providers_user_created_id" ON "public"."providers" USING "btree" ("user_created_id");



CREATE INDEX "idx_push_subscriptions_endpoint" ON "public"."push_subscriptions" USING "btree" ("endpoint");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_user_id" ON "public"."users" USING "btree" ("user_id");



CREATE INDEX "idx_users_user_id_role" ON "public"."users" USING "btree" ("user_id", "role") WHERE ("role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]));



COMMENT ON INDEX "public"."idx_users_user_id_role" IS 'Optimizes admin/moderator role checks in RLS policies, particularly for provider UPDATE operations';



CREATE INDEX "idx_waitlist_confirmed_at" ON "public"."waitlist" USING "btree" ("confirmed_at") WHERE ("confirmed_at" IS NOT NULL);



CREATE INDEX "idx_waitlist_created_at" ON "public"."waitlist" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_waitlist_email" ON "public"."waitlist" USING "btree" ("email");



CREATE INDEX "idx_waitlist_is_provider" ON "public"."waitlist" USING "btree" ("is_provider") WHERE ("is_provider" IS NOT NULL);



CREATE INDEX "idx_waitlist_selected_city" ON "public"."waitlist" USING "btree" ("selected_city") WHERE ("selected_city" IS NOT NULL);



CREATE INDEX "idx_waitlist_token" ON "public"."waitlist" USING "btree" ("waitlist_token") WHERE ("waitlist_token" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trigger_badge_system_config_updated_at" BEFORE UPDATE ON "public"."badge_system_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_badge_types_updated_at" BEFORE UPDATE ON "public"."badge_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_community_projects_updated_at" BEFORE UPDATE ON "public"."community_projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_enqueue_provider_outreach" AFTER INSERT ON "public"."providers" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_provider_outreach"();



COMMENT ON TRIGGER "trigger_enqueue_provider_outreach" ON "public"."providers" IS 'Trigger to auto-enqueue provider owner outreach on INSERT of recommendation-mode providers.';



CREATE OR REPLACE TRIGGER "trigger_provider_menu_items_updated_at" BEFORE UPDATE ON "public"."provider_menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_provider_service_offers_updated_at" BEFORE UPDATE ON "public"."provider_service_offers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_providers_updated_at" BEFORE UPDATE ON "public"."providers" FOR EACH ROW EXECUTE FUNCTION "public"."set_providers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_sync_provider_badge_to_boolean" AFTER INSERT OR DELETE ON "public"."provider_badges" FOR EACH ROW EXECUTE FUNCTION "public"."sync_provider_badge_to_boolean"();



CREATE OR REPLACE TRIGGER "trigger_update_badge_trust_level" BEFORE UPDATE OF "confirmation_count" ON "public"."provider_badges" FOR EACH ROW EXECUTE FUNCTION "public"."update_badge_trust_level"();



CREATE OR REPLACE TRIGGER "trigger_update_confirmation_count" AFTER INSERT OR DELETE ON "public"."badge_confirmations" FOR EACH ROW EXECUTE FUNCTION "public"."update_confirmation_count"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_community_services_updated_at" BEFORE UPDATE ON "public"."community_services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_provider_outreach_tasks_updated_at" BEFORE UPDATE ON "public"."provider_outreach_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_provider_owner_outreach_updated_at" BEFORE UPDATE ON "public"."provider_owner_outreach" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_providers_updated_at" BEFORE UPDATE ON "public"."providers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_push_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."badge_confirmations"
    ADD CONSTRAINT "badge_confirmations_provider_badge_id_fkey" FOREIGN KEY ("provider_badge_id") REFERENCES "public"."provider_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badge_confirmations"
    ADD CONSTRAINT "badge_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badge_verifications"
    ADD CONSTRAINT "badge_verifications_provider_badge_id_fkey" FOREIGN KEY ("provider_badge_id") REFERENCES "public"."provider_badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badge_verifications"
    ADD CONSTRAINT "badge_verifications_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_suggested_needs"
    ADD CONSTRAINT "category_suggested_needs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_suggested_needs"
    ADD CONSTRAINT "category_suggested_needs_need_id_fkey" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("need_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_suggested_offers"
    ADD CONSTRAINT "category_suggested_offers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_suggested_offers"
    ADD CONSTRAINT "category_suggested_offers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("offer_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_projects"
    ADD CONSTRAINT "community_projects_community_service_id_fkey" FOREIGN KEY ("community_service_id") REFERENCES "public"."community_services"("community_service_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_services"
    ADD CONSTRAINT "community_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id");



ALTER TABLE ONLY "public"."community_services"
    ADD CONSTRAINT "community_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_services"
    ADD CONSTRAINT "community_services_user_created_id_fkey" FOREIGN KEY ("user_created_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_services"
    ADD CONSTRAINT "community_services_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_confirmation_tokens"
    ADD CONSTRAINT "email_confirmation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrichment_candidates"
    ADD CONSTRAINT "enrichment_candidates_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrichment_candidates"
    ADD CONSTRAINT "enrichment_candidates_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "fk_admin_audit_logs_admin_user_id" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."needs"
    ADD CONSTRAINT "needs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."needs"
    ADD CONSTRAINT "needs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."offers"
    ADD CONSTRAINT "offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_badges"
    ADD CONSTRAINT "provider_badges_badge_type_id_fkey" FOREIGN KEY ("badge_type_id") REFERENCES "public"."badge_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_community_services"
    ADD CONSTRAINT "provider_community_services_community_service_id_fkey" FOREIGN KEY ("community_service_id") REFERENCES "public"."community_services"("community_service_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_community_services"
    ADD CONSTRAINT "provider_community_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_menu_items"
    ADD CONSTRAINT "provider_menu_items_offer_tag_id_fkey" FOREIGN KEY ("offer_tag_id") REFERENCES "public"."offers"("offer_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_menu_items"
    ADD CONSTRAINT "provider_menu_items_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_outreach_tasks"
    ADD CONSTRAINT "provider_outreach_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."provider_outreach_tasks"
    ADD CONSTRAINT "provider_outreach_tasks_outreach_id_fkey" FOREIGN KEY ("outreach_id") REFERENCES "public"."provider_owner_outreach"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_outreach_tasks"
    ADD CONSTRAINT "provider_outreach_tasks_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_owner_action_tokens"
    ADD CONSTRAINT "provider_owner_action_tokens_outreach_id_fkey" FOREIGN KEY ("outreach_id") REFERENCES "public"."provider_owner_outreach"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_owner_action_tokens"
    ADD CONSTRAINT "provider_owner_action_tokens_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_owner_outreach"
    ADD CONSTRAINT "provider_owner_outreach_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."provider_owner_outreach"
    ADD CONSTRAINT "provider_owner_outreach_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."provider_service_offers"
    ADD CONSTRAINT "provider_service_offers_offer_tag_id_fkey" FOREIGN KEY ("offer_tag_id") REFERENCES "public"."offers"("offer_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."provider_service_offers"
    ADD CONSTRAINT "provider_service_offers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("provider_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_provider_owner_id_fkey" FOREIGN KEY ("provider_owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_user_created_id_fkey" FOREIGN KEY ("user_created_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete badge system config" ON "public"."badge_system_config" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can delete categories" ON "public"."categories" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can insert badge system config" ON "public"."badge_system_config" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can insert badge types" ON "public"."badge_types" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can insert badge verifications" ON "public"."badge_verifications" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))) AND ("verified_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Admins can insert categories" ON "public"."categories" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can read enrichment candidates" ON "public"."enrichment_candidates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can read enrichment run logs" ON "public"."enrichment_run_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can update badge system config" ON "public"."badge_system_config" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can update badge types" ON "public"."badge_types" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can update categories" ON "public"."categories" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can update enrichment candidates" ON "public"."enrichment_candidates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can view audit logs" ON "public"."admin_audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Allow authenticated users to create relationships" ON "public"."provider_community_services" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Allow provider inserts" ON "public"."providers" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))) OR ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND ("user_created_id" = ( SELECT "auth"."uid"() AS "uid"))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND ("user_created_id" IS NULL) AND ("provider_owner_id" IS NULL))));



CREATE POLICY "Allow public read access to provider community services" ON "public"."provider_community_services" FOR SELECT USING (true);



CREATE POLICY "Anyone can create community services" ON "public"."community_services" FOR INSERT WITH CHECK ((((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text") AND (("user_created_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_created_id" IS NULL))) OR ((( SELECT "auth"."role"() AS "role") = 'anon'::"text") AND ("user_created_id" IS NULL))));



CREATE POLICY "Anyone can join waitlist" ON "public"."waitlist" FOR INSERT WITH CHECK ((("email" IS NOT NULL) AND ("email" ~ '^[^@]+@[^@]+\.[^@]+$'::"text") AND ("length"("email") <= 255)));



CREATE POLICY "Anyone can view categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can view cities" ON "public"."cities" FOR SELECT USING (true);



CREATE POLICY "Anyone can view community services" ON "public"."community_services" FOR SELECT USING ((("review_status" = 'approved'::"public"."review_status") OR ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_created_id" = ( SELECT "auth"."uid"() AS "uid"))) OR ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("provider_id" IN ( SELECT "providers"."provider_id"
   FROM "public"."providers"
  WHERE ("providers"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "Authenticated users can delete suggested needs" ON "public"."category_suggested_needs" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete suggested offers" ON "public"."category_suggested_offers" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert provider badges" ON "public"."provider_badges" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can insert suggested needs" ON "public"."category_suggested_needs" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert suggested offers" ON "public"."category_suggested_offers" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert their own confirmations" ON "public"."badge_confirmations" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Authenticated users can update needs" ON "public"."needs" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can update offers" ON "public"."offers" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can update suggested needs" ON "public"."category_suggested_needs" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update suggested offers" ON "public"."category_suggested_offers" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Badge confirmations are viewable by everyone" ON "public"."badge_confirmations" FOR SELECT USING (true);



CREATE POLICY "Badge system config is viewable by everyone" ON "public"."badge_system_config" FOR SELECT USING (true);



CREATE POLICY "Badge types are viewable by everyone" ON "public"."badge_types" FOR SELECT USING (true);



CREATE POLICY "Badge verifications are viewable by everyone" ON "public"."badge_verifications" FOR SELECT USING (true);



CREATE POLICY "Entity owners can update their badges" ON "public"."provider_badges" FOR UPDATE USING (((("entity_type" = 'provider'::"public"."entity_type") AND (EXISTS ( SELECT 1
   FROM "public"."providers"
  WHERE (("providers"."provider_id" = "provider_badges"."entity_id") AND (("providers"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("providers"."user_created_id" = ( SELECT "auth"."uid"() AS "uid"))))))) OR (("entity_type" = 'community_service'::"public"."entity_type") AND (EXISTS ( SELECT 1
   FROM "public"."community_services"
  WHERE (("community_services"."community_service_id" = "provider_badges"."entity_id") AND ("community_services"."user_created_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text"))))));



CREATE POLICY "Needs are viewable by everyone" ON "public"."needs" FOR SELECT USING (true);



CREATE POLICY "Offers are viewable by everyone" ON "public"."offers" FOR SELECT USING (true);



CREATE POLICY "Only admins can read deletion logs" ON "public"."deletion_logs" FOR SELECT USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Provider badges are viewable by everyone" ON "public"."provider_badges" FOR SELECT USING (true);



CREATE POLICY "Public can view approved, users can view own, admins can view a" ON "public"."providers" FOR SELECT USING ((("review_status" = 'approved'::"public"."review_status") OR ("provider_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "Service role can manage tokens" ON "public"."email_confirmation_tokens" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Suggested needs are viewable by everyone" ON "public"."category_suggested_needs" FOR SELECT USING (true);



CREATE POLICY "Suggested offers are viewable by everyone" ON "public"."category_suggested_offers" FOR SELECT USING (true);



CREATE POLICY "Users can create their own bookmarks" ON "public"."bookmarks" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can create their own subscriptions" ON "public"."push_subscriptions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own provider relationships" ON "public"."provider_community_services" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."providers"
  WHERE (("providers"."provider_id" = "provider_community_services"."provider_id") AND ("providers"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can delete their own bookmarks" ON "public"."bookmarks" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own confirmations" ON "public"."badge_confirmations" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete their own or admins can delete all community s" ON "public"."community_services" FOR DELETE USING ((("provider_id" IN ( SELECT "providers"."provider_id"
   FROM "public"."providers"
  WHERE ("providers"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "Users can delete their own or admins can delete any providers" ON "public"."providers" FOR DELETE USING ((("provider_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "Users can delete their own subscriptions" ON "public"."push_subscriptions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own unused needs" ON "public"."needs" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "created_by") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."providers"
  WHERE ("needs"."need_id" = ANY ("providers"."needs_ids")))))));



CREATE POLICY "Users can delete their own unused offers" ON "public"."offers" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") = "created_by") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."providers"
  WHERE ("offers"."offer_id" = ANY ("providers"."offers_ids")))))));



CREATE POLICY "Users can insert their own profile" ON "public"."users" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own provider relationships" ON "public"."provider_community_services" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."providers"
  WHERE (("providers"."provider_id" = "provider_community_services"."provider_id") AND ("providers"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own or admins can update all community s" ON "public"."community_services" FOR UPDATE USING ((("provider_id" IN ( SELECT "providers"."provider_id"
   FROM "public"."providers"
  WHERE ("providers"."provider_owner_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own providers or admins can update any" ON "public"."providers" FOR UPDATE USING ((("provider_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "Users can update their own subscriptions" ON "public"."push_subscriptions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own waitlist entry with token" ON "public"."waitlist" FOR UPDATE USING ((("waitlist_token" IS NOT NULL) AND ("length"("waitlist_token") >= 32))) WITH CHECK ((("email" IS NOT NULL) AND ("email" ~ '^[^@]+@[^@]+\.[^@]+$'::"text") AND ("length"("email") <= 255) AND ("waitlist_token" IS NOT NULL) AND ("length"("waitlist_token") >= 32)));



CREATE POLICY "Users can view their own bookmarks" ON "public"."bookmarks" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own profile" ON "public"."users" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."push_subscriptions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_manage_outreach_tasks" ON "public"."provider_outreach_tasks" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."badge_confirmations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badge_system_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badge_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badge_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_suggested_needs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_suggested_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_projects_owner_delete" ON "public"."community_projects" FOR DELETE USING (("community_service_id" IN ( SELECT "cs"."community_service_id"
   FROM ("public"."community_services" "cs"
     JOIN "public"."providers" "p" ON (("p"."provider_id" = "cs"."provider_id")))
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "community_projects_owner_insert" ON "public"."community_projects" FOR INSERT WITH CHECK (("community_service_id" IN ( SELECT "cs"."community_service_id"
   FROM ("public"."community_services" "cs"
     JOIN "public"."providers" "p" ON (("p"."provider_id" = "cs"."provider_id")))
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "community_projects_owner_update" ON "public"."community_projects" FOR UPDATE USING (("community_service_id" IN ( SELECT "cs"."community_service_id"
   FROM ("public"."community_services" "cs"
     JOIN "public"."providers" "p" ON (("p"."provider_id" = "cs"."provider_id")))
  WHERE ("p"."provider_owner_id" = "auth"."uid"())))) WITH CHECK (("community_service_id" IN ( SELECT "cs"."community_service_id"
   FROM ("public"."community_services" "cs"
     JOIN "public"."providers" "p" ON (("p"."provider_id" = "cs"."provider_id")))
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "community_projects_public_select" ON "public"."community_projects" FOR SELECT USING (true);



ALTER TABLE "public"."community_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deletion_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_confirmation_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrichment_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrichment_run_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."needs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_community_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_menu_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_menu_items_owner_delete" ON "public"."provider_menu_items" FOR DELETE USING (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "provider_menu_items_owner_insert" ON "public"."provider_menu_items" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "provider_menu_items_owner_update" ON "public"."provider_menu_items" FOR UPDATE USING (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"())))) WITH CHECK (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "provider_menu_items_public_select" ON "public"."provider_menu_items" FOR SELECT USING (true);



ALTER TABLE "public"."provider_outreach_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_owner_action_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_owner_outreach" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_service_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "provider_service_offers_owner_delete" ON "public"."provider_service_offers" FOR DELETE USING (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "provider_service_offers_owner_insert" ON "public"."provider_service_offers" FOR INSERT WITH CHECK (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "provider_service_offers_owner_update" ON "public"."provider_service_offers" FOR UPDATE USING (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"())))) WITH CHECK (("provider_id" IN ( SELECT "p"."provider_id"
   FROM "public"."providers" "p"
  WHERE ("p"."provider_owner_id" = "auth"."uid"()))));



CREATE POLICY "provider_service_offers_public_select" ON "public"."provider_service_offers" FOR SELECT USING (true);



ALTER TABLE "public"."providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_delete_need"("p_need_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_delete_need"("p_need_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_need"("p_need_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_delete_offer"("p_offer_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_delete_offer"("p_offer_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_offer"("p_offer_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_orphaned_files"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_files"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_files"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_provider_outreach"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_provider_outreach"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_provider_outreach"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cities_with_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cities_with_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cities_with_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_city_interest_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_city_interest_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_city_interest_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_community_services_for_provider"("provider_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_community_services_for_provider"("provider_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_community_services_for_provider"("provider_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_filtered_category_ids_by_search"("search_query" "text", "location_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_category_ids_by_search"("search_query" "text", "location_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_category_ids_by_search"("search_query" "text", "location_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_filtered_cities_by_search"("search_query" "text", "category_filter" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_cities_by_search"("search_query" "text", "category_filter" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_cities_by_search"("search_query" "text", "category_filter" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provider_count_by_city"("city_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_provider_count_by_city"("city_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provider_count_by_city"("city_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_providers_for_community_service"("service_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_providers_for_community_service"("service_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_providers_for_community_service"("service_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_url"("bucket_name" "text", "file_path" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_url"("bucket_name" "text", "file_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_url"("bucket_name" "text", "file_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_suggested_needs_for_category"("p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_suggested_needs_for_category"("p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suggested_needs_for_category"("p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_suggested_offers_for_category"("p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_suggested_offers_for_category"("p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suggested_offers_for_category"("p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_community_projects"("search_query" "text", "community_service_id_filter" "uuid", "project_type_filter" "text", "active_only" boolean, "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_community_projects"("search_query" "text", "community_service_id_filter" "uuid", "project_type_filter" "text", "active_only" boolean, "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_community_projects"("search_query" "text", "community_service_id_filter" "uuid", "project_type_filter" "text", "active_only" boolean, "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_community_services_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_community_services_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_community_services_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_food_categories"("search_query" "text", "limit_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_food_categories"("search_query" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_food_categories"("search_query" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_food_categories"("search_query" "text", "limit_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_food_concepts"("search_query" "text", "limit_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_food_concepts"("search_query" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_food_concepts"("search_query" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_food_concepts"("search_query" "text", "limit_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_food_menu_items"("search_query" "text", "limit_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_food_menu_items"("search_query" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_food_menu_items"("search_query" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_food_menu_items"("search_query" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_needs"("search_query" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_needs"("search_query" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_needs"("search_query" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_offers"("search_query" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_offers"("search_query" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_offers"("search_query" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_provider_ids_by_name"("search_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_provider_ids_by_name"("search_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_provider_ids_by_name"("search_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_provider_items"("search_query" "text", "listing_type_filter" "text", "provider_id_filter" "uuid", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_provider_items"("search_query" "text", "listing_type_filter" "text", "provider_id_filter" "uuid", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_provider_items"("search_query" "text", "listing_type_filter" "text", "provider_id_filter" "uuid", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_providers"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_providers"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_providers"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_providers_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_providers_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_providers_enhanced"("search_query" "text", "category_filter" "uuid", "city_filter" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_providers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_providers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_providers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_provider_badge_to_boolean"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_provider_badge_to_boolean"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_provider_badge_to_boolean"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_badge_trust_level"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_badge_trust_level"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_badge_trust_level"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_confirmation_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_confirmation_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_confirmation_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_push_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_push_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_push_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_waitlist_entry_with_token"("p_email" "text", "p_token" "text", "p_selected_city" "text", "p_has_seen_early_access" boolean, "p_skipped_early_access" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_waitlist_entry_with_token"("p_email" "text", "p_token" "text", "p_selected_city" "text", "p_has_seen_early_access" boolean, "p_skipped_early_access" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_waitlist_entry_with_token"("p_email" "text", "p_token" "text", "p_selected_city" "text", "p_has_seen_early_access" boolean, "p_skipped_early_access" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_joinhalal_providers"("p_providers" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_joinhalal_providers"("p_providers" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_joinhalal_providers"("p_providers" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_outreach_token"("p_token_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_outreach_token"("p_token_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_outreach_token"("p_token_hash" "text") TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."badge_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."badge_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_confirmations" TO "service_role";



GRANT ALL ON TABLE "public"."badge_system_config" TO "anon";
GRANT ALL ON TABLE "public"."badge_system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_system_config" TO "service_role";



GRANT ALL ON TABLE "public"."badge_types" TO "anon";
GRANT ALL ON TABLE "public"."badge_types" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_types" TO "service_role";



GRANT ALL ON TABLE "public"."badge_verifications" TO "anon";
GRANT ALL ON TABLE "public"."badge_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_suggested_needs" TO "anon";
GRANT ALL ON TABLE "public"."category_suggested_needs" TO "authenticated";
GRANT ALL ON TABLE "public"."category_suggested_needs" TO "service_role";



GRANT ALL ON TABLE "public"."category_suggested_offers" TO "anon";
GRANT ALL ON TABLE "public"."category_suggested_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."category_suggested_offers" TO "service_role";



GRANT ALL ON TABLE "public"."cities" TO "anon";
GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."community_projects" TO "anon";
GRANT ALL ON TABLE "public"."community_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."community_projects" TO "service_role";



GRANT ALL ON TABLE "public"."community_services" TO "anon";
GRANT ALL ON TABLE "public"."community_services" TO "authenticated";
GRANT ALL ON TABLE "public"."community_services" TO "service_role";



GRANT ALL ON TABLE "public"."deletion_logs" TO "anon";
GRANT ALL ON TABLE "public"."deletion_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_confirmation_tokens" TO "anon";
GRANT ALL ON TABLE "public"."email_confirmation_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."email_confirmation_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."enrichment_candidates" TO "anon";
GRANT ALL ON TABLE "public"."enrichment_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."enrichment_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."enrichment_run_logs" TO "anon";
GRANT ALL ON TABLE "public"."enrichment_run_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."enrichment_run_logs" TO "service_role";



GRANT ALL ON TABLE "public"."needs" TO "anon";
GRANT ALL ON TABLE "public"."needs" TO "authenticated";
GRANT ALL ON TABLE "public"."needs" TO "service_role";



GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";



GRANT ALL ON TABLE "public"."provider_badges" TO "anon";
GRANT ALL ON TABLE "public"."provider_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_badges" TO "service_role";



GRANT ALL ON TABLE "public"."provider_community_services" TO "anon";
GRANT ALL ON TABLE "public"."provider_community_services" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_community_services" TO "service_role";



GRANT ALL ON TABLE "public"."provider_menu_items" TO "anon";
GRANT ALL ON TABLE "public"."provider_menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_menu_items" TO "service_role";



GRANT ALL ON TABLE "public"."provider_outreach_tasks" TO "anon";
GRANT ALL ON TABLE "public"."provider_outreach_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_outreach_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."provider_owner_action_tokens" TO "anon";
GRANT ALL ON TABLE "public"."provider_owner_action_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_owner_action_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."provider_owner_outreach" TO "anon";
GRANT ALL ON TABLE "public"."provider_owner_outreach" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_owner_outreach" TO "service_role";



GRANT ALL ON TABLE "public"."provider_service_offers" TO "anon";
GRANT ALL ON TABLE "public"."provider_service_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_service_offers" TO "service_role";



GRANT ALL ON TABLE "public"."providers" TO "anon";
GRANT ALL ON TABLE "public"."providers" TO "authenticated";
GRANT ALL ON TABLE "public"."providers" TO "service_role";



GRANT ALL ON TABLE "public"."provider_stats" TO "anon";
GRANT ALL ON TABLE "public"."provider_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_stats" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







