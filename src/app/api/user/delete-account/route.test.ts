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
import { checkRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => 'user:test'),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

function mockAdmin({ logError = false, deleteError = false } = {}) {
  const calls: string[] = [];
  const insert = vi.fn(async () => {
    calls.push('deletion_logs');
    return { error: logError ? { message: 'insert failed' } : null };
  });
  const deleteUser = vi.fn(async () => {
    calls.push('deleteUser');
    return { error: deleteError ? { message: 'auth failed' } : null };
  });
  const from = vi.fn(() => ({ insert }));
  vi.mocked(getSupabaseAdmin).mockReturnValue({
    from,
    auth: { admin: { deleteUser } },
  } as never);
  return { calls, from, insert, deleteUser };
}

function makeRequest({ origin, body }: { origin?: string; body?: string } = {}) {
  const headers: Record<string, string> = { host: 'localhost:3000' };
  if (origin) headers.origin = origin;
  return new NextRequest('http://localhost:3000/api/user/delete-account', {
    method: 'DELETE',
    body,
    headers,
  });
}

function signedIn() {
  vi.mocked(getUserFromCookie).mockResolvedValue({ id: USER_ID } as never);
}

describe('DELETE /api/user/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 401 and deletes nothing without a session', async () => {
    vi.mocked(getUserFromCookie).mockResolvedValue(null);
    const { calls } = mockAdmin();

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('returns 403 and deletes nothing for a cross-origin request', async () => {
    signedIn();
    const { calls } = mockAdmin();

    const res = await DELETE(makeRequest({ origin: 'https://example.com' }));

    expect(res.status).toBe(403);
    expect(calls).toEqual([]);
  });

  it('accepts a same-origin request behind a proxy chain in x-forwarded-host', async () => {
    signedIn();
    const { deleteUser } = mockAdmin();
    const req = new NextRequest('http://internal:3000/api/user/delete-account', {
      method: 'DELETE',
      headers: {
        host: 'internal:3000',
        origin: 'https://ummahflow.com',
        'x-forwarded-host': 'ummahflow.com, internal:3000',
      },
    });

    const res = await DELETE(req);

    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('returns 429 and deletes nothing when rate limited', async () => {
    signedIn();
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const { calls } = mockAdmin();

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(429);
    expect(calls).toEqual([]);
  });

  it('returns a JSON 500 when the admin client is not configured', async () => {
    signedIn();
    vi.mocked(getSupabaseAdmin).mockImplementation(() => {
      throw new Error('Missing Supabase environment variables for admin client');
    });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to delete account' });
  });

  it("deletes the signed-in user's auth user, logs it first and clears the session cookies", async () => {
    signedIn();
    const { calls, from, insert, deleteUser } = mockAdmin();

    const res = await DELETE(makeRequest({ origin: 'http://localhost:3000' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(calls).toEqual(['deletion_logs', 'deleteUser']);
    expect(from).toHaveBeenCalledWith('deletion_logs');
    expect(insert).toHaveBeenCalledWith({
      user_id: USER_ID,
      reason: 'User requested account deletion',
    });
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
    expect(res.cookies.get('sb-access-token')?.value).toBe('');
    expect(res.cookies.get('sb-refresh-token')?.value).toBe('');
  });

  it('ignores a malformed body and still deletes only the session user', async () => {
    signedIn();
    const { deleteUser } = mockAdmin();

    const res = await DELETE(makeRequest({ body: '{not json' }));

    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('still deletes the account when the audit row cannot be written', async () => {
    signedIn();
    const { deleteUser } = mockAdmin({ logError: true });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('returns 500 and keeps the session cookies when removing the auth user fails', async () => {
    signedIn();
    mockAdmin({ deleteError: true });

    const res = await DELETE(makeRequest());

    expect(res.status).toBe(500);
    expect(res.cookies.get('sb-access-token')).toBeUndefined();
  });
});
