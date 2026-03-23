import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase admin client
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

import { updateProviderReview } from '@/services/admin/providers';

describe('updateProviderReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain: from().update().eq().eq().select()
    mockSelect.mockResolvedValue({ data: [], error: null });
    // Build the eq chain: first .eq('provider_id', ...) then .eq('updated_at', ...)
    mockEq.mockReturnValue({ eq: mockEq, select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('passes expectedUpdatedAt to the query when provided', async () => {
    const expectedTimestamp = '2026-03-23T10:00:00.000Z';
    const mockProvider = {
      provider_id: '123e4567-e89b-12d3-a456-426614174000',
      provider_name: 'Test Provider',
      review_status: 'approved',
      review_feedback: null,
      updated_at: new Date().toISOString(),
    };

    mockSelect.mockResolvedValue({ data: [mockProvider], error: null });

    await updateProviderReview(
      '123e4567-e89b-12d3-a456-426614174000',
      'approved',
      null,
      expectedTimestamp
    );

    // Verify .eq was called with 'updated_at' and the expected timestamp
    expect(mockEq).toHaveBeenCalledWith('updated_at', expectedTimestamp);
  });

  it('throws ConflictError when no rows match (stale write)', async () => {
    const expectedTimestamp = '2026-03-23T10:00:00.000Z';

    // Simulate no row returned (concurrency conflict - another admin already changed it)
    mockSelect.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(
      updateProviderReview(
        '123e4567-e89b-12d3-a456-426614174000',
        'approved',
        null,
        expectedTimestamp
      )
    ).rejects.toThrow('CONFLICT');
  });

  it('succeeds without expectedUpdatedAt (backward compat)', async () => {
    const mockProvider = {
      provider_id: '123e4567-e89b-12d3-a456-426614174000',
      provider_name: 'Test Provider',
      review_status: 'approved',
      review_feedback: null,
      updated_at: new Date().toISOString(),
    };

    mockSelect.mockResolvedValue({ data: [mockProvider], error: null });

    const result = await updateProviderReview(
      '123e4567-e89b-12d3-a456-426614174000',
      'approved'
    );

    expect(result.provider_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });
});

describe('getPendingProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes updated_at in the returned data', async () => {
    const mockProviders = [
      {
        provider_id: '123',
        provider_name: 'Test',
        provider_images: null,
        category_id: null,
        address_city: null,
        contact_email: null,
        review_status: 'pending',
        review_feedback: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-03-23T10:00:00Z',
        user_created_id: null,
      },
    ];

    // Mock the chain for getPendingProviders: from().select().eq().order().range()
    const mockRange = vi.fn().mockResolvedValue({ data: mockProviders, error: null });
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
    const mockEqStatus = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectList = vi.fn().mockReturnValue({ eq: mockEqStatus });

    // Mock count query: from().select('*', { count, head }).eq()
    const mockCountEq = vi.fn().mockResolvedValue({ count: 1, error: null });
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { select: mockSelectList };
      }
      return { select: mockCountSelect };
    });

    const { getPendingProviders } = await import('@/services/admin/providers');
    const result = await getPendingProviders('pending', { limit: 50, offset: 0 });

    // Verify the SELECT includes updated_at
    expect(mockSelectList).toHaveBeenCalledWith(
      expect.stringContaining('updated_at')
    );
    // Verify returned data includes updated_at
    expect(result.data[0]).toHaveProperty('updated_at');
  });
});
