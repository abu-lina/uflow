/**
 * Server-side community services
 *
 * Uses createSupabaseServerClient() for server-side authentication context.
 * All queries target `providers WHERE listing_type = 'ummah'`.
 * For client-side usage, see communityServices.ts.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logSupabaseError } from '@/utils/errorUtils';
import type { CommunityService } from './communityServices';

const UMMAH_SELECT_SERVER = `
  provider_id,
  provider_name,
  provider_description,
  provider_images,
  provider_owner_id,
  category_id,
  category:categories(name_de, name_en),
  contact_email,
  contact_phone,
  social_website,
  social_instagram,
  address_street,
  address_zip,
  address_city,
  address_country,
  location_latitude,
  location_longitude,
  review_status,
  review_feedback,
  show_address,
  user_created_id,
  created_at,
  updated_at,
  ummah_providers (
    community_service_view_count,
    donation_count,
    is_verified,
    verified_at,
    verified_by
  )
` as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToCS(row: any): CommunityService {
  const up = Array.isArray(row.ummah_providers) ? row.ummah_providers[0] : row.ummah_providers;
  const images: string[] =
    row.provider_images?.urls ??
    (Array.isArray(row.provider_images) ? row.provider_images : []);
  return {
    community_service_id:          row.provider_id,
    community_service_name:        row.provider_name,
    community_service_description: row.provider_description ?? undefined,
    community_service_images:      images.length > 0 ? images : undefined,
    is_verified:                   up?.is_verified ?? false,
    verified_at:                   up?.verified_at ?? undefined,
    verified_by:                   up?.verified_by ?? undefined,
    community_service_view_count:  up?.community_service_view_count ?? 0,
    donation_count:                up?.donation_count ?? 0,
    category_id:                   row.category_id ?? undefined,
    category:                      row.category ?? undefined,
    contact_email:                 row.contact_email ?? undefined,
    contact_phone:                 row.contact_phone ?? undefined,
    social_website:                row.social_website ?? undefined,
    social_instagram:              row.social_instagram ?? undefined,
    address_street:                row.address_street ?? undefined,
    address_zip:                   row.address_zip ?? undefined,
    address_city:                  row.address_city ?? undefined,
    address_country:               row.address_country ?? undefined,
    location_latitude:             row.location_latitude != null ? Number(row.location_latitude) : undefined,
    location_longitude:            row.location_longitude != null ? Number(row.location_longitude) : undefined,
    review_status:                 row.review_status ?? undefined,
    review_feedback:               row.review_feedback ?? undefined,
    show_address:                  row.show_address ?? true,
    user_created_id:               row.user_created_id ?? undefined,
    provider_id:                   row.provider_owner_id ?? undefined,
    created_at:                    row.created_at,
    updated_at:                    row.updated_at,
  };
}

/**
 * Get a single ummah community service by ID (= provider_id), server-side.
 * Also fetches associated offers and needs via provider_offers / provider_needs.
 */
export async function getCommunityServiceById(id: string): Promise<CommunityService | null> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('providers')
      .select(UMMAH_SELECT_SERVER)
      .eq('provider_id', id)
      .eq('listing_type', 'ummah')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logSupabaseError('Error fetching community service (server):', error);
      throw error;
    }
    if (!data) return null;

    const [offersResult, needsResult] = await Promise.all([
      supabase.from('provider_offers').select('offer_id').eq('provider_id', id),
      supabase.from('provider_needs').select('need_id').eq('provider_id', id),
    ]);

    const offerIds = (offersResult.data || []).map((r) => r.offer_id);
    const needIds  = (needsResult.data  || []).map((r) => r.need_id);

    const [offersData, needsData] = await Promise.all([
      offerIds.length > 0
        ? supabase.from('offers').select('name_de').in('offer_id', offerIds)
        : Promise.resolve({ data: [], error: null }),
      needIds.length > 0
        ? supabase.from('needs').select('name_de').in('need_id', needIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const cs = mapRowToCS(data);
    return {
      ...cs,
      offers_ids: offerIds,
      needs_ids:  needIds,
      offers:     offersData.data || [],
      needs:      needsData.data  || [],
    };
  } catch (error) {
    console.error('Error in getCommunityServiceById (server):', error);
    throw error;
  }
}

