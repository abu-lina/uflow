import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: mockRpc,
  }),
}));

import type { AdminProviderEditData } from '@/services/admin/providerEdit';

import {
  buildLocationsPayload,
  updateProviderFields,
} from '@/services/admin/providerEdit';

describe('buildLocationsPayload', () => {
  it('returns locations array when provided', () => {
    const data: Partial<AdminProviderEditData> = {
      locations: [
        {
          location_name: 'Berlin Mitte',
          address_street: 'Hauptstr 1',
          address_zip: '10115',
          address_city: 'Berlin',
          is_primary: true,
        },
      ],
    };
    const result = buildLocationsPayload(data);
    expect(result).toEqual({
      locations: [
        {
          location_name: 'Berlin Mitte',
          address_street: 'Hauptstr 1',
          address_zip: '10115',
          address_city: 'Berlin',
          is_primary: true,
        },
      ],
    });
  });

  it('preserves location_id when present', () => {
    const data: Partial<AdminProviderEditData> = {
      locations: [
        {
          location_id: '123e4567-e89b-12d3-a456-426614174000',
          location_name: 'Berlin Mitte',
          address_city: 'Berlin',
          is_primary: true,
        },
      ],
    };
    const result = buildLocationsPayload(data);
    const locs = result.locations as Array<Record<string, unknown>>;
    expect(locs[0].location_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('returns empty object when locations not provided', () => {
    const result = buildLocationsPayload({});
    expect(result).toEqual({});
  });
});

describe('updateProviderFields — locations in RPC payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes locations in the RPC payload when provided', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const result = await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        providerName: 'Test',
        locations: [
          { location_name: 'Berlin', address_city: 'Berlin', is_primary: true },
        ],
      },
      'admin-user-id'
    );

    const rpcArg = mockRpc.mock.calls[0][1] as { p_provider_id: string; p_data: Record<string, unknown> };
    expect(rpcArg.p_data.locations).toEqual([
      { location_name: 'Berlin', address_city: 'Berlin', is_primary: true },
    ]);
    expect(result).toEqual({ provider_id: 'test-id' });
  });

  it('[post-fix PASSES] [pre-fix FAILS] updates existing location with ID without destroying it', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const editData: AdminProviderEditData = {
      providerName: 'Multi-Branch Store',
      locations: [
        {
          location_id: 'existing-location-1',
          location_name: 'Berlin Mitte',
          address_city: 'Berlin',
          is_primary: true,
        },
        {
          location_name: 'Hamburg Hbf',
          address_city: 'Hamburg',
          is_primary: false,
        },
      ],
    };

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      editData,
      'admin-id'
    );

    const callPayload = mockRpc.mock.calls[0][1].p_data as Record<string, unknown>;
    const locs = callPayload.locations as Array<Record<string, unknown>>;
    expect(locs).toHaveLength(2);

    const existingLoc = locs.find(
      (l) => l.location_id === 'existing-location-1'
    );
    expect(existingLoc).toBeDefined();
    expect(existingLoc!.location_name).toBe('Berlin Mitte');

    const newLoc = locs.find(
      (l) => !l.location_id
    );
    expect(newLoc).toBeDefined();
    expect(newLoc!.location_name).toBe('Hamburg Hbf');
  });
});
