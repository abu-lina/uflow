/** #722 review: signup posts a supported auth-email language. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async () => ({
          data: { user: { id: 'u-1', email: 'new@example.com' } },
          error: null,
        }),
      },
    },
    from: () => ({ insert: async () => ({ error: null }) }),
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: () => 'ip:test',
}));

vi.mock('@/utils/security', () => ({
  getClientIP: () => '203.0.113.77',
  checkIPBlocked: () => false,
  markSuspiciousIP: vi.fn(),
  isDisposableEmail: () => false,
  validatePasswordComplexity: () => ({ valid: true }),
  isSuspiciousTiming: () => false,
}));

import { POST } from '@/app/api/auth/signup/route';

const signup = (language: string) =>
  POST(
    new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.77' },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'abcd1234',
        language,
        honeypot: '',
        termsAccepted: true,
        privacyAccepted: true,
      }),
    })
  );

const sentLanguage = () => {
  const call = mockFetch.mock.calls.find(([url]) => String(url).endsWith('/api/send-auth-email'));
  return call ? JSON.parse(call[1].body).language : undefined;
};

describe('POST /api/auth/signup email language (#722 review)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of ['error', 'log', 'warn', 'info', 'debug'] as const) {
      vi.spyOn(console, m).mockImplementation(() => {});
    }
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3001');
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends en for a ur signup', async () => {
    await signup('ur');
    expect(sentLanguage()).toBe('en');
  });

  it('keeps de for a de signup', async () => {
    await signup('de');
    expect(sentLanguage()).toBe('de');
  });
});
