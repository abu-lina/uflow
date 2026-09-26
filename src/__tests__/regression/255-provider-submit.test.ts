// @vitest-environment node
/**
 * Issue #415 / Plan 255 chunk C1 — create/recommend data-layer correctness
 *
 * TDD: tests written before the fix.
 * Validates:
 *   AC5.4  listing_type is derived from categories.applicable_section and
 *          written IN the providers insert payload (R1)
 *   AC5.5  a food/store submission writes its extension row in the same
 *          logical operation, including the recommend flow
 *   AC7.1  every submission produces exactly one providers row with
 *          review_status = 'pending'
 *   AC7.3  client input cannot set review_status to anything but 'pending'
 *   AC5.9  submitting twice does not create two providers
 *   AC1.8  exactly one submit call site per flow
 *   AC1.7  ProviderCreateForm no longer writes offers_ids/needs_ids to
 *          providers (R2 — dead path removed)
 *   AC7.2  public reads filter to review_status = 'approved'
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { createProviderOrService } from '@/features/providers/services/mutations';

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

const mockProviderInsert = vi.fn();
const mockProviderDeleteEq = vi.fn();
const mockProviderDelete = vi.fn();
const mockProviderUpdate = vi.fn();
const mockCategorySingle = vi.fn();
const mockFoodExtUpsert = vi.fn();
const mockStoreExtUpsert = vi.fn();
const mockLocationInsert = vi.fn();
const mockRelationDeleteEq = vi.fn();
const mockRelationInsert = vi.fn();
const mockBadgeTypeIn = vi.fn();
const mockBadgeInsert = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/x.png' } })),
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => mockProviderInsert(...args),
          update: (...args: unknown[]) => mockProviderUpdate(...args),
          delete: (...args: unknown[]) => mockProviderDelete(...args),
        };
      }
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({ single: () => mockCategorySingle() }),
          }),
        };
      }
      if (table === 'food_providers') {
        return { upsert: (...args: unknown[]) => mockFoodExtUpsert(...args) };
      }
      if (table === 'store_providers') {
        return { upsert: (...args: unknown[]) => mockStoreExtUpsert(...args) };
      }
      if (table === 'locations') {
        return { insert: (...args: unknown[]) => mockLocationInsert(...args) };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: (...args: unknown[]) => mockRelationDeleteEq(...args) }),
          insert: (...args: unknown[]) => mockRelationInsert(...args),
        };
      }
      if (table === 'badge_types') {
        return { select: () => ({ in: (...args: unknown[]) => mockBadgeTypeIn(...args) }) };
      }
      if (table === 'provider_badges') {
        return { insert: (...args: unknown[]) => mockBadgeInsert(...args) };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }),
  },
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: vi.fn().mockResolvedValue({ success: true }),
}));

const FOOD_CATEGORY = 'food-cat-1';

const ownerFormData: ProviderFormData = {
  creationMode: 'owner',
  entityType: 'provider',
  title: 'Test Restaurant',
  category: FOOD_CATEGORY,
  description: '',
  isOnlineBusiness: false,
  street: 'Main 1',
  zip: '12345',
  city: 'Berlin',
  country: 'DE',
  latitude: null,
  longitude: null,
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
  no_alcohol: true,
  no_pork: true,
  no_gambling: true,
  verification_method: 'online',
  has_certificate: false,
  certificate_file: null,
  certificate_url: '',
};

const recommendFormData = {
  ...ownerFormData,
  creationMode: 'recommendation' as const,
};

describe('C1: provider create/recommend submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProviderInsert.mockResolvedValue({ error: null });
    mockProviderDeleteEq.mockResolvedValue({ error: null });
    mockProviderDelete.mockReturnValue({
      eq: (...args: unknown[]) => mockProviderDeleteEq(...args),
    });
    mockProviderUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockCategorySingle.mockResolvedValue({
      data: { applicable_section: 'food' },
      error: null,
    });
    mockFoodExtUpsert.mockResolvedValue({ error: null });
    mockStoreExtUpsert.mockResolvedValue({ error: null });
    mockLocationInsert.mockResolvedValue({ error: null });
    mockRelationDeleteEq.mockResolvedValue({ error: null });
    mockRelationInsert.mockResolvedValue({ error: null });
    mockBadgeTypeIn.mockResolvedValue({ data: [], error: null });
    mockBadgeInsert.mockResolvedValue({ error: null });
  });

  it('AC5.4/AC7.1: owner submit writes exactly one providers row with listing_type in the insert and review_status pending', async () => {
    const user = { id: 'user-1' } as User;

    await createProviderOrService(ownerFormData, user, false);

    expect(mockProviderInsert).toHaveBeenCalledTimes(1);
    const payload = mockProviderInsert.mock.calls[0][0][0];
    expect(payload.listing_type).toBe('food');
    expect(payload.review_status).toBe('pending');
    expect(payload.user_created_id).toBe('user-1');
    expect(payload.provider_owner_id).toBe('user-1');
  });

  it('AC5.4/AC5.5/AC7.1 + C3b: logged-in recommend submit writes one pending providers row identified by user_created_id, with listing_type and a food_providers extension row', async () => {
    const user = { id: 'user-1' } as User;
    await createProviderOrService(recommendFormData, user, true);

    expect(mockProviderInsert).toHaveBeenCalledTimes(1);
    const payload = mockProviderInsert.mock.calls[0][0][0];
    expect(payload.listing_type).toBe('food');
    expect(payload.review_status).toBe('pending');
    expect(payload.user_created_id).toBe('user-1');
    expect(payload.provider_owner_id).toBeNull();
    // C3b: anonymous recommending is gone; no email is stored on the row
    expect(payload.recommender_email ?? null).toBeNull();
    expect('recommender_email' in payload).toBe(false);

    expect(mockFoodExtUpsert).toHaveBeenCalledTimes(1);
    const extPayload = mockFoodExtUpsert.mock.calls[0][0];
    expect(extPayload.provider_id).toBe(payload.provider_id);
    expect(extPayload.no_alcohol).toBe(true);
    expect(extPayload.no_pork).toBe(true);
    expect(extPayload.no_gambling).toBe(true);
  });

  it('AC5.4: store category resolves listing_type store and writes store_providers', async () => {
    mockCategorySingle.mockResolvedValue({
      data: { applicable_section: 'store' },
      error: null,
    });
    const user = { id: 'user-1' } as User;

    await createProviderOrService(ownerFormData, user, false);

    const payload = mockProviderInsert.mock.calls[0][0][0];
    expect(payload.listing_type).toBe('store');
    expect(mockStoreExtUpsert).toHaveBeenCalledTimes(1);
    expect(mockFoodExtUpsert).not.toHaveBeenCalled();
  });

  it('AC7.3: a spoofed review_status in client input cannot reach the insert payload', async () => {
    const user = { id: 'user-1' } as User;
    const spoofed = { ...ownerFormData, review_status: 'approved' };

    await createProviderOrService(spoofed as ProviderFormData, user, false);

    const payload = mockProviderInsert.mock.calls[0][0][0];
    expect(payload.review_status).toBe('pending');
  });

  it('AC5.9: two concurrent submissions create only one providers row', async () => {
    const user = { id: 'user-1' } as User;

    await Promise.all([
      createProviderOrService(ownerFormData, user, false),
      createProviderOrService(ownerFormData, user, false),
    ]);

    expect(mockProviderInsert).toHaveBeenCalledTimes(1);
  });

  it('C3b: food/store submissions with an untouched attestation are rejected at the service boundary', async () => {
    const user = { id: 'user-1' } as User;
    const unanswered = { ...recommendFormData, no_alcohol: undefined };

    await expect(
      createProviderOrService(unanswered as ProviderFormData, user, true),
    ).rejects.toThrow(/halal/i);
    expect(mockProviderInsert).not.toHaveBeenCalled();
  });

  it('C3b: explicit "not sure" (null) answers satisfy the service-boundary check', async () => {
    const user = { id: 'user-1' } as User;
    const notSure = { ...recommendFormData, no_alcohol: null, no_pork: null, no_gambling: null };

    await createProviderOrService(notSure, user, true);
    expect(mockProviderInsert).toHaveBeenCalledTimes(1);
  });

  it('C3b: ummah/community-service submissions are exempt from the attestation check', async () => {
    const user = { id: 'user-1' } as User;
    const ummah = {
      ...recommendFormData,
      category: '4470c3e0-458f-40a6-a96e-ca0fbdf145d7',
      no_alcohol: undefined,
      no_pork: undefined,
      no_gambling: undefined,
    } as ProviderFormData;

    await createProviderOrService(ummah, user, true);
    // ummah branch inserts into providers with listing_type 'ummah', no ext row
    expect(mockProviderInsert).toHaveBeenCalledTimes(1);
    expect(mockProviderInsert.mock.calls[0][0][0].listing_type).toBe('ummah');
  });

  it('AC5.4: submit fails loudly instead of inserting when listing_type is unresolvable', async () => {
    mockCategorySingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });
    const user = { id: 'user-1' } as User;

    await expect(createProviderOrService(ownerFormData, user, false)).rejects.toThrow();
    expect(mockProviderInsert).not.toHaveBeenCalled();
  });
});

describe('C1: exactly one submit call site per flow (AC1.8)', () => {
  it('the recommendation-mode wizard page no longer submits', () => {
    const src = readSrc('src/app/(public)/create/contact/page.tsx');
    expect(src).not.toContain('createProviderOrService');
    expect(src).toContain('/create/recommend');
  });

  it('the recommend flow submits from StreamlinedRecommendForm only', () => {
    const src = readSrc('src/features/providers/StreamlinedRecommendForm.tsx');
    expect(src).toContain('createProviderOrService');
  });

  it('the owner wizard submits from the media step only', () => {
    const src = readSrc('src/app/(public)/create/media/page.tsx');
    expect(src).toContain('createProviderOrService');
  });
});

describe('C1: ProviderCreateForm dead submit path removed (AC1.7 / R2)', () => {
  it('ProviderCreateForm no longer inserts into providers', () => {
    const src = readSrc('src/features/providers/ProviderCreateForm.tsx');
    expect(src).not.toMatch(/\.from\('providers'\)\s*\n?\s*\.insert/);
    expect(src).not.toContain('offers_ids: formData.offers_ids');
    expect(src).not.toContain('needs_ids: formData.needs_ids');
  });

  it("the unreachable profile 'create' tab is gone", () => {
    const profile = readSrc('src/app/(public)/profile/ProfileContent.tsx');
    expect(profile).not.toContain("activeTab === 'create'");
    const tabs = readSrc('src/components/shared/UserNavigationTabs.tsx');
    expect(tabs).not.toContain("'create'");
  });
});

describe('C1: non-approved providers excluded from public reads (AC7.2)', () => {
  const files = [
    'src/services/providers/crud.ts',
    'src/services/providers/cities.ts',
    'src/services/categories.ts',
    'src/services/providers/filters.ts',
    'src/services/providers/map-pins.ts',
  ];

  for (const file of files) {
    it(`${file} filters to approved`, () => {
      const src = readSrc(file);
      expect(src).toMatch(
        /\.eq\('(providers\.)?review_status',\s*(reviewStatus \?\? )?'approved'\)/,
      );
    });
  }
});
