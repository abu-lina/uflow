/**
 * TDD tests for community service admin edit service layer
 * Plan 083 — M1
 *
 * These tests import from src/services/admin/communityServiceEdit.ts
 * which does not exist yet. Running the suite before implementation
 * will produce the expected "Failed to resolve import" / Module error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock supabase admin client ---
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

vi.mock('@/utils/sanitizeInput', () => ({
  sanitizeTextInput: (text: string) => text,
}));

// Import after mocks — will fail with ModuleNotFoundError before implementation
import {
  getCommunityServiceForAdmin,
  updateCommunityServiceFields,
  updateCommunityServiceReview,
  type AdminCommunityServiceEditData,
} from '@/services/admin/communityServiceEdit';

const VALID_CS_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const VALID_ADMIN_ID = 'ffffffff-1111-2222-3333-444444444444';

describe('getCommunityServiceForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // GET chain: .from().select().eq(provider_id).eq(listing_type)
    // First eq must chain; second eq must resolve
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValueOnce({ eq: mockEq }); // first .eq() → chainable
    // individual tests set mockResolvedValue for the terminal second .eq()
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('queries providers table (ummah listing_type)', async () => {
    const mockCS = {
      provider_id: VALID_CS_ID,
      provider_name: 'Test Service',
      provider_images: ['https://example.com/img.jpg'],
      listing_type: 'ummah',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    // Only set terminal resolution; beforeEach already set up the chain Once
    mockEq.mockResolvedValue({ data: [mockCS], error: null });

    await getCommunityServiceForAdmin(VALID_CS_ID);

    expect(mockFrom).toHaveBeenCalledWith('providers');
  });

  it('returns null when not found', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    const result = await getCommunityServiceForAdmin(VALID_CS_ID);
    expect(result).toBeNull();
  });

  it('returns the provider record when found', async () => {
    const mockCS = {
      provider_id: VALID_CS_ID,
      provider_name: 'Test Service',
      provider_images: ['https://example.com/img.jpg'],
      listing_type: 'ummah',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    mockEq.mockResolvedValue({ data: [mockCS], error: null });

    const result = await getCommunityServiceForAdmin(VALID_CS_ID);
    expect(result).toEqual(mockCS);
  });

  it('throws when supabase returns an error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(getCommunityServiceForAdmin(VALID_CS_ID)).rejects.toThrow('DB error');
  });
});

describe('updateCommunityServiceFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ eq: mockEq, select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate, select: mockSelect });
  });

  it('updates providers table (ummah listing_type)', async () => {
    const mockCS = {
      provider_id: VALID_CS_ID,
      provider_name: 'Updated Name',
      listing_type: 'ummah',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockCS], error: null });

    const editData: AdminCommunityServiceEditData = { serviceName: 'Updated Name' };
    await updateCommunityServiceFields(VALID_CS_ID, editData, VALID_ADMIN_ID);

    expect(mockFrom).toHaveBeenCalledWith('providers');
  });

  it('includes updated_at in the payload', async () => {
    const mockCS = {
      provider_id: VALID_CS_ID,
      provider_name: 'Test',
      listing_type: 'ummah',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockCS], error: null });

    const editData: AdminCommunityServiceEditData = { serviceName: 'Test' };
    await updateCommunityServiceFields(VALID_CS_ID, editData, VALID_ADMIN_ID);

    const updateArg = (mockUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg).toHaveProperty('updated_at');
  });

  it('accepts provider_images as string array (TEXT[])', async () => {
    const mockCS = {
      provider_id: VALID_CS_ID,
      provider_images: ['https://example.com/img.jpg'],
      listing_type: 'ummah',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockCS], error: null });

    const editData: AdminCommunityServiceEditData = {
      providerImages: ['https://example.com/img.jpg'],
    };
    await updateCommunityServiceFields(VALID_CS_ID, editData, VALID_ADMIN_ID);

    const updateArg = (mockUpdate as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(Array.isArray(updateArg.provider_images)).toBe(true);
  });

  it('throws when community service not found', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    const editData: AdminCommunityServiceEditData = { serviceName: 'Test' };
    await expect(
      updateCommunityServiceFields(VALID_CS_ID, editData, VALID_ADMIN_ID)
    ).rejects.toThrow('Community service not found');
  });

  it('throws on supabase error', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

    const editData: AdminCommunityServiceEditData = { serviceName: 'Test' };
    await expect(
      updateCommunityServiceFields(VALID_CS_ID, editData, VALID_ADMIN_ID)
    ).rejects.toThrow('Update failed');
  });
});

describe('updateCommunityServiceReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ eq: mockEq, select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('updates providers table (ummah listing_type) for review', async () => {
    const mockCS = {
      provider_id: VALID_CS_ID,
      provider_name: 'Test Service',
      listing_type: 'ummah',
      review_status: 'approved',
      updated_at: new Date().toISOString(),
    };
    mockSelect.mockResolvedValue({ data: [mockCS], error: null });

    await updateCommunityServiceReview(VALID_CS_ID, 'approved', null, undefined);

    expect(mockFrom).toHaveBeenCalledWith('providers');
  });

  it('throws CONFLICT error when expectedUpdatedAt does not match', async () => {
    // 0 rows returned = concurrency conflict
    mockSelect.mockResolvedValue({ data: [], error: null });

    await expect(
      updateCommunityServiceReview(
        VALID_CS_ID,
        'approved',
        null,
        '2026-01-01T00:00:00.000Z' // expectedUpdatedAt provided → conflict detection active
      )
    ).rejects.toThrow('CONFLICT:');
  });

  it('throws when not found (no expectedUpdatedAt)', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    await expect(
      updateCommunityServiceReview(VALID_CS_ID, 'approved', null, undefined)
    ).rejects.toThrow('Community service not found');
  });
});
