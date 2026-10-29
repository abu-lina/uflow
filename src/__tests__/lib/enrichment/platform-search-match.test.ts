import { describe, expect, it } from 'vitest';

import {
  matchVenueToProvider,
  type SearchProvider,
  type SearchVenue,
} from '@/lib/enrichment/platform-search-match';

const provider: SearchProvider = {
  name: 'Bistro Salam',
  street: 'Hauptstraße 12',
  zip: '10115',
  city: 'Berlin',
};

const venue = (over: Partial<SearchVenue> = {}): SearchVenue => ({
  name: 'Bistro Salam',
  address: 'Hauptstraße 12, 10115 Berlin',
  city: 'Berlin',
  ...over,
});

describe('platform search matching (#807, criterion 2)', () => {
  describe('match', () => {
    it('accepts the same name, street and city', () => {
      expect(matchVenueToProvider(provider, venue())).toBe('match');
    });

    it('accepts a name with a legal suffix and different casing', () => {
      expect(matchVenueToProvider(provider, venue({ name: 'BISTRO SALAM Restaurant' }))).toBe(
        'match',
      );
    });

    it('accepts an abbreviated street spelling', () => {
      expect(matchVenueToProvider(provider, venue({ address: 'Hauptstr. 12, 10115 Berlin' }))).toBe(
        'match',
      );
    });
  });

  describe('stage for review (auto-write needs street, house number and zip)', () => {
    it('stages a zip-only venue address', () => {
      expect(matchVenueToProvider(provider, venue({ address: '10115 Berlin' }))).toBe('ambiguous');
    });

    it('stages a street and house number match without a zip', () => {
      expect(matchVenueToProvider(provider, venue({ address: 'Hauptstraße 12' }))).toBe(
        'ambiguous',
      );
    });

    it('stages a street and house number match with a different zip', () => {
      expect(
        matchVenueToProvider(provider, venue({ address: 'Hauptstraße 12, 10999 Berlin' })),
      ).toBe('ambiguous');
    });

    it('stages when the provider has no zip to confirm', () => {
      expect(matchVenueToProvider({ ...provider, zip: null }, venue())).toBe('ambiguous');
    });

    it('stages when the provider has no house number to confirm', () => {
      expect(matchVenueToProvider({ ...provider, street: 'Hauptstraße' }, venue())).toBe(
        'ambiguous',
      );
    });
  });

  describe('near-miss', () => {
    it('rejects the same city with a different street and zip', () => {
      expect(matchVenueToProvider(provider, venue({ address: 'Nebenweg 3, 10999 Berlin' }))).toBe(
        'no_match',
      );
    });

    it('rejects an unrelated name at the same address', () => {
      expect(matchVenueToProvider(provider, venue({ name: 'Pizza Roma' }))).toBe('no_match');
    });

    it('rejects the same street with a different house number and zip', () => {
      expect(
        matchVenueToProvider(provider, venue({ address: 'Hauptstraße 99, 10999 Berlin' })),
      ).toBe('no_match');
    });

    it('rejects the same zip with a different street', () => {
      expect(matchVenueToProvider(provider, venue({ address: 'Nebenweg 3, 10115 Berlin' }))).toBe(
        'no_match',
      );
    });

    it('rejects a provider street without a house number matching any house number', () => {
      expect(
        matchVenueToProvider(
          { ...provider, street: 'Hauptstraße', zip: '10555' },
          venue({ address: 'Hauptstraße 99, 10999 Berlin' }),
        ),
      ).toBe('no_match');
    });

    it('rejects the same street with a different house number suffix', () => {
      expect(
        matchVenueToProvider(
          { ...provider, street: 'Hauptstraße 5a' },
          venue({ address: 'Hauptstraße 5b, 10115 Berlin' }),
        ),
      ).toBe('no_match');
    });

    it('accepts a house number the venue lists without the suffix', () => {
      expect(
        matchVenueToProvider(
          { ...provider, street: 'Hauptstr. 5a' },
          venue({ address: 'Hauptstraße 5, 10115 Berlin' }),
        ),
      ).toBe('match');
    });

    it('marks a similar name with a matching address as ambiguous', () => {
      expect(matchVenueToProvider(provider, venue({ name: 'Bistro Salaam Grill House' }))).toBe(
        'ambiguous',
      );
    });

    it('marks an exact name with no address on the venue as ambiguous', () => {
      expect(matchVenueToProvider(provider, venue({ address: undefined }))).toBe('ambiguous');
    });
  });

  describe('wrong city', () => {
    it('rejects the same name, street and zip in another city', () => {
      expect(matchVenueToProvider(provider, venue({ city: 'Hamburg' }))).toBe('no_match');
    });

    it('rejects when the provider has no city to compare', () => {
      expect(matchVenueToProvider({ ...provider, city: null }, venue())).toBe('no_match');
    });
  });

  // Wolt venues carry a street and house number plus coordinates, but no city and no zip.
  describe('Wolt-shaped venues (street, no city, no zip, coordinates)', () => {
    const matchWolt = (p: SearchProvider, v: SearchVenue) => matchVenueToProvider(p, v, 'wolt');
    const geoProvider: SearchProvider = {
      name: 'Uncle Smash Ludwigsburg',
      street: 'Kirchstraße 26',
      zip: '71634',
      city: 'Ludwigsburg',
      latitude: 48.8988,
      longitude: 9.192,
    };
    const woltVenue = (over: Partial<SearchVenue> = {}): SearchVenue => ({
      name: 'Uncle Smash Ludwigsburg',
      address: 'Kirchstraße 26',
      city: '',
      latitude: 48.8988583,
      longitude: 9.1904087,
      ...over,
    });

    it('writes on an exact name, street and house number within 250 m of the provider', () => {
      expect(matchWolt(geoProvider, woltVenue())).toBe('match');
    });

    it('does not treat an empty venue city as a different city', () => {
      expect(matchWolt(geoProvider, woltVenue({ city: undefined }))).toBe('match');
    });

    it('rejects the same street and number when the venue is far from the provider', () => {
      expect(matchWolt(geoProvider, woltVenue({ latitude: 49.1, longitude: 9.4 }))).toBe(
        'no_match',
      );
    });

    it('stages when the venue has no coordinates to confirm the location', () => {
      expect(matchWolt(geoProvider, woltVenue({ latitude: undefined, longitude: undefined }))).toBe(
        'ambiguous',
      );
    });

    it('stages when the provider has no coordinates', () => {
      expect(matchWolt({ ...geoProvider, latitude: null, longitude: null }, woltVenue())).toBe(
        'ambiguous',
      );
    });

    it('rejects a different house number even when the venue is nearby', () => {
      expect(matchWolt(geoProvider, woltVenue({ address: 'Kirchstraße 27' }))).toBe('no_match');
    });

    it('does not let coordinates replace a zip the venue states and the provider contradicts', () => {
      expect(matchWolt(geoProvider, woltVenue({ address: 'Kirchstraße 26, 71635' }))).toBe(
        'ambiguous',
      );
    });

    it('stages a similar name with a nearby street match, never writes it', () => {
      expect(matchWolt(geoProvider, woltVenue({ name: 'Uncle Smash Burger' }))).not.toBe('match');
    });
  });
});

describe('empty venue city (#821, criterion 1)', () => {
  const noCity = venue({ city: '' });

  it('matches for a Wolt venue', () => {
    expect(matchVenueToProvider(provider, noCity, 'wolt')).toBe('match');
  });

  it.each(['lieferando', 'ubereats'])('stages instead of matching for a %s venue', (platform) => {
    expect(matchVenueToProvider(provider, noCity, platform)).toBe('ambiguous');
  });

  it('still matches a Lieferando venue that states the right city', () => {
    expect(matchVenueToProvider(provider, venue(), 'lieferando')).toBe('match');
  });
});
