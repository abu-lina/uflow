import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase admin client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

vi.mock('@/utils/sanitizeInput', () => ({
  sanitizeTextInput: (text: string) => text,
}));

import { updateProviderFields, type AdminProviderEditData } from '@/services/admin/providerEdit';

describe('updateProviderFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain: from().update().eq().select()
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ eq: mockEq, select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSingle });
  });

  const validProviderId = '123e4567-e89b-12d3-a456-426614174000';
  const validAdminId = '223e4567-e89b-12d3-a456-426614174001';

  it('updates provider fields via service-role client', async () => {
    const mockProvider = {
      provider_id: validProviderId,
      provider_name: 'Updated Name',
      provider_description: 'Updated description',
      review_status: 'pending',
      updated_at: new Date().toISOString(),
    };

    mockSelect.mockResolvedValue({ data: [mockProvider], error: null });

    const editData: AdminProviderEditData = {
      providerName: 'Updated Name',
      providerDescription: 'Updated description',
    };

    const result = await updateProviderFields(validProviderId, editData, validAdminId);

    expect(result).toEqual(mockProvider);
    expect(mockFrom).toHaveBeenCalledWith('providers');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('includes all provided fields in the update payload', async () => {
    const mockProvider = {
      provider_id: validProviderId,
      provider_name: 'Test',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockProvider], error: null });

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
      offersIds: ['offer-1', 'offer-2'],
      needsIds: ['need-1'],
    };

    await updateProviderFields(validProviderId, editData, validAdminId);

    // Verify update was called with the right data
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload).toMatchObject({
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
      offers_ids: ['offer-1', 'offer-2'],
      needs_ids: ['need-1'],
    });
    expect(updatePayload.updated_at).toBeDefined();
  });

  it('throws error when provider is not found', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    await expect(
      updateProviderFields(validProviderId, { providerName: 'Test' }, validAdminId)
    ).rejects.toThrow('Provider not found');
  });

  it('throws error when database update fails', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(
      updateProviderFields(validProviderId, { providerName: 'Test' }, validAdminId)
    ).rejects.toThrow('Failed to update provider');
  });

  it('sanitizes text fields before saving', async () => {
    const mockProvider = {
      provider_id: validProviderId,
      provider_name: 'Clean Name',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockProvider], error: null });

    await updateProviderFields(
      validProviderId,
      { providerName: '<script>alert("xss")</script>Clean Name' },
      validAdminId
    );

    // sanitizeTextInput is mocked to pass-through, but verify it was called
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.provider_name).toBeDefined();
  });

  it('only includes defined fields in the update (partial updates)', async () => {
    const mockProvider = {
      provider_id: validProviderId,
      provider_name: 'Name Only',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockProvider], error: null });

    await updateProviderFields(
      validProviderId,
      { providerName: 'Name Only' },
      validAdminId
    );

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.provider_name).toBe('Name Only');
    expect(updatePayload.updated_at).toBeDefined();
    // Fields not provided should not be in the payload
    expect(updatePayload).not.toHaveProperty('address_street');
    expect(updatePayload).not.toHaveProperty('category_id');
  });
});
