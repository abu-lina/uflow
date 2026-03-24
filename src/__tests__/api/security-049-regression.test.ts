/**
 * Security Regression Tests for Plan 049
 *
 * Covers all critical and high-severity findings from Security Audit 049.
 * Each test verifies the security behavior AFTER remediation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock getUserFromCookie
const mockGetUserFromCookie = vi.fn();
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: () => mockGetUserFromCookie(),
}));

// Mock isAdminOrModerator
const mockIsAdminOrModerator = vi.fn();
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: (userId: string) => mockIsAdminOrModerator(userId),
}));

// Mock getSupabaseAdmin
const mockSupabaseAdmin = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  auth: {
    admin: {
      listUsers: vi.fn(),
      getUserById: vi.fn(),
    },
  },
};
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockSupabaseAdmin,
}));

// Mock sendAuthEmail
vi.mock('@/services/emailService', () => ({
  sendAuthEmail: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
}));

// Mock rate-limit
const mockCheckRateLimit = vi.fn().mockReturnValue(true);
const mockGetClientIdentifier = vi.fn().mockReturnValue('ip:127.0.0.1');
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
  getRemainingRequests: vi.fn().mockReturnValue(10),
  rateLimiters: {
    pushSend: {
      perMinute: vi.fn().mockReturnValue(true),
      perHour: vi.fn().mockReturnValue(true),
    },
  },
}));

// Mock Supabase server client for push/send
const mockSupabaseServerAuth = {
  auth: {
    getUser: vi.fn(),
  },
};
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => mockSupabaseServerAuth,
}));

// Mock web-push
vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

// Mock push notification validators
vi.mock('@/lib/validations/push-notifications', () => ({
  validateNotificationTitle: (v: string) => v,
  validateNotificationBody: (v: string) => v,
  validateUserIds: (v: string | string[]) => (Array.isArray(v) ? v : [v]),
  validateNotificationUrl: (v: string | undefined) => v,
  validateNotificationTag: (v: string | undefined) => v,
  validateNotificationImageUrl: (v: string | undefined) => v,
}));

// Mock security utils
vi.mock('@/utils/security', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  checkIPBlocked: vi.fn().mockReturnValue(false),
  getAllBlockedIPs: vi.fn().mockReturnValue([]),
  clearAllBlockedIPs: vi.fn(),
}));

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: () => 'mock-token-hex-value-1234567890abcdef',
    }),
  },
}));

// Set env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.NEXT_PUBLIC_SITE_URL = 'https://ummahflow.com';
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public';
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>): Request {
  return new Request('http://localhost:3000/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// ─── F-049-01: set-role authorization ────────────────────────────────────────

describe('F-049-01: /api/admin/set-role authorization gate', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh module
    const mod = await import('@/app/api/admin/set-role/route');
    POST = mod.POST;
  });

  it('[post-fix] rejects unauthenticated caller with 401', async () => {
    mockGetUserFromCookie.mockResolvedValue(null);

    const res = await POST(makeRequest({ role: 'admin' }));
    expect(res.status).toBe(401);
  });

  it('[post-fix] rejects non-admin authenticated user with 403', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'user-123', email: 'user@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(false);

    const res = await POST(makeRequest({ role: 'admin' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin|moderator|forbidden/i);
  });

  it('[post-fix] allows admin user to set role', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-123', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);

    // Mock the chain of Supabase calls for getUserById and from().select().eq().single()
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: 'target-user', email: 'target@test.com' } },
      error: null,
    });
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 1, user_id: 'target-user', email: 'target@test.com', role: 'user' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 1, user_id: 'target-user', role: 'moderator' },
              error: null,
            }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ userId: 'target-user', role: 'moderator' }));
    expect(res.status).toBe(200);
  });
});

// ─── F-049-02: send-auth-email rate limiting ─────────────────────────────────

describe('F-049-02: /api/send-auth-email rate limiting', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/send-auth-email/route');
    POST = mod.POST;
  });

  it('[post-fix] rejects when rate limited with 429', async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const res = await POST(
      makeRequest({
        to: 'user@test.com',
        type: 'confirmSignup',
        language: 'en',
        confirmationUrl: 'https://ummahflow.com/confirm?token=abc',
      })
    );
    expect(res.status).toBe(429);
  });

  it('[post-fix] ignores client-supplied confirmationUrl and uses server-derived URL', async () => {
    mockCheckRateLimit.mockReturnValue(true);
    const { sendAuthEmail } = await import('@/services/emailService');

    const res = await POST(
      makeRequest({
        to: 'user@test.com',
        type: 'confirmSignup',
        language: 'en',
        confirmationUrl: 'https://evil.com/phish?token=abc',
      })
    );
    // Must succeed (valid inputs, rate limit not exceeded)
    expect(res.status).toBe(200);

    // sendAuthEmail must have been called with a URL that contains ummahflow.com, not evil.com
    const calls = vi.mocked(sendAuthEmail).mock.calls;
    expect(calls.length).toBe(1);
    const usedUrl = calls[0][3]; // 4th argument is confirmationUrl
    expect(usedUrl).not.toContain('evil.com');
    expect(usedUrl).toContain('ummahflow.com');
  });
});

// ─── F-049-02: generate-confirmation-token rate limiting ─────────────────────

describe('F-049-02: /api/generate-confirmation-token rate limiting', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    const mod = await import('@/app/api/generate-confirmation-token/route');
    POST = mod.POST;
  });

  it('[post-fix] rejects when rate limited with 429', async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const res = await POST(
      makeRequest({ email: 'user@test.com', type: 'signup' })
    );
    expect(res.status).toBe(429);
  });
});

// ─── F-049-05: push/send server-authoritative auth ───────────────────────────

describe('F-049-05: /api/push/send authorization trust boundary', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (request: any) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to pick up mocks
    const mod = await import('@/app/api/push/send/route');
    POST = mod.POST as typeof POST;
  });

  it('[pre-fix FAILS, post-fix PASSES] rejects user_metadata.role=admin if DB says user role', async () => {
    // Simulate: user has user_metadata.role = 'admin' (client-mutable!)
    // but is NOT actually admin/moderator in the database
    mockSupabaseServerAuth.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'attacker-id',
          user_metadata: { role: 'admin' },
        },
      },
      error: null,
    });
    mockIsAdminOrModerator.mockResolvedValue(false); // DB says NOT admin

    const req = new Request('http://localhost:3000/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds: ['victim-id'],
        title: 'Test',
        body: 'Test body',
      }),
    });

    const res = await POST(req);
    // After fix: should be 403 because DB says not admin
    expect(res.status).toBe(403);
  });
});

// ─── F-049-03: Hardcoded debug key removal ───────────────────────────────────

describe('F-049-03: Debug endpoint hardcoded key removal', () => {
  it('[post-fix] debug-ip-status rejects when ADMIN_DEBUG_KEY env var is not set', async () => {
    // Remove the env var to simulate production without it
    const origKey = process.env.ADMIN_DEBUG_KEY;
    delete process.env.ADMIN_DEBUG_KEY;

    const { GET } = await import('@/app/api/auth/debug-ip-status/route');
    const req = new Request('http://localhost:3000/api/auth/debug-ip-status?list=all', {
      headers: { 'x-admin-key': 'debug-key-change-in-production' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);

    // Restore
    if (origKey !== undefined) process.env.ADMIN_DEBUG_KEY = origKey;
  });
});

// ─── F-049-04: User enumeration ──────────────────────────────────────────────

describe('F-049-04: /api/check-email-exists user enumeration', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/check-email-exists/route');
    POST = mod.POST;
  });

  it('[post-fix] does not reveal whether email exists', async () => {
    // Mock: user NOT found
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const resNotFound = await POST(makeRequest({ email: 'noone@test.com' }));
    const bodyNotFound = await resNotFound.json();

    // Mock: user found but NOT confirmed
    mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-1',
            email: 'unconfirmed@test.com',
            email_confirmed_at: null,
          },
        ],
      },
      error: null,
    });

    const resUnconfirmed = await POST(makeRequest({ email: 'unconfirmed@test.com' }));
    const bodyUnconfirmed = await resUnconfirmed.json();

    // Both "not found" and "not confirmed" should return identical responses
    expect(resNotFound.status).toBe(resUnconfirmed.status);
    expect(bodyNotFound.confirmed).toBe(bodyUnconfirmed.confirmed);
    expect(bodyNotFound.confirmed).toBe(false);
    // Must NOT reveal userId or exists field
    expect(bodyNotFound).not.toHaveProperty('exists');
    expect(bodyNotFound).not.toHaveProperty('userId');
    expect(bodyUnconfirmed).not.toHaveProperty('exists');
    expect(bodyUnconfirmed).not.toHaveProperty('userId');
  });
});

// ─── F-049-07: Instagram scrape input validation ─────────────────────────────

describe('F-049-07: /api/instagram/scrape input validation', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: (request: any) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/instagram/scrape/route');
    POST = mod.POST as typeof POST;
  });

  it('[post-fix] rejects malformed username with path traversal', async () => {
    const res = await POST(makeRequest({ username: '../../../etc/passwd' }));
    expect(res.status).toBe(400);
  });

  it('[post-fix] rejects username with URL injection', async () => {
    const res = await POST(makeRequest({ username: 'user?__a=1&evil=true' }));
    expect(res.status).toBe(400);
  });

  it('[post-fix] accepts valid Instagram username', async () => {
    // This will likely fail because of network call, but it should NOT return 400
    const res = await POST(makeRequest({ username: 'valid_user.123' }));
    expect(res.status).not.toBe(400);
  });
});
