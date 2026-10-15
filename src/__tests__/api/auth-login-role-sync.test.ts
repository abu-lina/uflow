import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkIPBlocked } from '@/utils/security';

const mockCreateSupabaseServerClient = vi.fn();
const mockGetSupabaseAdmin = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => mockCreateSupabaseServerClient(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockGetSupabaseAdmin(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => 'ip:203.0.113.77'),
}));

vi.mock('@/utils/security', () => ({
  getClientIP: vi.fn(() => '203.0.113.77'),
  checkIPBlocked: vi.fn(() => false),
  markSuspiciousIP: vi.fn(),
  unblockIP: vi.fn(),
}));

describe('POST /api/auth/login role metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(checkIPBlocked).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not write the DB role to auth user metadata', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const fromChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: 'moderator' },
            error: null,
          }),
        }),
      }),
    };

    const supabaseAdmin = {
      from: vi.fn(() => fromChain),
      auth: {
        admin: {
          updateUserById,
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        },
      },
    };

    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@test.com',
          user_metadata: { language: 'en' },
        },
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      },
      error: null,
    });

    const supabaseServerClient = {
      auth: {
        signInWithPassword,
      },
    };

    mockGetSupabaseAdmin.mockReturnValue(supabaseAdmin);
    mockCreateSupabaseServerClient.mockReturnValue(supabaseServerClient);

    const { POST } = await import('@/app/api/auth/login/route');

    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.77' },
      body: JSON.stringify({ email: 'user@test.com', password: 'Password123!' }),
    });

    vi.stubEnv('NODE_ENV', 'development');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(updateUserById).not.toHaveBeenCalled();

    const loggedOutput = JSON.stringify([
      vi.mocked(console.log).mock.calls,
      vi.mocked(console.info).mock.calls,
      vi.mocked(console.warn).mock.calls,
      vi.mocked(console.error).mock.calls,
      vi.mocked(console.debug).mock.calls,
    ]);
    expect(loggedOutput).toContain('user-1');
    expect(loggedOutput).not.toContain('user@test.com');
    expect(loggedOutput).not.toContain('u***@test.com');

    const { getClientIdentifier } = await import('@/lib/rate-limit');
    expect(getClientIdentifier).toHaveBeenCalledWith(req);
    expect(checkRateLimit).toHaveBeenCalledWith('ip:203.0.113.77', 10, 15 * 60 * 1000, 'login');
    expect(checkIPBlocked).toHaveBeenCalledWith('203.0.113.77');
  });

  it.each([
    ['blocked IP', true, true, { email: 'pii-probe@example.test', password: 'Password123!' }, 403],
    [
      'rate limited',
      false,
      false,
      { email: 'pii-probe@example.test', password: 'Password123!' },
      429,
    ],
    ['invalid email', true, false, { email: 'not-an-email', password: 'Password123!' }, 400],
  ] as const)(
    'does not log PII when login is %s',
    async (_name, allowed, blocked, body, status) => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.mocked(checkRateLimit).mockReturnValue(allowed);
      vi.mocked(checkIPBlocked).mockReturnValue(blocked);
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'info').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const { POST } = await import('@/app/api/auth/login/route');
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.77' },
        body: JSON.stringify(body),
      });

      const response = await POST(request);
      expect(response.status).toBe(status);
      const logs = JSON.stringify([
        vi.mocked(console.log).mock.calls,
        vi.mocked(console.info).mock.calls,
        vi.mocked(console.warn).mock.calls,
        vi.mocked(console.error).mock.calls,
        vi.mocked(console.debug).mock.calls,
      ]);
      expect(logs).not.toContain('pii-probe@example.test');
      expect(logs).not.toContain('203.0.113.77');
      expect(logs).not.toContain('not-an-email');
    },
  );
});
