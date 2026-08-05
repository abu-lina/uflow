import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  getClientIdentifier: vi.fn(() => 'ip:127.0.0.1'),
}));

vi.mock('@/utils/security', () => ({
  getClientIP: vi.fn(() => '127.0.0.1'),
  checkIPBlocked: vi.fn(() => false),
  markSuspiciousIP: vi.fn(),
  unblockIP: vi.fn(),
}));

describe('POST /api/auth/login role sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[pre-fix FAILS, post-fix PASSES] syncs DB role to auth user_metadata.role when mismatched', async () => {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com', password: 'Password123!' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(updateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: {
        language: 'en',
        role: 'moderator',
      },
    });
  });
});
