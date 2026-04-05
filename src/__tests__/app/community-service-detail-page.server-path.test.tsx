import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockServerGetCommunityServiceById = vi.fn();
const mockClientGetCommunityServiceById = vi.fn();

vi.mock('@/services/communityServices.server', () => ({
  getCommunityServiceById: (...args: unknown[]) => mockServerGetCommunityServiceById(...args),
}));

vi.mock('@/services/communityServices', () => ({
  getCommunityServiceById: (...args: unknown[]) => mockClientGetCommunityServiceById(...args),
}));

describe('community service detail page server data path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const fakeCommunityService = {
      community_service_id: 'cs-1',
      community_service_name: 'Test Service',
      community_service_images: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      barakah_effects: [],
      offers_ids: [],
      needs_ids: [],
      offers: [],
      needs: [],
    };

    mockServerGetCommunityServiceById.mockResolvedValue(fakeCommunityService);
    mockClientGetCommunityServiceById.mockResolvedValue(fakeCommunityService);
  });

  it('[post-fix PASSES] loads via server module (not client module) in Server Component', async () => {
    const mod = await import('@/app/(public)/community-services/[community_service_id]/page');

    await mod.default({
      params: Promise.resolve({ community_service_id: 'cs-1' }),
    });

    expect(mockServerGetCommunityServiceById).toHaveBeenCalledWith('cs-1');
    expect(mockClientGetCommunityServiceById).not.toHaveBeenCalled();
  });
});
