import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockSearch } = vi.hoisted(() => ({ mockSearch: vi.fn() }));
vi.mock('@/services/providers', () => ({ searchProvidersAndCommunityServices: mockSearch }));
vi.mock('@/lib/supabase/getUserFromCookie', () => ({ getUserFromCookie: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdminOrModerator: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => ({}) }));

import { GET } from '@/app/api/providers/search/route';

const call = async (qs: string) => {
  mockSearch.mockResolvedValue({ results: [], hasMore: false });
  await GET(new Request(`http://localhost:3000/api/providers/search${qs}`));
  const args = mockSearch.mock.calls[0];
  return { page: args[3], pageSize: args[4] };
};

describe('#953 route bounds page and pageSize (page is 0-indexed)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('caps pageSize at 50 so a huge value cannot build an oversized .in() URL', async () => {
    expect((await call('?pageSize=100000')).pageSize).toBe(50);
  });

  it('keeps the admin hook size of 50', async () => {
    expect((await call('?pageSize=50')).pageSize).toBe(50);
  });

  it('raises pageSize below 1 to the default', async () => {
    expect((await call('?pageSize=0')).pageSize).toBe(12);
    expect((await call('?pageSize=-5')).pageSize).toBe(12);
  });

  it('turns a negative or non-numeric page into 0', async () => {
    expect((await call('?page=-3')).page).toBe(0);
    expect((await call('?page=abc')).page).toBe(0);
  });
});
