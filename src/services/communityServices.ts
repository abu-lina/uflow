import { supabase } from '@/lib/supabase/client';
import { logSupabaseError } from '@/utils/errorUtils';
import type { ProviderBadgeWithType } from '@/types/badges';

// ============================================================================
// CommunityService — adapter interface mapping ummah providers to the legacy
// shape consumed by components.  All DB queries target `providers` with
// listing_type = 'ummah' joined with `ummah_providers` extension table.
// ============================================================================

export interface CommunityService {
  id?: string;
  /** Maps to providers.provider_id */
  community_service_id: string;
  /** Maps to providers.provider_name */
  community_service_name: string;
  /** Maps to providers.provider_description */
  community_service_description?: string;
  /** Not exposed in DB (logo stored as part of provider images) */
  community_service_logo?: Record<string, unknown>;
  /** Maps to providers.provider_images.urls[] */
  community_service_images?: string[];
  /** Maps to ummah_providers.is_verified */
  is_verified?: boolean;
  /** Maps to ummah_providers.verified_at */
  verified_at?: string;
  /** Maps to ummah_providers.verified_by */
  verified_by?: string;
  /** Maps to ummah_providers.community_service_view_count */
  community_service_view_count?: number;
  /** Maps to ummah_providers.donation_count */
  donation_count?: number;
  category_id?: string;
  category?: {
    name_de?: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
  contact_email?: string;
  contact_phone?: string;
  social_website?: string;
  social_instagram?: string;
  address_street?: string;
  address_zip?: string;
  address_city?: string;
  address_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'removed_by_owner';
  review_feedback?: string;
  offers_ids?: string[];
  needs_ids?: string[];
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  show_address?: boolean;
  user_created_id?: string;
  /** Maps to providers.provider_owner_id — the linked provider organisation */
  provider_id?: string;
  created_at: string;
  updated_at: string;
  badges?: ProviderBadgeWithType[];
}

// Legacy type alias
export type CommunityServiceData = CommunityService;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const UMMAH_SELECT = `
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
  recommender_email,
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

function isValidCategoryId(category: string | null | undefined): boolean {
  if (!category) return false;
  const allTranslations = ['All', 'Alle', 'الكل', 'Tümü'];
  if (allTranslations.includes(category)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(category);
}

function isValidLocation(location: string | null | undefined): boolean {
  return Boolean(location);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch all approved ummah community services */
export async function getCommunityServices(): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('providers')
    .select(UMMAH_SELECT)
    .eq('listing_type', 'ummah')
    .eq('review_status', 'approved')
    .order('provider_name');

  if (error) {
    console.error('Error fetching community services:', error);
    throw error;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : []).map((row: any) => mapRowToCS(row));
}

/** Search ummah community services with optional query, category, location, and pagination */
export async function searchCommunityServices(
  query: string,
  category: string = '',
  location: string = '',
  limit?: number,
  offset?: number,
): Promise<CommunityService[]> {
  let req = supabase
    .from('providers')
    .select(UMMAH_SELECT)
    .eq('listing_type', 'ummah')
    .eq('review_status', 'approved');

  if (query && query.trim()) {
    // Full-text search via RPC (targets providers tsvector)
    try {
      const { data: searchResults, error: rpcError } = await supabase.rpc('search_offers', {
        search_query: query.trim(),
        limit_count: limit || 1000,
        offset_count: offset || 0,
      });
      if (!rpcError && Array.isArray(searchResults) && searchResults.length > 0) {
        const ids = searchResults.map((r: { provider_id: string }) => r.provider_id);
        req = req.in('provider_id', ids);
      } else if (rpcError) {
        // Fallback to ilike
        req = req.or(
          `provider_name.ilike.%${query.trim()}%,provider_description.ilike.%${query.trim()}%`,
        );
      }
    } catch {
      req = req.or(
        `provider_name.ilike.%${query.trim()}%,provider_description.ilike.%${query.trim()}%`,
      );
    }
  }

  if (isValidLocation(location)) {
    req = req.eq('address_city', location);
  }

  if (isValidCategoryId(category)) {
    req = req.eq('category_id', category);
  }

  req = req.order('created_at', { ascending: false });

  if (limit !== undefined) {
    req = req.limit(limit);
  }
  if (offset !== undefined) {
    req = req.range(offset, offset + (limit || 1000) - 1);
  }

  const { data, error } = await req;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : []).map((row: any) => mapRowToCS(row));
}

/** Get a single community service by ID (= provider_id) */
export async function getCommunityServiceById(id: string): Promise<CommunityService | null> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select(UMMAH_SELECT)
      .eq('provider_id', id)
      .eq('listing_type', 'ummah')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
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
    console.error('Error in getCommunityServiceById:', error);
    throw error;
  }
}

/** Get ummah providers for a given category */
export async function getCommunityServicesByCategory(categoryId: string): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('providers')
    .select(UMMAH_SELECT)
    .eq('listing_type', 'ummah')
    .eq('category_id', categoryId)
    .eq('review_status', 'approved')
    .order('provider_name');

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data : []).map((row: any) => mapRowToCS(row));
}

/**
 * Get ummah providers that have an engagement with a given initiating provider.
 * Replaces the old provider_community_services lookup.
 */
export async function getCommunityServicesForProvider(providerId: string): Promise<CommunityService[]> {
  try {
    const { data: engagements, error: engErr } = await supabase
      .from('provider_engagements')
      .select('engaged_provider_id')
      .eq('initiating_provider_id', providerId);

    if (engErr) throw engErr;
    if (!engagements || engagements.length === 0) return [];

    const ids = engagements.map((e) => e.engaged_provider_id);
    const { data, error } = await supabase
      .from('providers')
      .select(UMMAH_SELECT)
      .in('provider_id', ids)
      .eq('listing_type', 'ummah')
      .eq('review_status', 'approved')
      .order('provider_name');

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(data) ? data : []).map((row: any) => mapRowToCS(row));
  } catch (error) {
    console.error('Error fetching community services for provider:', error);
    return [];
  }
}

/**
 * Create an engagement between an initiating provider and an ummah provider.
 * Replaces createProviderCommunityServiceRelationship.
 */
export async function createProviderCommunityServiceRelationship(
  providerId: string,
  communityServiceId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_engagements')
      .insert({
        initiating_provider_id: providerId,
        engaged_provider_id:    communityServiceId,
      });

    if (error) {
      console.error('Error creating provider engagement:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error creating provider engagement:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Remove an engagement between an initiating provider and an ummah provider.
 * Replaces removeProviderCommunityServiceRelationship.
 */
export async function removeProviderCommunityServiceRelationship(
  providerId: string,
  communityServiceId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_engagements')
      .delete()
      .eq('initiating_provider_id', providerId)
      .eq('engaged_provider_id', communityServiceId);

    if (error) {
      console.error('Error removing provider engagement:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Error removing provider engagement:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Get provider organisations that have an engagement with a given ummah provider.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProvidersForCommunityService(communityServiceId: string): Promise<any[]> {
  try {
    const { data: engagements, error: engErr } = await supabase
      .from('provider_engagements')
      .select('initiating_provider_id')
      .eq('engaged_provider_id', communityServiceId);

    if (engErr) throw engErr;
    if (!engagements || engagements.length === 0) return [];

    const providerIds = engagements.map((e) => e.initiating_provider_id);
    const { data, error } = await supabase
      .from('providers')
      .select('provider_id, provider_name, provider_images, address_city, category:categories(name_de, name_en)')
      .in('provider_id', providerIds)
      .eq('review_status', 'approved')
      .order('provider_name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching providers for community service:', error);
    return [];
  }
}

/** Get ummah providers created by a specific user */
export async function getCreatedCommunityServices(userId: string): Promise<CommunityService[]> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select(UMMAH_SELECT)
      .eq('listing_type', 'ummah')
      .eq('user_created_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('communityServices.getCreatedCommunityServices', error);
      throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(data) ? data : []).map((row: any) => mapRowToCS(row));
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching created community services: ${(error as Error).message}. ` +
          'Check NEXT_PUBLIC_SUPABASE_URL in .env.local.',
      );
      (enhancedError as Error & { cause: unknown }).cause = error;
      throw enhancedError;
    }
    throw error;
  }
}

/** Ummah services recommended by user — always empty (no separate recommendation model) */
export async function getRecommendedCommunityServices(_userId: string): Promise<CommunityService[]> {
  return [];
}

