import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase admin client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

vi.mock('@/utils/sanitizeInput', () => ({
  sanitizeTextInput: (text: string) => text,
}));

import {
  getCommunityServiceForAdmin,
  updateCommunityServiceFields,
  updateCommunityServiceReview,
  type AdminCommunityServiceEditData,
} from '@/services/admin/communityServices';

const validCsId = '123e4567-e89b-12d3-a456-426614174000';
const adminUserId = '223e4567-e89b-12d3-a456-426614174001';

const fakeCommunityService = {
  provider_id: validCsId,
  provider_name: 'Test Service',
  listing_type: 'ummah',
  review_status: 'pending',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── getCommunityServiceForAdmin ──────────────────────────────────────────────

describe('getCommunityServiceForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // GET chain: .from().select().eq(provider_id).eq(listing_type) resolves
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValue({ data: [fakeCommunityService], error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('[post-fix PASSES] uses service-role client to bypass RLS', async () => {
    const result = await getCommunityServiceForAdmin(validCsId);

    expect(mockFrom).toHaveBeenCalledWith('providers');
    expect(result).toMatchObject({ provider_id: validCsId });
  });

  it('[post-fix PASSES] returns null when community service does not exist', async () => {
    mockEq.mockResolvedValue({ data: [], error: null });

    const result = await getCommunityServiceForAdmin(validCsId);

    expect(result).toBeNull();
  });

  it('[post-fix PASSES] throws when database returns an error', async () => {
    mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(getCommunityServiceForAdmin(validCsId)).rejects.toThrow('Failed to fetch community service');
  });
});

// ── updateCommunityServiceFields ─────────────────────────────────────────────

describe('updateCommunityServiceFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle.mockResolvedValue({ data: fakeCommunityService, error: null });
    const mockSelectChain = { single: mockSingle };
    // UPDATE chain: .from().update().eq(provider_id).eq(listing_type).select().single()
    // First eq chains; second eq returns { select: ... }
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockReturnValue({ select: () => mockSelectChain });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('[post-fix PASSES] maps camelCase fields to community_service_* column names', async () => {
    const editData: AdminCommunityServiceEditData = {
      communityServiceName: 'Updated Name',
      communityServiceDescription: 'Updated description',
    };

    await updateCommunityServiceFields(validCsId, editData, adminUserId);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_name: 'Updated Name',
        provider_description: 'Updated description',
      }),
    );
  });

  it('[post-fix PASSES] only includes provided fields (partial update)', async () => {
    const editData: AdminCommunityServiceEditData = {
      communityServiceName: 'New Name',
    };

    await updateCommunityServiceFields(validCsId, editData, adminUserId);

    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updateArg)).toContain('provider_name');
    expect(Object.keys(updateArg)).not.toContain('provider_description');
  });

  it('[post-fix PASSES] always sets updated_at', async () => {
    await updateCommunityServiceFields(validCsId, { communityServiceName: 'x' }, adminUserId);

    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof updateArg.updated_at).toBe('string');
  });

  it('[post-fix PASSES] throws when database returns an error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB write error' } });

    await expect(
      updateCommunityServiceFields(validCsId, { communityServiceName: 'x' }, adminUserId),
    ).rejects.toThrow('Failed to update community service');
  });
});

// ── updateCommunityServiceReview ─────────────────────────────────────────────
// TDD: function does not exist yet — these tests MUST FAIL before implementation

describe('updateCommunityServiceReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle.mockResolvedValue({ data: { ...fakeCommunityService, review_status: 'approved' }, error: null });
    const mockSelectChain = { single: mockSingle };
    // UPDATE chain: .from().update().eq(provider_id).eq(listing_type).select().single()
    mockEq.mockReturnValueOnce({ eq: mockEq }).mockReturnValue({ select: () => mockSelectChain });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('[TDD RED] updates review_status to approved', async () => {
    const result = await updateCommunityServiceReview(validCsId, 'approved', null, adminUserId);

    expect(mockFrom).toHaveBeenCalledWith('providers');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ review_status: 'approved' }),
    );
    expect(result).toMatchObject({ review_status: 'approved' });
  });

  it('[TDD RED] updates review_status to rejected with feedback', async () => {
    mockSingle.mockResolvedValue({
      data: { ...fakeCommunityService, review_status: 'rejected', review_feedback: 'bad content' },
      error: null,
    });

    const result = await updateCommunityServiceReview(
      validCsId,
      'rejected',
      'bad content',
      adminUserId,
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        review_status: 'rejected',
        review_feedback: 'bad content',
      }),
    );
    expect(result).toMatchObject({ review_status: 'rejected' });
  });

  it('[TDD RED] updates review_status to needs_revision', async () => {
    mockSingle.mockResolvedValue({
      data: { ...fakeCommunityService, review_status: 'needs_revision' },
      error: null,
    });

    await updateCommunityServiceReview(validCsId, 'needs_revision', null, adminUserId);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ review_status: 'needs_revision' }),
    );
  });

  it('[TDD RED] throws when database returns an error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    await expect(
      updateCommunityServiceReview(validCsId, 'approved', null, adminUserId),
    ).rejects.toThrow('Failed to update community service review');
  });
});
