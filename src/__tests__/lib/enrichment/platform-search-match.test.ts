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
});
