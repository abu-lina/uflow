import { supabase } from '@/lib/supabase/client';

export interface ProviderMenuItemRaw {
  item_id: string;
  provider_id: string;
  item_type: string;
  name_de: string;
  name_en: string | null;
  price_cents: number | null;
  // RPC pre-filters to available items only.
  is_available: boolean;
  rank: number;
}

export interface ProviderMenuItem extends ProviderMenuItemRaw {
  provider_name: string;
  provider_image: string | null;
}

export interface SearchProviderItemsParams {
  search_query: string;
  listing_type_filter: 'food' | 'business' | 'ummah' | null;
  provider_id_filter?: string | null;
  limit_count?: number;
  offset_count?: number;
}

export async function searchProviderItems(
  params: SearchProviderItemsParams,
): Promise<ProviderMenuItemRaw[]> {
  const {
    search_query,
    listing_type_filter,
    provider_id_filter = null,
    limit_count = 20,
    offset_count = 0,
  } = params;

  const { data, error } = await supabase.rpc('search_provider_items', {
    search_query,
    listing_type_filter,
    provider_id_filter,
    limit_count,
    offset_count,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as ProviderMenuItemRaw[]) : [];
}
