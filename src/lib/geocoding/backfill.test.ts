import { describe, it, expect, vi } from 'vitest';
import { backfillCoordinates } from './backfill';
import {
  recordingSupabase,
  hasFilter,
  type RecordedQuery,
} from '@/__tests__/helpers/recordingSupabase';

const addr = {
  address_street: 'Hauptstr. 1',
  address_zip: '09111',
  address_city: 'Chemnitz',
  address_country: 'DE',
};
const coords = { lat: 50.8, lon: 12.9 };

function setup(opts: { rowsAppearMeanwhile?: boolean } = {}) {
  const writes: RecordedQuery[] = [];
  const locationPages = [[{ location_id: 'l1', ...addr }], []];
  const providerPages = [
    [
      { provider_id: 'p1', ...addr },
      { provider_id: 'p2', ...addr },
    ],
    [],
  ];
  const supabase = recordingSupabase((q) => {
    if (q.action !== 'select') {
      writes.push(q);
      return {};
    }
    if (q.table === 'providers') return { data: providerPages.shift() ?? [] };
    if (hasFilter(q, 'in', 'provider_id')) return { data: [{ provider_id: 'p2' }] };
    if (hasFilter(q, 'eq', 'provider_id')) {
      return { data: opts.rowsAppearMeanwhile ? [{ location_id: 'x' }] : [] };
    }
    return { data: locationPages.shift() ?? [] };
  });
  return { supabase, writes };
}

describe('backfillCoordinates (#756 AC4)', () => {
  it('dry-run (default) geocodes but never writes', async () => {
    const { supabase, writes } = setup();
    const geocode = vi.fn().mockResolvedValue(coords);
    const summary = await backfillCoordinates({ supabase, geocode, apply: false });
    expect(writes).toHaveLength(0);
    expect(summary).toMatchObject({ updated: 2, failed: 0 });
  });

  it('--apply updates only rows still missing coordinates and inserts a primary row for row-less providers', async () => {
    const { supabase, writes } = setup();
    const geocode = vi.fn().mockResolvedValue(coords);
    await backfillCoordinates({ supabase, geocode, apply: true });
    const update = writes.find((w) => w.action === 'update');
    if (!update) throw new Error('expected an update');
    expect(update.values).toEqual({ location_latitude: 50.8, location_longitude: 12.9 });
    expect(hasFilter(update, 'or', 'location_latitude.is.null,location_longitude.is.null')).toBe(
      true,
    );
    const inserts = writes.filter((w) => w.action === 'insert');
    expect(inserts).toHaveLength(1); // p2 has a row, only p1 is row-less
    expect(inserts[0].values).toMatchObject({
      provider_id: 'p1',
      is_primary: true,
      location_latitude: 50.8,
    });
  });

  it('does not insert when a row appeared during the geocode call', async () => {
    const { supabase, writes } = setup({ rowsAppearMeanwhile: true });
    await backfillCoordinates({ supabase, geocode: async () => coords, apply: true });
    expect(writes.filter((w) => w.action === 'insert')).toHaveLength(0);
  });

  it('selects only location rows missing coordinates (never overwrites)', async () => {
    const seen: RecordedQuery[] = [];
    const supabase = recordingSupabase((q) => {
      seen.push(q);
      return { data: [] };
    });
    await backfillCoordinates({ supabase, geocode: async () => coords, apply: true });
    const first = seen.find((q) => q.table === 'locations');
    if (!first) throw new Error('expected a locations query');
    expect(hasFilter(first, 'or', 'location_latitude.is.null,location_longitude.is.null')).toBe(
      true,
    );
  });

  it('pages by keyset so more than one page is processed', async () => {
    let page = 0;
    const supabase = recordingSupabase((q) => {
      if (q.table === 'providers') return { data: [] };
      page += 1;
      return { data: page <= 2 ? [{ location_id: `l${page}`, ...addr }] : [] };
    });
    const summary = await backfillCoordinates({
      supabase,
      geocode: async () => coords,
      apply: false,
      pageSize: 1,
    });
    expect(summary.updated).toBe(2);
  });
});
