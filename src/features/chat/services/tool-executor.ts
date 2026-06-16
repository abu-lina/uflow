import 'server-only';

import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getProviderById, fetchProviderCities, checkCityExists } from '@/services/providers';
import { createProviderOrService } from '@/services/providerService';
import type { ToolCall, ToolDefinition } from '@/features/chat/types';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_providers',
      description:
        'Search providers on UFlow. IMPORTANT: For cuisine searches ("afghanisch", "italienisch", "döner"), use the CATEGORY parameter (not query). For name searches ("Burger Hannes"), use query. For broad searches, leave query empty.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Free-text search query. Leave EMPTY for broad searches like "what restaurants are in Berlin". Only use specific terms like "döner" or "pizza" when user asks for something specific. Database is mostly German — use German terms.',
          },
          category: {
            type: 'string',
            description: 'Filter by cuisine/category — use the CATEGORY NAME like "Afghanisch", "Pakistanisch", "Döner". NOT a UUID — just the name. MUST use this for cuisine searches, not query.',
          },
          city: {
            type: 'string',
            description: 'City name filter (optional, e.g., "Berlin", "Köln")',
          },
          listing_type: {
            type: 'string',
            enum: ['food', 'store', 'ummah'],
            description: 'Filter by provider type',
          },
          muslim_owned: {
            type: 'boolean',
            description: 'Filter for Muslim-owned businesses',
          },
          has_prayer_space: {
            type: 'boolean',
            description: 'Filter for prayer space availability',
          },
          family_friendly: {
            type: 'boolean',
            description: 'Filter for family-friendly providers',
          },
          women_friendly: {
            type: 'boolean',
            description: 'Filter for women-friendly providers',
          },
          limit: {
            type: 'integer',
            description: 'Max results (default 5)',
            default: 5,
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_provider_details',
      description:
        'Get full details about a specific provider, including menu items, opening hours, and contact info.',
      parameters: {
        type: 'object',
        properties: {
          provider_id: {
            type: 'string',
            description: 'The UUID of the provider',
          },
        },
        required: ['provider_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_categories',
      description:
        'Get available categories (cuisines, service types) for filtering. Use when user asks for a specific cuisine or service type.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search for matching category names (e.g., "türkisch", "italienisch")',
          },
          listing_type: {
            type: 'string',
            enum: ['food', 'store', 'ummah'],
            description: 'Filter by provider type',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cities',
      description:
        'Get list of cities that have providers. Use when user asks about a specific city to verify it exists.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_provider',
      description:
        'Register a new restaurant, store, or community service on UFlow. Collect all required fields before calling this.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Provider name' },
          listing_type: {
            type: 'string',
            enum: ['food', 'store', 'ummah'],
          },
          category_id: {
            type: 'string',
            description: 'Category UUID from get_categories',
          },
          city: {
            type: 'string',
            description: 'City name (must exist in UFlow cities)',
          },
          street: { type: 'string', description: 'Street address (optional)' },
          zip: { type: 'string', description: 'ZIP code (optional)' },
          country: {
            type: 'string',
            description: "Country code, default 'DE'",
          },
          phone: { type: 'string', description: 'Contact phone (optional)' },
          email: { type: 'string', description: 'Contact email (optional)' },
          description: {
            type: 'string',
            description: 'Provider description (optional)',
          },
          website: { type: 'string', description: 'Website URL (optional)' },
          muslim_owned: { type: 'boolean' },
          has_prayer_space: { type: 'boolean' },
          family_friendly: { type: 'boolean' },
          women_friendly: { type: 'boolean' },
          no_alcohol: {
            type: 'boolean',
            description: 'For food listing_type only',
          },
          no_pork: {
            type: 'boolean',
            description: 'For food listing_type only',
          },
          no_gambling: {
            type: 'boolean',
            description: 'For store listing_type only',
          },
          makes_donations: {
            type: 'boolean',
            description: 'For ummah listing_type only',
          },
        },
        required: ['name', 'listing_type', 'category_id', 'city'],
      },
    },
  },
];

const VALID_LISTING_TYPES = ['food', 'store', 'ummah'] as const;

export async function executeToolCall(
  toolCall: ToolCall,
  userId?: string,
): Promise<string> {
  const { name, arguments: argsJson } = toolCall.function;
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(argsJson);
  } catch {
    throw new Error(`Invalid JSON arguments for tool: ${name}`);
  }

  switch (name) {
    case 'search_providers': {
      const rawQuery = args.query as string | undefined;
      const rawCategory = args.category as string | undefined;
      
      // Strip generic terms that won't match provider names in tsvector search
      const GENERIC_TERMS = /^(essen|food|restaurant|eat|store|shop|service|help|something|anything|all|everything)$/i;
      let query = (!rawQuery || GENERIC_TERMS.test(rawQuery)) ? '' : rawQuery;
      
      // Auto-detect: if query looks like a cuisine/type and no category set, move to category
      if (query && !rawCategory && !/^[0-9a-f]{8}-/i.test(query)) {
        // Check if this matches a known category name
        const adminCat = getSupabaseAdmin();
        const { data: catCheck } = await adminCat
          .from('categories')
          .select('category_id')
          .ilike('name_de', `%${query}%`)
          .limit(1);
        if (catCheck && catCheck.length > 0) {
          // Found a matching category — use it as filter instead of query
          args.category = catCheck[0].category_id;
          query = ''; // Clear the query since we're filtering by category
        }
      }


      const supabase = createSupabaseServerClient();
      
      // Resolve category name to UUID if needed
      let categoryFilter = (args.category as string) || null;
      if (categoryFilter && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryFilter)) {
        const adminForCat = getSupabaseAdmin();
        const { data: catData } = await adminForCat
          .from('categories')
          .select('category_id')
          .ilike('name_de', `%${categoryFilter}%`)
          .limit(1);
        if (catData && catData.length > 0) {
          categoryFilter = catData[0].category_id;
        }
      }

      const { data, error } = await supabase.rpc('search_providers_chat', {
        p_search_query: query as string,
        p_category_filter: categoryFilter,
        p_city_filter: (args.city as string) || null,
        p_listing_type_filter: (args.listing_type as string) || null,
        p_muslim_owned: (args.muslim_owned as boolean) ?? null,
        p_has_prayer_space: (args.has_prayer_space as boolean) ?? null,
        p_family_friendly: (args.family_friendly as boolean) ?? null,
        p_women_friendly: (args.women_friendly as boolean) ?? null,
        p_limit_count: (args.limit as number) || 5,
      });

      if (error) throw error;
      return JSON.stringify({ results: data || [] });
    }

    case 'get_provider_details': {
      const providerId = args.provider_id;
      if (!providerId || typeof providerId !== 'string') {
        throw new Error('provider_id is required for get_provider_details');
      }

      const provider = await getProviderById(providerId);
      if (!provider) {
        return JSON.stringify({ error: 'Provider not found' });
      }

      return JSON.stringify({
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        provider_description: provider.description || provider.provider_name,
        address_city: provider.address_city,
        address_street: provider.address_street,
        address_zip: provider.address_zip,
        category_name: provider.category?.name_de || null,
        listing_type: provider.listing_type,
        muslim_owned: provider.muslim_owned,
        has_prayer_space: provider.has_prayer_space,
        family_friendly: provider.family_friendly,
        women_friendly: provider.women_friendly,
        contact_phone: provider.contact_phone,
        contact_email: provider.contact_email,
        social_website: provider.social_website,
        badges: provider.badges || [],
      });
    }

    case 'get_categories': {
      const supabase = createSupabaseServerClient();
      let query = supabase.from('categories').select('category_id, name_de, name_en, applicable_section');

      if (args.query && typeof args.query === 'string') {
        query = query.ilike('name_de', `%${args.query}%`);
      }

      if (args.listing_type && typeof args.listing_type === 'string') {
        query = query.eq('applicable_section', args.listing_type);
      }

      query = query.limit(20);

      const { data, error } = await query;
      if (error) throw error;

      return JSON.stringify({ categories: data || [] });
    }

    case 'get_cities': {
      const cities = await fetchProviderCities();
      return JSON.stringify({ cities });
    }

    case 'register_provider': {
      if (!userId) {
        throw new Error('Authentication required for registration');
      }

      const listingType = args.listing_type as string;
      if (!VALID_LISTING_TYPES.includes(listingType as typeof VALID_LISTING_TYPES[number])) {
        throw new Error('listing_type must be one of: food, store, ummah');
      }

      const city = args.city as string;
      if (!city) {
        throw new Error('city is required for registration');
      }

      // Use admin client for city check (bypasses RLS)
      const adminSupabase = getSupabaseAdmin();
      const { data: cityData } = await adminSupabase
        .from('cities')
        .select('city_name')
        .ilike('city_name', city)
        .limit(1);
      if (!cityData || cityData.length === 0) {
        throw new Error(`City "${city}" not found`);
      }

      const { formData, user } = await mapChatArgsToFormData(args, userId);
      const regListingType = (args.listing_type as string) || 'food';

      // Use admin client for provider creation (bypasses RLS)
      const adminForCreate = getSupabaseAdmin();
      const providerId = crypto.randomUUID();
      
      const { error: createError } = await adminForCreate
        .from('providers')
        .insert({
          provider_id: providerId,
          listing_type: listingType,
          provider_name: formData.title,
          provider_description: formData.description || null,
          address_city: formData.city || null,
          address_street: formData.street || null,
          address_zip: formData.zip || null,
          address_country: formData.country || 'DE',
          category_id: formData.category || null,
          contact_email: formData.email || null,
          contact_phone: formData.phone || null,
          social_website: formData.website || null,
          show_address: formData.showAddress !== false,
          review_status: 'pending',
          user_created_id: userId,
          muslim_owned: formData.tags?.includes('muslim') || false,
          has_prayer_space: formData.tags?.includes('prayer') || false,
          family_friendly: formData.tags?.includes('family_friendly') || false,
          women_friendly: formData.tags?.includes('women_friendly') || false,
        });

      if (createError) {
        throw new Error(`Registration failed: ${createError.message}`);
      }

      // Insert Muslim-friendly flags into extension tables
      if (regListingType === 'food' || listingType === 'store') {
        const extTable = regListingType === 'food' ? 'food_providers' : 'store_providers';
        const noAlcohol = !!(args.no_alcohol as boolean);
        const noPork = !!(args.no_pork as boolean);
        const noGambling = !!(args.no_gambling as boolean);
        
        const { error: extError } = await adminForCreate
          .from(extTable)
          .upsert({
            provider_id: providerId,
            no_alcohol: noAlcohol,
            no_pork: listingType === 'food' ? noPork : false,
            no_gambling: listingType === 'store' ? noGambling : false,
          }, { onConflict: 'provider_id' });
        
        if (extError) {
          console.error(`[Registration] Failed to insert into ${extTable}:`, extError);
        }
      }

      return JSON.stringify({
        success: true,
        provider_id: providerId,
        review_status: 'pending',
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function buildTags(args: Record<string, unknown>): string[] {
  const tags: string[] = [];
  if (args.muslim_owned) tags.push('muslim');
  if (args.has_prayer_space) tags.push('prayer');
  if (args.makes_donations) tags.push('donations');
  if (args.no_alcohol) tags.push('no_alcohol');
  if (args.no_pork) tags.push('no_pork');
  if (args.family_friendly) tags.push('family_friendly');
  if (args.women_friendly) tags.push('women_friendly');
  return tags;
}

export async function mapChatArgsToFormData(
  args: Record<string, unknown>,
  userId: string,
): Promise<{ formData: ProviderFormData; user: User }> {
  const tags = buildTags(args);

  // Resolve category: if it looks like a name (not UUID), try to resolve it
  let categoryId = (args.category_id as string) || (args.category as string) || '';
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (categoryId && !UUID_REGEX.test(categoryId)) {
    // Category is a name — resolve it via the categories table
    try {
      const lookupSupabase = getSupabaseAdmin();
      const { data: catData } = await lookupSupabase
        .from('categories')
        .select('category_id')
        .ilike('name_de', `%${categoryId}%`)
        .limit(1);
      if (catData && catData.length > 0) {
        categoryId = catData[0].category_id;
      } else {
        // Category not found — throw clear error so LLM can suggest alternatives
        throw new Error(`Kategorie "${categoryId}" existiert nicht. Bitte wähle eine gültige Kategorie aus der Liste.`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Kategorie')) throw e;
      // Keep as-is if lookup fails for other reasons
    }
  }

  const formData: ProviderFormData = {
    creationMode: 'owner',
    entityType: 'provider',
    title: (args.name as string) || '',
    category: categoryId,
    description: (args.description as string) || '',
    isOnlineBusiness: false,
    street: (args.street as string) || '',
    zip: (args.zip as string) || '',
    city: (args.city as string) || '',
    country: (args.country as string) || 'DE',
    showAddress: true,
    website: (args.website as string) || '',
    instagram: '',
    phone: (args.phone as string) || '',
    email: (args.email as string) || '',
    offers_ids: [],
    needs_ids: [],
    images: [],
    selectedCommunityServiceIds: [],
    tags,
    socialCategory: '',
    socialTitle: '',
    socialDescription: '',
  };

  const user: User = {
    id: userId,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };

  return { formData, user };
}
