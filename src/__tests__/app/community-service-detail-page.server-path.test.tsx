import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockServerGetCommunityServiceById = vi.fn();
const mockClientGetCommunityServiceById = vi.fn();
const mockCommunityServiceDetailPageClient = vi.fn((props: unknown) => null);

vi.mock('@/services/communityServices.server', () => ({
  getCommunityServiceById: (...args: unknown[]) => mockServerGetCommunityServiceById(...args),
}));

vi.mock('@/services/communityServices', () => ({
  getCommunityServiceById: (...args: unknown[]) => mockClientGetCommunityServiceById(...args),
}));

vi.mock('@/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient', () => ({
  CommunityServiceDetailPageClient: (props: unknown) => mockCommunityServiceDetailPageClient(props),
}));

vi.mock('@/components/community-services/ImagePreloader', () => ({
  ImagePreloader: () => null,
}));

const fakeCommunityService = {
  community_service_id: 'cs-1',
  community_service_name: 'Test Service',
  community_service_images: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  offers_ids: [],
  needs_ids: [],
  offers: [],
  needs: [],
};

describe('community service detail page server data path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Clear module cache between tests
    mockServerGetCommunityServiceById.mockResolvedValue(fakeCommunityService);
    mockClientGetCommunityServiceById.mockResolvedValue(fakeCommunityService);
    mockCommunityServiceDetailPageClient.mockReturnValue(null);
  });

  it('[post-fix PASSES] loads via server module (not client module) in Server Component', async () => {
    const mod = await import('@/app/(public)/community-services/[community_service_id]/page');

    await mod.default({
      params: Promise.resolve({ community_service_id: 'cs-1' }),
    });

    expect(mockServerGetCommunityServiceById).toHaveBeenCalledWith('cs-1');
    expect(mockClientGetCommunityServiceById).not.toHaveBeenCalled();
  });

  it('[post-fix PASSES] does NOT call notFound() when data is null; passes nullable initialData to client', async () => {
    // The CommunityServiceDetailPageClient (v0.10.16+) accepts nullable initialData
    // and uses React Query hook for client-side fetching. The server page passes null
    // without calling notFound(), allowing the client to retry with the user's actual session.
    mockServerGetCommunityServiceById.mockResolvedValue(null);

    const mod = await import('@/app/(public)/community-services/[community_service_id]/page');

    // Should NOT throw — page returns JSX with CommunityServiceDetailPageClient
    const result = await mod.default({ params: Promise.resolve({ community_service_id: 'cs-missing' }) });

    expect(mockServerGetCommunityServiceById).toHaveBeenCalledWith('cs-missing');
    // Verify the result is a React element (not an error/throw)
    expect(result).toBeTruthy();
    expect(result).toHaveProperty('type'); // React elements have a 'type' property
  });
});
