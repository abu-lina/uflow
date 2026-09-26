-- ============================================================
-- Migration: Fix location upsert honouring caller-supplied ids
-- Date: 2026-09-05
-- Problem: two defects in the locations block of
--   admin_update_provider (carried unchanged through 131):
--   A) The admin edit form stamps every NEW location with a
--      client-generated UUID (crypto.randomUUID()). Any supplied
--      location_id took the UPDATE branch, which matched zero rows
--      for a brand-new id and silently discarded the location.
--   B) The INSERT branch never appended the inserted row's id to
--      v_existing_ids, so the trailing delete-sweep deleted the
--      row it had just inserted in the same call.
--   C) The delete-sweep ran even for an empty or JSON-null
--      locations array; with an empty v_existing_ids,
--      `location_id <> ALL(...)` is true for every row and ALL of
--      the provider's locations were wiped.
-- Fix: UPDATE first when an id is supplied; if it matches a row
--   for this provider, keep it. If the id exists but belongs to
--   another provider, raise. Otherwise INSERT, honouring the
--   supplied id via COALESCE(v_location_id, gen_random_uuid()),
--   and RETURNING location_id so the inserted row is appended to
--   v_existing_ids and survives the delete-sweep, which now only
--   runs when the caller actually sent a non-empty locations list.
-- This supersedes 131: the function body is copied verbatim from
-- 131_admin_update_provider_tri_state_halal.sql, preserving its
-- tri-state halal attestation behaviour; only the locations
-- block, this header, and COMMENT ON FUNCTION changed.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_update_provider(
  p_provider_id UUID,
  p_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_providers JSONB;
  v_food_providers JSONB;
  v_store_providers JSONB;
  v_menu_items JSONB;
  v_delivery_links JSONB;
  v_community_service_ids JSONB;
  v_locations JSONB;
  v_listing_type TEXT;
  v_result JSONB;
  v_updated_at TIMESTAMPTZ := NOW();
  v_location JSONB;
  v_location_id UUID;
  v_existing_ids UUID[];
BEGIN
  SELECT p.listing_type INTO v_listing_type
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  v_providers := p_data->'providers';
  v_food_providers := p_data->'food_providers';
  v_store_providers := p_data->'store_providers';
  v_menu_items := p_data->'menu_items';
  v_delivery_links := p_data->'delivery_links';
  v_community_service_ids := p_data->'community_service_ids';
  v_locations := p_data->'locations';

  IF v_providers IS NOT NULL AND v_providers != 'null'::jsonb THEN
    UPDATE public.providers SET
      provider_name       = COALESCE(v_providers->>'provider_name', provider_name),
      provider_description = CASE WHEN v_providers ? 'provider_description'
                             THEN v_providers->>'provider_description'
                             ELSE provider_description END,
      category_id         = CASE WHEN v_providers ? 'category_id'
                            THEN NULLIF(v_providers->>'category_id', '')::uuid
                            ELSE category_id END,
      listing_type        = CASE WHEN v_providers ? 'listing_type'
                            THEN NULLIF(v_providers->>'listing_type', '')::listing_type_enum
                            ELSE listing_type END,
      address_street      = CASE WHEN v_providers ? 'address_street'
                            THEN v_providers->>'address_street'
                            ELSE address_street END,
      address_zip         = CASE WHEN v_providers ? 'address_zip'
                            THEN v_providers->>'address_zip'
                            ELSE address_zip END,
      address_city        = CASE WHEN v_providers ? 'address_city'
                            THEN v_providers->>'address_city'
                            ELSE address_city END,
      address_country     = CASE WHEN v_providers ? 'address_country'
                            THEN v_providers->>'address_country'
                            ELSE address_country END,
      contact_email       = CASE WHEN v_providers ? 'contact_email'
                            THEN v_providers->>'contact_email'
                            ELSE contact_email END,
      contact_phone       = CASE WHEN v_providers ? 'contact_phone'
                            THEN v_providers->>'contact_phone'
                            ELSE contact_phone END,
      social_website      = CASE WHEN v_providers ? 'social_website'
                            THEN v_providers->>'social_website'
                            ELSE social_website END,
      social_instagram    = CASE WHEN v_providers ? 'social_instagram'
                            THEN v_providers->>'social_instagram'
                            ELSE social_instagram END,
      provider_images     = CASE WHEN v_providers ? 'provider_images'
                            THEN v_providers->'provider_images'
                            ELSE provider_images END,
      review_status      = CASE WHEN v_providers ? 'review_status'
                            THEN NULLIF(v_providers->>'review_status', '')::review_status
                            ELSE review_status END,
      opening_hours       = CASE WHEN v_providers ? 'opening_hours'
                            THEN v_providers->'opening_hours'
                            ELSE opening_hours END,
      muslim_owned        = COALESCE((v_providers->>'muslim_owned')::boolean, muslim_owned),
      has_prayer_space    = COALESCE((v_providers->>'has_prayer_space')::boolean, has_prayer_space),
      family_friendly     = COALESCE((v_providers->>'family_friendly')::boolean, family_friendly),
      women_friendly      = COALESCE((v_providers->>'women_friendly')::boolean, women_friendly),
      children_friendly   = COALESCE((v_providers->>'children_friendly')::boolean, children_friendly),
      makes_donations     = COALESCE((v_providers->>'makes_donations')::boolean, makes_donations),
      has_parking         = COALESCE((v_providers->>'has_parking')::boolean, has_parking),
      economic_solidarity = COALESCE((v_providers->>'economic_solidarity')::boolean, economic_solidarity),
      show_address        = COALESCE((v_providers->>'show_address')::boolean, show_address),
      updated_at          = v_updated_at
    WHERE provider_id = p_provider_id;
  END IF;

  -- Upsert food_providers extension
  IF v_food_providers IS NOT NULL AND v_food_providers != 'null'::jsonb THEN
    INSERT INTO public.food_providers (
      provider_id, verification_method, has_certificate, certificate_url,
      no_alcohol, no_pork, no_gambling, updated_at
    ) VALUES (
      p_provider_id,
      COALESCE(NULLIF(v_food_providers->>'verification_method', ''), 'online'),
      COALESCE((v_food_providers->>'has_certificate')::boolean, false),
      NULLIF(v_food_providers->>'certificate_url', ''),
      CASE WHEN v_food_providers ? 'no_alcohol' THEN (v_food_providers->>'no_alcohol')::boolean ELSE NULL END,
      CASE WHEN v_food_providers ? 'no_pork' THEN (v_food_providers->>'no_pork')::boolean ELSE NULL END,
      CASE WHEN v_food_providers ? 'no_gambling' THEN (v_food_providers->>'no_gambling')::boolean ELSE NULL END,
      v_updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      verification_method = COALESCE(NULLIF(EXCLUDED.verification_method, ''), food_providers.verification_method, 'online'),
      has_certificate     = COALESCE(EXCLUDED.has_certificate, food_providers.has_certificate),
      certificate_url     = COALESCE(NULLIF(EXCLUDED.certificate_url, ''), food_providers.certificate_url),
      no_alcohol          = CASE WHEN v_food_providers ? 'no_alcohol' THEN (v_food_providers->>'no_alcohol')::boolean ELSE food_providers.no_alcohol END,
      no_pork          = CASE WHEN v_food_providers ? 'no_pork' THEN (v_food_providers->>'no_pork')::boolean ELSE food_providers.no_pork END,
      no_gambling          = CASE WHEN v_food_providers ? 'no_gambling' THEN (v_food_providers->>'no_gambling')::boolean ELSE food_providers.no_gambling END,
      updated_at          = v_updated_at;
  END IF;

  -- Upsert store_providers extension (now includes no_alcohol, no_pork)
  IF v_store_providers IS NOT NULL AND v_store_providers != 'null'::jsonb THEN
    INSERT INTO public.store_providers (
      provider_id, verification_method, has_certificate, certificate_url,
      no_alcohol, no_pork, no_gambling, updated_at
    ) VALUES (
      p_provider_id,
      COALESCE(NULLIF(v_store_providers->>'verification_method', ''), 'online'),
      COALESCE((v_store_providers->>'has_certificate')::boolean, false),
      NULLIF(v_store_providers->>'certificate_url', ''),
      CASE WHEN v_store_providers ? 'no_alcohol' THEN (v_store_providers->>'no_alcohol')::boolean ELSE NULL END,
      CASE WHEN v_store_providers ? 'no_pork' THEN (v_store_providers->>'no_pork')::boolean ELSE NULL END,
      CASE WHEN v_store_providers ? 'no_gambling' THEN (v_store_providers->>'no_gambling')::boolean ELSE NULL END,
      v_updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      verification_method = COALESCE(NULLIF(EXCLUDED.verification_method, ''), store_providers.verification_method, 'online'),
      has_certificate     = COALESCE(EXCLUDED.has_certificate, store_providers.has_certificate),
      certificate_url     = COALESCE(NULLIF(EXCLUDED.certificate_url, ''), store_providers.certificate_url),
      no_alcohol          = CASE WHEN v_store_providers ? 'no_alcohol' THEN (v_store_providers->>'no_alcohol')::boolean ELSE store_providers.no_alcohol END,
      no_pork          = CASE WHEN v_store_providers ? 'no_pork' THEN (v_store_providers->>'no_pork')::boolean ELSE store_providers.no_pork END,
      no_gambling          = CASE WHEN v_store_providers ? 'no_gambling' THEN (v_store_providers->>'no_gambling')::boolean ELSE store_providers.no_gambling END,
      updated_at          = v_updated_at;
  END IF;

  -- Replace menu items
  IF p_data ? 'menu_items' THEN
    DELETE FROM public.food_menu WHERE provider_id = p_provider_id;
    IF jsonb_array_length(v_menu_items) > 0 THEN
      INSERT INTO public.food_menu (provider_id, name_de, name_en, description_de, price_cents, category, is_available, sort_order, updated_at)
      SELECT
        p_provider_id,
        item->>'name_de',
        item->>'name_en',
        item->>'description_de',
        NULLIF(item->>'price_cents', '')::int,
        NULLIF(item->>'category', ''),
        COALESCE((item->>'is_available')::boolean, true),
        COALESCE((item->>'sort_order')::int, 0),
        v_updated_at
      FROM jsonb_array_elements(v_menu_items) AS item;
    END IF;
  END IF;

  -- Replace delivery links
  IF p_data ? 'delivery_links' THEN
    DELETE FROM public.provider_delivery_links WHERE provider_id = p_provider_id;
    IF jsonb_array_length(v_delivery_links) > 0 THEN
      INSERT INTO public.provider_delivery_links (provider_id, platform, platform_url, platform_slug, is_active, updated_at)
      SELECT
        p_provider_id,
        item->>'platform',
        item->>'platform_url',
        NULLIF(item->>'platform_slug', ''),
        COALESCE((item->>'is_active')::boolean, true),
        v_updated_at
      FROM jsonb_array_elements(v_delivery_links) AS item;
    END IF;
  END IF;

  -- Replace community service engagements
  IF p_data ? 'community_service_ids' THEN
    DELETE FROM public.provider_engagements WHERE initiating_provider_id = p_provider_id;
    IF jsonb_array_length(v_community_service_ids) > 0 THEN
      INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id)
      SELECT p_provider_id, value::uuid
      FROM jsonb_array_elements_text(v_community_service_ids) AS value;
    END IF;
  END IF;

  -- Upsert locations
  IF p_data ? 'locations' THEN
    v_existing_ids := ARRAY[]::uuid[];
    IF jsonb_array_length(v_locations) > 0 THEN
      FOR v_location IN SELECT * FROM jsonb_array_elements(v_locations)
      LOOP
        v_location_id := NULLIF(v_location->>'location_id', '')::uuid;

        -- Update in place when the id already belongs to this provider.
        IF v_location_id IS NOT NULL THEN
          UPDATE public.locations SET
            location_name    = COALESCE(NULLIF(v_location->>'location_name', ''), location_name),
            address_street   = COALESCE(NULLIF(v_location->>'address_street', ''), address_street),
            address_zip      = COALESCE(NULLIF(v_location->>'address_zip', ''), address_zip),
            address_city     = COALESCE(NULLIF(v_location->>'address_city', ''), address_city),
            address_country  = COALESCE(NULLIF(v_location->>'address_country', ''), address_country),
            location_latitude = COALESCE(NULLIF(v_location->>'location_latitude', '')::numeric, location_latitude),
            location_longitude = COALESCE(NULLIF(v_location->>'location_longitude', '')::numeric, location_longitude),
            opening_hours    = CASE WHEN v_location ? 'opening_hours'
                               THEN v_location->'opening_hours'
                               ELSE opening_hours END,
            show_address     = COALESCE(NULLIF(v_location->>'show_address', '')::boolean, show_address),
            contact_phone    = COALESCE(NULLIF(v_location->>'contact_phone', ''), contact_phone),
            is_primary       = COALESCE(NULLIF(v_location->>'is_primary', '')::boolean, is_primary),
            updated_at       = v_updated_at
          WHERE location_id = v_location_id AND provider_id = p_provider_id;

          IF FOUND THEN
            v_existing_ids := array_append(v_existing_ids, v_location_id);
            CONTINUE;
          END IF;

          -- An id was supplied but matches no row for this provider. Never touch
          -- another provider's location, and never hit a bare PK unique violation.
          IF EXISTS (SELECT 1 FROM public.locations WHERE location_id = v_location_id) THEN
            RAISE EXCEPTION 'location % belongs to another provider', v_location_id
              USING ERRCODE = 'check_violation';
          END IF;
        END IF;

        -- Insert: either no id was supplied, or the client generated one for a
        -- brand-new location (the admin edit form does exactly this).
        INSERT INTO public.locations (
          location_id, provider_id, location_name, address_street, address_zip, address_city,
          address_country, location_latitude, location_longitude, opening_hours,
          show_address, contact_phone, is_primary, updated_at
        ) VALUES (
          COALESCE(v_location_id, gen_random_uuid()),
          p_provider_id,
          NULLIF(v_location->>'location_name', ''),
          NULLIF(v_location->>'address_street', ''),
          NULLIF(v_location->>'address_zip', ''),
          NULLIF(v_location->>'address_city', ''),
          COALESCE(NULLIF(v_location->>'address_country', ''), 'DE'),
          NULLIF(v_location->>'location_latitude', '')::numeric,
          NULLIF(v_location->>'location_longitude', '')::numeric,
          CASE WHEN v_location ? 'opening_hours' THEN v_location->'opening_hours' ELSE NULL END,
          COALESCE(NULLIF(v_location->>'show_address', '')::boolean, true),
          NULLIF(v_location->>'contact_phone', ''),
          COALESCE(NULLIF(v_location->>'is_primary', '')::boolean, false),
          v_updated_at
        )
        RETURNING location_id INTO v_location_id;

        -- The inserted row must survive the delete-sweep below.
        v_existing_ids := array_append(v_existing_ids, v_location_id);
      END LOOP;

      -- Prune only when the caller actually sent a list. An empty or null
      -- locations payload must never wipe a provider's locations: with an
      -- empty v_existing_ids, `location_id <> ALL(...)` is true for every row.
      DELETE FROM public.locations
      WHERE provider_id = p_provider_id
        AND location_id <> ALL(v_existing_ids);
    END IF;
  END IF;

  SELECT to_jsonb(p.*)
  INTO v_result
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_update_provider IS
  'Tri-state halal attestations (from 131) plus location upsert fix: honour caller-supplied location ids (update when owned, insert when new), keep inserted ids out of the delete-sweep, and only sweep when a non-empty locations list was sent.';

REVOKE ALL ON FUNCTION public.admin_update_provider(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_provider(UUID, JSONB) TO service_role;

COMMIT;
