import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseStore,
  runScreening,
  type ApifyPlace,
  type ScreeningProvider,
  type ScreeningStore,
  type WebsiteLinkDeps,
} from '../../../scripts/screen-provider-google-maps';

const WOLT = 'https://wolt.com/de/deu/stuttgart/restaurant/tevhid?utm_source=google';

const provider = (): ScreeningProvider =>
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
  }) as ScreeningProvider;

const place = {
  title: 'Tevhid Restaurant',
  url: 'https://maps.google.com/?cid=1',
  categoryName: 'Restaurant',
  postalCode: '70190',
  location: { lat: 48.7801, lng: 9.2001 },
  phone: '+49 711 1',
  imageUrls: ['https://img/1.jpg'],
  reviews: [{ text: 'Great', stars: 5 }],
  additionalInfo: {},
  orderOnline: { deliveries: [{ name: 'Wolt', url: WOLT }] },
} as unknown as ApifyPlace;

async function run(missingLinks: boolean) {
  const store: ScreeningStore = {
    listProviders: vi.fn().mockResolvedValue([provider()]),
    insertScreening: vi.fn(async () => undefined),
    applyFields: vi.fn(async () => undefined),
    stageImages: vi.fn(async () => ({ outcome: 'staged' as const })),
  };
  const stage = vi.fn(async () => ({ outcome: 'staged' as const }));
  await runScreening({
    store,
    fetchPlaces: async () => [place],
    options: { apply: true, limit: 10, missingLinks },
    websiteLinks: {
      fetchPage: vi.fn(),
      existingPlatforms: vi.fn(async () => new Set<string>()),
      stage,
    } as unknown as WebsiteLinkDeps,
  });
  return { store, stage };
}

describe('#807 missing-links mode asks the store for approved food providers lacking links', () => {
  it('passes missingLinks to listProviders', async () => {
    const r = await run(true);
    expect(r.store.listProviders).toHaveBeenCalledWith(
      expect.objectContaining({ missingLinks: true }),
    );
  });

  it('does not pass it in the default mode', async () => {
    const r = await run(false);
    expect(r.store.listProviders).toHaveBeenCalledWith(
      expect.not.objectContaining({ missingLinks: true }),
    );
  });
});

describe('#807 missing-links mode stages links and writes no provider fields', () => {
  it('records the screening and stages the order online link but does not enrich', async () => {
    const r = await run(true);
    expect(r.store.insertScreening).toHaveBeenCalledTimes(1);
    expect(r.stage).toHaveBeenCalledTimes(1);
    expect(r.store.applyFields).not.toHaveBeenCalled();
    expect(r.store.stageImages).not.toHaveBeenCalled();
  });

  it('keeps enriching in the default mode', async () => {
    const r = await run(false);
    expect(r.store.applyFields).toHaveBeenCalled();
  });
});

// Chainable fake: eq/in filter the rows, every other method is a no-op that returns the builder.
function fakeClient(rows: Record<string, Array<Record<string, unknown>>>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const client = {
    from(table: string) {
      let result = rows[table] ?? [];
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) => resolve({ data: result, error: null }),
      };
      for (const method of ['select', 'gt', 'gte', 'like', 'order', 'limit', 'eq', 'in']) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          const [col, val] = args as [string, unknown];
          if (method === 'eq') result = result.filter((r) => !(col in r) || r[col] === val);
          if (method === 'in')
            result = result.filter((r) => !(col in r) || (val as unknown[]).includes(r[col]));
          return builder;
        };
      }
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const row = (id: string) => ({ provider_id: id, provider_name: id, locations: [] });

describe('#807 the store selects approved food providers that still miss a platform', () => {
  const rows = {
    providers: [row('none'), row('all'), row('recent'), row('some')],
    provider_screenings: [{ provider_id: 'recent' }],
    provider_delivery_links: [
      { provider_id: 'all', platform: 'wolt' },
      { provider_id: 'all', platform: 'lieferando' },
      { provider_id: 'all', platform: 'ubereats' },
      { provider_id: 'some', platform: 'wolt' },
    ],
    enrichment_candidates: [],
  };

  it('keeps providers with a free platform and drops full or recently screened ones', async () => {
    const { client } = fakeClient(rows);
    const found = await createSupabaseStore(client).listProviders({
      limit: 10,
      missingLinks: true,
    });
    expect(found.map((p) => p.provider_id)).toEqual(['none', 'some']);
  });

  it('filters on approved and food', async () => {
    const { client, calls } = fakeClient(rows);
    await createSupabaseStore(client).listProviders({ limit: 10, missingLinks: true });
    const on = (m: string, a: unknown[]) =>
      calls.some((c) => c.table === 'providers' && c.method === m && c.args.join() === a.join());
    expect(on('eq', ['review_status', 'approved'])).toBe(true);
    expect(on('eq', ['listing_type', 'food'])).toBe(true);
  });

  it('still selects pending providers by default', async () => {
    const { client, calls } = fakeClient(rows);
    await createSupabaseStore(client).listProviders({ limit: 10 });
    expect(
      calls.some((c) => c.method === 'eq' && c.args.join() === ['review_status', 'pending'].join()),
    ).toBe(true);
  });
});

describe('#807 the workflow exposes the mode as an input', () => {
  const wf = readFileSync(resolve(process.cwd(), '.github/workflows/screen-providers.yml'), 'utf8');

  it('has a mode input with both choices, passed through env', () => {
    expect(wf).toMatch(/^ {6}mode:/m);
    expect(wf).toContain('missing_links');
    expect(wf).toMatch(/INPUT_MODE: \$\{\{ inputs\.mode \}\}/);
  });
});
