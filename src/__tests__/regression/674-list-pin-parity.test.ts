// @vitest-environment node
/**
 * #674: the section list and the map read the same providers.
 *
 *   AC4 an approved food provider without coordinates is in the /food list,
 *       but never a map pin.
 *   AC5 for the same section, city and filters, every map pin is also in the
 *       list result set. Pins still come from getMapLocations.
 *
 * Both services run for real against an in-memory Supabase fake that applies
 * the eq / not / in filters they send to a fixture.
 */
import type { ReactElement } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const PROVIDERS: Row[] = [
  // Berlin, muslim-owned, geocoded: list + pin
  provider('p-geo', { address_city: 'Berlin', muslim_owned: true }),
  // Berlin, muslim-owned, no coordinates: list only
  provider('p-no-coords', { address_city: 'Berlin', muslim_owned: true }),
  // Berlin, not muslim-owned: excluded from the filtered list
  provider('p-not-muslim', { address_city: 'Berlin', muslim_owned: false }),
  // Provider city Hamburg, but its location row says Berlin
  provider('p-hamburg', { address_city: 'Hamburg', muslim_owned: true }),
  // Other section
  provider('p-store', { address_city: 'Berlin', muslim_owned: true, listing_type: 'store' }),
  // Not approved
  provider('p-pending', { address_city: 'Berlin', muslim_owned: true, review_status: 'pending' }),
];

const LOCATIONS: Row[] = [
  location('p-geo', 'Berlin', 52.52, 13.4),
  location('p-no-coords', 'Berlin', null, null),
  location('p-not-muslim', 'Berlin', 52.5, 13.41),
  location('p-hamburg', 'Berlin', 52.51, 13.39),
  location('p-store', 'Berlin', 52.49, 13.38),
  location('p-pending', 'Berlin', 52.48, 13.37),
];

function provider(id: string, overrides: Row): Row {
  return {
    provider_id: id,
    provider_name: id,
    listing_type: 'food',
    review_status: 'approved',
    location_latitude: null,
    location_longitude: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function location(id: string, city: string, lat: number | null, lng: number | null): Row {
  return {
    provider_id: id,
    address_city: city,
    location_latitude: lat,
    location_longitude: lng,
    providers: PROVIDERS.find((p) => p.provider_id === id),
  };
}

function valueAt(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Row | undefined)?.[key], row);
}

/** Minimal PostgREST builder over the fixture: applies eq / not-is-null / in. */
function fakeClient(): SupabaseClient {
  const tables: Record<string, Row[]> = { providers: PROVIDERS, locations: LOCATIONS };
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    const builder: Record<string, unknown> = {};
    const chain = (fn?: () => void) => () => {
      fn?.();
      return builder;
    };
    builder.select = chain();
    builder.order = chain();
    builder.limit = chain();
    builder.range = chain();
    builder.returns = chain();
    builder.eq = (col: string, value: unknown) =>
      chain(() => (rows = rows.filter((r) => valueAt(r, col) === value)))();
    builder.not = (col: string, op: string, value: unknown) =>
      chain(() => {
        if (op === 'is' && value === null) rows = rows.filter((r) => valueAt(r, col) != null);
      })();
    builder.in = (col: string, values: unknown[]) =>
      chain(() => (rows = rows.filter((r) => values.includes(valueAt(r, col)))))();
    builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve, reject);
    return builder;
  };
  return { from } as unknown as SupabaseClient;
}

const { client } = vi.hoisted(() => ({ client: { current: null as SupabaseClient | null } }));

vi.mock('@/services/badges', () => ({
  getBadgesForEntities: vi.fn(async () => new Map()),
}));

// The /food server render runs the real search, bound to the fixture client.
vi.mock('@/services/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/providers')>();
  return {
    ...actual,
    searchProvidersAndCommunityServices: (
      ...args: Parameters<typeof actual.searchProvidersAndCommunityServices>
    ) =>
      actual.searchProvidersAndCommunityServices(
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7],
        client.current ?? undefined,
      ),
  };
});

vi.mock('@/services/categories', () => ({ getCategoryById: vi.fn(async () => null) }));

vi.mock('@/app/(public)/providers/ProvidersContent', () => ({
  ProvidersContent: () => null,
}));

import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { getMapLocations, searchProvidersAndCommunityServices } from '@/services/providers';
import type { SearchResult } from '@/services/providers';
import type { SearchFilterKey } from '@/features/search/constants/filterKeys';

async function foodListIds(params: Record<string, string>, routeCity?: string) {
  const element = (await renderProvidersPage({
    searchParams: Promise.resolve(params),
    routeSection: 'food',
    routeCity,
  })) as ReactElement<{ children: ReactElement<{ initialData: { results: SearchResult[] } }> }>;
  return element.props.children.props.initialData.results.map((r) => r.id);
}

async function pinIds(opts: { city?: string | null; filters?: SearchFilterKey[] }) {
  const rows = await getMapLocations(
    { section: 'food', ...opts } as Parameters<typeof getMapLocations>[0],
    client.current!,
  );
  return rows
    .filter((row) => row.location_latitude !== null && row.location_longitude !== null)
    .map((row) => row.provider_id);
}

beforeEach(() => {
  client.current = fakeClient();
});

describe('#674 AC4: list contains providers without coordinates', () => {
  it('an approved food provider without coordinates appears in the /food list view', async () => {
    expect(await foodListIds({})).toContain('p-no-coords');
  });

  it('the same provider does not appear as a map pin', async () => {
    expect(await pinIds({})).not.toContain('p-no-coords');
  });
});

describe('#674 AC5: map pins are a subset of the list', () => {
  const cases: Array<{ name: string; city: string | null; filters?: SearchFilterKey[] }> = [
    { name: 'section only', city: null },
    { name: 'section + city', city: 'Berlin' },
    { name: 'section + filters', city: null, filters: ['muslim'] },
    { name: 'section + city + filters', city: 'Berlin', filters: ['muslim'] },
  ];

  it.each(cases)('every pin is in the list result set ($name)', async ({ city, filters }) => {
    const list = await searchProvidersAndCommunityServices(
      '',
      null,
      city ?? '',
      0,
      50,
      undefined,
      'food',
      filters,
    );
    const listIds = list.results.map((r) => r.id);

    const pins = await pinIds({ city, filters });

    expect(pins.length).toBeGreaterThan(0);
    expect(pins.filter((id) => !listIds.includes(id))).toEqual([]);
  });

  it('the /food/[city]?filters= list holds every pin for that city and filter', async () => {
    const listIds = await foodListIds({ filters: 'muslim' }, 'Berlin');
    const pins = await pinIds({ city: 'Berlin', filters: ['muslim'] });

    expect(pins.filter((id) => !listIds.includes(id))).toEqual([]);
  });
});
