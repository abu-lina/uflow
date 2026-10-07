import { describe, it, expect, vi, beforeEach } from 'vitest';

// The initial-auth resolver must use the request-scoped caller client (RLS
// self-read on public.users), never the service-role client.
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

describe('getInitialAuth (#567)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'user' }, error: null });
  });

  it('resolves the role from public.users via the request-scoped caller client', async () => {
    const user = { id: 'u-1', email: 'a@b.c' };
    mocks.getUserFromCookie.mockResolvedValue(user);
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });

    const result = await getInitialAuth();

    expect(result.user).toEqual(user);
    expect(result.role).toBe('admin');
    expect(mocks.createSupabaseCallerClient).toHaveBeenCalled();
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith('users');
    expect(mocks.select).toHaveBeenCalledWith('role');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'u-1');
  });

  it('defaults to user role when the users row is missing', async () => {
    mocks.getUserFromCookie.mockResolvedValue({ id: 'u-2', email: 'b@b.c' });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getInitialAuth();

    expect(result.role).toBe('user');
  });

  it('fails closed to user role when the role query errors', async () => {
    mocks.getUserFromCookie.mockResolvedValue({ id: 'u-3', email: 'c@b.c' });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'rls denied' } });

    const result = await getInitialAuth();

    expect(result.role).toBe('user');
    expect(result.user?.id).toBe('u-3');
  });

  it('returns null user and null role when nobody is signed in', async () => {
    mocks.getUserFromCookie.mockResolvedValue(null);

    const result = await getInitialAuth();

    expect(result).toEqual({ user: null, role: null });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
