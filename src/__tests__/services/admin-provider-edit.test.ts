import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: mockRpc,
  }),
}));

import { updateProviderFields, type AdminProviderEditData, buildBasicFieldsPayload } from '@/services/admin/providerEdit';

describe('updateProviderFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validProviderId = '123e4567-e89b-12d3-a456-426614174000';
  const validAdminId = '223e4567-e89b-12d3-a456-426614174001';

  it('calls admin_update_provider RPC with correct payload', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: validProviderId, provider_name: 'Updated Name' }, error: null });

    const editData: AdminProviderEditData = {
      providerName: 'Updated Name',
      providerDescription: 'Updated description',
    };

    const result = await updateProviderFields(validProviderId, editData, validAdminId);

    expect(result).toEqual({ provider_id: validProviderId, provider_name: 'Updated Name' });
    expect(mockRpc).toHaveBeenCalledWith('admin_update_provider', {
      p_provider_id: validProviderId,
      p_data: expect.objectContaining({
        providers: expect.objectContaining({
          provider_name: 'Updated Name',
          provider_description: 'Updated description',
        }),
      }),
    });
  });

  it('includes all provided fields in the RPC payload', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: validProviderId }, error: null });

    const editData: AdminProviderEditData = {
      providerName: 'Test Provider',
      providerDescription: 'A description',
      categoryId: 'cat-123',
      addressStreet: '123 Main St',
      addressZip: '12345',
      addressCity: 'Berlin',
      addressCountry: 'Deutschland',
      contactEmail: 'test@example.com',
      contactPhone: '+49123456789',
      socialWebsite: 'https://example.com',
      socialInstagram: '@example',
      providerImages: '{"urls":[]}',
    };

    await updateProviderFields(validProviderId, editData, validAdminId);

    const rpcPayload = mockRpc.mock.calls[0][1].p_data;
    expect(rpcPayload.providers).toMatchObject({
      provider_name: 'Test Provider',
      provider_description: 'A description',
      category_id: 'cat-123',
      address_street: '123 Main St',
      address_zip: '12345',
      address_city: 'Berlin',
      address_country: 'Deutschland',
      contact_email: 'test@example.com',
      contact_phone: '+49123456789',
      social_website: 'https://example.com',
      social_instagram: '@example',
      provider_images: '{"urls":[]}',
    });
  });

  it('throws error when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(
      updateProviderFields(validProviderId, { providerName: 'Test' }, validAdminId)
    ).rejects.toThrow('DB error');
  });

  it('throws error when RPC returns no data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(
      updateProviderFields(validProviderId, { providerName: 'Test' }, validAdminId)
    ).rejects.toThrow('Provider not found');
  });

  it('buildBasicFieldsPayload only includes defined fields', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: validProviderId }, error: null });

    await updateProviderFields(validProviderId, { providerName: 'Name Only' }, validAdminId);

    const rpcPayload = mockRpc.mock.calls[0][1].p_data;
    expect(rpcPayload.providers.provider_name).toBe('Name Only');
    expect(rpcPayload.providers).not.toHaveProperty('address_street');
    expect(rpcPayload.providers).not.toHaveProperty('category_id');
  });

  it('includes listing_type when explicitly provided', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: validProviderId }, error: null });

    await updateProviderFields(validProviderId, { providerName: 'Name Only', listingType: 'store' }, validAdminId);

    const rpcPayload = mockRpc.mock.calls[0][1].p_data;
    expect(rpcPayload.providers).toMatchObject({
      provider_name: 'Name Only',
      listing_type: 'store',
    });
  });

  it('includes listing_type ummah in payload', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: validProviderId }, error: null });

    await updateProviderFields(validProviderId, { providerName: 'Name Only', listingType: 'ummah' }, validAdminId);

    const rpcPayload = mockRpc.mock.calls[0][1].p_data;
    expect(rpcPayload.providers).toMatchObject({
      provider_name: 'Name Only',
      listing_type: 'ummah',
    });
  });
});

describe('buildBasicFieldsPayload', () => {
  it('builds correct snake_case payload from camelCase input', () => {
    const result = buildBasicFieldsPayload({
      providerName: 'Test',
      providerDescription: 'Desc',
      categoryId: 'cat-1',
      listingType: 'food',
    });

    expect(result).toEqual({
      provider_name: 'Test',
      provider_description: 'Desc',
      category_id: 'cat-1',
      listing_type: 'food',
    });
  });
});
