import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  locations: [] as Record<string, unknown>[],
  provider: null as Record<string, unknown> | null,
  inserted: [] as Record<string, unknown>[],
  updated: [] as { values: Record<string, unknown>; id: string }[],
  locError: null as { message: string } | null,
  insertError: null as { code: string; message: string } | null,
  raceUpdates: [] as Record<string, unknown>[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === 'locations'
            ? Promise.resolve({ data: state.locations, error: state.locError })
            : { maybeSingle: () => Promise.resolve({ data: state.provider, error: null }) },
      }),
      insert: (row: Record<string, unknown>) => {
        state.inserted.push(row);
        return Promise.resolve({ error: state.insertError });
      },
      update: (values: Record<string, unknown>) => ({
        eq: (col: string, id: string) => {
          if (col === 'provider_id') {
            state.raceUpdates.push(values);
            return { eq: () => ({ is: () => Promise.resolve({ error: null }) }) };
          }
          state.updated.push({ values, id });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

import { ensureProviderCoordinates } from './geocode-on-approval.server';
import { logger } from '@/lib/logging/structuredLogger';

const address = {
  address_street: 'Hauptstr. 1',
  address_zip: '09111',
  address_city: 'Chemnitz',
  address_country: 'DE',
};
const hit = [{ lat: '50.83', lon: '12.92' }];
const mockFetch = vi.fn();

beforeEach(() => {
  state.locations = [];
  state.provider = { ...address };
  state.inserted = [];
  state.updated = [];
  state.insertError = null;
  state.locError = null;
  state.raceUpdates = [];
  mockFetch.mockReset();
  vi.mocked(logger.warn).mockClear();
  vi.stubGlobal('fetch', mockFetch);
});

describe('ensureProviderCoordinates (#756)', () => {
  it('AC1: geocodes a location row without coordinates and writes lat/lon', async () => {
    state.locations = [
      {
        location_id: 'l1',
        is_primary: true,
        ...address,
        location_latitude: null,
        location_longitude: null,
      },
    ];
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => hit });
    await ensureProviderCoordinates('p1');
    expect(state.updated).toEqual([
      { id: 'l1', values: { location_latitude: 50.83, location_longitude: 12.92 } },
    ]);
  });

  it('AC1: inserts a primary location with coordinates when the provider has no row', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => hit });
    await ensureProviderCoordinates('p1');
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      provider_id: 'p1',
      is_primary: true,
      address_city: 'Chemnitz',
      location_latitude: 50.83,
      location_longitude: 12.92,
    });
  });

  it('AC2: a geocoding failure is logged and never throws', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));
    await expect(ensureProviderCoordinates('p1')).resolves.toBeDefined();
    expect(logger.warn).toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
  });

  it('AC2: no geocoder match is logged and writes nothing', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    await ensureProviderCoordinates('p1');
    expect(logger.warn).toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
    expect(state.updated).toHaveLength(0);
  });

  it('AC3: a provider that already has coordinates is not re-geocoded', async () => {
    state.locations = [
      {
        location_id: 'l1',
        is_primary: true,
        ...address,
        location_latitude: 1,
        location_longitude: 2,
      },
    ];
    await ensureProviderCoordinates('p1');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(state.inserted).toHaveLength(0);
    expect(state.updated).toHaveLength(0);
  });

  it('on a unique-primary race (23505) it fills the existing primary row instead of failing', async () => {
    state.insertError = { code: '23505', message: 'duplicate key' };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => hit });
    await expect(ensureProviderCoordinates('p1')).resolves.toBe('geocoded');
    expect(state.raceUpdates).toEqual([{ location_latitude: 50.83, location_longitude: 12.92 }]);
  });

  it('serialises geocoder calls through the shared rate-limit slot', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => hit });
    const t0 = Date.now();
    await Promise.all([ensureProviderCoordinates('p1'), ensureProviderCoordinates('p2')]);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(1000);
  });

  it('AC2: a provider without enough address is logged and not geocoded', async () => {
    state.provider = {
      address_street: null,
      address_zip: null,
      address_city: 'Chemnitz',
      address_country: 'DE',
    };
    await expect(ensureProviderCoordinates('p1')).resolves.toBe('no_address');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('AC2: a database read error is logged and returns failed', async () => {
    state.locError = { message: 'db down' };
    await expect(ensureProviderCoordinates('p1')).resolves.toBe('failed');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('AC2: a non-OK geocoder response (429) is logged and returns failed', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429, json: async () => [] });
    await expect(ensureProviderCoordinates('p1')).resolves.toBe('failed');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('AC2: a non-23505 insert error is logged and returns failed', async () => {
    state.insertError = { code: '42501', message: 'denied' };
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => hit });
    await expect(ensureProviderCoordinates('p1')).resolves.toBe('failed');
    expect(logger.warn).toHaveBeenCalled();
  });
});
