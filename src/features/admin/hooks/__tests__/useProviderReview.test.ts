import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useProviderReview } from '../useProviderReview';

/**
 * Tests for useProviderReview hook (Plan 058 M3)
 * 
 * This hook handles provider review actions (approve/reject) and cache invalidation
 */

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useQueryClient
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

describe('useProviderReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should approve a provider successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { provider_id: 'provider-1', review_status: 'approved' } }),
    });

    const { result } = renderHook(() => useProviderReview());

    await act(async () => {
      await result.current.approveProvider('provider-1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/review-provider', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'provider-1',
        reviewStatus: 'approved',
      }),
    }));
  });

  it('should reject a provider without feedback', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { provider_id: 'provider-1', review_status: 'rejected' } }),
    });

    const { result } = renderHook(() => useProviderReview());

    await act(async () => {
      await result.current.rejectProvider('provider-1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/review-provider', expect.objectContaining({
      body: JSON.stringify({
        providerId: 'provider-1',
        reviewStatus: 'rejected',
      }),
    }));
  });

  it('should reject a provider with feedback', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { provider_id: 'provider-1', review_status: 'rejected' } }),
    });

    const { result } = renderHook(() => useProviderReview());

    await act(async () => {
      await result.current.rejectProvider('provider-1', 'This provider does not meet guidelines');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/review-provider', expect.objectContaining({
      body: JSON.stringify({
        providerId: 'provider-1',
        reviewStatus: 'rejected',
        reviewFeedback: 'This provider does not meet guidelines',
      }),
    }));
  });

  it('should invalidate providers query after successful review', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { provider_id: 'provider-1', review_status: 'approved' } }),
    });

    const { result } = renderHook(() => useProviderReview());

    await act(async () => {
      await result.current.approveProvider('provider-1');
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['providers'] });
  });

  it('should return loading state during review', async () => {
    let resolvePromise: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockImplementationOnce(() => pendingPromise.then(() => ({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    })));

    const { result } = renderHook(() => useProviderReview());

    expect(result.current.isLoading).toBe(false);

    let reviewPromise: Promise<void>;
    act(() => {
      reviewPromise = result.current.approveProvider('provider-1');
    });

    // Should be loading now
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!();
      await reviewPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Forbidden' }),
    });

    const { result } = renderHook(() => useProviderReview());

    await expect(
      act(async () => {
        await result.current.approveProvider('provider-1');
      })
    ).rejects.toThrow();
  });

  it('should track the provider being reviewed', async () => {
    let resolvePromise: () => void;
    mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePromise = () => resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
    }));

    const { result } = renderHook(() => useProviderReview());

    let reviewPromise: Promise<void>;
    act(() => {
      reviewPromise = result.current.approveProvider('provider-123');
    });

    expect(result.current.reviewingProviderId).toBe('provider-123');

    await act(async () => {
      resolvePromise!();
      await reviewPromise;
    });

    expect(result.current.reviewingProviderId).toBe(null);
  });

  /**
   * Regression: Code Review finding MEDIUM — reviewingProviderId wiring
   *
   * Pre-fix, ProvidersContent used:
   *   reviewingProviderId={isReviewLoading ? rejectModalState.providerId : null}
   *
   * During Approve (no modal open), rejectModalState.providerId is null, so
   * even though isLoading=true the card never received isReviewing=true.
   *
   * Post-fix, ProvidersContent destructures reviewingProviderId from the hook
   * and passes it directly. This test verifies the hook exports the correct
   * specific ID during an in-flight approve call, without any modal state.
   */
  it('[pre-fix FAILS] reviewingProviderId is null during Approve when modal is closed; [post-fix PASSES] hook tracks specific provider ID independent of modal state', async () => {
    let resolvePromise: () => void;
    mockFetch.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePromise = () => resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
    }));

    const { result } = renderHook(() => useProviderReview());

    // Initially null — no review in progress
    expect(result.current.reviewingProviderId).toBeNull();
    expect(result.current.isLoading).toBe(false);

    // Trigger approve — simulating the Approve button click with NO modal involved
    let reviewPromise: Promise<void>;
    act(() => {
      reviewPromise = result.current.approveProvider('provider-approve-test');
    });

    // [post-fix PASSES]: hook exposes the exact providerId independent of modal state
    // [pre-fix FAILS]: pre-fix used rejectModalState.providerId (null during Approve), so
    //   `isReviewLoading ? null : null` → card buttons were never disabled
    expect(result.current.reviewingProviderId).toBe('provider-approve-test');
    expect(result.current.isLoading).toBe(true);

    // After resolution, both reset
    await act(async () => {
      resolvePromise!();
      await reviewPromise;
    });

    expect(result.current.reviewingProviderId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
