import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { AdminProviderEditData } from '@/services/admin/providerEdit';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: mockRpc,
  }),
}));

describe('buildCommunityServicePayload', () => {
  it('returns community_service_ids array when provided', async () => {
    const { buildCommunityServicePayload } = await import('@/services/admin/providerEdit');

    const result = buildCommunityServicePayload({
      communityServiceIds: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ],
    });

    expect(result).toEqual({
      community_service_ids: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ],
    });
  });

  it('returns empty object when communityServiceIds not provided', async () => {
    const { buildCommunityServicePayload } = await import('@/services/admin/providerEdit');

    const result = buildCommunityServicePayload({});
    expect(result).toEqual({});
  });

  it('returns empty object when communityServiceIds is empty array', async () => {
    const { buildCommunityServicePayload } = await import('@/services/admin/providerEdit');

    const result = buildCommunityServicePayload({ communityServiceIds: [] });
    expect(result).toEqual({
      community_service_ids: [],
    });
  });
});

describe('updateProviderFields — community service RPC payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes community_service_ids in RPC payload when provided', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        providerName: 'Test',
        listingType: 'food',
        communityServiceIds: ['550e8400-e29b-41d4-a716-446655440001'],
      },
      'admin-user-id'
    );

    expect(mockRpc).toHaveBeenCalledWith('admin_update_provider', {
      p_provider_id: '123e4567-e89b-12d3-a456-426614174000',
      p_data: expect.objectContaining({
        providers: expect.objectContaining({
          provider_name: 'Test',
          listing_type: 'food',
        }),
        community_service_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      }),
    });
  });

  it('omits community_service_ids from RPC payload when not provided', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      { providerName: 'Name Only' },
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data.community_service_ids).toBeUndefined();
  });

  it('includes empty community_service_ids when clearing all engagements', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        providerName: 'Test',
        communityServiceIds: [],
      },
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data.community_service_ids).toEqual([]);
  });
});

describe('updateProviderFields — edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles partial payload with only menu items', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        menuItems: [
          { name_de: 'Döner', price_cents: 850, sort_order: 1, is_available: true },
        ],
      },
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data.providers).toBeUndefined();
    expect(callArg.p_data.menu_items).toHaveLength(1);
    expect(callArg.p_data.community_service_ids).toBeUndefined();
  });

  it('handles empty payload with no changes', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {},
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data).toEqual({});
  });

  it('handles mixed provider types: food provider with all field types', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        providerName: 'Food Place',
        listingType: 'food',
        muslimOwned: true,
        verificationMethod: 'online',
        noAlcohol: true,
        noPork: true,
        noGambling: false,
        menuItems: [
          { name_de: 'Kebab', price_cents: 700, sort_order: 0, is_available: true },
        ],
        deliveryLinks: [
          { platform: 'wolt', platform_url: 'https://wolt.com/venue/test', is_active: true },
        ],
        communityServiceIds: ['550e8400-e29b-41d4-a716-446655440001'],
      },
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data.providers.provider_name).toBe('Food Place');
    expect(callArg.p_data.providers.muslim_owned).toBe(true);
    expect(callArg.p_data.food_providers.verification_method).toBe('online');
    expect(callArg.p_data.food_providers.no_alcohol).toBe(true);
    expect(callArg.p_data.menu_items).toHaveLength(1);
    expect(callArg.p_data.delivery_links).toHaveLength(1);
    expect(callArg.p_data.community_service_ids).toEqual([
      '550e8400-e29b-41d4-a716-446655440001',
    ]);
  });

  it('handles store provider with store-specific fields', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        providerName: 'Store Place',
        listingType: 'store',
        verificationMethod: 'onsite',
        hasCertificate: true,
        noGambling: true,
        communityServiceIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      },
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data.providers.provider_name).toBe('Store Place');
    expect(callArg.p_data.store_providers.verification_method).toBe('onsite');
    expect(callArg.p_data.store_providers.no_gambling).toBe(true);
    expect(callArg.p_data.store_providers.no_alcohol).toBeUndefined();
    expect(callArg.p_data.community_service_ids).toHaveLength(2);
  });

  it('throws error when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await expect(
      updateProviderFields(
        '123e4567-e89b-12d3-a456-426614174000',
        { communityServiceIds: ['550e8400-e29b-41d4-a716-446655440001'] },
        'admin-id'
      )
    ).rejects.toThrow('RPC failed');
  });
});
