-- Plan 148: Fix NOT NULL violation when verification_method is absent from payload.
-- The admin_update_provider RPC used NULLIF(v_providers->>'verification_method', '')
-- which returns NULL when the JSONB key is absent. Both store_providers and
-- food_providers have verification_method NOT NULL, causing INSERT failures.
-- Fix: COALESCE(NULLIF(...), 'online') provides the column default.

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
  v_listing_type TEXT;
  v_result JSONB;
  v_updated_at TIMESTAMPTZ := NOW();
BEGIN
  -- Resolve listing_type from existing provider or from payload
  SELECT p.listing_type INTO v_listing_type
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  v_providers := p_data->'providers';
  v_food_providers := p_data->'food_providers';
  v_store_providers := p_data->'store_providers';
  v_menu_items := p_data->'menu_items';
  v_delivery_links := p_data->'delivery_links';
  v_community_service_ids := p_data->'community_service_ids';

  -- Update providers table with whatever fields are provided
  IF v_providers IS NOT NULL AND v_providers != 'null'::jsonb THEN
    UPDATE public.providers SET
      provider_name       = COALESCE(v_providers->>'provider_name', provider_name),
      provider_description = COALESCE(v_providers->>'provider_description', provider_description),
      category_id         = CASE WHEN v_providers ? 'category_id'
                            THEN NULLIF(v_providers->>'category_id', '')::uuid
                            ELSE category_id END,
      listing_type        = CASE WHEN v_providers ? 'listing_type'
                            THEN NULLIF(v_providers->>'listing_type', '')::listing_type_enum
                            ELSE listing_type END,
      address_street      = COALESCE(v_providers->>'address_street', address_street),
      address_zip         = COALESCE(v_providers->>'address_zip', address_zip),
      address_city        = COALESCE(v_providers->>'address_city', address_city),
      address_country     = COALESCE(v_providers->>'address_country', address_country),
      contact_email       = COALESCE(v_providers->>'contact_email', contact_email),
      contact_phone       = COALESCE(v_providers->>'contact_phone', contact_phone),
      social_website      = COALESCE(v_providers->>'social_website', social_website),
      social_instagram    = COALESCE(v_providers->>'social_instagram', social_instagram),
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
      COALESCE((v_food_providers->>'no_alcohol')::boolean, false),
      COALESCE((v_food_providers->>'no_pork')::boolean, false),
      COALESCE((v_food_providers->>'no_gambling')::boolean, false),
      v_updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      verification_method = COALESCE(NULLIF(EXCLUDED.verification_method, ''), food_providers.verification_method),
      has_certificate     = COALESCE(EXCLUDED.has_certificate, food_providers.has_certificate),
      certificate_url     = COALESCE(NULLIF(EXCLUDED.certificate_url, ''), food_providers.certificate_url),
      no_alcohol          = COALESCE(EXCLUDED.no_alcohol, food_providers.no_alcohol),
      no_pork             = COALESCE(EXCLUDED.no_pork, food_providers.no_pork),
      no_gambling         = COALESCE(EXCLUDED.no_gambling, food_providers.no_gambling),
      updated_at          = v_updated_at;
  END IF;

  -- Upsert store_providers extension
  IF v_store_providers IS NOT NULL AND v_store_providers != 'null'::jsonb THEN
    INSERT INTO public.store_providers (
      provider_id, verification_method, has_certificate, certificate_url,
      no_gambling, updated_at
    ) VALUES (
      p_provider_id,
      COALESCE(NULLIF(v_store_providers->>'verification_method', ''), 'online'),
      COALESCE((v_store_providers->>'has_certificate')::boolean, false),
      NULLIF(v_store_providers->>'certificate_url', ''),
      COALESCE((v_store_providers->>'no_gambling')::boolean, false),
      v_updated_at
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      verification_method = COALESCE(NULLIF(EXCLUDED.verification_method, ''), store_providers.verification_method),
      has_certificate     = COALESCE(EXCLUDED.has_certificate, store_providers.has_certificate),
      certificate_url     = COALESCE(NULLIF(EXCLUDED.certificate_url, ''), store_providers.certificate_url),
      no_gambling         = COALESCE(EXCLUDED.no_gambling, store_providers.no_gambling),
      updated_at          = v_updated_at;
  END IF;

  -- Replace menu items (full array replacement)
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

  -- Replace delivery links (full array replacement)
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

  -- Replace community service engagements (full array replacement)
  IF p_data ? 'community_service_ids' THEN
    DELETE FROM public.provider_engagements WHERE initiating_provider_id = p_provider_id;

    IF jsonb_array_length(v_community_service_ids) > 0 THEN
      INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id)
      SELECT p_provider_id, value::uuid
      FROM jsonb_array_elements_text(v_community_service_ids) AS value;
    END IF;
  END IF;

  -- Return updated provider as JSONB
  SELECT to_jsonb(p.*)
  INTO v_result
  FROM public.providers p
  WHERE p.provider_id = p_provider_id;

  RETURN v_result;
END;
$$;

COMMIT;
