import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { loadHeldPlatforms } from '@/lib/enrichment/held-delivery-platforms';

// Minimal chainable Supabase fake: every filter returns the builder, awaiting it yields the rows.
function fakeClient(rows: Record<string, unknown[]>, errors: Record<string, string> = {}) {
  const filters: Array<{ table: string; method: string; args: unknown[] }> = [];
  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) =>
          resolve(
            errors[table]
              ? { data: null, error: { message: errors[table] } }
              : { data: rows[table] ?? [], error: null },
          ),
      };
      for (const method of ['select', 'eq', 'like', 'or']) {
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

describe('#806 held delivery platforms (done-once check)', () => {
  it('holds platforms that already have a delivery link row', async () => {
    const { client } = fakeClient({ provider_delivery_links: [{ platform: 'ubereats' }] });

    expect(Array.from(await loadHeldPlatforms(client, 'p1'))).toEqual(['ubereats']);
  });

  it('holds platforms with a candidate of any status, from the source suffix', async () => {
    const { client, filters } = fakeClient({
      enrichment_candidates: [
        { source: 'provider_website:wolt', proposed_value: null },
        { source: 'provider_website:lieferando', proposed_value: null },
      ],
    });

    const held = await loadHeldPlatforms(client, 'p1');

    expect(Array.from(held).sort()).toEqual(['lieferando', 'wolt']);
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'eq',
      args: ['field_name', 'delivery_links'],
    });
    expect(filters.some((f) => f.method === 'eq' && f.args[0] === 'status')).toBe(false);
  });

  it('holds platforms named in the proposed value of a candidate from another source', async () => {
    const { client } = fakeClient({
      enrichment_candidates: [
        { source: 'wolt_discovery', proposed_value: [{ platform: 'wolt' }, { platform: 7 }, null] },
      ],
    });

    expect(Array.from(await loadHeldPlatforms(client, 'p1'))).toEqual(['wolt']);
  });

  it('limits the lookup to rejected website candidates when asked', async () => {
    const { client, filters } = fakeClient({
      provider_delivery_links: [{ platform: 'ubereats' }],
      enrichment_candidates: [{ source: 'provider_website:wolt', proposed_value: null }],
    });

    const held = await loadHeldPlatforms(client, 'p1', {
      candidateStatus: 'rejected',
      sourcePrefix: 'provider_website',
    });

    expect(Array.from(held).sort()).toEqual(['ubereats', 'wolt']);
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'eq',
      args: ['status', 'rejected'],
    });
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'like',
      args: ['source', 'provider_website:%'],
    });
  });

  it('#820 applies sourcePrefix on its own, without any other option', async () => {
    const { client, filters } = fakeClient({
      enrichment_candidates: [
        { source: 'google_maps_order_online:wolt', proposed_value: [{ platform: 'ubereats' }] },
      ],
    });

    const held = await loadHeldPlatforms(client, 'p1', {
      sourcePrefix: 'google_maps_order_online',
    });

    expect(Array.from(held)).toEqual(['wolt']);
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'like',
      args: ['source', 'google_maps_order_online:%'],
    });
  });

  it('#820 covers several prefixes in a single candidate query', async () => {
    const { client, filters } = fakeClient({
      enrichment_candidates: [
        { source: 'provider_website:wolt', proposed_value: null },
        { source: 'google_maps_order_online:ubereats', proposed_value: null },
      ],
    });

    const held = await loadHeldPlatforms(client, 'p1', {
      sourcePrefix: ['provider_website', 'google_maps_order_online'],
    });

    expect(Array.from(held).sort()).toEqual(['ubereats', 'wolt']);
    expect(
      filters.filter((f) => f.table === 'enrichment_candidates' && f.method === 'select'),
    ).toHaveLength(1);
    expect(filters).toContainEqual({
      table: 'enrichment_candidates',
      method: 'or',
      args: ['source.like.provider_website:%,source.like.google_maps_order_online:%'],
    });
  });

  it('throws when either lookup fails', async () => {
    await expect(
      loadHeldPlatforms(fakeClient({}, { provider_delivery_links: 'links down' }).client, 'p1'),
    ).rejects.toThrow('links down');
    await expect(
      loadHeldPlatforms(fakeClient({}, { enrichment_candidates: 'cands down' }).client, 'p1'),
    ).rejects.toThrow('cands down');
  });
});
