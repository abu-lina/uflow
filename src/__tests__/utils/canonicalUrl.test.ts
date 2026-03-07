/**
 * Canonical URL Utility Tests (Plan 035 — M2)
 *
 * TDD tests for UTM-stripping and city canonical URL generation.
 * ADR-005: UTMs must not create duplicate crawlable URLs; canonicals strip query strings.
 * Tests written BEFORE implementation (RED phase).
 */

import { describe, it, expect } from 'vitest';

// These imports will fail initially (TDD RED phase — module doesn't exist yet)
import { stripUtmParams, generateCityCanonicalUrl } from '@/utils/canonicalUrl';

describe('stripUtmParams', () => {
  it('removes utm_source, utm_medium, utm_campaign from a URL', () => {
    const url =
      'https://ummahflow.com/city/Stuttgart?utm_source=referral&utm_medium=invite&utm_campaign=city-builder';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/city/Stuttgart');
  });

  it('removes utm_term and utm_content', () => {
    const url = 'https://ummahflow.com/city/Berlin?utm_term=test&utm_content=hero';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/city/Berlin');
  });

  it('preserves non-UTM query parameters', () => {
    const url = 'https://ummahflow.com/search?q=halal&utm_source=google';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/search?q=halal');
  });

  it('returns URL unchanged when no UTM params present', () => {
    const url = 'https://ummahflow.com/city/Frankfurt';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/city/Frankfurt');
  });

  it('returns URL unchanged when no query params at all', () => {
    const url = 'https://ummahflow.com/';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/');
  });

  it('handles URLs with only UTM params (removes ? entirely)', () => {
    const url = 'https://ummahflow.com/city/Stuttgart?utm_source=social';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/city/Stuttgart');
  });

  it('is case-insensitive for utm_ prefix', () => {
    const url = 'https://ummahflow.com/city/Berlin?UTM_SOURCE=test&UTM_MEDIUM=email';
    expect(stripUtmParams(url)).toBe('https://ummahflow.com/city/Berlin');
  });
});

describe('generateCityCanonicalUrl', () => {
  const siteUrl = 'https://ummahflow.com';

  it('generates canonical URL for a city', () => {
    expect(generateCityCanonicalUrl('Stuttgart', siteUrl)).toBe(
      'https://ummahflow.com/city/Stuttgart',
    );
  });

  it('encodes city names with special characters', () => {
    expect(generateCityCanonicalUrl('München', siteUrl)).toBe(
      'https://ummahflow.com/city/M%C3%BCnchen',
    );
  });

  it('trims whitespace from city name', () => {
    expect(generateCityCanonicalUrl('  Berlin  ', siteUrl)).toBe(
      'https://ummahflow.com/city/Berlin',
    );
  });

  it('strips trailing slash from siteUrl', () => {
    expect(generateCityCanonicalUrl('Frankfurt', 'https://ummahflow.com/')).toBe(
      'https://ummahflow.com/city/Frankfurt',
    );
  });
});
