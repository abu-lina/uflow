import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => mockSelect(...args),
      insert: (...args: unknown[]) => mockInsert(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    })),
  },
}));

describe('bookmarks service phase 3 typed FKs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockReturnValue({
      eq: (...args: unknown[]) => mockEq(...args),
    });

    mockEq
      .mockReturnValueOnce({ eq: (...args: unknown[]) => mockEq(...args) })
      .mockReturnValueOnce({ single: (...args: unknown[]) => mockSingle(...args) })
      .mockReturnValue({ single: (...args: unknown[]) => mockSingle(...args) });

    mockSingle.mockResolvedValue({ data: null, error: null });

    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'b1',
        provider_id: 'p1',
        user_id: 'u1',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });
    const insertSelect = vi.fn(() => ({ single: insertSingle }));
    mockInsert.mockReturnValue({ select: insertSelect });

    mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  });

  it('[pre-fix FAILS] getBookmarkForProvider filters on provider_id (typed FK)', async () => {
    const { getBookmarkForProvider } = await import('@/services/bookmarks');
    await getBookmarkForProvider('p1', 'u1');

    expect(mockSelect).toHaveBeenCalledWith('id, provider_id, community_service_id, user_id, created_at');
    expect(mockEq).toHaveBeenCalledWith('provider_id', 'p1');
  });

  it('[pre-fix FAILS] toggleBookmarkForProvider inserts provider_id instead of polymorphic columns', async () => {
    const { toggleBookmarkForProvider } = await import('@/services/bookmarks');
    await toggleBookmarkForProvider('p1', 'u1');

    expect(mockInsert).toHaveBeenCalledWith([{ provider_id: 'p1', community_service_id: null, user_id: 'u1' }]);
  });
});
