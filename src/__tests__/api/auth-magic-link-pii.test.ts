import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCheckRateLimit = vi.fn((..._args: unknown[]) => true);
const mockCheckIPBlocked = vi.fn((..._args: unknown[]) => false);
const mockIsDisposableEmail = vi.fn((..._args: unknown[]) => false);
const mockListUsers = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(null));
const mockCreateUser = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(null));
const mockInsert = vi.fn((..._args: unknown[]): Promise<{ error: { code: string } | null }> =>
  Promise.resolve({ error: null }),
);
const mockSendAuthEmail = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ data: { id: 'email-1' }, error: null }),
);

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip') || 'unknown'}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: (...args: unknown[]) => mockCheckIPBlocked(...args),
  markSuspiciousIP: vi.fn(),
  isDisposableEmail: (...args: unknown[]) => mockIsDisposableEmail(...args),
  isSuspiciousTiming: () => false,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
      },
    },
    from: (table: string) => ({
      insert: (...args: unknown[]) => {
        mockInsert(table, ...args);
        return table === 'consent_logs'
          ? Promise.resolve({ error: null })
          : { select: () => ({ single: async () => ({ error: null }) }) };
      },
    }),
  }),
}));

vi.mock('@/services/emailService', () => ({
  sendAuthEmail: (...args: unknown[]) => mockSendAuthEmail(...args),
}));

import { POST } from '@/app/api/auth/magic-link/route';

const EMAIL = 'pii-probe@example.test';
const IP = '203.0.113.77';

function makeRequest(email: string = EMAIL): Request {
  return new Request('http://localhost/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': IP,
      origin: 'http://localhost',
    },
    body: JSON.stringify({ email, language: 'en' }),
  });
}

function capturedLogs(): string {
  return JSON.stringify([
    vi.mocked(console.log).mock.calls,
    vi.mocked(console.info).mock.calls,
    vi.mocked(console.warn).mock.calls,
    vi.mocked(console.error).mock.calls,
    vi.mocked(console.debug).mock.calls,
  ]);
}

describe('POST /api/auth/magic-link PII logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockCheckIPBlocked.mockReturnValue(false);
    mockIsDisposableEmail.mockReturnValue(false);
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValue({
      data: {
        user: {
          id: 'magic-user-1',
          email: EMAIL,
          email_confirmed_at: null,
          user_metadata: {},
        },
      },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('keeps success behaviour and abuse checks unchanged without logging raw PII', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockCheckIPBlocked).toHaveBeenCalledWith(IP);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(`ip:${IP}`, 10, 60 * 60 * 1000, 'magic-link');
    const logs = capturedLogs();
    expect(logs).toContain('magic-user-1');
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
  });

  it.each([
    ['blocked IP', 'production', 'blocked', false, EMAIL, 403],
    ['rate limited', 'development', 'allowed', true, EMAIL, 429],
    ['invalid email', 'development', 'allowed', false, 'not-an-email', 400],
    ['disposable email', 'development', 'allowed', false, EMAIL, 400],
  ] as const)(
    'does not log PII when magic-link request is %s',
    async (_name, nodeEnv, ipStatus, rateLimited, email, status) => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      mockCheckIPBlocked.mockReturnValue(ipStatus === 'blocked');
      mockCheckRateLimit.mockReturnValue(!rateLimited);
      mockIsDisposableEmail.mockReturnValue(_name === 'disposable email');

      const response = await POST(makeRequest(email));

      expect(response.status).toBe(status);
      const logs = capturedLogs();
      expect(logs).not.toContain(EMAIL);
      expect(logs).not.toContain(IP);
    },
  );

  it('returns a generic error when user creation fails', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: `${EMAIL} internal-detail-xyz` },
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to create user' });
    expect(JSON.stringify(body)).not.toContain(EMAIL);
    expect(JSON.stringify(body)).not.toContain('internal-detail-xyz');
  });

  it('omits the caller IP from rate-limit responses', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mockCheckRateLimit.mockReturnValue(false);

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: 'Too many magic link requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      limit: 10,
      window: '60 minutes',
      message:
        'You have exceeded the limit of 10 requests per 60 minutes. Please wait before trying again.',
    });
    expect(JSON.stringify(body)).not.toContain(IP);
  });
});
