/**
 * Plan 089: Section-aware search routing tests (M2)
 * TDD Gate: written BEFORE implementation changes to searchProvidersAndCommunityServices
 *
 * Tests the new section-based routing that replaces the category-based
 * getSearchStrategy() function.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/services/offers', () => ({
  searchOffers: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/needs', () => ({
  searchNeeds: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/badges', () => ({
  getBadgesForEntities: vi.fn().mockResolvedValue(new Map()),
  getBadgesForEntity: vi.fn().mockResolvedValue([]),
  EntityType: { PROVIDER: 'provider' },
}));
vi.mock('@/utils/errorUtils', () => ({ logSupabaseError: vi.fn() }));

const mockSearchCommunityServices = vi.fn().mockResolvedValue([]);
vi.mock('@/services/communityServices', () => ({
  searchCommunityServices: (...args: unknown[]) => mockSearchCommunityServices(...args),
}));

// Supabase mock chain
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockReturns = vi.fn();
const mockSelect = vi.fn();
const mockRpc = vi.fn();

function setupChain() {
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr, returns: mockReturns });
  mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr, returns: mockReturns });
  mockOrder.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr, returns: mockReturns });
  mockLimit.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr, returns: mockReturns });
  mockRange.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr, returns: mockReturns });
  mockOr.mockReturnValue({ eq: mockEq, order: mockOrder, limit: mockLimit, range: mockRange, or: mockOr, returns: mockReturns });
  mockReturns.mockResolvedValue({ data: [], error: null });
  mockRpc.mockResolvedValue({ data: [], error: null });
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select: mockSelect })),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { searchProvidersAndCommunityServices } from '@/services/providers';

// ─── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setupChain();
});

describe('searchProvidersAndCommunityServices — section routing (Plan 089 M2)', () => {
  it('[pre-fix] UMMAH section routes to community services ONLY', async () => {
    mockSearchCommunityServices.mockResolvedValue([
      { community_service_id: 'cs-1', community_service_name: 'Test Mosque', barakah_effects: [], offers_ids: [], needs_ids: [], created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]);

    const { results } = await searchProvidersAndCommunityServices('', null, '', 0, 5, undefined, 'ummah');

    expect(mockSearchCommunityServices).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('community_service');
  });

  it('[post-fix] FOOD section filters by listing_type = food', async () => {
    await searchProvidersAndCommunityServices('', null, '', 0, 5, undefined, 'food');

    // Should NOT call community services for food section
    expect(mockSearchCommunityServices).not.toHaveBeenCalled();
    // Should call providers with listing_type eq
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'food');
  });

  it('[post-fix] BUSINESS section filters by listing_type = business', async () => {
    await searchProvidersAndCommunityServices('', null, '', 0, 5, undefined, 'business');

    expect(mockSearchCommunityServices).not.toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'business');
  });

  it("defaults to food section when section is undefined (D9)", async () => {
    await searchProvidersAndCommunityServices('', null, '', 0, 5, undefined, undefined);
    expect(mockEq).toHaveBeenCalledWith('listing_type', 'food');
  });

  it('UMMAH section does NOT query providers table', async () => {
    const { supabase } = await import('@/lib/supabase/client');
    await searchProvidersAndCommunityServices('', null, '', 0, 5, undefined, 'ummah');
    expect(supabase.from).not.toHaveBeenCalledWith('providers');
  });

  it('no cross-section leakage: FOOD does not return community services', async () => {
    mockSearchCommunityServices.mockResolvedValue([
      { community_service_id: 'cs-1', community_service_name: 'Mosque', barakah_effects: [], offers_ids: [], needs_ids: [], created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]);

    const { results } = await searchProvidersAndCommunityServices('', null, '', 0, 5, undefined, 'food');
    const communityServiceResults = results.filter((r) => r.type === 'community_service');
    expect(communityServiceResults).toHaveLength(0);
  });
});
