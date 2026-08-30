import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { logSupabaseError } from '@/utils/errorUtils';
import { EntityType } from '@/types/badges';
import { getBadgesForEntity } from '../badges';
import type { Provider } from './types';

export async function getProviders(
  limit?: number,
  includeLocations?: boolean,
  client?: SupabaseClient,
): Promise<Provider[]> {
  try {
    const supabase = getSupabaseClient(client);

    const selectFields = includeLocations
      ? '*, category:categories(name_de, name_en, category_images), locations(*)'
      : '*, category:categories(name_de, name_en, category_images)';

    let query = supabase
      .from('providers')
      .select(selectFields)
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false });

    // Add limit if provided (for performance optimization)
    if (limit !== undefined && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query.returns<Provider[]>();

    if (error) {
      logSupabaseError('providers.getProviders', error);
      // Log additional details before throwing
      if (error instanceof Error) {
        console.error('Error fetching providers:', error.message, error);
      } else {
        console.error('Error fetching providers:', error);
      }
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching providers: ${error.message}. ` +
          'This usually means:\n' +
          '1. Check your internet connection\n' +
          '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
          '3. Check if Supabase project is accessible\n' +
          '4. Restart your dev server after updating .env.local',
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    throw error;
  }
}

export async function getProviderById(
  id: string,
  client?: SupabaseClient,
): Promise<Provider | null> {
  try {
    const supabase = getSupabaseClient(client);

    const { data, error } = await supabase
      .from('providers')
      .select('*, category:categories(name_de, name_en, category_images), locations(*)')
      .eq('provider_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is expected behavior
        return null;
      }
      logSupabaseError('Error fetching provider:', error);
      throw error;
    }

    if (!data) return null;

    // Fetch offers, needs, badges, and extension-table fields in parallel
    const [providerOffersResult, providerNeedsResult, badges, foodProvider, storeProvider] =
      await Promise.all([
        supabase.from('provider_offers').select('offer_id').eq('provider_id', id),
        supabase.from('provider_needs').select('need_id').eq('provider_id', id),
        getBadgesForEntity(id, EntityType.PROVIDER, client),
        supabase
          .from('food_providers')
          .select('verification_method, has_certificate, no_alcohol, no_pork, no_gambling')
          .eq('provider_id', id)
          .maybeSingle(),
        supabase.from('store_providers').select('no_gambling').eq('provider_id', id).maybeSingle(),
      ]);

    let offerIds = (providerOffersResult.data || []).map((row) => row.offer_id);
    let needIds = (providerNeedsResult.data || []).map((row) => row.need_id);

    // Some environments restrict anon/server-cookie reads on relation tables.
    // If relation reads are empty, retry with admin client so provider detail
    // SSR can still hydrate menu/needs for publicly readable providers.
    // NOTE: we construct the admin client inline rather than importing from
    // @/lib/supabase/admin because that module has `import 'server-only'`
    // which breaks the Next.js client bundle at build time.
    if (offerIds.length === 0 && needIds.length === 0) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceRoleKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const [adminOffersResult, adminNeedsResult] = await Promise.all([
            admin.from('provider_offers').select('offer_id').eq('provider_id', id),
            admin.from('provider_needs').select('need_id').eq('provider_id', id),
          ]);

          offerIds = (adminOffersResult.data || []).map((row) => row.offer_id);
          needIds = (adminNeedsResult.data || []).map((row) => row.need_id);
        }
      } catch {
        // Keep anon-read result when admin env vars are not available.
      }
    }

    const [offersResult, needsResult, foodMenuResult] = await Promise.all([
      offerIds.length > 0
        ? supabase.from('offers').select('name_de').in('offer_id', offerIds)
        : Promise.resolve({ data: [], error: null }),
      needIds.length > 0
        ? supabase.from('needs').select('name_de').in('need_id', needIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('food_menu')
        .select('name_de, name_en, description_de, price_cents, category, sort_order, is_available')
        .eq('provider_id', id)
        .order('sort_order', { ascending: true })
        .order('name_de', { ascending: true }),
    ]);

    const offers = offersResult.data || [];
    const needs = needsResult.data || [];

    return {
      ...data,
      ...(foodProvider.data ?? {}),
      ...(storeProvider.data ?? {}),
      offers_ids: offerIds,
      needs_ids: needIds,
      offers,
      needs,
      food_menu_items: foodMenuResult.data || [],
      badges,
    } as Provider;
  } catch (error) {
    console.error('Error in getProviderById:', error);
    throw error;
  }
}

export async function getProviderCount(client?: SupabaseClient): Promise<number> {
  const supabase = getSupabaseClient(client);
  const { count, error } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error fetching provider count:', error);
    throw error;
  }
  return count ?? 0;
}

// Get providers owned by a specific user (where user is the actual owner)
export async function getCreatedProviders(
  userId: string,
  client?: SupabaseClient,
): Promise<Provider[]> {
  const supabase = getSupabaseClient(client);
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('provider_owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    console.error('Error fetching created providers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

// Get recommendations by a specific user (where user recommended but is not the owner)
// Excludes items where user is both owner and creator (those should only appear in "content")
export async function getRecommendations(
  userId: string,
  client?: SupabaseClient,
): Promise<Provider[]> {
  const supabase = getSupabaseClient(client);
  // First, get all providers where user is the creator
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('user_created_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }

  // Filter out items where user is also the owner (those belong in "content", not "recommendations")
  // This ensures items only appear once - in "content" if user is owner, in "recommendations" if not
  const filtered = Array.isArray(data)
    ? data.filter((provider) => {
        // Include only if provider_owner_id is null OR different from userId
        return provider.provider_owner_id === null || provider.provider_owner_id !== userId;
      })
    : [];

  return filtered;
}

/**
 * Get recently approved providers (placeholder recommendation engine).
 * Formerly the server-only `getRecommendations` in providers.server.ts.
 */
export async function getRecentApprovedProviders(
  limit = 10,
  client?: SupabaseClient,
): Promise<Provider[]> {
  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logSupabaseError('Error fetching recent approved providers:', error);
    throw error;
  }

  return (data || []) as Provider[];
}
