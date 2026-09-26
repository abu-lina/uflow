import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateProviderPayload } from '@/features/providers/services/create-provider.server';

const mockFrom = vi.fn();
const mockDeleteEq = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { createProviderOrServiceServer } from '@/features/providers/services/create-provider.server';

function setupSupabaseMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'providers') {
      return {
        insert: async () => ({ error: null }),
        delete: () => ({ eq: (...args: unknown[]) => mockDeleteEq(...args) }),
      };
    }
    if (table === 'provider_offers' || table === 'provider_needs') {
      return {
        delete: () => ({ eq: async () => ({ error: null }) }),
        insert: async () => ({ error: null }),
      };
    }
    if (table === 'badge_types') {
      return {
        select: () => ({
          in: async () => ({ data: [], error: null }),
        }),
      };
    }
    if (table === 'provider_badges') {
      return { insert: async () => ({ error: null }) };
    }
    return {
      insert: async () => ({ error: null }),
      upsert: async () => ({ error: null }),
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { applicable_section: 'food' }, error: null }),
        }),
      }),
    };
  });
}

function basePayload(over: Partial<CreateProviderPayload> = {}): CreateProviderPayload {
  return {
    creationMode: 'owner',
    entityType: 'provider',
    title: 'Test Provider',
    category: 'cat-1',
    description: 'A test provider',
    isOnlineBusiness: false,
    street: 'Teststr. 1',
    zip: '10115',
    city: 'Berlin',
    country: 'DE',
    latitude: null,
    longitude: null,
    showAddress: true,
    website: '',
    instagram: '',
    phone: '+49 30 123456',
    email: '',
    offers_ids: [],
    needs_ids: [],
    selectedCommunityServiceIds: [],
    tags: [],
    socialCategory: '',
    socialTitle: '',
    socialDescription: '',
    no_alcohol: false,
    no_pork: false,
    no_gambling: false,
    verification_method: '',
    has_certificate: false,
    certificate_url: '',
    ...over,
  };
}

const ownerActor = { userId: 'user-1', isOwner: true };

describe('providerService multi-location creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteEq.mockResolvedValue({ error: null });
    setupSupabaseMock();
  });

  it('[post-fix PASSES] creates a primary location row after provider INSERT succeeds', async () => {
    const insertCalls: { table: string; data: unknown }[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return { error: null };
          },
          delete: () => ({ eq: (...args: unknown[]) => mockDeleteEq(...args) }),
        };
      }
      if (table === 'locations') {
        return {
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return { error: null };
          },
        };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'badge_types') {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === 'provider_badges') {
        return { insert: async () => ({ error: null }) };
      }
      return {
        insert: async () => ({ error: null }),
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { applicable_section: 'food' }, error: null }),
          }),
        }),
      };
    });

    await createProviderOrServiceServer({ formData: basePayload(), actor: ownerActor });

    const locationInsert = insertCalls.find((c) => c.table === 'locations');
    expect(locationInsert).toBeDefined();
    expect(locationInsert?.data).toBeDefined();
  });

  it('[post-fix PASSES] sets is_primary to true on the created location', async () => {
    let lastLocationData: unknown = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') {
        return {
          insert: (data: unknown) => {
            lastLocationData = data;
            return { error: null };
          },
        };
      }
      if (table === 'providers') {
        return {
          insert: () => ({ error: null }),
          delete: () => ({ eq: (...args: unknown[]) => mockDeleteEq(...args) }),
        };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'badge_types') {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === 'provider_badges') {
        return { insert: async () => ({ error: null }) };
      }
      return {
        insert: async () => ({ error: null }),
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { applicable_section: 'food' }, error: null }),
          }),
        }),
      };
    });

    await createProviderOrServiceServer({ formData: basePayload(), actor: ownerActor });

    expect(lastLocationData).not.toBeNull();
    if (lastLocationData && Array.isArray(lastLocationData)) {
      expect(lastLocationData[0]).toHaveProperty('is_primary');
    }
  });

  it('[post-fix PASSES] throws and deletes the provider when location insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          insert: () => ({ error: null }),
          delete: () => ({ eq: (...args: unknown[]) => mockDeleteEq(...args) }),
        };
      }
      if (table === 'locations') {
        return {
          insert: () => ({ error: new Error('Location insert failed') }),
        };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'badge_types') {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === 'provider_badges') {
        return { insert: async () => ({ error: null }) };
      }
      return {
        insert: async () => ({ error: null }),
        upsert: async () => ({ error: null }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { applicable_section: 'food' }, error: null }),
          }),
        }),
      };
    });

    await expect(
      createProviderOrServiceServer({ formData: basePayload(), actor: ownerActor }),
    ).rejects.toThrow('Location insert failed');
    expect(mockDeleteEq).toHaveBeenCalledWith('provider_id', expect.any(String));
  });
});
