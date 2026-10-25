import { describe, it, expect, vi } from 'vitest';
import { recordingSupabase, hasFilter } from '@/__tests__/helpers/recordingSupabase';

const store = vi.hoisted(() => ({ locations: [] as Record<string, unknown>[] }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/supabase/admin', async () => {
  const { recordingSupabase: fake } = await import('@/__tests__/helpers/recordingSupabase');
  return {
    getSupabaseAdmin: () =>
      fake((q) => {
        if (q.action === 'insert') {
          store.locations.push({ location_id: 'new', ...q.values });
          return {};
        }
        if (q.table === 'locations') return { data: store.locations };
        return {
          data: {
            address_street: 'Hauptstr. 1',
            address_zip: '09111',
            address_city: 'Chemnitz',
            address_country: 'DE',
          },
        };
      }),
  };
});

import { ensureProviderCoordinates } from '@/features/providers/services/geocode-on-approval.server';
import { getMapLocations } from './map-pins';

describe('map pins after approval (#756 AC5)', () => {
  it('getMapLocations returns a row-less provider once approval geocoded it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ lat: '50.83', lon: '12.92' }],
      }),
    );
    const mapClient = recordingSupabase((q) => {
      expect(hasFilter(q, 'not', 'location_latitude', 'is', null)).toBe(true);
      expect(hasFilter(q, 'not', 'location_longitude', 'is', null)).toBe(true);
      return {
        data: store.locations
          .filter((l) => l.location_latitude != null && l.location_longitude != null)
          .map((l) => ({ ...l, providers: { provider_name: 'Ali Baba' } })),
      };
    });

    expect(await getMapLocations({}, mapClient)).toHaveLength(0);
    await ensureProviderCoordinates('p1');
    const pins = await getMapLocations({}, mapClient);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({
      provider_id: 'p1',
      location_latitude: 50.83,
      location_longitude: 12.92,
    });
  });
});
