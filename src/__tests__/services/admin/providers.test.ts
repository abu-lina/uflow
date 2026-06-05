import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminProviderWithExtensions } from '@/types/adminProvider';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

import { getProviderForAdmin } from '@/services/admin/providers';

describe('getProviderForAdmin', () => {
  const validProviderId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();

    // from().select('...').eq('provider_id', id)
    mockEq.mockResolvedValue({ data: [], error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('joins food_providers and store_providers extension tables', async () => {
    mockEq.mockResolvedValue({
      data: [
        {
          provider_id: validProviderId,
          provider_name: 'Test Food',
          review_status: 'approved',
          category_id: null,
          provider_images: null,
          address_city: null,
          contact_email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          food_providers: {
            verification_method: 'online',
            has_certificate: false,
            certificate_url: null,
            no_alcohol: false,
            no_pork: false,
            no_gambling: false,
          },
          store_providers: null,
        },
      ],
      error: null,
    });

    const result = await getProviderForAdmin(validProviderId) as AdminProviderWithExtensions | null;

    expect(result).not.toBeNull();
    expect(result?.provider_name).toBe('Test Food');
    expect(result?.food_providers).toEqual({
      verification_method: 'online',
      has_certificate: false,
      certificate_url: null,
      no_alcohol: false,
      no_pork: false,
      no_gambling: false,
    });
    expect(result?.store_providers).toBeNull();
  });

  it('joins food_menu and provider_delivery_links', async () => {
    mockEq.mockResolvedValue({
      data: [
        {
          provider_id: validProviderId,
          provider_name: 'Test Store',
          review_status: 'approved',
          category_id: null,
          provider_images: null,
          address_city: null,
          contact_email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          food_providers: null,
          store_providers: {
            verification_method: 'onsite',
            has_certificate: true,
            certificate_url: 'https://example.com/cert.pdf',
            no_gambling: false,
          },
          food_menu: [
            { id: '1', name_de: 'Döner', price_cents: 850, sort_order: 1, is_available: true },
          ],
          provider_delivery_links: [
            { platform: 'wolt', platform_url: 'https://wolt.com/venue/test', is_active: true },
          ],
        },
      ],
      error: null,
    });

    const result = await getProviderForAdmin(validProviderId) as AdminProviderWithExtensions | null;

    expect(result?.store_providers?.certificate_url).toBe('https://example.com/cert.pdf');
    expect((result as Record<string, unknown>)['food_menu']).toHaveLength(1);
    expect((result as Record<string, unknown>)['provider_delivery_links']).toHaveLength(1);
    const links = (result as Record<string, unknown>)['provider_delivery_links'] as Array<Record<string, unknown>>;
    expect(links[0].platform).toBe('wolt');
  });

  it('returns null when provider is not found', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    const result = await getProviderForAdmin(validProviderId);
    expect(result).toBeNull();
  });

  it('throws error on database failure', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(getProviderForAdmin(validProviderId)).rejects.toThrow('DB error');
  });

  it('includes category join', async () => {
    mockEq.mockResolvedValue({
      data: [
        {
          provider_id: validProviderId,
          provider_name: 'Test',
          review_status: 'approved',
          category_id: 'cat-1',
          provider_images: null,
          address_city: null,
          contact_email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: { name_de: 'Restaurant', name_en: 'Restaurant' },
          food_providers: null,
          store_providers: null,
        },
      ],
      error: null,
    });

    const result = await getProviderForAdmin(validProviderId) as AdminProviderWithExtensions | null;
    expect((result as Record<string, unknown>)['category']).toEqual({ name_de: 'Restaurant', name_en: 'Restaurant' });
  });
});
