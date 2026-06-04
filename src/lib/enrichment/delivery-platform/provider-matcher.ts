import { distance as levenshteinDistance } from 'fastest-levenshtein';
import type { WoltVenue } from './wolt-client';

export interface MatchCandidate {
  providerId: string;
  providerName: string;
  providerCity: string;
  woltVenue: WoltVenue;
  confidence: number;
  matchType: 'exact_name_city' | 'fuzzy_name_city' | 'fuzzy_name_only';
}

export interface ProviderMatchConfig {
  nameSimilarityThreshold: number;
  requireCityMatch: boolean;
}

const DEFAULT_CONFIG: ProviderMatchConfig = {
  nameSimilarityThreshold: 0.5,
  requireCityMatch: true,
};

// sorted by length descending so longer suffixes match before shorter substrings
const SUFFIXES = [
  ' gmbh & co. kg', ' ug & co. kg', ' restaurant', ' e. k.', ' e. v.',
  ' gmbh', ' e.k.', ' e.v.', ' ug',
];

export function normalizeName(name: string): string {
  let result = name.trim().toLowerCase();

  for (const suffix of SUFFIXES) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length).trim();
    }
  }

  result = result.replace(/[^a-zäöüß0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return result;
}

export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);

  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  return 1 - dist / maxLen;
}

export function matchProviderToVenues(
  providerName: string,
  providerCity: string,
  venues: WoltVenue[],
  config?: ProviderMatchConfig
): MatchCandidate | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (venues.length === 0) return null;
  if (!providerName) return null;

  const normProviderName = normalizeName(providerName);
  const normProviderCity = providerCity?.trim().toLowerCase() ?? '';

  if (!normProviderName) return null;

  let bestCandidate: MatchCandidate | null = null;
  let bestScore = -1;

  for (const venue of venues) {
    const normVenueName = normalizeName(venue.name ?? '');
    const normVenueCityRaw = (venue.city as string) ?? '';
    const normVenueCity = normVenueCityRaw.trim().toLowerCase();

    if (!normVenueName) continue;

    const nameScore = stringSimilarity(normProviderName, normVenueName);
    const cityMatch = !normVenueCity || (normProviderCity && normProviderCity === normVenueCity);

    if (nameScore === 1 && cityMatch) {
      return {
        providerId: '',
        providerName,
        providerCity,
        woltVenue: venue,
        confidence: 1,
        matchType: 'exact_name_city',
      };
    }

  const highSimilarity = nameScore >= 1.0;

  if (!cityMatch && cfg.requireCityMatch && !highSimilarity) {
    continue;
  }

  const effectiveThreshold = highSimilarity ? 0 : cfg.nameSimilarityThreshold;
  if (nameScore >= effectiveThreshold) {
      const matchType = cityMatch ? 'fuzzy_name_city' : 'fuzzy_name_only';
      const confidence = cityMatch ? nameScore : nameScore * 0.8;

      if (confidence > bestScore) {
        bestScore = confidence;
        bestCandidate = {
          providerId: '',
          providerName,
          providerCity,
          woltVenue: venue,
          confidence: Math.min(confidence, 1),
          matchType,
        };
      }
    }
  }

  return bestCandidate;
}
