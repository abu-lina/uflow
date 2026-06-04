import { describe, expect, it } from 'vitest';
import {
  matchProviderToVenues,
  stringSimilarity,
  normalizeName,
} from '@/lib/enrichment/delivery-platform/provider-matcher';
import type { WoltVenue } from '@/lib/enrichment/delivery-platform/wolt-client';

function makeVenue(name: string, slug: string, city?: string): WoltVenue {
  return { name, slug, city };
}

describe('normalizeName', () => {
  it('lowercases the name', () => {
    expect(normalizeName('Döner Haus')).toBe('döner haus');
  });

  it('removes GmbH suffix', () => {
    expect(normalizeName('Restaurant GmbH')).toBe('restaurant');
  });

  it('removes e.K. suffix', () => {
    expect(normalizeName('Döner Haus e.K.')).toBe('döner haus');
  });

  it('removes Restaurant suffix', () => {
    expect(normalizeName('Pizza Platz Restaurant')).toBe('pizza platz');
  });

  it('strips special characters', () => {
    expect(normalizeName('Döner-Haus!')).toBe('döner haus');
  });

  it('handles complex names', () => {
    expect(normalizeName('Saray Döner & Pizza Haus GmbH')).toBe('saray döner pizza haus');
  });
});

describe('stringSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(stringSimilarity('Döner Haus', 'Döner Haus')).toBe(1);
  });

  it('returns high score for similar names', () => {
    const score = stringSimilarity('Döner Haus', 'Döner Haus Berlin');
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns low score for different names', () => {
    const score = stringSimilarity('Pizza Platz', 'Döner Haus');
    expect(score).toBeLessThan(0.4);
  });

  it('handles normalization differences', () => {
    const score = stringSimilarity('Döner Haus GmbH', 'Döner Haus');
    expect(score).toBe(1);
  });

  it('handles case insensitivity', () => {
    const score = stringSimilarity('DÖNER HAUS', 'döner haus');
    expect(score).toBe(1);
  });
});

describe('matchProviderToVenues', () => {
  const venues: WoltVenue[] = [
    makeVenue('Döner Haus', 'doner-haus', 'Berlin'),
    makeVenue('Pizza Platz', 'pizza-platz', 'Berlin'),
    makeVenue('Asia Imbiss', 'asia-imbiss', 'Hamburg'),
  ];

  it('exact match by name and city', () => {
    const result = matchProviderToVenues('Döner Haus', 'Berlin', venues);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('exact_name_city');
    expect(result!.confidence).toBe(1);
    expect(result!.woltVenue.slug).toBe('doner-haus');
  });

  it('fuzzy match with normalization', () => {
    const result = matchProviderToVenues('Döner Haus GmbH', 'Berlin', venues);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('exact_name_city');
    expect(result!.confidence).toBe(1);
  });

  it('returns null for no match', () => {
    const result = matchProviderToVenues('Sushi Bar', 'Berlin', venues);
    expect(result).toBeNull();
  });

  it('returns null for empty venues', () => {
    const result = matchProviderToVenues('Döner Haus', 'Berlin', []);
    expect(result).toBeNull();
  });

  it('returns null for empty provider name', () => {
    const result = matchProviderToVenues('', 'Berlin', venues);
    expect(result).toBeNull();
  });

  it('matches case insensitive', () => {
    const result = matchProviderToVenues('döner haus', 'berlin', venues);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('exact_name_city');
  });

  it('fuzzy_name_only when city does not match but name is very similar', () => {
    const result = matchProviderToVenues('Asia Imbiss', 'Berlin', venues);
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('fuzzy_name_only');
    expect(result!.confidence).toBeLessThan(1);
  });

  it('matches as fuzzy_name_only when city config required but name is identical', () => {
    const venuesBerlin: WoltVenue[] = [makeVenue('Unique Name', 'unique', 'Berlin')];
    const result = matchProviderToVenues('Unique Name', 'München', venuesBerlin, {
      nameSimilarityThreshold: 0.6,
      requireCityMatch: true,
    });
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('fuzzy_name_only');
    expect(result!.confidence).toBeLessThan(1);
  });

  it('fuzzy_name_only when requireCityMatch is false', () => {
    const venuesBerlin: WoltVenue[] = [makeVenue('Unique Name', 'unique', 'Berlin')];
    const result = matchProviderToVenues('Unique Name', 'München', venuesBerlin, {
      nameSimilarityThreshold: 0.6,
      requireCityMatch: false,
    });
    expect(result).not.toBeNull();
    expect(result!.matchType).toBe('fuzzy_name_only');
  });

  it('returns best match among multiple venues', () => {
    const multiVenues: WoltVenue[] = [
      makeVenue('Döner Haus Original', 'doner-original', 'Berlin'),
      makeVenue('Döner Haus', 'doner-haus', 'Berlin'),
    ];
    const result = matchProviderToVenues('Döner Haus', 'Berlin', multiVenues);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(1);
    expect(result!.woltVenue.slug).toBe('doner-haus');
  });
});
