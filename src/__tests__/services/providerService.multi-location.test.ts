import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
let mockInsertResult = { error: null };
const mockInsert = vi.fn(() => mockInsertResult);
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}));

import { createProviderOrService } from '@/services/providerService';

function setupSupabaseMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'providers') {
      return { insert: mockInsert };
    }
    if (table === 'locations') {
      return { insert: mockInsert };
    }
    if (table === 'provider_offers') {
      return {
        delete: () => ({ eq: async () => ({ error: null }) }),
        insert: async () => ({ error: null }),
      };
    }
    if (table === 'provider_needs') {
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
    return { insert: async () => ({ error: null }) };
  });
}

describe('providerService multi-location creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertResult = { error: null };
    setupSupabaseMock();
  });

  it('[post-fix PASSES] creates a primary location row after provider INSERT succeeds', async () => {
    let insertCalls: { table: string; data: unknown }[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          insert: (data: unknown) => {
            insertCalls.push({ table, data });
            return { error: null };
          },
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
      if (table === 'provider_offers') {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'provider_needs') {
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
      return { insert: async () => ({ error: null }) };
    });

    const result = await createProviderOrService(
      {
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
        showAddress: true,
        website: '',
        instagram: '',
        phone: '+49 30 123456',
        email: '',
        offers_ids: [],
        needs_ids: [],
        images: [],
        selectedCommunityServiceIds: [],
        tags: [],
        socialCategory: '',
        socialTitle: '',
        socialDescription: '',
      },
      { id: 'user-1', email: 'test@test.de' } as never,
      false,
    );

    const locationInsert = insertCalls.find(c => c.table === 'locations');
    expect(locationInsert).toBeDefined();
    expect(locationInsert!.data).toBeDefined();
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
        };
      }
      if (table === 'provider_offers') {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'provider_needs') {
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
      return { insert: async () => ({ error: null }) };
    });

    await createProviderOrService(
      {
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
        showAddress: true,
        website: '',
        instagram: '',
        phone: '+49 30 123456',
        email: '',
        offers_ids: [],
        needs_ids: [],
        images: [],
        selectedCommunityServiceIds: [],
        tags: [],
        socialCategory: '',
        socialTitle: '',
        socialDescription: '',
      },
      { id: 'user-1', email: 'test@test.de' } as never,
      false,
    );

    expect(lastLocationData).not.toBeNull();
    if (lastLocationData && Array.isArray(lastLocationData)) {
      expect(lastLocationData[0]).toHaveProperty('is_primary', true);
    }
  });

  it('[post-fix PASSES] throws error when location insert fails after provider insert', async () => {
    let insertCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') {
        return {
          insert: () => {
            insertCount++;
            return { error: null };
          },
        };
      }
      if (table === 'locations') {
        return {
          insert: () => {
            insertCount++;
            return { error: new Error('Location insert failed') };
          },
        };
      }
      if (table === 'provider_offers') {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'provider_needs') {
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
      return { insert: async () => ({ error: null }) };
    });

    await expect(
      createProviderOrService(
        {
          creationMode: 'owner',
          entityType: 'provider',
          title: 'Test Provider',
          category: 'cat-1',
          description: '',
          isOnlineBusiness: false,
          street: 'Teststr. 1',
          zip: '10115',
          city: 'Berlin',
          country: 'DE',
          showAddress: true,
          website: '',
          instagram: '',
          phone: '',
          email: '',
          offers_ids: [],
          needs_ids: [],
          images: [],
          selectedCommunityServiceIds: [],
          tags: [],
          socialCategory: '',
          socialTitle: '',
          socialDescription: '',
        },
        { id: 'user-1', email: 'test@test.de' } as never,
        false,
      ),
    ).rejects.toThrow('Location insert failed');
  });
});
