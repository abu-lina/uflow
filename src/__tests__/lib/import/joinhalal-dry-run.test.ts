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
import { runJoinHalalDryRun, type DryRunResult, type DryRunTiming } from '@/lib/import/joinhalal';

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

function createMockSupabase(
  existingProviders: { provider_name: string; address_city: string | null }[],
  offersData: { offer_id: string; name_de: string }[] = []
) {
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

    if (table === 'offers') {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: offersData, error: null }),
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
    expect(result).toHaveProperty('unmappedOffers');
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
        wouldUpdate: expect.any(Number),
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

    // Invariant: wouldInsert + wouldUpdate = parsed - skipped (all non-duplicate parsed records)
    expect(result.stats.wouldInsert + result.stats.wouldUpdate).toBe(result.stats.parsed - result.stats.skipped);
  });
});

// ---------------------------------------------------------------------------
// Plan 051 — Speisen → offers_ids mapping
// ---------------------------------------------------------------------------

/** Page HTML with additionalProperty containing Speisen values */
function makePageHtmlWithSpeisen(name: string, streetAddress: string, speisen: string): string {
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
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Speisen', value: speisen },
        ],
      },
    ],
  };
  return `<html><head>
    <script type="application/ld+json" class="rank-math-schema-pro">${JSON.stringify(schema)}</script>
    </head><body><h1>${name}</h1></body></html>`;
}

describe('runJoinHalalDryRun — Speisen offers mapping (Plan 051)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('[Plan 051] resolves Speisen to offers_ids and reports unmatched', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/kebab-haus/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    // Provider has Döner (in catalog), Falafel (in catalog), Sushi (NOT in catalog)
    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtmlWithSpeisen(
        'Kebab Haus', 'Berliner Str. 5, 10115 Berlin, Deutschland', 'Döner, Falafel, Sushi'
      ),
    });

    const supabase = createMockSupabase([], [
      { offer_id: 'offer-001', name_de: 'Döner' },
      { offer_id: 'offer-002', name_de: 'Falafel' },
      { offer_id: 'offer-003', name_de: 'Burger' },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    // Unmapped offers should report "Sushi" 
    expect(result.unmappedOffers.length).toBe(1);
    expect(result.unmappedOffers[0].speise).toBe('Sushi');
    expect(result.unmappedOffers[0].count).toBe(1);

    // Sample should show 2 offers matched (Döner, Falafel)
    expect(result.samples.length).toBe(1);
    expect(result.samples[0].offers_matched).toBe(2);
  });

  it('[Plan 051] no unmapped offers when all Speisen match catalog', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/burger-place/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtmlWithSpeisen(
        'Burger Place', 'Musterstr. 1, 10117 Berlin, Deutschland', 'Burger, Döner'
      ),
    });

    const supabase = createMockSupabase([], [
      { offer_id: 'offer-001', name_de: 'Döner' },
      { offer_id: 'offer-003', name_de: 'Burger' },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.unmappedOffers).toEqual([]);
    expect(result.samples[0].offers_matched).toBe(2);
  });

  it('[Plan 051 pre-fix regression] offers_ids were hardcoded empty before Plan 051', async () => {
    // This test verifies the pre-fix behavior: without Speisen extraction,
    // providers would always get offers_ids: [] regardless of source data.
    // Post-fix: offers_ids are populated from Speisen values.
    const pageUrl = 'https://joinhalal.com/locations/restaurant/food-spot/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtmlWithSpeisen(
        'Food Spot', 'Hauptstr. 10, 80331 München, Deutschland', 'Pommes, Steak'
      ),
    });

    const supabase = createMockSupabase([], [
      { offer_id: 'offer-010', name_de: 'Pommes' },
      { offer_id: 'offer-011', name_de: 'Steak' },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    // Post-fix: offers_matched is > 0 (pre-fix it would always be 0)
    expect(result.samples[0].offers_matched).toBe(2);
    expect(result.unmappedOffers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Plan 049 — Timeout hardening: timing telemetry + AbortSignal support
// ---------------------------------------------------------------------------

describe('runJoinHalalDryRun — timing telemetry (Plan 049)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns timing object with expected phase keys', async () => {
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

    // timing must exist on the result
    expect(result.timing).toBeDefined();
    const timing = result.timing as DryRunTiming;

    // Must have all expected phase keys
    expect(timing).toHaveProperty('totalMs');
    expect(timing).toHaveProperty('categoriesMs');
    expect(timing).toHaveProperty('offersMs');
    expect(timing).toHaveProperty('descCheckMs');
    expect(timing).toHaveProperty('existingKeysMs');
    expect(timing).toHaveProperty('sitemapMs');
    expect(timing).toHaveProperty('pageProcessingMs');

    // All timing values must be non-negative numbers
    expect(timing.totalMs).toBeGreaterThanOrEqual(0);
    expect(timing.categoriesMs).toBeGreaterThanOrEqual(0);
    expect(timing.offersMs).toBeGreaterThanOrEqual(0);
    expect(timing.descCheckMs).toBeGreaterThanOrEqual(0);
    expect(timing.existingKeysMs).toBeGreaterThanOrEqual(0);
    expect(timing.sitemapMs).toBeGreaterThanOrEqual(0);
    expect(timing.pageProcessingMs).toBeGreaterThanOrEqual(0);
  });

  it('total timing is at least the sum of individual phases', async () => {
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

    const timing = result.timing as DryRunTiming;
    const phaseSum =
      timing.categoriesMs +
      timing.offersMs +
      timing.descCheckMs +
      timing.existingKeysMs +
      timing.sitemapMs +
      timing.pageProcessingMs;

    // totalMs must be >= sum of phases (there may be minor overhead)
    expect(timing.totalMs).toBeGreaterThanOrEqual(phaseSum - 1); // 1ms tolerance for rounding
  });
});

describe('runJoinHalalDryRun — AbortSignal support (Plan 049)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects with a timeout error when signal is already aborted', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/test-place/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtml('Test Place', 'Berliner Str. 5, 10115 Berlin, Deutschland'),
    });

    const supabase = createMockSupabase([]);

    // Pre-aborted signal
    const controller = new AbortController();
    controller.abort();

    await expect(
      runJoinHalalDryRun({
        supabase,
        limit: 10,
        sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
        signal: controller.signal,
      })
    ).rejects.toThrow(/abort|timeout/i);
  });

  it('[QA-049 regression] rejects promptly when caller aborts mid-flight during a page fetch', async () => {
    // This test proves the caller's AbortSignal is propagated into fetchText().
    // The mock page fetch hangs for 5s unless the signal aborts it sooner.
    // We abort the caller signal FROM INSIDE the mock (when the page fetch starts),
    // guaranteeing the abort fires while the fetch is in-flight — not before.
    //
    // Without signal propagation: fetchText uses an independent 15s timeout signal,
    //   so the mock's 5s timer fires, fetchText returns HTML, function returns
    //   normally → .rejects.toThrow() FAILS (function resolved, not rejected).
    //
    // With signal propagation: AbortSignal.any() composes the caller signal with
    //   the 15s timeout. The mock sees the composite signal abort immediately,
    //   rejects, fetchText returns null, the post-fetch signal check throws →
    //   function rejects promptly.

    const pageUrl = 'https://joinhalal.com/locations/restaurant/slow-place/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    const controller = new AbortController();

    global.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('sitemap')) {
        return { ok: true, status: 200, text: async () => sitemapXml } as Response;
      }

      // Abort the caller's signal NOW, while the page fetch is starting.
      // This simulates the route-level timeout (90s) expiring mid-fetch.
      controller.abort();

      // Simulate a slow page fetch that respects its signal.
      // Native fetch aborts immediately when the signal fires; our mock mirrors that.
      const fetchSignal = init?.signal;
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            text: async () => makePageHtml('Slow Place', 'Str 1, 10115 Berlin, Deutschland'),
          } as Response);
        }, 5000);

        if (fetchSignal) {
          if (fetchSignal.aborted) {
            clearTimeout(timer);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
          }
          fetchSignal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          }, { once: true });
        }
      });
    }) as typeof global.fetch;

    const supabase = createMockSupabase([]);

    const startMs = performance.now();
    await expect(
      runJoinHalalDryRun({
        supabase,
        limit: 10,
        sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
        signal: controller.signal,
      })
    ).rejects.toThrow(/abort|timeout|cancel/i);
    const elapsedMs = performance.now() - startMs;

    // Must reject within 2s (well before the 5s mock fallback).
    // This proves the caller signal is propagated into the in-flight fetch.
    expect(elapsedMs).toBeLessThan(2000);
  }, 10_000); // 10s test timeout to let the 5s fallback expire if propagation fails
});

// ---------------------------------------------------------------------------
// Plan 052 — Upsert: import_source / import_source_id / wouldUpdate
// ---------------------------------------------------------------------------

/** Page HTML with vxconfig containing current_post.id for upsert keying */
function makePageHtmlWithPostId(
  name: string,
  streetAddress: string,
  postId: number
): string {
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
  const vxconfig = JSON.stringify({ current_post: { id: postId, display_name: name } });
  return `<html><head>
    <script type="application/ld+json" class="rank-math-schema-pro">${JSON.stringify(schema)}</script>
    </head><body>
    <script class="vxconfig" type="application/json">${vxconfig}</script>
    <h1>${name}</h1></body></html>`;
}

/**
 * createMockSupabase variant that supports import_source and import_source_id
 * fields on existing providers for wouldUpdate classification testing.
 */
function createMockSupabaseWithImportSource(
  existingProviders: {
    provider_name: string;
    address_city: string | null;
    import_source?: string | null;
    import_source_id?: string | null;
  }[],
  offersData: { offer_id: string; name_de: string }[] = []
) {
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

    if (table === 'offers') {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: offersData, error: null }),
        }),
      };
    }

    if (table === 'providers') {
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

describe('runJoinHalalDryRun — wouldUpdate classification (Plan 052)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('counts a provider with matching import_source+import_source_id as wouldUpdate', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/existing-place/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtmlWithPostId(
        'Existing Place',
        'Hauptstr. 1, 10115 Berlin, Deutschland',
        12345
      ),
    });

    // Provider already exists with same import_source + import_source_id
    const supabase = createMockSupabaseWithImportSource([
      {
        provider_name: 'Existing Place',
        address_city: 'Berlin',
        import_source: 'joinhalal',
        import_source_id: '12345',
      },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.wouldUpdate).toBe(1);
    expect(result.stats.wouldInsert).toBe(0);
    expect(result.stats.skipped).toBe(0);
  });

  it('counts a provider with vxconfig post ID but no DB match as wouldInsert', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/new-place/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      [pageUrl]: makePageHtmlWithPostId(
        'New Place',
        'Berliner Str. 5, 10115 Berlin, Deutschland',
        99999
      ),
    });

    // No matching import_source_id in DB
    const supabase = createMockSupabaseWithImportSource([]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.wouldInsert).toBe(1);
    expect(result.stats.wouldUpdate).toBe(0);
    expect(result.stats.skipped).toBe(0);
  });

  it('a page without vxconfig falls back to name+city dedup (no wouldUpdate)', async () => {
    const pageUrl = 'https://joinhalal.com/locations/restaurant/no-vxconfig/';
    const sitemapXml = makeSitemapXml([pageUrl]);

    setupFetchMock(sitemapXml, {
      // Uses makePageHtml (no vxconfig tag)
      [pageUrl]: makePageHtml(
        'No Vxconfig Place',
        'Strasse 1, 10115 Berlin, Deutschland'
      ),
    });

    // Provider exists with same name+city but no import source
    const supabase = createMockSupabaseWithImportSource([
      {
        provider_name: 'No Vxconfig Place',
        address_city: 'Berlin',
        import_source: null,
        import_source_id: null,
      },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.wouldUpdate).toBe(0);
    expect(result.stats.skipped).toBe(1);
    expect(result.stats.wouldInsert).toBe(0);
  });

  it('mixed: one update, one insert, one skip — invariant holds', async () => {
    const urlUpdate = 'https://joinhalal.com/locations/restaurant/update-me/';
    const urlNew = 'https://joinhalal.com/locations/restaurant/new-one/';
    const urlDup = 'https://joinhalal.com/locations/restaurant/dup-one/';
    const sitemapXml = makeSitemapXml([urlUpdate, urlNew, urlDup]);

    setupFetchMock(sitemapXml, {
      [urlUpdate]: makePageHtmlWithPostId(
        'Update Me', 'Str 1, 10115 Berlin, Deutschland', 100
      ),
      [urlNew]: makePageHtmlWithPostId(
        'New One', 'Str 2, 20095 Hamburg, Deutschland', 200
      ),
      [urlDup]: makePageHtml(
        'Dup One', 'Str 3, 80331 München, Deutschland'
      ),
    });

    const supabase = createMockSupabaseWithImportSource([
      {
        provider_name: 'Update Me',
        address_city: 'Berlin',
        import_source: 'joinhalal',
        import_source_id: '100',
      },
      {
        provider_name: 'Dup One',
        address_city: 'München',
        import_source: null,
        import_source_id: null,
      },
    ]);

    const result = await runJoinHalalDryRun({
      supabase,
      limit: 10,
      sitemapUrls: ['https://joinhalal.com/test-sitemap.xml'],
    });

    expect(result.stats.wouldUpdate).toBe(1);
    expect(result.stats.wouldInsert).toBe(1);
    expect(result.stats.skipped).toBe(1);
    // Invariant: wouldInsert + wouldUpdate = parsed - skipped
    expect(result.stats.wouldInsert + result.stats.wouldUpdate).toBe(
      result.stats.parsed - result.stats.skipped
    );
  });
});
