import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { createProviderOrService } from '@/features/providers/services/mutations';

const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockProviderInsert = vi.fn();
const mockProviderUpdate = vi.fn();
const mockProviderUpdateEq = vi.fn();
const mockBadgeTypeSelect = vi.fn();
const mockBadgeTypeIn = vi.fn();
const mockProviderBadgeInsert = vi.fn();
const mockProviderOffersDelete = vi.fn();
const mockProviderOffersEq = vi.fn();
const mockProviderOffersInsert = vi.fn();
const mockProviderNeedsDelete = vi.fn();
const mockProviderNeedsEq = vi.fn();
const mockProviderNeedsInsert = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockStorageGetPublicUrl(...args),
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => mockProviderInsert(...args),
          update: (...args: unknown[]) => mockProviderUpdate(...args),
        };
      }

      if (table === 'badge_types') {
        return {
          select: (...args: unknown[]) => mockBadgeTypeSelect(...args),
        };
      }

      if (table === 'provider_badges') {
        return {
          insert: (...args: unknown[]) => mockProviderBadgeInsert(...args),
        };
      }

      if (table === 'provider_offers') {
        return {
          delete: (...args: unknown[]) => mockProviderOffersDelete(...args),
          insert: (...args: unknown[]) => mockProviderOffersInsert(...args),
        };
      }

      if (table === 'provider_needs') {
        return {
          delete: (...args: unknown[]) => mockProviderNeedsDelete(...args),
          insert: (...args: unknown[]) => mockProviderNeedsInsert(...args),
        };
      }

      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: vi.fn().mockResolvedValue({ success: true }),
}));

const baseFormData: ProviderFormData = {
  creationMode: 'owner',
  entityType: 'provider',
  title: 'Test Provider',
  category: 'cat-1',
  description: 'desc',
  isOnlineBusiness: false,
  street: 'Main 1',
  zip: '12345',
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
      no_alcohol: false,
      no_pork: false,
      no_gambling: false,
      verification_method: '',
      has_certificate: false,
      certificate_file: null,
      certificate_url: '',
};

describe('createProviderOrService badge/boolean wiring (Plan 106)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/file.png' } });

    mockProviderInsert.mockResolvedValue({ error: null });

    mockProviderUpdateEq.mockResolvedValue({ error: null });
    mockProviderUpdate.mockReturnValue({
      eq: (...args: unknown[]) => mockProviderUpdateEq(...args),
    });

    mockBadgeTypeIn.mockResolvedValue({
      data: [
        { id: 'bt-muslim',      badge_key: 'MUSLIM_OWNED' },
        { id: 'bt-prayer',      badge_key: 'PRAYER_FRIENDLY' },
        { id: 'bt-sadaqah',    badge_key: 'SUPPORTS_SADAQAH' },
        { id: 'bt-parking',    badge_key: 'HAS_PARKING' },
        { id: 'bt-solidarity', badge_key: 'ECONOMIC_SOLIDARITY' },
      ],
      error: null,
    });
    mockBadgeTypeSelect.mockReturnValue({
      in: (...args: unknown[]) => mockBadgeTypeIn(...args),
    });

    mockProviderBadgeInsert.mockResolvedValue({ error: null });

    mockProviderOffersEq.mockResolvedValue({ error: null });
    mockProviderOffersDelete.mockReturnValue({
      eq: (...args: unknown[]) => mockProviderOffersEq(...args),
    });
    mockProviderOffersInsert.mockResolvedValue({ error: null });

    mockProviderNeedsEq.mockResolvedValue({ error: null });
    mockProviderNeedsDelete.mockReturnValue({
      eq: (...args: unknown[]) => mockProviderNeedsEq(...args),
    });
    mockProviderNeedsInsert.mockResolvedValue({ error: null });
  });

  it('[post-fix PASSES] routes all attribute tags through badge system — no direct boolean injection', async () => {
    // FL-23: has_parking and economic_solidarity are no longer set directly in
    // the provider insert payload. They are routed through the badge system and
    // the sync_provider_badge_to_boolean trigger sets the boolean columns.
    const user = { id: 'user-1' } as User;

    await createProviderOrService(
      {
        ...baseFormData,
        tags: ['muslim', 'parken', 'solidaritaet', 'gebet', 'spenden'],
      },
      user,
      false,
    );

    expect(mockProviderInsert).toHaveBeenCalledTimes(1);

    const providerInsertPayload = mockProviderInsert.mock.calls[0][0][0];
    // Parking and solidarity are no longer set directly (FL-23 badge routing)
    expect(providerInsertPayload.has_parking).toBeUndefined();
    expect(providerInsertPayload.economic_solidarity).toBeUndefined();

    expect(mockProviderBadgeInsert).toHaveBeenCalledTimes(1);
    const badgeRows = mockProviderBadgeInsert.mock.calls[0][0];

    // All 5 attribute tags now go through the badge system
    expect(badgeRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ badge_type_id: 'bt-muslim',      trust_level: 'SELF_DECLARED' }),
        expect.objectContaining({ badge_type_id: 'bt-prayer',      trust_level: 'SELF_DECLARED' }),
        expect.objectContaining({ badge_type_id: 'bt-sadaqah',    trust_level: 'SELF_DECLARED' }),
        expect.objectContaining({ badge_type_id: 'bt-parking',    trust_level: 'SELF_DECLARED' }),
        expect.objectContaining({ badge_type_id: 'bt-solidarity', trust_level: 'SELF_DECLARED' }),
      ]),
    );
  });

  it('[post-fix PASSES] falls back to direct provider boolean update when badge insert fails', async () => {
    const user = { id: 'user-1' } as User;

    mockProviderBadgeInsert.mockResolvedValue({ error: { message: 'insert failed' } });

    await createProviderOrService(
      {
        ...baseFormData,
        tags: ['muslim', 'gebet', 'spenden'],
      },
      user,
      false,
    );

    expect(mockProviderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        muslim_owned: true,
        has_prayer_space: true,
        makes_donations: true,
      }),
    );
    expect(mockProviderUpdateEq).toHaveBeenCalledWith('provider_id', expect.any(String));
  });
});
