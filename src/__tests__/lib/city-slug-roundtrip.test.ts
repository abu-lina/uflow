/**
 * City slug round-trip tests (request 244 — T1)
 *
 * The /food/<city> canonical is built with `slugify(city_name)`, and the route
 * resolves back with `findCityBySlug`. Those two must stay inverses of each
 * other, especially for umlaut cities (München → muenchen → München).
 */

import { describe, it, expect, vi } from 'vitest';

import { slugify } from '@/lib/slugify';
import { generateFoodCityCanonicalUrl } from '@/utils/canonicalUrl';

const CITY_ROWS = [
  { city_name: 'Berlin' },
  { city_name: 'München' },
  { city_name: 'Frankfurt am Main' },
  { city_name: 'Köln' },
];

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'cities') {
        return {
          select: () => ({
            limit: () => Promise.resolve({ data: CITY_ROWS, error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            not: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    },
  },
}));

describe('city slug round-trip', () => {
  it('slugifies umlauts by transliteration', () => {
    expect(slugify('München')).toBe('muenchen');
    expect(slugify('Köln')).toBe('koeln');
  });

  it('resolves every seeded city back from its own slug', async () => {
    const { findCityBySlug } = await import('@/lib/city-slug');

    for (const { city_name } of CITY_ROWS) {
      await expect(findCityBySlug(slugify(city_name))).resolves.toBe(city_name);
    }
  });

  it('resolves muenchen back to München', async () => {
    const { findCityBySlug } = await import('@/lib/city-slug');
    await expect(findCityBySlug('muenchen')).resolves.toBe('München');
  });

  it('returns null for a slug that matches no city', async () => {
    const { findCityBySlug } = await import('@/lib/city-slug');
    await expect(findCityBySlug('atlantis')).resolves.toBeNull();
  });

  it('round-trips the canonical URL slug back to the city name', async () => {
    const { findCityBySlug } = await import('@/lib/city-slug');
    const canonical = generateFoodCityCanonicalUrl('München', 'https://ummahflow.com');
    const slug = canonical.split('/food/')[1];

    expect(slug).toBe('muenchen');
    await expect(findCityBySlug(slug)).resolves.toBe('München');
  });
});
