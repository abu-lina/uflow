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
import { buildActorInput } from '@/lib/enrichment/google-maps/apify-google-maps-client';

const MAPS_URL = 'https://maps.google.com/?cid=1';
const WOLT = 'https://wolt.com/de/deu/stuttgart/restaurant/tevhid?utm_source=google&rwg_token=abc';
const UBER = 'https://www.ubereats.com/de/store/tevhid/XjwKnTcpW-u1VmF1KMQ0Sw?utm_campaign=x';

const provider = (over: Partial<ScreeningProvider> = {}): ScreeningProvider =>
  ({
    provider_id: 'p1',
    provider_name: 'Tevhid Restaurant',
    address_street: 'Neckarstraße 160',
    address_zip: '70190',
    address_city: 'Stuttgart',
    contact_phone: null,
    social_website: null,
    social_instagram: null,
    opening_hours: null,
    provider_description: null,
    has_parking: false,
    family_friendly: false,
    children_friendly: false,
    imageUrls: [],
    latitude: 48.78,
    longitude: 9.2,
    primaryLocationId: 'loc1',
    ...over,
  }) as ScreeningProvider;

const place = (over: Record<string, unknown> = {}): ApifyPlace =>
  ({
    title: 'Tevhid Restaurant',
    url: MAPS_URL,
    categoryName: 'Restaurant',
    postalCode: '70190',
    location: { lat: 48.7801, lng: 9.2001 },
    website: null,
    reviews: [{ text: 'Great', stars: 5 }],
    additionalInfo: {},
    orderOnline: {
      deliveries: [
        { name: 'Wolt', url: WOLT },
        { name: 'Uber Eats', url: UBER },
      ],
      pickUps: [{ name: 'Wolt', orderUrl: WOLT }],
    },
    ...over,
  }) as ApifyPlace;

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
  const fetchPage = opts.fetchPage ?? vi.fn(async () => ({ html: '', url: 'https://x.example/' }));
  const stage = opts.stage ?? vi.fn(async () => ({ outcome: 'staged' as const }));
  const logs: string[] = [];
  const summary = await runScreening({
    store,
    fetchPlaces: async () => places,
    log: (m) => logs.push(m),
    options: { apply: opts.apply ?? true, limit: 10 },
    websiteLinks: {
      fetchPage,
      existingPlatforms: vi.fn(async () => new Set(opts.existing ?? [])),
      stage,
    } as unknown as WebsiteLinkDeps,
  });
  return { summary, fetchPage, stage, logs };
}

const staged = (stage: ReturnType<typeof vi.fn>) =>
  stage.mock.calls.map((c) => c[0] as Record<string, unknown>);

describe('#807 the Maps request asks for the order online widget', () => {
  it('sets scrapeOrderOnline in the actor input', () => {
    expect(buildActorInput(provider()).scrapeOrderOnline).toBe(true);
  });
});

describe('#807 order online links of a clear Maps match are staged as pending candidates', () => {
  it('stages one candidate per platform with a canonical URL and the Maps page as source', async () => {
    const r = await run(provider(), [place()]);
    const rows = staged(r.stage);
    expect(rows.map((x) => x.source).sort()).toEqual([
      'google_maps_order_online:ubereats',
      'google_maps_order_online:wolt',
    ]);
    for (const row of rows) {
      expect(row).toMatchObject({
        provider_id: 'p1',
        field_name: 'delivery_links',
        source_url: MAPS_URL,
        status: 'pending',
      });
    }
    const urls = rows.map(
      (x) => (x.proposed_value as Array<{ platform_url: string }>)[0].platform_url,
    );
    expect(urls.sort()).toEqual([
      'https://wolt.com/de/deu/stuttgart/restaurant/tevhid',
      'https://www.ubereats.com/de/store/tevhid/XjwKnTcpW-u1VmF1KMQ0Sw',
    ]);
  });

  it('does not need a provider website', async () => {
    const r = await run(provider({ social_website: null }), [place()]);
    expect(r.fetchPage).not.toHaveBeenCalled();
    expect(r.stage).toHaveBeenCalledTimes(2);
  });

  it('ignores links that are not a venue page on a supported platform', async () => {
    const r = await run(provider(), [
      place({
        orderOnline: {
          deliveries: [
            { name: 'Other', url: 'https://example.com/order' },
            { name: 'Wolt', url: 'https://wolt.com/de/deu/stuttgart' },
            { name: 'Wolt', url: 'http://wolt.com/de/deu/stuttgart/restaurant/x' },
          ],
        },
      }),
    ]);
    expect(r.stage).not.toHaveBeenCalled();
  });

  it('stages nothing when the place has no order online data', async () => {
    const r = await run(provider(), [place({ orderOnline: undefined })]);
    expect(r.stage).not.toHaveBeenCalled();
  });
});

describe('#807 order online links are not duplicated', () => {
  it('skips platforms the provider already holds', async () => {
    const r = await run(provider(), [place()], { existing: ['wolt'] });
    expect(staged(r.stage).map((x) => x.source)).toEqual(['google_maps_order_online:ubereats']);
  });

  it('keeps the website candidate when the site and Maps both link the same platform', async () => {
    const fetchPage = vi.fn(async () => ({
      html: '<a href="https://wolt.com/de/deu/stuttgart/restaurant/from-site">x</a>',
      url: 'https://tevhid.example/',
    }));
    const r = await run(provider({ social_website: 'https://tevhid.example/' }), [place()], {
      fetchPage,
    });
    expect(
      staged(r.stage)
        .map((x) => x.source)
        .sort(),
    ).toEqual(['google_maps_order_online:ubereats', 'provider_website:wolt']);
  });
});

describe('#807 order online links are staged only for clear matches and only on apply', () => {
  it.each([
    ['review', () => [place({ categoryName: 'Weinbar' })]],
    ['flagged', () => [place({ additionalInfo: { Offerings: [{ 'Serves beer': true }] } })]],
    [
      'no_maps_match',
      () => [
        place({ title: 'Kebab King', postalCode: '80331', location: { lat: 48.1, lng: 11.5 } }),
      ],
    ],
  ])('stages nothing for a %s provider', async (_name, places) => {
    const r = await run(provider(), places());
    expect(r.stage).not.toHaveBeenCalled();
  });

  it('reports what it would stage on a dry run without staging', async () => {
    const r = await run(provider(), [place()], { apply: false });
    expect(r.stage).not.toHaveBeenCalled();
    expect(r.logs.join('\n')).toContain('WOULD STAGE');
  });

  it('logs and carries on when staging fails', async () => {
    const stage = vi.fn(async () => ({ outcome: 'failed' as const, error: { message: 'boom' } }));
    const r = await run(provider(), [place()], { stage });
    expect(r.summary.failed).toBe(0);
    expect(r.logs.join('\n')).toContain('boom');
  });
});

describe('#807 a rejected Maps order candidate does not come back', () => {
  it('counts a rejected google_maps_order_online candidate as already handled', async () => {
    const tables: Record<string, Array<Record<string, unknown>>> = {
      provider_delivery_links: [],
      enrichment_candidates: [
        { source: 'google_maps_order_online:wolt', proposed_value: [{ platform: 'wolt' }] },
      ],
    };
    const builder = (table: string) => {
      const b: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: tables[table] ?? [], error: null }),
      };
      for (const m of ['select', 'eq', 'like', 'in']) b[m] = () => b;
      return b;
    };
    const client = { from: builder } as unknown as SupabaseClient;
    const held = await createWebsiteLinkDeps(client).existingPlatforms('p1');
    expect(Array.from(held)).toContain('wolt');
  });
});
