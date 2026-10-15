import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSupabaseAdmin = vi.fn();
const mockCheckRateLimit = vi.fn((..._args: unknown[]) => true);

const tokenData = {
  id: 'token-1',
  user_id: 'user-1',
  email: 'pii-probe@example.test',
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  used: false,
};

const query = {
  select: vi.fn(() => query),
  eq: vi.fn(() => query),
  maybeSingle: vi.fn(async () => ({ data: tokenData, error: null })),
  update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
  insert: vi.fn(async () => ({ error: null })),
};

const admin = {
  auth: {
    admin: {
      updateUserById: vi.fn(async () => ({ error: null })),
      listUsers: vi.fn(async () => ({
        data: {
          users: [
            {
              id: 'user-1',
              email: 'pii-probe@example.test',
              email_confirmed_at: new Date().toISOString(),
              user_metadata: {},
            },
          ],
        },
        error: null,
      })),
    },
  },
  from: vi.fn(() => query),
};

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockGetSupabaseAdmin(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip') || 'unknown'}`,
}));

type Handler = (request: Request) => Promise<Response>;

let confirmEmail: Handler;
let checkEmailExists: Handler;
let generateToken: Handler;
let resetPassword: Handler;

const EMAIL = 'pii-probe@example.test';
const IP = '203.0.113.77';

function request(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': IP },
    body: JSON.stringify(body),
  });
}

function loggedOutput(): string {
  return JSON.stringify([
    vi.mocked(console.log).mock.calls,
    vi.mocked(console.info).mock.calls,
    vi.mocked(console.warn).mock.calls,
    vi.mocked(console.error).mock.calls,
    vi.mocked(console.debug).mock.calls,
  ]);
}

describe('authentication routes do not log email or IP', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ POST: confirmEmail } = await import('@/app/api/confirm-email/route'));
    ({ POST: checkEmailExists } = await import('@/app/api/check-email-exists/route'));
    ({ POST: generateToken } = await import('@/app/api/generate-confirmation-token/route'));
    ({ POST: resetPassword } = await import('@/app/api/auth/reset-password/route'));
    vi.clearAllMocks();
    mockGetSupabaseAdmin.mockReturnValue(admin);
    mockCheckRateLimit.mockReturnValue(true);
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

  it('preserves password reset responses and redacts success and early-rejection logs', async () => {
    const success = await resetPassword(
      request('auth/reset-password', { token: 'reset-token', email: EMAIL, password: 'abc123' }),
    );
    expect(success.status).toBe(200);

    const invalid = await resetPassword(
      request('auth/reset-password', {
        token: 'reset-token',
        email: 'invalid-email',
        password: 'abc123',
      }),
    );
    expect(invalid.status).toBe(400);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await resetPassword(
        request('auth/reset-password', {
          token: 'reset-token',
          email: 'invalid-email',
          password: 'abc123',
        }),
      );
    }
    const limited = await resetPassword(
      request('auth/reset-password', { token: 'reset-token', email: EMAIL, password: 'abc123' }),
    );
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('p***@example.test');
    expect(logs).toContain('203.0.113.0');
    expect(logs).toContain('user-1');
  });

  it('preserves email confirmation responses and redacts success and early-rejection logs', async () => {
    const success = await confirmEmail(
      request('confirm-email', { token: 'confirm-token', email: EMAIL }),
    );
    expect(success.status).toBe(200);

    const invalid = await confirmEmail(
      request('confirm-email', { token: 'confirm-token', email: 'invalid-email' }),
    );
    expect(invalid.status).toBe(400);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await confirmEmail(
        request('confirm-email', { token: 'confirm-token', email: 'invalid-email' }),
      );
    }
    const limited = await confirmEmail(
      request('confirm-email', { token: 'confirm-token', email: EMAIL }),
    );
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('p***@example.test');
    expect(logs).toContain('203.0.113.0');
    expect(logs).toContain('user-1');
  });

  it('preserves email-existence responses and redacts success and early-rejection logs', async () => {
    const success = await checkEmailExists(request('check-email-exists', { email: EMAIL }));
    expect(success.status).toBe(200);

    const invalid = await checkEmailExists(
      request('check-email-exists', { email: 'invalid-email' }),
    );
    expect(invalid.status).toBe(400);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await checkEmailExists(request('check-email-exists', { email: 'invalid-email' }));
    }
    const limited = await checkEmailExists(request('check-email-exists', { email: EMAIL }));
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('203.0.113.0');
  });

  it('preserves confirmation-token responses and redacts email on validation failure', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

    const success = await generateToken(
      request('generate-confirmation-token', { userId: 'user-1', email: EMAIL, type: 'signup' }),
    );
    expect(success.status).toBe(200);

    const invalid = await generateToken(
      request('generate-confirmation-token', { userId: 'user-1', email: EMAIL }),
    );
    expect(invalid.status).toBe(400);

    mockCheckRateLimit.mockReturnValue(false);
    const limited = await generateToken(
      request('generate-confirmation-token', { userId: 'user-1', email: EMAIL, type: 'signup' }),
    );
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('p***@example.test');
  });
});
