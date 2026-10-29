import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseStore,
  createWebsiteLinkDeps,
  runScreening,
  type ApifyPlace,
  type ScreeningProvider,
  type ScreeningStore,
} from '../../../scripts/screen-provider-google-maps';
import {
  buildActorInput,
  fetchGoogleMapsPlaces,
} from '@/lib/enrichment/google-maps/apify-google-maps-client';

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
    listingType: 'food',
    ...over,
  }) as ScreeningProvider;

async function run(
  p: ScreeningProvider,
  opts: { apply?: boolean; held?: string[]; heldError?: boolean; missingLinks?: boolean } = {},
) {
  const calls: string[] = [];
  const heldPlatforms = vi.fn(async () => {
    calls.push('held');
    if (opts.heldError) throw new Error('lookup down');
    return new Set(opts.held ?? []);
  });
  const store = {
    listProviders: vi.fn().mockResolvedValue([p]),
    insertScreening: vi.fn(async () => undefined),
    applyFields: vi.fn(async () => undefined),
    stageImages: vi.fn(async () => ({ outcome: 'staged' as const })),
    heldPlatforms,
  } as unknown as ScreeningStore;
  const fetchPlaces = vi.fn(async (_p: ScreeningProvider, _o?: unknown): Promise<ApifyPlace[]> => {
    calls.push('fetch');
    return [];
  });
  const logs: string[] = [];
  const summary = await runScreening({
    store,
    fetchPlaces,
    log: (m) => logs.push(m),
    options: { apply: opts.apply ?? true, limit: 10, missingLinks: opts.missingLinks },
  });
  return { fetchPlaces, heldPlatforms, calls, logs, summary };
}

const requested = (r: Awaited<ReturnType<typeof run>>) =>
  (r.fetchPlaces.mock.calls[0][1] as { scrapeOrderOnline?: boolean } | undefined)
    ?.scrapeOrderOnline;

describe('#820 criterion 1: the order online add-on fires only for food providers missing a platform', () => {
  it('requests it for a food provider that holds no platform', async () => {
    expect(requested(await run(provider()))).toBe(true);
  });

  it('requests it for a food provider that holds some but not all platforms', async () => {
    expect(requested(await run(provider(), { held: ['wolt', 'ubereats'] }))).toBe(true);
  });

  it.each(['store', 'ummah', null])('never requests it for a %s provider', async (listingType) => {
    const r = await run(provider({ listingType }));
    expect(requested(r)).toBe(false);
  });

  it('requests it in missing-links mode, with no CLI flag involved', async () => {
    expect(requested(await run(provider(), { missingLinks: true }))).toBe(true);
  });

  it('does not request it when the held lookup fails, and still screens the provider', async () => {
    const r = await run(provider(), { heldError: true });
    expect(requested(r)).toBe(false);
    expect(r.summary.failed).toBe(0);
    expect(r.logs.join('\n')).toContain('lookup down');
  });
});

describe('#820 criterion 2: the check runs before the Apify call', () => {
  it('looks up held platforms before fetching places', async () => {
    const r = await run(provider());
    expect(r.calls).toEqual(['held', 'fetch']);
  });

  it('skips the held lookup for a non-food provider', async () => {
    const r = await run(provider({ listingType: 'store' }));
    expect(r.heldPlatforms).not.toHaveBeenCalled();
  });

  it('builds actor input from the decision made before the call', () => {
    expect(buildActorInput(provider(), { scrapeOrderOnline: true }).scrapeOrderOnline).toBe(true);
    expect(buildActorInput(provider(), { scrapeOrderOnline: false }).scrapeOrderOnline).toBe(false);
  });

  it('sends the option through to the actor request body', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => [] }) as Response);
    await fetchGoogleMapsPlaces(provider(), 'token', { scrapeOrderOnline: true }, fetchImpl);
    await fetchGoogleMapsPlaces(provider(), 'token', undefined, fetchImpl);
    const bodies = fetchImpl.mock.calls.map(
      (c) => JSON.parse((c[1] as RequestInit).body as string) as Record<string, unknown>,
    );
    expect(bodies.map((b) => b.scrapeOrderOnline)).toEqual([true, false]);
  });
});

describe('#820 criterion 3: dry-run and fully covered providers do not request the add-on', () => {
  it('does not request it on a dry run', async () => {
    const r = await run(provider(), { apply: false });
    expect(requested(r)).toBe(false);
  });

  it('does not request it when every delivery platform is held', async () => {
    const r = await run(provider(), { held: ['wolt', 'lieferando', 'ubereats'] });
    expect(requested(r)).toBe(false);
  });

  it('defaults the actor input to no add-on', () => {
    expect(buildActorInput(provider()).scrapeOrderOnline).toBe(false);
  });
});

// Chainable fake that records which tables were queried and the filters applied.
function fakeClient(tables: Record<string, Array<Record<string, unknown>>> = {}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const client = {
    from(table: string) {
      calls.push({ table, method: 'from', args: [] });
      const b: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: tables[table] ?? [], error: null }),
      };
      for (const m of ['select', 'eq', 'like', 'or', 'in']) {
        b[m] = (...args: unknown[]) => {
          calls.push({ table, method: m, args });
          return b;
        };
      }
      return b;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('#820 criterion 5 and 6: one held lookup covers both source prefixes', () => {
  it('queries enrichment_candidates once for both prefixes', async () => {
    const { client, calls } = fakeClient({
      enrichment_candidates: [
        { source: 'provider_website:wolt', proposed_value: null },
        { source: 'google_maps_order_online:ubereats', proposed_value: null },
      ],
    });

    const held = await createWebsiteLinkDeps(client).existingPlatforms('p1');

    expect(Array.from(held).sort()).toEqual(['ubereats', 'wolt']);
    expect(
      calls.filter((c) => c.table === 'enrichment_candidates' && c.method === 'from'),
    ).toHaveLength(1);
  });

  it('still restricts the lookup to rejected candidates', async () => {
    const { client, calls } = fakeClient();
    await createWebsiteLinkDeps(client).existingPlatforms('p1');
    expect(calls).toContainEqual({
      table: 'enrichment_candidates',
      method: 'eq',
      args: ['status', 'rejected'],
    });
  });
});

describe('#820 the store exposes the held platforms of a provider', () => {
  it('returns the platforms held through delivery link rows', async () => {
    const { client } = fakeClient({ provider_delivery_links: [{ platform: 'wolt' }] });
    const held = await createSupabaseStore(client).heldPlatforms?.('p1');
    expect(Array.from(held ?? [])).toEqual(['wolt']);
  });
});
