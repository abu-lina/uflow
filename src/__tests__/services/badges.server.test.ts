import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityType } from '@/types/badges';

const logSupabaseErrorMock = vi.fn();

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: (...args: unknown[]) => logSupabaseErrorMock(...args),
}));

// Mock the default client so it doesn't fail in test env
vi.mock('@/lib/supabase/client', () => ({
  supabase: {},
}));

describe('badges.getBadgesForEntity is_active fallback (formerly badges.server)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to query without is_active when column is missing (42703)', async () => {
    const rows = [
      {
        id: 'badge-1',
        provider_id: 'provider-1',
        community_service_id: null,
        trust_level: 'SELF_DECLARED',
        badge_type: { id: 'bt-1', badge_key: 'MUSLIM_OWNED' },
      },
    ];

    const createQueryBuilder = () => {
      const filters: Array<{ column: string; value: unknown }> = [];

      const queryBuilder: {
        select: (value: string) => typeof queryBuilder;
        eq: (column: string, value: unknown) => typeof queryBuilder;
        order: (column: string, options: { ascending: boolean }) => typeof queryBuilder;
        then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>;
      } = {
        select: () => queryBuilder,
        eq: (column, value) => {
          filters.push({ column, value });
          return queryBuilder;
        },
        order: () => queryBuilder,
        then: (onFulfilled, onRejected) => {
          const hasIsActiveFilter = filters.some((entry) => entry.column === 'is_active');

          const payload = hasIsActiveFilter
            ? { data: null, error: { code: '42703', message: 'column provider_badges.is_active does not exist' } }
            : { data: rows, error: null };

          return Promise.resolve(payload).then(onFulfilled, onRejected);
        },
      };

      return queryBuilder;
    };

    const mockClient = {
      from: () => createQueryBuilder(),
    } as never;

    const { getBadgesForEntity } = await import('@/services/badges');
    const result = await getBadgesForEntity('provider-1', EntityType.PROVIDER, mockClient);

    expect(result).toEqual([
      {
        ...rows[0],
        entity_id: 'provider-1',
        entity_type: 'provider',
      },
    ]);
    expect(logSupabaseErrorMock).not.toHaveBeenCalled();
  });
});
