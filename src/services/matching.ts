/**
 * Service for matching providers based on offers and needs
 * Allows providers to find matching offers/needs with other providers
 */

import { supabase } from '@/lib/supabase/client';
import type { Provider } from './providers';

export interface MatchResult {
  provider: Provider;
  matchedOffer?: { offer_id: string; name_de: string; name_en?: string };
  matchedNeed?: { need_id: string; name_de: string; name_en?: string };
  matchType: 'exact';
  matchedCount: number; // Number of offers/needs that matched
}

/**
 * Find providers who need what the current provider offers
 * 
 * Example: If Provider A offers "Catering", this finds providers who need "Catering"
 * 
 * @param providerId - The provider_id of the current provider
 * @returns Array of matching providers with details about what matched
 */
export async function findProvidersNeedingMyOffers(
  providerId: string
): Promise<MatchResult[]> {
  try {
    // 1. Get current provider's offers from junction table
    const { data: providerOffers } = await supabase
      .from('provider_offers')
      .select('offer_id')
      .eq('provider_id', providerId);

    const offeredIds = (providerOffers || []).map((row) => row.offer_id);
    if (offeredIds.length === 0) {
      return [];
    }

    // 2. Find providers whose needs contain any of my offers
    const { data: matchingNeeds } = await supabase
      .from('provider_needs')
      .select('provider_id, need_id')
      .in('need_id', offeredIds)
      .neq('provider_id', providerId);

    if (!matchingNeeds || matchingNeeds.length === 0) {
      return [];
    }

    const matchedProviderIds = Array.from(new Set(matchingNeeds.map((row) => row.provider_id)));

    const { data: matchedProviders } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de, name_en)
      `)
      .in('provider_id', matchedProviderIds);

    if (!matchedProviders || matchedProviders.length === 0) {
      return [];
    }

    // 3. Get offer names for reference
    const { data: allOffers } = await supabase
      .from('offers')
      .select('offer_id, name_de, name_en')
      .in('offer_id', offeredIds);

    const offersMap = new Map(
      (allOffers || []).map(o => [o.offer_id, { offer_id: o.offer_id, name_de: o.name_de, name_en: o.name_en }])
    );

    // 4. Build match results
    const results: MatchResult[] = [];

    const needsByProvider = new Map<string, string[]>();
    for (const row of matchingNeeds) {
      const ids = needsByProvider.get(row.provider_id) || [];
      ids.push(row.need_id);
      needsByProvider.set(row.provider_id, ids);
    }

    for (const matchedProvider of matchedProviders) {
      const matchingOfferIds = needsByProvider.get(matchedProvider.provider_id) || [];

      if (matchingOfferIds.length > 0) {
        // Get the first matching offer for display
        const firstMatchId = matchingOfferIds[0];
        const matchedOffer = offersMap.get(firstMatchId);

        results.push({
          provider: matchedProvider as Provider,
          matchedOffer,
          matchType: 'exact',
          matchedCount: matchingOfferIds.length,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error finding providers needing my offers:', error);
    return [];
  }
}

/**
 * Find providers who offer what the current provider needs
 * 
 * Example: If Provider A needs "Kitchen Equipment", this finds providers who offer it
 * 
 * @param providerId - The provider_id of the current provider
 * @returns Array of matching providers with details about what matched
 */
export async function findProvidersOfferingMyNeeds(
  providerId: string
): Promise<MatchResult[]> {
  try {
    // 1. Get current provider's needs from junction table
    const { data: providerNeeds } = await supabase
      .from('provider_needs')
      .select('need_id')
      .eq('provider_id', providerId);

    const neededIds = (providerNeeds || []).map((row) => row.need_id);
    if (neededIds.length === 0) {
      return [];
    }

    // 2. Find providers whose offers contain any of my needs
    const { data: matchingOffers } = await supabase
      .from('provider_offers')
      .select('provider_id, offer_id')
      .in('offer_id', neededIds)
      .neq('provider_id', providerId);

    if (!matchingOffers || matchingOffers.length === 0) {
      return [];
    }

    const matchedProviderIds = Array.from(new Set(matchingOffers.map((row) => row.provider_id)));

    const { data: matchedProviders } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de, name_en)
      `)
      .in('provider_id', matchedProviderIds);

    if (!matchedProviders || matchedProviders.length === 0) {
      return [];
    }

    // 3. Get need names for reference
    const { data: allNeeds } = await supabase
      .from('needs')
      .select('need_id, name_de, name_en')
      .in('need_id', neededIds);

    const needsMap = new Map(
      (allNeeds || []).map(n => [n.need_id, { need_id: n.need_id, name_de: n.name_de, name_en: n.name_en }])
    );

    // 4. Build match results
    const results: MatchResult[] = [];

    const offersByProvider = new Map<string, string[]>();
    for (const row of matchingOffers) {
      const ids = offersByProvider.get(row.provider_id) || [];
      ids.push(row.offer_id);
      offersByProvider.set(row.provider_id, ids);
    }

    for (const matchedProvider of matchedProviders) {
      const matchingNeedIds = offersByProvider.get(matchedProvider.provider_id) || [];

      if (matchingNeedIds.length > 0) {
        // Get the first matching need for display
        const firstMatchId = matchingNeedIds[0];
        const matchedNeed = needsMap.get(firstMatchId);

        results.push({
          provider: matchedProvider as Provider,
          matchedNeed,
          matchType: 'exact',
          matchedCount: matchingNeedIds.length,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error finding providers offering my needs:', error);
    return [];
  }
}

/**
 * Get all matching providers (both directions)
 * 
 * @param providerId - The provider_id of the current provider
 * @returns Object with both types of matches
 */
export async function getAllMatches(providerId: string): Promise<{
  providersNeedingMyOffers: MatchResult[];
  providersOfferingMyNeeds: MatchResult[];
}> {
  const [providersNeedingMyOffers, providersOfferingMyNeeds] = await Promise.all([
    findProvidersNeedingMyOffers(providerId),
    findProvidersOfferingMyNeeds(providerId),
  ]);

  return {
    providersNeedingMyOffers,
    providersOfferingMyNeeds,
  };
}

/**
 * Filter matches by category
 * 
 * @param matches - Array of match results
 * @param categoryId - Optional category ID to filter by
 * @returns Filtered matches
 */
export function filterMatchesByCategory(
  matches: MatchResult[],
  categoryId?: string | null
): MatchResult[] {
  if (!categoryId) return matches;

  return matches.filter(
    match => match.provider.category_id === categoryId
  );
}

