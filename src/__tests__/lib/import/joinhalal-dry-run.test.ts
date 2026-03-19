/**
 * Regression tests for runJoinHalalDryRun — QA-1 and QA-2 fixes.
 *
 * QA-1: wouldInsert was computed as `parsed - skipped - unmapped`, which
 *        double-subtracts when a record is both unmapped AND duplicate.
 * QA-2: CLI/shared-core alignment — the shared module's result contract
 *        is the single source of truth for both CLI and API dry-run paths.
 *
 * These tests exercise runJoinHalalDryRun with mocked fetch + Supabase to
 * verify the counting logic without network or database access.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { runJoinHalalDryRun, type DryRunResult } from '@/lib/import/joinhalal';

// ---------------------------------------------------------------------------
// Test HTML fixtures
// ---------------------------------------------------------------------------

/** Minimal Schema.org JSON-LD that the parser can extract */
function makePageHtml(name: string, streetAddress: string): string {
  const schema = {
    '@graph': [
      {
        '@type': 'Restaurant',
        name,
        address: {
          '@type': 'PostalAddress',
          streetAddress,
          addressCountry: 'DE',
        },
      },
    ],
  };
  return `<html><head>
    <script type="application/ld+json" class="rank-math-schema-pro">${JSON.stringify(schema)}</script>
    </head><body><h1>${name}</h1></body></html>`;
}

/** Minimal sitemap XML returning the given URLs */
function makeSitemapXml(urls: string[]): string {
  const entries = urls.map((u) => `<url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
}

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

function createMockSupabase(existingProviders: { provider_name: string; address_city: string | null }[]) {
  const selectMock = vi.fn();

  const fromMock = vi.fn((table: string) => {
    if (table === 'categories') {
      return {
        select: () => ({
          order: () =>
            Promise.resolve({
              data: [
                { category_id: 'cat-001', name_de: 'Restaurant' },
                { category_id: 'cat-002', name_de: 'Metzgerei' },
                { category_id: 'cat-003', name_de: 'Café' },
                { category_id: 'cat-004', name_de: 'Imbiss' },
              ],
              error: null,
            }),
        }),
      };
    }

    if (table === 'providers') {
      // First call: checkProviderDescriptionExists (select provider_description limit 1)
      // Subsequent calls: loadExistingProviderKeys (select provider_name, address_city with range)
      selectMock.mockReturnValueOnce({
        limit: () => Promise.resolve({ data: [], error: null }),
      });
      selectMock.mockReturnValueOnce({
        range: () =>
          Promise.resolve({
            data: existingProviders,
            error: null,
          }),
      });
      return { select: selectMock };
    }

    return { select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) };
  });

  return { from: fromMock } as unknown as Parameters<typeof runJoinHalalDryRun>[0]['supabase'];
}

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;

function setupFetchMock(
  sitemapXml: string,
  pageHtmlByUrl: Record<string, string>
) {
  global.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Sitemap request
    if (url.includes('sitemap')) {
      return {
        ok: true,
        status: 200,
        text: async () => sitemapXml,
      } as Response;
    }

    // Page request
    const html = pageHtmlByUrl[url];
    if (html) {
      return {
        ok: true,
        status: 200,
        text: async () => html,
      } as Response;
    }

    return { ok: false, status: 404, text: async () => '' } as Response;
  }) as typeof global.fetch;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runJoinHalalDryRun — wouldInsert correctness', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('[QA-1 regression] does NOT double-subtract when a record is both unmapped AND duplicate', async () => {
    // Record 1: "pizza" slug → unmapped, and "Pizza Roma|berlin" already in DB → duplicate
    // Record 2: "restaurant" slug → mapped, "Good Food|berlin" NOT in DB → would insert
    const pageUrls = [
      'https://joinhalal.com/locations/pizza/pizza-roma-berlin/',
      'https://joinhalal.com/locations/restaurant/good-food-berlin/',
    ];
    const sitemapXml = makeSitemapXml(pageUrls);

    const pageHtml: Record<string, string> = {
      [pageUrls[0]]: makePageHtml('Pizza Roma', 'Hauptstraße 1, 10115 Berlin, Deutschland'),
      [pageUrls[1]]: makePageHtml('Good Food', 'Berliner Str. 5, 10115 Berlin, Deutschland'),
    };

    setupFetchMock(sitemapXml, pageHtml);

    // "pizza roma|berlin" is already in the DB → duplicate
    const supabase = createMockSupabase([
      { provider_name: 'Pizza Roma', address_city: 'Berlin' },
    ]);

    const result: DryRunResult = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.total).toBe(2);
    expect(result.stats.parsed).toBe(2);
    expect(result.stats.unmapped).toBe(1); // Pizza Roma has "pizza" slug → unmapped
    expect(result.stats.skipped).toBe(1); // Pizza Roma is duplicate
    expect(result.stats.mapped).toBe(1);  // Good Food has "restaurant" slug → mapped

    // The critical assertion: wouldInsert must be 1 (only Good Food),
    // NOT -1 (the old bug: 2 - 1 - 1 = 0 was also wrong) or 0.
    expect(result.stats.wouldInsert).toBe(1);
    expect(result.stats.wouldInsert).toBeGreaterThanOrEqual(0); // must never be negative
  });

  it('[QA-1 regression] wouldInsert is never negative even with all-unmapped all-duplicate data', async () => {
    // Single record: unmapped AND duplicate
    const pageUrl = 'https://joinhalal.com/locations/pizza/pizza-roma-berlin/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtml('Pizza Roma', 'Hauptstraße 1, 10115 Berlin, Deutschland'),
    });

    const supabase = createMockSupabase([
      { provider_name: 'Pizza Roma', address_city: 'Berlin' },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.parsed).toBe(1);
    expect(result.stats.unmapped).toBe(1);
    expect(result.stats.skipped).toBe(1);
    // Old bug: 1 - 1 - 1 = -1. Correct: 0
    expect(result.stats.wouldInsert).toBe(0);
    expect(result.stats.wouldInsert).toBeGreaterThanOrEqual(0);
  });

  it('wouldInsert counts unmapped non-duplicate records as insertable (matches CLI write behavior)', async () => {
    // Record with "pizza" slug → unmapped but NOT a duplicate
    // The CLI write path DOES insert unmapped records (with null category_id)
    const pageUrl = 'https://joinhalal.com/locations/pizza/pizza-roma-berlin/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtml('Pizza Roma', 'Hauptstraße 1, 10115 Berlin, Deutschland'),
    });

    // No existing providers → not a duplicate
    const supabase = createMockSupabase([]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.parsed).toBe(1);
    expect(result.stats.unmapped).toBe(1);
    expect(result.stats.skipped).toBe(0);
    // Unmapped but not duplicate → WOULD be inserted (CLI writes these with null category_id)
    expect(result.stats.wouldInsert).toBe(1);
  });

  it('[QA-2] DryRunResult contract matches expected shape for both CLI and API consumers', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/test-place/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtml('Test Place', 'Berliner Str. 5, 10115 Berlin, Deutschland'),
    });

    const supabase = createMockSupabase([]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    // Verify DryRunResult has all required fields for both consumers
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('unmappedGroups');
    expect(result).toHaveProperty('samples');

    // Stats has the full shape
    expect(result.stats).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        parsed: expect.any(Number),
        mapped: expect.any(Number),
        unmapped: expect.any(Number),
        skipped: expect.any(Number),
        failed: expect.any(Number),
        wouldInsert: expect.any(Number),
      })
    );

    // Samples shape
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.samples[0]).toEqual(
      expect.objectContaining({
        provider_name: expect.any(String),
        address_city: expect.any(String),
        category_id: expect.any(String),
      })
    );

    // Invariant: wouldInsert = parsed - skipped (all non-duplicate parsed records)
    expect(result.stats.wouldInsert).toBe(result.stats.parsed - result.stats.skipped);
  });
});
