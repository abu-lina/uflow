import type {
  LieferandoClient,
  LieferandoSearchResult,
} from './lieferando-types';
import type { Geocoder } from './geocoder';
import type { DeliveryPlatformSnapshot, DeliveryEnrichmentResult } from '../delivery-enricher';
import { matchProviderToVenues } from './provider-matcher';
import { detectConflict, type EnrichmentCandidate } from '../joinhalal-enricher';
import { detectAlcohol } from './alcohol-detector';

export async function enrichFromLieferando(
  provider: DeliveryPlatformSnapshot,
  client: LieferandoClient,
  geocoder: Geocoder,
): Promise<DeliveryEnrichmentResult> {
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

  const restaurants = await client.searchRestaurants(address_city);
  if (restaurants.length === 0) {
    return {
      providerId: provider_id,
      venueSlug: null,
      matchConfidence: null,
      candidates: [],
      error: 'No Lieferando restaurants found for city',
    };
  }

  const match = matchProviderToVenues<LieferandoSearchResult>(
    provider_name,
    address_city,
    restaurants,
  );
  if (!match) {
    return {
      providerId: provider_id,
      venueSlug: null,
      matchConfidence: null,
      candidates: [],
      error: 'No Lieferando restaurant matched',
    };
  }

  const restaurantData = await client.getRestaurantPage(match.venue.slug);

  const allMenuItemNames = restaurantData.menuCategories
    .flatMap((cat) => cat.items)
    .map((item) => item.name);

  const alcoholResult = detectAlcohol(allMenuItemNames);

  let proposedNoAlcohol: boolean | null = null;
  if (alcoholResult.signal === 'definite_alcohol') {
    proposedNoAlcohol = false;
  } else if (alcoholResult.signal === 'definite_no_alcohol') {
    proposedNoAlcohol = true;
  }

  const candidates = buildLieferandoCandidates(
    provider_id,
    restaurantData.deliveryUrl,
    provider.opening_hours,
    provider.no_alcohol,
    restaurantData.openingHours,
    proposedNoAlcohol,
  );

  return {
    providerId: provider_id,
    venueSlug: match.venue.slug,
    matchConfidence: match.confidence,
    candidates,
    error: null,
  };
}

function buildLieferandoCandidates(
  providerId: string,
  sourceUrl: string,
  currentOpeningHours: unknown,
  currentNoAlcohol: unknown,
  proposedOpeningHours: unknown,
  proposedNoAlcohol: unknown,
): EnrichmentCandidate[] {
  const candidates: EnrichmentCandidate[] = [];

  const hoursConflict = detectConflict(currentOpeningHours, proposedOpeningHours);
  if (hoursConflict !== 'no-change') {
    candidates.push({
      provider_id: providerId,
      source: 'lieferando',
      source_url: sourceUrl,
      field_name: 'opening_hours',
      proposed_value: proposedOpeningHours,
      current_value: currentOpeningHours,
    });
  }

  const alcoholConflict = detectConflict(currentNoAlcohol, proposedNoAlcohol);
  if (alcoholConflict !== 'no-change') {
    candidates.push({
      provider_id: providerId,
      source: 'lieferando',
      source_url: sourceUrl,
      field_name: 'no_alcohol',
      proposed_value: proposedNoAlcohol,
      current_value: currentNoAlcohol,
    });
  }

  return candidates;
}
