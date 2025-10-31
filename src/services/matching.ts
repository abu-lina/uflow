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
    // 1. Get current provider's offers
    const { data: provider } = await supabase
      .from('providers')
      .select('offers_ids, category_id')
      .eq('provider_id', providerId)
      .single();

    if (!provider?.offers_ids || provider.offers_ids.length === 0) {
      return [];
    }

    // 2. Find providers whose needs_ids contain any of my offers_ids
    // Using PostgreSQL array overlap operator (&&) which is fast with GIN indexes
    const { data: matchedProviders } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de, name_en, category_images)
      `)
      .neq('provider_id', providerId)
      .overlaps('needs_ids', provider.offers_ids);

    if (!matchedProviders || matchedProviders.length === 0) {
      return [];
    }

    // 3. Get offer names for reference
    const { data: allOffers } = await supabase
      .from('offers')
      .select('offer_id, name_de, name_en')
      .in('offer_id', provider.offers_ids);

    const offersMap = new Map(
      (allOffers || []).map(o => [o.offer_id, { offer_id: o.offer_id, name_de: o.name_de, name_en: o.name_en }])
    );

    // 4. Build match results
    const results: MatchResult[] = [];

    for (const matchedProvider of matchedProviders) {
      // Find which of my offers match their needs
      const matchingOfferIds = matchedProvider.needs_ids.filter(
        (needId: string) => provider.offers_ids.includes(needId)
      );

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
    // 1. Get current provider's needs
    const { data: provider } = await supabase
      .from('providers')
      .select('needs_ids, category_id')
      .eq('provider_id', providerId)
      .single();

    if (!provider?.needs_ids || provider.needs_ids.length === 0) {
      return [];
    }

    // 2. Find providers whose offers_ids contain any of my needs_ids
    const { data: matchedProviders } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de, name_en, category_images)
      `)
      .neq('provider_id', providerId)
      .overlaps('offers_ids', provider.needs_ids);

    if (!matchedProviders || matchedProviders.length === 0) {
      return [];
    }

    // 3. Get need names for reference
    const { data: allNeeds } = await supabase
      .from('needs')
      .select('need_id, name_de, name_en')
      .in('need_id', provider.needs_ids);

    const needsMap = new Map(
      (allNeeds || []).map(n => [n.need_id, { need_id: n.need_id, name_de: n.name_de, name_en: n.name_en }])
    );

    // 4. Build match results
    const results: MatchResult[] = [];

    for (const matchedProvider of matchedProviders) {
      // Find which of my needs match their offers
      const matchingNeedIds = matchedProvider.offers_ids.filter(
        (offerId: string) => provider.needs_ids.includes(offerId)
      );

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

