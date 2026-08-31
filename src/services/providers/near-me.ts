import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import type { NearMeFoodResult } from './types';

/**
 * Plan 196: Searches for approved food providers within a radius of a point,
 * nearest-location-per-provider, distance-ordered. Reuses the additive
 * `search_food_near_me` RPC (migration 120) — does NOT touch the existing
 * `find_nearby_food_providers` RPC used by the provider detail page.
 *
 * Open-now filtering is intentionally NOT applied here — callers filter the
 * returned `opening_hours` client-side via `getOpenStatus` (Analysis 196 #3).
 */
export async function searchFoodNearMe(
  params: {
    lat: number;
    lon: number;
    radiusKm: number;
    limit?: number;
    /** Review status filter. Defaults to 'approved' on the server side. */
    reviewStatus?: string | null;
  },
  client?: SupabaseClient,
): Promise<NearMeFoodResult[]> {
  const { lat, lon, radiusKm, limit = 100, reviewStatus } = params;
  const supabase = getSupabaseClient(client);

  const rpcParams: Record<string, unknown> = {
    p_lat: lat,
    p_lon: lon,
    p_radius_km: radiusKm,
    p_limit: limit,
  };
  if (reviewStatus) {
    rpcParams.p_review_status = reviewStatus;
  }

  const { data, error } = await supabase.rpc('search_food_near_me', rpcParams);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as NearMeFoodResult[]) : [];
}
