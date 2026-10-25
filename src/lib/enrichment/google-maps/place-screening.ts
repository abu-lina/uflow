import {
  scanProvider,
  type ScanInput,
  type ScreeningFlag,
} from '@/features/providers/services/screening-scanner';
import type { OpeningHours } from '@/types/openingHours';
import type { EnrichmentCandidate } from '@/lib/enrichment/joinhalal-enricher';
import { GOOGLE_MAPS_SETTINGS, type ApifyPlace } from './apify-google-maps-client';

export const MATCH_RADIUS_M = 100;
const MAX_REVIEW_CHARS = 500;
const MAPS_SOURCE_URL = 'https://www.google.com/maps';

export interface MatchableProvider {
  provider_name: string;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PlaceMatch {
  place: ApifyPlace;
  method: 'distance' | 'name_postcode';
  distanceM: number | null;
}

export interface NoMatchFlag {
  code: 'no_maps_match';
  term: string;
  snippet: string;
  url: string;
  source: 'google_maps';
}

export interface ScreeningResult {
  status: 'clear' | 'review' | 'flagged';
  flags: Array<ScreeningFlag | NoMatchFlag>;
  raw: Record<string, unknown>;
}

const MARKS_RE = new RegExp(String.raw`\p{M}`, 'gu');
const NON_ALNUM_RE = new RegExp(String.raw`[^\p{L}\p{N}]`, 'gu');

const normalise = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFKD').replace(MARKS_RE, '').toLowerCase().replace(NON_ALNUM_RE, '');

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(a));
}

function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalise(a);
  const y = normalise(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x)));
}

export function matchPlace(provider: MatchableProvider, places: ApifyPlace[]): PlaceMatch | null {
  if (provider.latitude != null && provider.longitude != null) {
    let best: PlaceMatch | null = null;
    for (const place of places) {
      if (!place.location) continue;
      const d = distanceMeters(
        provider.latitude,
        provider.longitude,
        place.location.lat,
        place.location.lng,
      );
      if (d <= MATCH_RADIUS_M && (!best || d < (best.distanceM as number))) {
        best = { place, method: 'distance', distanceM: Math.round(d) };
      }
    }
    if (best) return best;
  }

  const zip = normalise(provider.address_zip);
  if (!zip) return null;
  const place = places.find(
    (p) => normalise(p.postalCode) === zip && namesMatch(p.title, provider.provider_name),
  );
  return place ? { place, method: 'name_postcode', distanceM: null } : null;
}

function attributeTokens(place: ApifyPlace): string[] {
  const tokens: string[] = [];
  for (const group of Object.values(place.additionalInfo ?? {})) {
    for (const entry of group) {
      for (const [key, value] of Object.entries(entry)) {
        if (value === true && /^serves /i.test(key)) {
          tokens.push(key.toLowerCase().trim().replace(/\s+/g, '_'));
        }
      }
    }
  }
  return tokens;
}

export function screenPlace(match: PlaceMatch): ScreeningResult {
  const { place } = match;
  const mapsUrl = place.url ?? MAPS_SOURCE_URL;
  const reviews = (place.reviews ?? []).slice(0, GOOGLE_MAPS_SETTINGS.maxReviews).map((r) => ({
    text: (r.text ?? '').slice(0, MAX_REVIEW_CHARS),
    stars: r.stars ?? null,
  }));
  const attributes = attributeTokens(place);
  const websiteUrl = place.website ?? mapsUrl;

  const inputs: ScanInput[] = [
    ...reviews.map((r) => ({ text: r.text, source: 'review' as const, url: mapsUrl })),
    { text: attributes.join(' '), source: 'attribute', url: mapsUrl },
    {
      text: [place.title, place.categoryName, ...(place.categories ?? []), place.website]
        .filter(Boolean)
        .join(' '),
      source: 'website',
      url: websiteUrl,
    },
  ];
  const { status, flags } = scanProvider(inputs);

  return {
    status,
    flags,
    raw: {
      title: place.title,
      url: place.url,
      categoryName: place.categoryName,
      categories: place.categories,
      address: place.address,
      postalCode: place.postalCode,
      location: place.location,
      website: place.website,
      phone: place.phone,
      instagrams: place.instagrams,
      reviewsCount: place.reviewsCount,
      reviews,
      attributes,
      match: { method: match.method, distance_m: match.distanceM },
    },
  };
}

export function noMatchScreening(placesReturned: number): ScreeningResult {
  return {
    status: 'review',
    flags: [
      {
        code: 'no_maps_match',
        term: '',
        snippet: 'No Google Maps place matched this provider',
        url: '',
        source: 'google_maps',
      },
    ],
    raw: { placesReturned },
  };
}

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;

function to24h(raw: string, fallbackMeridian?: string): string | null {
  const m = TIME_RE.exec(raw.trim());
  if (!m) return null;
  let hour = Number(m[1]);
  const meridian = (m[3] ?? fallbackMeridian)?.toLowerCase();
  if (meridian === 'pm' && hour < 12) hour += 12;
  if (meridian === 'am' && hour === 12) hour = 0;
  if (hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${m[2] ?? '00'}`;
}

function parseDay(hours: string): { open: string; close: string } | null | undefined {
  const text = hours.trim();
  if (/^closed$/i.test(text)) return null;
  if (/^open 24 hours$/i.test(text)) return { open: '00:00', close: '23:59' };

  const ranges = text.split(',').map((r) => r.split(/\s+(?:to|–|-)\s+/i));
  if (ranges.some((r) => r.length !== 2)) return undefined;
  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  const open = to24h(first[0], /am|pm/i.exec(first[1])?.[0]);
  const close = to24h(last[1]);
  return open && close ? { open, close } : undefined;
}

/** Converts Google's day list to our format; returns null when no day can be parsed. */
export function parseOpeningHours(list: ApifyPlace['openingHours']): OpeningHours | null {
  const out: OpeningHours = {};
  for (const { day, hours } of list ?? []) {
    const key = DAYS.find((d) => d === day.trim().toLowerCase());
    const parsed = key ? parseDay(hours) : undefined;
    if (key && parsed !== undefined) out[key] = parsed;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export interface EnrichableProvider {
  provider_id: string;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  opening_hours: Record<string, unknown> | null;
  primaryLocationId: string | null;
}

/** Candidates for every field the place can supply; apply logic keeps only the empty ones. */
export function buildFieldCandidates(
  provider: EnrichableProvider,
  place: ApifyPlace,
): EnrichmentCandidate[] {
  const sourceUrl = place.url ?? MAPS_SOURCE_URL;
  const hasHours = provider.opening_hours && Object.keys(provider.opening_hours).length > 0;
  const proposals: Array<[string, unknown, unknown]> = [
    ['social_website', provider.social_website, place.website],
    ['contact_phone', provider.contact_phone, place.phone],
    ['social_instagram', provider.social_instagram, place.instagrams?.[0]],
  ];
  // Hours live on the primary location; without its id the RPC would replace all locations.
  if (provider.primaryLocationId) {
    proposals.push([
      'opening_hours',
      hasHours ? provider.opening_hours : null,
      parseOpeningHours(place.openingHours),
    ]);
  }

  return proposals.map(([field_name, current, proposed]) => ({
    provider_id: provider.provider_id,
    source: 'google_maps_apify',
    source_url: sourceUrl,
    field_name,
    proposed_value: proposed ?? null,
    current_value: current ?? null,
  }));
}

export function estimateCostUsd(places: number, images: number): number {
  return (
    places * GOOGLE_MAPS_SETTINGS.costPerPlaceUsd + images * GOOGLE_MAPS_SETTINGS.costPerImageUsd
  );
}

export function placeImages(place: ApifyPlace): string[] {
  return Array.from(new Set(place.imageUrls ?? [])).slice(0, GOOGLE_MAPS_SETTINGS.maxImages);
}
