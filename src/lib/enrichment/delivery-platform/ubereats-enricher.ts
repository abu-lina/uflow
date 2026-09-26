import type { UberEatsClient, UberEatsSearchResult } from './ubereats-types';
import type {
  DeliveryPlatformSnapshot,
  DeliveryEnrichmentResult,
} from '../delivery-enricher';
import { StaticCityGeocoder } from './geocoder';
import { stringSimilarity } from './provider-matcher';
import { detectAlcohol } from './alcohol-detector';
import { buildDeliveryCandidates } from '../delivery-enricher';

const geocoder = new StaticCityGeocoder();

const MATCH_THRESHOLD = 0.4;

function findBestMatch(
  providerName: string,
  venues: UberEatsSearchResult[],
): UberEatsSearchResult | null {
  let best: UberEatsSearchResult | null = null;
  let bestScore = -1;

  for (const venue of venues) {
    const score = stringSimilarity(providerName, venue.name);
    if (score > bestScore) {
      bestScore = score;
      best = venue;
    }
  }

  return best && bestScore >= MATCH_THRESHOLD ? best : null;
}

function extractMenuNames(
  categories: { items: { name: string }[] }[],
): string[] {
  const names: string[] = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      names.push(item.name);
    }
  }
  return names;
}

export async function enrichFromUberEats(
  provider: DeliveryPlatformSnapshot,
  client: UberEatsClient,
): Promise<DeliveryEnrichmentResult> {
  try {
    const { provider_id, provider_name, address_city } = provider;

    if (!address_city) {
      return {
        providerId: provider_id,
        venueSlug: null,
        matchConfidence: null,
        candidates: [],
        error: 'Provider has no city set',
      };
    }

    const coords = await geocoder.geocode(address_city);
    if (!coords) {
      return {
        providerId: provider_id,
        venueSlug: null,
        matchConfidence: null,
        candidates: [],
        error: `City not found in geocoder: ${address_city}`,
      };
    }

    const venues = await client.searchRestaurants(
      address_city,
      coords.lat,
      coords.lon,
    );
    if (venues.length === 0) {
      return {
        providerId: provider_id,
        venueSlug: null,
        matchConfidence: null,
        candidates: [],
        error: 'No UberEats venues found for location',
      };
    }

    const match = findBestMatch(provider_name, venues);
    if (!match) {
      return {
        providerId: provider_id,
        venueSlug: null,
        matchConfidence: null,
        candidates: [],
        error: 'No UberEats venue matched',
      };
    }

    const restaurant = await client.getRestaurantPage(match.slug);

    const menuNames = extractMenuNames(restaurant.menuCategories);
    const alcoholResult = detectAlcohol(menuNames);

    let proposedNoAlcohol: boolean | null = null;
    if (alcoholResult.signal === 'definite_alcohol') {
      proposedNoAlcohol = false;
    } else if (alcoholResult.signal === 'definite_no_alcohol') {
      proposedNoAlcohol = true;
    }

    const sourceUrl = restaurant.deliveryUrl;
    const candidates = buildDeliveryCandidates(
      provider_id,
      sourceUrl,
      'ubereats',
      provider.opening_hours,
      provider.no_alcohol,
      restaurant.openingHours,
      proposedNoAlcohol,
    );

    return {
      providerId: provider_id,
      venueSlug: match.slug,
      matchConfidence: match.rating
        ? Math.min(match.rating / 5, 1)
        : null,
      candidates,
      error: null,
    };
  } catch (error) {
    return {
      providerId: provider.provider_id,
      venueSlug: null,
      matchConfidence: null,
      candidates: [],
      error: `UberEats experimental: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
