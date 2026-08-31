import type { OpeningHours } from '@/types/openingHours';
import { detectConflict, type EnrichmentCandidate } from './joinhalal-enricher';
import type { WoltClient } from './delivery-platform/wolt-client';
import { matchProviderToVenues } from './delivery-platform/provider-matcher';
import { normalizeWoltOpeningHours } from './delivery-platform/normalizer';
import { detectAlcohol } from './delivery-platform/alcohol-detector';

export interface DeliveryPlatformSnapshot {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
  listing_type: string | null;
  opening_hours: OpeningHours | null;
  no_alcohol: boolean | null;
}

export interface DeliveryEnrichmentResult {
  providerId: string;
  venueSlug: string | null;
  matchConfidence: number | null;
  candidates: EnrichmentCandidate[];
  error: string | null;
}

function extractWoltVenueUrl(slug: string): string {
  return `https://wolt.com/de/deu/venue/${slug}`;
}

export async function enrichFromWolt(
  provider: DeliveryPlatformSnapshot,
  woltClient: WoltClient,
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

  const coords = await woltClient.geocodeCity(address_city);
  if (!coords) {
    return {
      providerId: provider_id,
      venueSlug: null,
      matchConfidence: null,
      candidates: [],
      error: `City not found in geocoder: ${address_city}`,
    };
  }

  const searchResult = await woltClient.searchVenuesByLocation(coords.lat, coords.lon);
  if (searchResult.venues.length === 0) {
    return {
      providerId: provider_id,
      venueSlug: null,
      matchConfidence: null,
      candidates: [],
      error: 'No Wolt venues found for location',
    };
  }

  const match = matchProviderToVenues(provider_name, address_city, searchResult.venues);
  if (!match) {
    return {
      providerId: provider_id,
      venueSlug: null,
      matchConfidence: null,
      candidates: [],
      error: 'No Wolt venue matched',
    };
  }

  // Use venue_preview_items from discovery API (menu endpoint deprecated)
  const previewItems =
    (match.venue.venue_preview_items as Array<{ name?: string }>) ?? [];
  const menuItemNames = previewItems
    .filter((i): i is { name: string } => typeof i?.name === 'string')
    .map((i) => i.name);
  const alcoholResult = detectAlcohol(menuItemNames);

  // Opening hours not available in current Wolt API response
  const normalizedHours = null;

  let proposedNoAlcohol: boolean | null = null;
  if (alcoholResult.signal === 'definite_alcohol') {
    proposedNoAlcohol = false;
  } else if (alcoholResult.signal === 'definite_no_alcohol') {
    proposedNoAlcohol = true;
  }

  const sourceUrl = extractWoltVenueUrl(match.venue.slug);
  const candidates = buildDeliveryCandidates(
    provider_id,
    sourceUrl,
    'wolt',
    provider.opening_hours,
    provider.no_alcohol,
    normalizedHours,
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

export function buildDeliveryCandidates(
  providerId: string,
  sourceUrl: string,
  source: string,
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
      source,
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
      source,
      source_url: sourceUrl,
      field_name: 'no_alcohol',
      proposed_value: proposedNoAlcohol,
      current_value: currentNoAlcohol,
    });
  }

  return candidates;
}
