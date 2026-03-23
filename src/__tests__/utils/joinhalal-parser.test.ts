/**
 * Unit tests for JoinHalal HTML parser utilities.
 * Tests are written FIRST (TDD Red → Green → Refactor).
 *
 * These functions are pure (no network, no Supabase) and are exercised
 * via vitest with jsdom environment.
 */

import { describe, it, expect } from 'vitest';
import {
  extractSchemaOrgFromHtml,
  extractDisplayNameFromHtml,
  parseGermanAddress,
  extractInstagramFromSameAs,
  cleanProviderName,
  extractUrlsFromSitemapXml,
  extractCategoryFromUrl,
  extractSpeisen,
  extractJoinHalalPostId,
  isJoinHalalDetailUrl,
  hasAlkoholverkauf,
} from '@/utils/joinhalal-parser';

// ---------------------------------------------------------------------------
// Fixtures — representative raw HTML fragments from joinhalal.com
// ---------------------------------------------------------------------------

const RESTAURANT_SCHEMA_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Restaurant',
      name: 'Etem Burger &amp; Steak | München in München - joinhalal | Finde Halal Spots',
      description: 'Entdecke Etem Burger &amp; Steak...',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Preußenstraße 5, 80809 München, Deutschland',
        addressLocality: 'München',
        addressCountry: 'DE',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '48.18423',
        longitude: '11.55425',
      },
      url: 'https://www.etem-augsburg.de/',
      email: 'etem@example.de',
      sameAs:
        'https://www.instagram.com/etem_kasapgrill/, https://www.facebook.com/EtemGrill',
      additionalProperty: [],
      mainEntityOfPage: {
        '@id': 'https://joinhalal.com/locations/restaurant/etem-burger-steak-muenchen-24043/#webpage',
      },
    },
    {
      '@type': 'Organization',
      name: 'joinhalal',
      email: 'info@joinhalal.com',
    },
  ],
});

const VALID_HTML_WITH_SCHEMA = `<!DOCTYPE html><html><head>
<script type="application/ld+json" class="rank-math-schema-pro">${RESTAURANT_SCHEMA_JSON}</script>
<script type="text/json" class="vxconfig">{"current_post":{"exists":true,"id":24043,"display_name":"Etem Burger &amp; Steak | München"}}</script>
</head><body></body></html>`;

const HTML_WITHOUT_SCHEMA = `<!DOCTYPE html><html><head><title>No schema</title></head><body></body></html>`;

const METZGEREI_SCHEMA_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FoodEstablishment',
      name: "Josef's Biofleisch in Frankfurt am Main - joinhalal | Finde Halal Spots",
      description: 'Entdecke Josef...',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Berger Str. 222, 60385 Frankfurt am Main-Bornheim/Ostend, Deutschland',
        addressLocality: 'Frankfurt am Main',
        addressCountry: 'DE',
      },
      url: 'https://josefsbio.de/',
      email: 'info@josefsbio.de',
      sameAs:
        'https://www.instagram.com/josefsbio/, https://www.facebook.com/Josefs, https://www.youtube.com/c/JosefsBio',
    },
    {
      '@type': 'Organization',
      email: 'info@joinhalal.com',
    },
  ],
});

// ---------------------------------------------------------------------------
// extractSchemaOrgFromHtml
// ---------------------------------------------------------------------------

describe('extractSchemaOrgFromHtml', () => {
  it('returns the first @graph entry from valid rank-math-schema-pro script', () => {
    const result = extractSchemaOrgFromHtml(VALID_HTML_WITH_SCHEMA);
    expect(result).not.toBeNull();
    expect(result?.['@type']).toBe('Restaurant');
  });

  it('returns null when no rank-math-schema-pro script is present', () => {
    const result = extractSchemaOrgFromHtml(HTML_WITHOUT_SCHEMA);
    expect(result).toBeNull();
  });

  it('extracts email field when present in schema', () => {
    const result = extractSchemaOrgFromHtml(VALID_HTML_WITH_SCHEMA);
    expect(result?.email).toBe('etem@example.de');
  });

  it('extracts address object from schema', () => {
    const result = extractSchemaOrgFromHtml(VALID_HTML_WITH_SCHEMA);
    expect(result?.address?.streetAddress).toBe('Preußenstraße 5, 80809 München, Deutschland');
    expect(result?.address?.addressLocality).toBe('München');
  });

  it('does NOT return the Organization node (index 1)', () => {
    // The Organization node is joinhalal's own info — we want the business
    const result = extractSchemaOrgFromHtml(VALID_HTML_WITH_SCHEMA);
    expect(result?.name).not.toContain('joinhalal.com');
  });

  it('handles FoodEstablishment @type correctly', () => {
    const html = `<head><script type="application/ld+json" class="rank-math-schema-pro">${METZGEREI_SCHEMA_JSON}</script></head>`;
    const result = extractSchemaOrgFromHtml(html);
    expect(result?.['@type']).toBe('FoodEstablishment');
  });
});

// ---------------------------------------------------------------------------
// extractDisplayNameFromHtml
// ---------------------------------------------------------------------------

describe('extractDisplayNameFromHtml', () => {
  it('extracts display_name from vxconfig JSON', () => {
    const result = extractDisplayNameFromHtml(VALID_HTML_WITH_SCHEMA);
    expect(result).toBe('Etem Burger & Steak | München');
  });

  it('returns null when vxconfig script is absent', () => {
    const result = extractDisplayNameFromHtml(HTML_WITHOUT_SCHEMA);
    expect(result).toBeNull();
  });

  it('decodes HTML entities in display_name', () => {
    const html = `<script type="text/json" class="vxconfig">{"current_post":{"display_name":"Caf\u00e9 &amp; Bistro"}}</script>`;
    const result = extractDisplayNameFromHtml(html);
    expect(result).toBe('Café & Bistro');
  });
});

// ---------------------------------------------------------------------------
// parseGermanAddress
// ---------------------------------------------------------------------------

describe('parseGermanAddress', () => {
  it('parses standard German address: "Preußenstraße 5, 80809 München, Deutschland"', () => {
    const result = parseGermanAddress('Preußenstraße 5, 80809 München, Deutschland');
    expect(result.street).toBe('Preußenstraße 5');
    expect(result.zip).toBe('80809');
    expect(result.city).toBe('München');
    expect(result.country).toBe('DE');
  });

  it('parses address with district: "Berger Str. 222, 60385 Frankfurt am Main-Bornheim/Ostend, Deutschland"', () => {
    const result = parseGermanAddress(
      'Berger Str. 222, 60385 Frankfurt am Main-Bornheim/Ostend, Deutschland'
    );
    expect(result.street).toBe('Berger Str. 222');
    expect(result.zip).toBe('60385');
    expect(result.city).toBe('Frankfurt am Main');
  });

  it('parses address with multi-part city suffix: "Zollernstraße 9, 86154 Augsburg, Augsburg-Oberhausen, Deutschland"', () => {
    const result = parseGermanAddress(
      'Zollernstraße 9, 86154 Augsburg, Augsburg-Oberhausen, Deutschland'
    );
    expect(result.street).toBe('Zollernstraße 9');
    expect(result.zip).toBe('86154');
    expect(result.city).toBe('Augsburg');
  });

  it('returns null fields for unparseable address', () => {
    const result = parseGermanAddress('');
    expect(result.street).toBeNull();
    expect(result.zip).toBeNull();
    expect(result.city).toBeNull();
  });

  it('handles address without Deutschland suffix', () => {
    const result = parseGermanAddress('Musterstraße 1, 10117 Berlin');
    expect(result.street).toBe('Musterstraße 1');
    expect(result.zip).toBe('10117');
    expect(result.city).toBe('Berlin');
  });
});

// ---------------------------------------------------------------------------
// extractInstagramFromSameAs
// ---------------------------------------------------------------------------

describe('extractInstagramFromSameAs', () => {
  it('extracts first instagram URL from comma-separated string', () => {
    const result = extractInstagramFromSameAs(
      'https://www.instagram.com/etem_kasapgrill/, https://www.facebook.com/EtemGrill'
    );
    expect(result).toBe('https://www.instagram.com/etem_kasapgrill/');
  });

  it('returns null when no instagram URL is present', () => {
    const result = extractInstagramFromSameAs(
      'https://www.facebook.com/EtemGrill, https://www.tiktok.com/@foo'
    );
    expect(result).toBeNull();
  });

  it('handles array input', () => {
    const result = extractInstagramFromSameAs([
      'https://www.facebook.com/foo',
      'https://www.instagram.com/bar/',
    ]);
    expect(result).toBe('https://www.instagram.com/bar/');
  });

  it('returns null for empty string', () => {
    expect(extractInstagramFromSameAs('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cleanProviderName
// ---------------------------------------------------------------------------

describe('cleanProviderName', () => {
  it('uses display_name when available (cleanest source)', () => {
    const result = cleanProviderName(
      'Etem Burger &amp; Steak | München in München - joinhalal | Finde Halal Spots',
      'Etem Burger & Steak | München'
    );
    expect(result).toBe('Etem Burger & Steak | München');
  });

  it('strips joinhalal suffix from schema name when display_name is null', () => {
    const result = cleanProviderName(
      'ECHTE BÄRLINER | Augsburg Oberhausen in Augsburg - joinhalal | Finde Halal Spots',
      null
    );
    expect(result).toBe('ECHTE BÄRLINER | Augsburg Oberhausen');
  });

  it('decodes HTML entities in schema name fallback', () => {
    const result = cleanProviderName(
      "Josef&#039;s Biofleisch in Frankfurt am Main - joinhalal | Finde Halal Spots",
      null
    );
    expect(result).toBe("Josef's Biofleisch");
  });

  it('trims resulting name', () => {
    const result = cleanProviderName('  My Restaurant  in Berlin - joinhalal | foo  ', null);
    expect(result).toBe('My Restaurant');
  });
});

// ---------------------------------------------------------------------------
// extractUrlsFromSitemapXml
// ---------------------------------------------------------------------------

describe('extractUrlsFromSitemapXml', () => {
  const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://joinhalal.com/locations/restaurant/foo-bar-123/</loc></url>
  <url><loc>https://joinhalal.com/locations/food-truck/baz-qux-456/</loc></url>
  <url><loc>https://joinhalal.com/locations/metzgerei/meat-shop-789/</loc></url>
</urlset>`;

  it('extracts all <loc> URLs from sitemap XML', () => {
    const urls = extractUrlsFromSitemapXml(SITEMAP_XML);
    expect(urls).toHaveLength(3);
    expect(urls[0]).toBe('https://joinhalal.com/locations/restaurant/foo-bar-123/');
    expect(urls[2]).toBe('https://joinhalal.com/locations/metzgerei/meat-shop-789/');
  });

  it('returns empty array for empty XML', () => {
    expect(extractUrlsFromSitemapXml('')).toEqual([]);
  });

  it('returns empty array for XML with no loc elements', () => {
    expect(extractUrlsFromSitemapXml('<urlset></urlset>')).toEqual([]);
  });

  it('[post-fix PASSES] excludes non-detail URLs like /locations/ from extraction', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://joinhalal.com/locations/</loc></url>
  <url><loc>https://joinhalal.com/locations/restaurant/</loc></url>
  <url><loc>https://joinhalal.com/locations/restaurant/foo-bar-123/</loc></url>
  <url><loc>https://joinhalal.com/locations/food-truck/baz-qux-456/</loc></url>
</urlset>`;
    const urls = extractUrlsFromSitemapXml(xml);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://joinhalal.com/locations/restaurant/foo-bar-123/');
    expect(urls[1]).toBe('https://joinhalal.com/locations/food-truck/baz-qux-456/');
  });
});

// ---------------------------------------------------------------------------
// isJoinHalalDetailUrl
// ---------------------------------------------------------------------------

describe('isJoinHalalDetailUrl', () => {
  it('accepts a standard detail page URL', () => {
    expect(isJoinHalalDetailUrl('https://joinhalal.com/locations/restaurant/echte-baerliner-augsburg-oberhausen-26548/')).toBe(true);
  });

  it('accepts a detail page with different category', () => {
    expect(isJoinHalalDetailUrl('https://joinhalal.com/locations/food-truck/some-name-999/')).toBe(true);
  });

  it('[pre-fix FAILS] rejects the generic /locations/ listing page', () => {
    expect(isJoinHalalDetailUrl('https://joinhalal.com/locations/')).toBe(false);
  });

  it('rejects a category listing page like /locations/restaurant/', () => {
    expect(isJoinHalalDetailUrl('https://joinhalal.com/locations/restaurant/')).toBe(false);
  });

  it('rejects non-location URLs from the same domain', () => {
    expect(isJoinHalalDetailUrl('https://joinhalal.com/about/')).toBe(false);
    expect(isJoinHalalDetailUrl('https://joinhalal.com/')).toBe(false);
  });

  it('rejects empty or invalid input', () => {
    expect(isJoinHalalDetailUrl('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractCategoryFromUrl
// ---------------------------------------------------------------------------

describe('extractCategoryFromUrl', () => {
  it('extracts category slug from locations URL', () => {
    expect(
      extractCategoryFromUrl('https://joinhalal.com/locations/restaurant/foo-123/')
    ).toBe('restaurant');
    expect(
      extractCategoryFromUrl('https://joinhalal.com/locations/food-truck/bar-456/')
    ).toBe('food-truck');
    expect(
      extractCategoryFromUrl('https://joinhalal.com/locations/metzgerei/shop-789/')
    ).toBe('metzgerei');
  });

  it('returns null for unexpected URL format', () => {
    expect(extractCategoryFromUrl('https://joinhalal.com/other/path/')).toBeNull();
    expect(extractCategoryFromUrl('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractSpeisen (Plan 051)
// ---------------------------------------------------------------------------

describe('extractSpeisen', () => {
  it('extracts comma-separated Speisen values from additionalProperty', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen', value: 'Döner, Falafel, Pommes' },
      ],
    });
    expect(result).toEqual(['Döner', 'Falafel', 'Pommes']);
  });

  it('returns empty array when additionalProperty is undefined', () => {
    expect(extractSpeisen({})).toEqual([]);
  });

  it('returns empty array when additionalProperty is empty', () => {
    expect(extractSpeisen({ additionalProperty: [] })).toEqual([]);
  });

  it('returns empty array when no Speisen entry exists in additionalProperty', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Küche', value: 'Türkisch' },
      ],
    });
    expect(result).toEqual([]);
  });

  it('returns empty array when Speisen value is empty string', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen', value: '' },
      ],
    });
    expect(result).toEqual([]);
  });

  it('deduplicates repeated Speisen values', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen', value: 'Burger, Burger, Döner' },
      ],
    });
    expect(result).toEqual(['Burger', 'Döner']);
  });

  it('handles single Speisen value (no comma)', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen', value: 'Döner' },
      ],
    });
    expect(result).toEqual(['Döner']);
  });

  it('trims whitespace from individual Speisen values', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen', value: '  Burger , Döner  , Falafel  ' },
      ],
    });
    expect(result).toEqual(['Burger', 'Döner', 'Falafel']);
  });

  it('filters out empty strings after splitting', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen', value: 'Burger,, ,Döner' },
      ],
    });
    expect(result).toEqual(['Burger', 'Döner']);
  });

  it('returns empty array when Speisen value is undefined', () => {
    const result = extractSpeisen({
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Speisen' },
      ],
    });
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractJoinHalalPostId (Plan 052)
// ---------------------------------------------------------------------------

// Multi-block vxconfig fixture matching real JoinHalal page structure (Plan 053).
// Real pages have 3 vxconfig blocks: blocks 0+1 are search/filter configs
// without current_post; block 2 is the timeline config WITH current_post.
const MULTI_BLOCK_VXCONFIG_HTML = `<!DOCTYPE html><html><head>
<script type="application/ld+json" class="rank-math-schema-pro">${RESTAURANT_SCHEMA_JSON}</script>
<script type="text/json" class="vxconfig">{"post_types":["listing"],"display_mode":"form","keywords":"","single_mode":false}</script>
<script type="text/json" class="vxconfig">{"post_types":["listing"],"display_mode":"results","keywords":"restaurant"}</script>
<script type="text/json" class="vxconfig">{"timeline":true,"current_post":{"exists":true,"id":26548,"display_name":"ECHTE B\u00c4RLINER | Augsburg Oberhausen"}}</script>
</head><body></body></html>`;

describe('extractJoinHalalPostId', () => {
  it('extracts post ID from vxconfig script tag', () => {
    expect(extractJoinHalalPostId(VALID_HTML_WITH_SCHEMA)).toBe('24043');
  });

  it('returns null when vxconfig script tag is absent', () => {
    expect(extractJoinHalalPostId(HTML_WITHOUT_SCHEMA)).toBeNull();
  });

  it('returns null when current_post.id is missing', () => {
    const html = `<script type="text/json" class="vxconfig">{"current_post":{"display_name":"Test"}}</script>`;
    expect(extractJoinHalalPostId(html)).toBeNull();
  });

  it('converts numeric id to string', () => {
    const html = `<script type="text/json" class="vxconfig">{"current_post":{"id":99999}}</script>`;
    expect(extractJoinHalalPostId(html)).toBe('99999');
  });

  it('returns null for non-numeric id values', () => {
    const html = `<script type="text/json" class="vxconfig">{"current_post":{"id":null}}</script>`;
    expect(extractJoinHalalPostId(html)).toBeNull();
  });

  it('returns null for empty HTML', () => {
    expect(extractJoinHalalPostId('')).toBeNull();
  });

  // Plan 053 regression: real pages have multiple vxconfig blocks,
  // only the last one contains current_post
  it('extracts post ID from third vxconfig block when first two lack current_post [post-fix PASSES]', () => {
    expect(extractJoinHalalPostId(MULTI_BLOCK_VXCONFIG_HTML)).toBe('26548');
  });
});

// ---------------------------------------------------------------------------
// extractDisplayNameFromHtml — multi-block regression (Plan 053)
// ---------------------------------------------------------------------------

describe('extractDisplayNameFromHtml — multi-block vxconfig', () => {
  it('extracts display_name from the correct vxconfig block [post-fix PASSES]', () => {
    const result = extractDisplayNameFromHtml(MULTI_BLOCK_VXCONFIG_HTML);
    expect(result).toBe('ECHTE BÄRLINER | Augsburg Oberhausen');
  });
});

// ---------------------------------------------------------------------------
// hasAlkoholverkauf (Plan 051)
// ---------------------------------------------------------------------------

describe('hasAlkoholverkauf', () => {
  it('returns true when additionalProperty contains Halal Merkmale with Alkoholverkauf', () => {
    expect(
      hasAlkoholverkauf({
        additionalProperty: [{ name: 'Halal Merkmale', value: 'Alkoholverkauf' }],
      })
    ).toBe(true);
  });

  it('returns true when Alkoholverkauf is one of multiple comma-separated values', () => {
    expect(
      hasAlkoholverkauf({
        additionalProperty: [
          { name: 'Halal Merkmale', value: 'Handgeschächtet, Alkoholverkauf, Lieferung' },
        ],
      })
    ).toBe(true);
  });

  it('returns false when Halal Merkmale does not contain Alkoholverkauf', () => {
    expect(
      hasAlkoholverkauf({
        additionalProperty: [
          { name: 'Halal Merkmale', value: 'Handgeschächtet, Lieferung' },
        ],
      })
    ).toBe(false);
  });

  it('returns false when additionalProperty is an empty array', () => {
    expect(hasAlkoholverkauf({ additionalProperty: [] })).toBe(false);
  });

  it('returns false when additionalProperty is undefined', () => {
    expect(hasAlkoholverkauf({})).toBe(false);
  });

  it('returns false when Halal Merkmale property is absent (other props present)', () => {
    expect(
      hasAlkoholverkauf({
        additionalProperty: [{ name: 'Speisen', value: 'Burger, Pizza' }],
      })
    ).toBe(false);
  });

  it('matches Alkoholverkauf case-insensitively', () => {
    expect(
      hasAlkoholverkauf({
        additionalProperty: [{ name: 'Halal Merkmale', value: 'alkoholverkauf' }],
      })
    ).toBe(true);
  });

  it('handles whitespace around token values', () => {
    expect(
      hasAlkoholverkauf({
        additionalProperty: [
          { name: 'Halal Merkmale', value: '  Alkoholverkauf  ' },
        ],
      })
    ).toBe(true);
  });
});
