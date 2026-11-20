// @vitest-environment node
/**
 * #1002 — DELETE /api/user/delete-account
 *
 * Account deletion runs on the server with the service-role client. The user id
 * comes from the session only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

import { DELETE } from '@/app/api/user/delete-account/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

type Calls = { table: string; column: string; value: string }[];

function mockAdmin(failOn?: string) {
  const calls: Calls = [];
  const deleteUser = vi.fn(async (id: string) => {
    calls.push({ table: 'auth.users', column: 'id', value: id });
    return { error: failOn === 'auth.users' ? { message: 'auth failed' } : null };
  });
  const admin = {
    from: (table: string) => ({
      delete: () => ({
        eq: async (column: string, value: string) => {
          calls.push({ table, column, value });
          return { error: failOn === table ? { message: `${table} failed` } : null };
        },
      }),
    }),
    auth: { admin: { deleteUser } },
  };
  vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
  return calls;
}

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost:3000/api/user/delete-account', {
    method: 'DELETE',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('DELETE /api/user/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 401 and deletes nothing without a session', async () => {
    vi.mocked(getUserFromCookie).mockResolvedValue(null);
    const calls = mockAdmin();

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("returns 403 and deletes nothing when the body names another user's id", async () => {
    vi.mocked(getUserFromCookie).mockResolvedValue({ id: USER_ID } as never);
    const calls = mockAdmin();

    const res = await DELETE(makeRequest({ userId: OTHER_ID }));

    expect(res.status).toBe(403);
    expect(calls).toEqual([]);
  });

  it("deletes the signed-in user's data and auth user in order and returns success", async () => {
    vi.mocked(getUserFromCookie).mockResolvedValue({ id: USER_ID } as never);
    const calls = mockAdmin();

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(calls).toEqual([
      { table: 'providers', column: 'provider_owner_id', value: USER_ID },
      { table: 'bookmarks', column: 'user_id', value: USER_ID },
      { table: 'users', column: 'user_id', value: USER_ID },
      { table: 'auth.users', column: 'id', value: USER_ID },
    ]);
  });

  it('returns an error and stops when a data step fails part-way', async () => {
    vi.mocked(getUserFromCookie).mockResolvedValue({ id: USER_ID } as never);
    const calls = mockAdmin('bookmarks');

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
    expect(calls.map((c) => c.table)).toEqual(['providers', 'bookmarks']);
  });

  it('returns an error when removing the auth user fails', async () => {
    vi.mocked(getUserFromCookie).mockResolvedValue({ id: USER_ID } as never);
    mockAdmin('auth.users');

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
  });
});
