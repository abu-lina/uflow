import { describe, expect, it } from 'vitest';

import { parseDiscoveryQuery, parseDiscoveryQueryForRoute } from '../discoveryQuery';

describe('Discovery Query module', () => {
  describe('free text (q)', () => {
    it('returns no free text when q is absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.q).toBe('');
    });

    it('returns the value when q=kebab', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('q=kebab'));
      expect(result.q).toBe('kebab');
    });

    it('takes the first value for repeated q params', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('q=a&q=b'));
      expect(result.q).toBe('a');
    });
  });

  describe('category', () => {
    it('returns no category when absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.category).toBeNull();
    });

    it('returns no category when empty', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('category='));
      expect(result.category).toBeNull();
    });

    it('returns the value as given', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('category=some-uuid'));
      expect(result.category).toBe('some-uuid');
    });
  });

  describe('location (city)', () => {
    it('returns all cities when location is absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.location).toBe('');
    });

    it('returns all cities when location is empty', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location='));
      expect(result.location).toBe('');
    });

    it('returns Everywhere as a literal city name', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=Everywhere'));
      expect(result.location).toBe('Everywhere');
    });

    it('returns Überall as a literal city name', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=%C3%9Cberall'));
      expect(result.location).toBe('Überall');
    });

    it('returns a real city name as given', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=Berlin'));
      expect(result.location).toBe('Berlin');
    });
  });

  describe('path-resolved city overrides query location', () => {
    it('uses the path city regardless of query location', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=Hamburg'), {
        city: 'Berlin',
      });
      expect(result.location).toBe('Berlin');
    });
  });

  describe('path-resolved category overrides query category', () => {
    it('uses the path category regardless of query category', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('category=from-query'), {
        category: 'from-path',
      });
      expect(result.category).toBe('from-path');
    });
  });

  describe('filters', () => {
    it('returns muslim and parken from valid mixed input', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('filters=muslim,notakey, parken'));
      expect(result.filters).toEqual(['muslim', 'parken']);
    });

    it('returns undefined when no known keys remain', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('filters=notakey,bogus'));
      expect(result.filters).toBeUndefined();
    });

    it('returns undefined when filters param is absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.filters).toBeUndefined();
    });
  });

  describe('section (Listing Type) for the page reader', () => {
    it('falls back to food when an inactive Listing Type is passed', () => {
      const result = parseDiscoveryQuery(new URLSearchParams(), {
        section: 'store',
      });
      expect(result.section).toBe('food');
    });

    it('keeps an active Listing Type', () => {
      const result = parseDiscoveryQuery(new URLSearchParams(), {
        section: 'food',
      });
      expect(result.section).toBe('food');
    });
  });

  describe('section for the JSON route reader (parseDiscoveryQueryForRoute)', () => {
    it('returns undefined for section=business', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=business'));
      expect(result.section).toBeUndefined();
    });

    it('returns undefined for unknown section values', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=unknown'));
      expect(result.section).toBeUndefined();
    });

    it('returns food for section=food', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=food'));
      expect(result.section).toBe('food');
    });

    it('returns ummah for section=ummah', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=ummah'));
      expect(result.section).toBe('ummah');
    });

    it('returns store for section=store', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=store'));
      expect(result.section).toBe('store');
    });
  });

  describe('status for the JSON route reader', () => {
    it.each(['approved', 'pending', 'rejected', 'needs_revision', 'all'] as const)(
      'accepts %s as a valid status',
      (status) => {
        const result = parseDiscoveryQueryForRoute(new URLSearchParams(`status=${status}`));
        expect(result.status).toBe(status);
      },
    );

    it('returns an error result for invalid status values', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('status=invalid'));
      expect(result.statusError).toBeTruthy();
    });

    it('returns no status when absent', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams());
      expect(result.status).toBeUndefined();
      expect(result.statusError).toBeUndefined();
    });
  });
});
