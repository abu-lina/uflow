import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityType } from '@/types/badges';

const createSupabaseServerClientMock = vi.fn();
const logSupabaseErrorMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => createSupabaseServerClientMock(),
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: (...args: unknown[]) => logSupabaseErrorMock(...args),
}));

describe('badges.server getBadgesForEntityServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[pre-fix FAILS] falls back to query without is_active when column is missing (42703)', async () => {
    const rows = [
      {
        id: 'badge-1',
        entity_id: 'provider-1',
        entity_type: 'provider',
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

    createSupabaseServerClientMock.mockReturnValue({
      from: () => createQueryBuilder(),
    });

    const { getBadgesForEntityServer } = await import('@/services/badges.server');
    const result = await getBadgesForEntityServer('provider-1', EntityType.PROVIDER);

    expect(result).toEqual(rows);
    expect(logSupabaseErrorMock).not.toHaveBeenCalled();
  });
});
