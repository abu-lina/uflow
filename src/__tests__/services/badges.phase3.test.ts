import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityType, TrustLevel } from '@/types/badges';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockSingle = vi.fn();
const mockIn = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => mockSelect(...args),
      insert: (...args: unknown[]) => mockInsert(...args),
    })),
  },
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

describe('badges service phase 3 typed FKs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({
      eq: (...args: unknown[]) => mockEq(...args),
      in: (...args: unknown[]) => mockIn(...args),
    });

    mockEq.mockReturnValue({
      eq: (...args: unknown[]) => mockEq(...args),
      order: (...args: unknown[]) => mockOrder(...args),
    });

    mockIn.mockReturnValue({
      eq: (...args: unknown[]) => mockEq(...args),
      order: (...args: unknown[]) => mockOrder(...args),
    });

    mockOrder.mockResolvedValue({ data: [], error: null });

    const insertSelect = vi.fn(() => ({ single: (...args: unknown[]) => mockSingle(...args) }));
    mockInsert.mockReturnValue({ select: insertSelect });
    mockSingle.mockResolvedValue({
      data: {
        id: 'badge-1',
        provider_id: 'provider-1',
        community_service_id: null,
        badge_type_id: 'bt-1',
        trust_level: TrustLevel.SELF_DECLARED,
        confirmation_count: 0,
      },
      error: null,
    });
  });

  it('[pre-fix FAILS] getBadgesForEntity filters on provider_id for provider badges', async () => {
    const { getBadgesForEntity } = await import('@/services/badges');
    await getBadgesForEntity('provider-1', EntityType.PROVIDER);

    expect(mockEq).toHaveBeenCalledWith('provider_id', 'provider-1');
  });

  it('[pre-fix FAILS] createProviderBadge inserts typed FK payload', async () => {
    const { createProviderBadge } = await import('@/services/badges');

    await createProviderBadge({
      entity_id: 'provider-1',
      entity_type: EntityType.PROVIDER,
      badge_type_id: 'bt-1',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_id: 'provider-1',
        community_service_id: null,
        badge_type_id: 'bt-1',
      })
    );
  });
});
