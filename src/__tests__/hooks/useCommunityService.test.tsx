/**
 * TDD tests for useCommunityService hook (Plan 082)
 * 
 * These tests were written BEFORE the hook was implemented.
 * Red → Green verified per TDD gate procedure.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the client service BEFORE importing the hook
const mockGetCommunityServiceById = vi.fn();

vi.mock('@/services/communityServices', () => ({
  getCommunityServiceById: (...args: unknown[]) => mockGetCommunityServiceById(...args),
}));

// Import AFTER mock is set up
import { useCommunityService } from '@/hooks/useCommunityServices';
import type { CommunityService } from '@/services/communityServices';

const fakeCommunityService: CommunityService = {
  community_service_id: 'cs-test-1',
  community_service_name: 'Test Service',
  community_service_description: 'A test community service',
  community_service_images: ['https://mock-supabase-url.com/image1.jpg'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  offers_ids: [],
  needs_ids: [],
  offers: [],
  needs: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
}

describe('useCommunityService hook (Plan 082)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[post-fix PASSES] exports useCommunityService from useCommunityServices module', () => {
    // This will fail (ImportError/undefined) until the hook is added
    expect(typeof useCommunityService).toBe('function');
  });

  it('[post-fix PASSES] fetches a community service by ID when no initialData', async () => {
    mockGetCommunityServiceById.mockResolvedValue(fakeCommunityService);

    const { result } = renderHook(
      () => useCommunityService({ communityServiceId: 'cs-test-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetCommunityServiceById).toHaveBeenCalledWith('cs-test-1');
    expect(result.current.data).toEqual(fakeCommunityService);
    expect(result.current.error).toBeNull();
  });

  it('[post-fix PASSES] returns initialData immediately without fetching when provided', async () => {
    // Hook should serve initialData immediately (not null)
    const { result } = renderHook(
      () => useCommunityService({ communityServiceId: 'cs-test-1', initialData: fakeCommunityService }),
      { wrapper: createWrapper() },
    );

    // With initialData, data should be available immediately
    expect(result.current.data).toEqual(fakeCommunityService);
    // getCommunityServiceById should NOT be called on mount when fresh initialData is provided
    expect(mockGetCommunityServiceById).not.toHaveBeenCalled();
  });

  it('[post-fix PASSES] returns null and fetches when initialData is null', async () => {
    mockGetCommunityServiceById.mockResolvedValue(fakeCommunityService);

    const { result } = renderHook(
      () => useCommunityService({ communityServiceId: 'cs-test-1', initialData: null }),
      { wrapper: createWrapper() },
    );

    // With null initialData, should fetch
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetCommunityServiceById).toHaveBeenCalledWith('cs-test-1');
    expect(result.current.data).toEqual(fakeCommunityService);
  });

  it('[post-fix PASSES] does not fetch when communityServiceId is empty', () => {
    const { result } = renderHook(
      () => useCommunityService({ communityServiceId: '' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockGetCommunityServiceById).not.toHaveBeenCalled();
  });
});
