import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createWebsiteLinkDeps,
  runScreening,
  type ApifyPlace,
  type ScreeningProvider,
  type ScreeningStore,
  type WebsiteLinkDeps,
} from '../../../scripts/screen-provider-google-maps';

const SITE = 'https://tevhid.example/';
const PAGE_HTML = [
  'https://www.lieferando.de/speisekarte/tevhid',
  'https://wolt.com/de/deu/berlin/restaurant/tevhid',
  'https://www.instagram.com/tevhid',
]
  .map((h) => `<a href="${h}">x</a>`)
  .join('');

const provider = (over: Partial<ScreeningProvider> = {}): ScreeningProvider =>
  ({
    provider_id: 'p1',
    provider_name: 'Bistro Salam',
    address_street: 'Hauptstr. 1',
    address_zip: '10115',
    address_city: 'Berlin',
    contact_phone: null,
    social_website: SITE,
    social_instagram: null,
    opening_hours: null,
    provider_description: null,
    has_parking: false,
    family_friendly: false,
    children_friendly: false,
    imageUrls: [],
    latitude: 52.52,
    longitude: 13.405,
    primaryLocationId: 'loc1',
    ...over,
  }) as ScreeningProvider;

const place = (over: Partial<ApifyPlace> = {}): ApifyPlace => ({
  title: 'Bistro Salam',
  url: 'https://maps.google.com/?cid=1',
  categoryName: 'Restaurant',
  postalCode: '10115',
  location: { lat: 52.5201, lng: 13.4051 },
  website: SITE,
  reviews: [{ text: 'Great falafel', stars: 5 }],
  additionalInfo: {},
  ...over,
});

const unmatched = (): ApifyPlace =>
  place({ title: 'Kebab King', postalCode: '80331', location: { lat: 48.1, lng: 11.5 } });

async function run(
  p: ScreeningProvider,
  places: ApifyPlace[],
  opts: {
    apply?: boolean;
    existing?: string[];
    fetchPage?: ReturnType<typeof vi.fn>;
    stage?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const store: ScreeningStore = {
    listProviders: vi.fn().mockResolvedValue([p]),
    insertScreening: vi.fn(async () => undefined),
    applyFields: vi.fn(async () => undefined),
    stageImages: vi.fn(async () => ({ outcome: 'staged' as const })),
  };
  const fetchPage = opts.fetchPage ?? vi.fn(async () => ({ html: PAGE_HTML, url: SITE }));
  const stage = opts.stage ?? vi.fn(async () => ({ outcome: 'staged' as const }));
  const existingPlatforms = vi.fn(async () => new Set(opts.existing ?? []));
  const logs: string[] = [];
  const summary = await runScreening({
    store,
    fetchPlaces: async () => places,
    log: (m) => logs.push(m),
    options: { apply: opts.apply ?? true, limit: 10 },
    websiteLinks: { fetchPage, existingPlatforms, stage } as unknown as WebsiteLinkDeps,
  });
  return { store, summary, fetchPage, stage, existingPlatforms, logs };
}

const staged = (stage: ReturnType<typeof vi.fn>) =>
  stage.mock.calls.map((c) => c[0] as Record<string, unknown>);

describe('#801 a provider site with outbound delivery links stages one pending candidate per platform', () => {
  it('stages Lieferando and Wolt candidates with the source page URL and ignores Instagram', async () => {
    const r = await run(provider(), [place()]);
    expect(r.fetchPage).toHaveBeenCalledWith(SITE);
    const rows = staged(r.stage);
    expect(rows.map((x) => x.source).sort()).toEqual([
      'provider_website:lieferando',
      'provider_website:wolt',
    ]);
    for (const row of rows) {
      expect(row).toMatchObject({
        provider_id: 'p1',
        field_name: 'delivery_links',
        source_url: SITE,
        status: 'pending',
      });
    }
  });
});

describe('#801 a provider already holding a link for a platform gets no duplicate candidate', () => {
  it('skips platforms that already have a provider_delivery_links row', async () => {
    const r = await run(provider(), [place()], { existing: ['wolt'] });
    expect(staged(r.stage).map((x) => x.source)).toEqual(['provider_website:lieferando']);
  });

  it('stages nothing when every found platform is already linked', async () => {
    const r = await run(provider(), [place()], { existing: ['wolt', 'lieferando'] });
    expect(r.stage).not.toHaveBeenCalled();
  });

  it('does not count an already staged candidate as new work', async () => {
    const stage = vi.fn(async () => ({ outcome: 'skipped-existing' as const }));
    const r = await run(provider(), [place()], { stage });
    expect(r.summary.failed).toBe(0);
  });
});

describe('#801 non-clear providers, providers without a website and unreachable sites are skipped without failing the run', () => {
  it.each([
    ['review', () => [place({ categoryName: 'Weinbar' })]],
    ['flagged', () => [place({ additionalInfo: { Offerings: [{ 'Serves beer': true }] } })]],
    ['no_maps_match', () => [unmatched()]],
  ])('does not read the website of a %s provider', async (_name, places) => {
    const r = await run(provider(), places());
    expect(r.fetchPage).not.toHaveBeenCalled();
    expect(r.stage).not.toHaveBeenCalled();
  });

  it('skips a provider without a website', async () => {
    const r = await run(provider({ social_website: null }), [place({ website: undefined })]);
    expect(r.fetchPage).not.toHaveBeenCalled();
    expect(r.stage).not.toHaveBeenCalled();
    expect(r.summary.failed).toBe(0);
  });

  it('skips a blank website', async () => {
    const r = await run(provider({ social_website: '   ' }), [place()]);
    expect(r.fetchPage).not.toHaveBeenCalled();
  });

  it('logs and carries on when the site is unreachable', async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
    const r = await run(provider(), [place()], { fetchPage });
    expect(r.summary.failed).toBe(0);
    expect(r.summary.clear).toBe(1);
    expect(r.store.insertScreening).toHaveBeenCalledTimes(1);
    expect(r.stage).not.toHaveBeenCalled();
    expect(r.logs.join('\n')).toContain('ENOTFOUND');
  });

  it('logs and carries on when staging fails', async () => {
    const stage = vi.fn(async () => ({ outcome: 'failed' as const, error: { message: 'boom' } }));
    const r = await run(provider(), [place()], { stage });
    expect(r.summary.failed).toBe(0);
    expect(r.logs.join('\n')).toContain('boom');
  });
});

describe('#801 dry-run writes nothing', () => {
  it('reads the page and reports what it would stage without staging', async () => {
    const r = await run(provider(), [place()], { apply: false });
    expect(r.stage).not.toHaveBeenCalled();
    expect(r.logs.join('\n')).toContain('WOULD STAGE');
  });
});

// Minimal chainable Supabase fake: every filter returns the builder, awaiting it yields the rows.
function fakeClient(rows: Record<string, unknown[]>) {
  const filters: Array<{ table: string; method: string; args: unknown[] }> = [];
  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) => resolve({ data: rows[table] ?? [], error: null }),
      };
      for (const method of ['select', 'eq', 'like', 'or', 'in']) {
        builder[method] = (...args: unknown[]) => {
          filters.push({ table, method, args });
          return builder;
        };
      }
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, filters };
}

describe('#801 review: rejected candidates do not come back on the next run', () => {
  it('treats a platform with a rejected provider_website candidate as already handled', async () => {
    const { client, filters } = fakeClient({
      provider_delivery_links: [{ platform: 'ubereats' }],
      enrichment_candidates: [{ source: 'provider_website:wolt' }],
    });
    const held = await createWebsiteLinkDeps(client).existingPlatforms('p1');

    expect(Array.from(held).sort()).toEqual(['ubereats', 'wolt']);
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'eq',
      args: ['status', 'rejected'],
    });
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'or',
      args: ['source.like.provider_website:%,source.like.google_maps_order_online:%'],
    });
  });
});
