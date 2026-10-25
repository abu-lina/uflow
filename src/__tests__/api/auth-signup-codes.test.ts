/**
 * Regression tests for issue #577, AC5.
 *
 * /api/auth/signup returned English prose in `error`, which the client
 * printed raw regardless of locale. The route now returns a stable opaque
 * `code` alongside a safe generic `error`, and never leaks internals
 * (Supabase errors, validation detail) to the client.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockListUsers = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(null));
const mockCreateUser = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(null));
const mockInsert = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(null));
const mockCheckRateLimit = vi.fn((..._args: unknown[]) => true);
const mockCheckIPBlocked = vi.fn((..._args: unknown[]) => false);
const mockMarkSuspiciousIP = vi.fn((..._args: unknown[]) => {});
const mockIsDisposableEmail = vi.fn((..._args: unknown[]) => false);

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
      },
    },
    from: () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
    }),
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip')}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: (...args: unknown[]) => mockCheckIPBlocked(...args),
  markSuspiciousIP: (...args: unknown[]) => mockMarkSuspiciousIP(...args),
  isDisposableEmail: (...args: unknown[]) => mockIsDisposableEmail(...args),
  validatePasswordComplexity: (password: string) =>
    password.length < 8
      ? {
          valid: false,
          error: 'Password must be at least 8 characters long',
          code: 'PASSWORD_TOO_SHORT',
        }
      : { valid: true },
  isSuspiciousTiming: () => false,
}));

import { POST } from '@/app/api/auth/signup/route';

// Signs the resend capability the signup route issues (#746)
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.77' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: 'new@example.com',
  password: 'abcd1234',
  language: 'en',
  honeypot: '',
  termsAccepted: true,
  privacyAccepted: true,
};

// Sentinel codes must be opaque identifiers only
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

describe('POST /api/auth/signup — sentinel error codes (issue #577)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    mockCheckRateLimit.mockReturnValue(true);
    mockCheckIPBlocked.mockReturnValue(false);
    mockIsDisposableEmail.mockReturnValue(false);
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: VALID_BODY.email } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns CONSENT_REQUIRED when consent flags are missing', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, termsAccepted: false }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('CONSENT_REQUIRED');
    expect(body.code).toMatch(CODE_PATTERN);
  });

  it('returns EMAIL_INVALID for a malformed email', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('EMAIL_INVALID');
    const loggedOutput = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(loggedOutput).not.toContain('not-an-email');
  });

  it('returns PASSWORD_REQUIRED when password is missing', async () => {
    const res = await POST(
      makeRequest({
        email: 'new@example.com',
        password: undefined,
        termsAccepted: true,
        privacyAccepted: true,
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('PASSWORD_REQUIRED');
  });

  it('returns a password rule code for a weak password', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: 'short' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('PASSWORD_TOO_SHORT');
  });

  it('returns EMAIL_ALREADY_REGISTERED when the user exists', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [{ email: VALID_BODY.email }] },
      error: null,
    });
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('never leaks Supabase internals on createUser failure', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'duplicate key value violates unique constraint "users_pkey"' },
    });
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe('SIGNUP_FAILED');
    expect(JSON.stringify(body)).not.toContain('users_pkey');
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });

  it('returns SIGNUP_FAILED with no internals on unexpected exceptions', async () => {
    mockListUsers.mockRejectedValue(new Error('connection to db.internal:5432 refused'));
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe('SIGNUP_FAILED');
    expect(JSON.stringify(body)).not.toContain('db.internal');
  });

  it('keeps success behaviour unchanged and logs the user ID, not email', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userId).toBe('u-1');

    const loggedOutput = JSON.stringify(vi.mocked(console.log).mock.calls);
    expect(loggedOutput).toContain('u-1');
    expect(loggedOutput).not.toContain(VALID_BODY.email);
    expect(loggedOutput).not.toContain('n***@example.com');
  });

  it('keeps full IP for abuse checks and excludes PII from success logs', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(mockCheckIPBlocked).toHaveBeenCalledWith('203.0.113.77');
    expect(mockCheckRateLimit).toHaveBeenCalledWith('ip:203.0.113.77', 3, 60 * 60 * 1000, 'signup');
    const loggedOutput = JSON.stringify([
      vi.mocked(console.log).mock.calls,
      vi.mocked(console.info).mock.calls,
      vi.mocked(console.error).mock.calls,
      vi.mocked(console.warn).mock.calls,
      vi.mocked(console.debug).mock.calls,
    ]);
    expect(loggedOutput).toContain('u-1');
    expect(loggedOutput).not.toContain(VALID_BODY.email);
    expect(loggedOutput).not.toContain('n***@example.com');
    expect(loggedOutput).not.toContain('203.0.113.77');
  });

  it.each([
    ['rate limited', 'development', false, '', true, 429],
    ['blocked IP', 'production', true, '', true, 403],
    ['honeypot', 'development', false, 'filled', false, 400],
    ['disposable email', 'development', false, '', true, 400],
  ] as const)(
    'does not log PII when signup is %s',
    async (_name, nodeEnv, blocked, honeypot, disposable, status) => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      mockCheckIPBlocked.mockReturnValue(blocked);
      mockCheckRateLimit.mockReturnValue(!(_name === 'rate limited'));
      mockIsDisposableEmail.mockReturnValue(disposable);

      const res = await POST(
        makeRequest({
          ...VALID_BODY,
          email: 'pii-probe@example.test',
          honeypot,
        }),
      );

      expect(res.status).toBe(status);
      const loggedOutput = JSON.stringify([
        vi.mocked(console.log).mock.calls,
        vi.mocked(console.info).mock.calls,
        vi.mocked(console.error).mock.calls,
        vi.mocked(console.warn).mock.calls,
        vi.mocked(console.debug).mock.calls,
      ]);
      expect(loggedOutput).not.toContain('pii-probe@example.test');
      expect(loggedOutput).not.toContain('203.0.113.77');
    },
  );
});
