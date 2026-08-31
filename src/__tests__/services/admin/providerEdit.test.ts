import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: mockRpc,
  }),
}));

import type { AdminProviderEditData } from '@/services/admin/providerEdit';

// Import the payload builder functions
import {
  buildBasicFieldsPayload,
  buildExtensionFieldsPayload,
  buildAmenitiesPayload,
  buildMenuPayload,
  buildDeliveryLinksPayload,
} from '@/services/admin/providerEdit';

describe('buildBasicFieldsPayload', () => {
  it('extracts basic provider fields to snake_case', () => {
    const data: Partial<AdminProviderEditData> = {
      providerName: 'Test Provider',
      providerDescription: 'A description',
      categoryId: 'cat-123',
      addressStreet: 'Main St 1',
      addressZip: '10115',
      addressCity: 'Berlin',
      addressCountry: 'Germany',
      contactEmail: 'test@example.com',
      contactPhone: '+4912345',
      socialWebsite: 'https://example.com',
      socialInstagram: '@test',
      providerImages: '{"urls":[]}',
    };

    const result = buildBasicFieldsPayload(data);

    expect(result).toEqual({
      provider_name: 'Test Provider',
      provider_description: 'A description',
      category_id: 'cat-123',
      listing_type: undefined,
      address_street: 'Main St 1',
      address_zip: '10115',
      address_city: 'Berlin',
      address_country: 'Germany',
      contact_email: 'test@example.com',
      contact_phone: '+4912345',
      social_website: 'https://example.com',
      social_instagram: '@test',
      provider_images: '{"urls":[]}',
      opening_hours: undefined,
    });
  });

  it('only includes defined fields', () => {
    const data: Partial<AdminProviderEditData> = {
      providerName: 'Only Name',
    };

    const result = buildBasicFieldsPayload(data);

    expect(result.provider_name).toBe('Only Name');
    expect(result.provider_description).toBeUndefined();
    expect(result.address_street).toBeUndefined();
  });

  it('includes listing_type when provided', () => {
    const result = buildBasicFieldsPayload({ listingType: 'food' });
    expect(result.listing_type).toBe('food');
  });

  it('includes opening_hours when provided', () => {
    const hours = { monday: { open: '09:00', close: '18:00' } };
    const result = buildBasicFieldsPayload({ openingHours: hours });
    expect(result.opening_hours).toEqual(hours);
  });

  it('[post-fix PASSES] buildBasicFieldsPayload includes showAddress', () => {
    const result = buildBasicFieldsPayload({ showAddress: false });
    expect(result.show_address).toBe(false);
  });

  it('[post-fix PASSES] buildBasicFieldsPayload includes showAddress set to true', () => {
    const result = buildBasicFieldsPayload({ showAddress: true });
    expect(result.show_address).toBe(true);
  });
});

describe('buildExtensionFieldsPayload', () => {
  it('builds food_providers payload', () => {
    const data: Partial<AdminProviderEditData> = {
      verificationMethod: 'online',
      hasCertificate: false,
      certificateUrl: 'https://example.com/cert.pdf',
      noAlcohol: true,
      noPork: false,
      noGambling: false,
    };

    const result = buildExtensionFieldsPayload(data, 'food');

    expect(result).toEqual({
      food_providers: {
        verification_method: 'online',
        has_certificate: false,
        certificate_url: 'https://example.com/cert.pdf',
        no_alcohol: true,
        no_pork: false,
        no_gambling: false,
      },
    });
  });

  it('builds store_providers payload', () => {
    const data: Partial<AdminProviderEditData> = {
      verificationMethod: 'onsite',
      hasCertificate: true,
      certificateUrl: null,
      noGambling: true,
    };

    const result = buildExtensionFieldsPayload(data, 'store');

    expect(result).toEqual({
      store_providers: {
        verification_method: 'onsite',
        has_certificate: true,
        certificate_url: null,
        no_gambling: true,
      },
    });
  });

  it('returns empty object when no extension fields are provided', () => {
    const result = buildExtensionFieldsPayload({}, 'food');
    expect(result).toEqual({});
  });

  it('returns empty object for unknown listing_type', () => {
    const result = buildExtensionFieldsPayload(
      { verificationMethod: 'online' },
      'ummah' as 'food' | 'store'
    );
    expect(result).toEqual({});
  });
});

describe('buildAmenitiesPayload', () => {
  it('extracts amenity booleans to snake_case', () => {
    const data: Partial<AdminProviderEditData> = {
      muslimOwned: true,
      hasPrayerSpace: false,
      familyFriendly: true,
      womenFriendly: false,
      childrenFriendly: true,
      makesDonations: false,
      hasParking: true,
      economicSolidarity: false,
    };

    const result = buildAmenitiesPayload(data);

    expect(result).toEqual({
      muslim_owned: true,
      has_prayer_space: false,
      family_friendly: true,
      women_friendly: false,
      children_friendly: true,
      makes_donations: false,
      has_parking: true,
      economic_solidarity: false,
    });
  });

  it('only includes defined amenity fields', () => {
    const result = buildAmenitiesPayload({ muslimOwned: true });
    expect(result.muslim_owned).toBe(true);
    expect(result.has_prayer_space).toBeUndefined();
  });

  it('returns empty object when no amenities are defined', () => {
    const result = buildAmenitiesPayload({});
    expect(result).toEqual({});
  });
});

describe('buildMenuPayload', () => {
  it('returns menu_items array when provided', () => {
    const data: Partial<AdminProviderEditData> = {
      menuItems: [
        {
          name_de: 'Döner',
          price_cents: 850,
          sort_order: 1,
          is_available: true,
          category: 'Hauptgerichte',
        },
      ],
    };
    const result = buildMenuPayload(data);
    expect(result).toEqual({
      menu_items: [
        {
          name_de: 'Döner',
          price_cents: 850,
          sort_order: 1,
          is_available: true,
          category: 'Hauptgerichte',
        },
      ],
    });
  });

  it('returns empty object when menuItems not provided', () => {
    const result = buildMenuPayload({});
    expect(result).toEqual({});
  });
});

describe('buildDeliveryLinksPayload', () => {
  it('returns delivery_links array when provided', () => {
    const data: Partial<AdminProviderEditData> = {
      deliveryLinks: [
        { platform: 'wolt', platform_url: 'https://wolt.com/venue/test', is_active: true },
      ],
    };
    const result = buildDeliveryLinksPayload(data);
    expect(result).toEqual({
      delivery_links: [
        { platform: 'wolt', platform_url: 'https://wolt.com/venue/test', platform_slug: undefined, is_active: true },
      ],
    });
  });

  it('returns empty object when deliveryLinks not provided', () => {
    const result = buildDeliveryLinksPayload({});
    expect(result).toEqual({});
  });
});

describe('updateProviderFields — RPC integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls admin_update_provider RPC with correct payload', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    const result = await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      { providerName: 'Test', listingType: 'food' },
      'admin-user-id'
    );

    expect(mockRpc).toHaveBeenCalledWith('admin_update_provider', {
      p_provider_id: '123e4567-e89b-12d3-a456-426614174000',
      p_data: expect.objectContaining({
        providers: expect.objectContaining({
          provider_name: 'Test',
          listing_type: 'food',
        }),
      }),
    });
    expect(result).toEqual({ provider_id: 'test-id' });
  });

  it('throws error when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await expect(
      updateProviderFields('test-id', { providerName: 'Test' }, 'admin-id')
    ).rejects.toThrow('RPC failed');
  });

  it('merges basic fields, extensions, amenities, menu, and delivery into one payload', async () => {
    mockRpc.mockResolvedValue({ data: { provider_id: 'test-id' }, error: null });

    const { updateProviderFields } = await import('@/services/admin/providerEdit');

    await updateProviderFields(
      '123e4567-e89b-12d3-a456-426614174000',
      {
        providerName: 'Test Provider',
        listingType: 'food',
        muslimOwned: true,
        verificationMethod: 'online',
        menuItems: [{ name_de: 'Item', price_cents: 500, sort_order: 0, is_available: true }],
        deliveryLinks: [{ platform: 'wolt', platform_url: 'https://wolt.com', is_active: true }],
      },
      'admin-id'
    );

    const callArg = mockRpc.mock.calls[0][1];
    expect(callArg.p_data.providers.provider_name).toBe('Test Provider');
    expect(callArg.p_data.providers.muslim_owned).toBe(true);
    expect(callArg.p_data.food_providers.verification_method).toBe('online');
    expect(callArg.p_data.menu_items).toHaveLength(1);
    expect(callArg.p_data.delivery_links).toHaveLength(1);
  });
});
