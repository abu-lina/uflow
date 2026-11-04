import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const callerClient = { from };
  return {
    getUserFromCookie: vi.fn(),
    createSupabaseCallerClient: vi.fn(async () => callerClient),
    getSupabaseAdmin: vi.fn(() => {
      throw new Error('service-role client must not be used for initial auth resolution');
    }),
    maybeSingle,
    eq,
    select,
    from,
  };
});

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mocks.getUserFromCookie,
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseCallerClient: mocks.createSupabaseCallerClient,
}));
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import { getInitialAuth } from '@/lib/auth/initial-auth';

describe('getInitialAuth (#570)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null user and null role when nobody is signed in', async () => {
    mocks.getUserFromCookie.mockResolvedValue(null);

    const result = await getInitialAuth();

    expect(result).toEqual({ user: null, role: null });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns null role for a signed-in user — no public.users query runs', async () => {
    const user = { id: 'u-1', email: 'a@b.c' };
    mocks.getUserFromCookie.mockResolvedValue(user);

    const result = await getInitialAuth();

    expect(result.user).toEqual(user);
    expect(result.role).toBeNull();
    expect(mocks.createSupabaseCallerClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not call the service-role admin client', async () => {
    mocks.getUserFromCookie.mockResolvedValue({ id: 'u-2', email: 'b@b.c' });

    await getInitialAuth();

    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
  });
});
