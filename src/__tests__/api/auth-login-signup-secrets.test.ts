import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROBE_EMAIL,
  PROBE_IP,
  PROBE_TEST_KEY,
  leakedValues,
  sixCharSubstrings,
  spyOnConsole,
} from '@/__tests__/utils/pii-probe';

const mockSignInWithPassword = vi.fn();
const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    auth: { signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args) },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
    from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }),
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip')}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: () => false,
  markSuspiciousIP: vi.fn(),
  unblockIP: vi.fn(),
  isDisposableEmail: () => false,
  validatePasswordComplexity: () => ({ valid: true }),
  isSuspiciousTiming: () => false,
}));

import { POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';

function request(
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': PROBE_IP, ...headers },
    body: JSON.stringify(body),
  });
}

const SIGNUP_BODY = {
  email: PROBE_EMAIL,
  password: 'Password123!',
  language: 'en',
  honeypot: '',
  termsAccepted: true,
  privacyAccepted: true,
};

describe('auth login and signup log no secret or PII material', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spyOnConsole();
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'login-user-1', email: PROBE_EMAIL },
        session: { access_token: 'access', refresh_token: 'refresh' },
      },
      error: null,
    });
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'signup-user-1', email: PROBE_EMAIL } },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('AC1: no test-key material in logs', () => {
    it.each([
      ['TEST_API_KEY unset', undefined],
      ['TEST_API_KEY matching', PROBE_TEST_KEY],
      ['TEST_API_KEY different', 'FAKE-OTHER-KEY-FOR-TESTING'],
    ])('login and signup with x-test-api-key, %s', async (_name, envKey) => {
      if (envKey) vi.stubEnv('TEST_API_KEY', envKey);
      const headers = { 'x-test-api-key': PROBE_TEST_KEY };

      const loginResponse = await login(
        request('login', { email: PROBE_EMAIL, password: 'Password123!' }, headers),
      );
      const signupResponse = await signup(request('signup', SIGNUP_BODY, headers));

      expect(loginResponse.status).toBe(200);
      expect(signupResponse.status).toBe(200);
      expect(leakedValues(['FAKE-TEST', ...sixCharSubstrings(PROBE_TEST_KEY)])).toEqual([]);
    });
  });

  describe('AC6: raw signup errors do not echo the email', () => {
    it('createUser error with the email in message and details', async () => {
      mockCreateUser.mockResolvedValue({
        data: { user: null },
        error: {
          message: `User ${PROBE_EMAIL} already registered`,
          details: `Key (email)=(${PROBE_EMAIL}) already exists.`,
          code: '23505',
        },
      });

      const response = await signup(request('signup', SIGNUP_BODY));

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });

    it('send-auth-email failure text containing the email', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          text: async () =>
            `{"error":"Could not deliver to ${PROBE_EMAIL}","details":"${PROBE_EMAIL}"}`,
        }),
      );

      const response = await signup(request('signup', SIGNUP_BODY));

      expect(response.status).toBe(200);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('AC8: success paths run with the probe email', () => {
    it('login success', async () => {
      const response = await login(
        request('login', { email: PROBE_EMAIL, password: 'Password123!' }),
      );

      expect(response.status).toBe(200);
      expect(leakedValues([PROBE_EMAIL, PROBE_IP])).toEqual([]);
    });

    it('signup success', async () => {
      const response = await signup(request('signup', SIGNUP_BODY));

      expect(response.status).toBe(200);
      expect(leakedValues([PROBE_EMAIL, PROBE_IP])).toEqual([]);
    });
  });

  it('redacts PII from auto-confirm errors in login logs', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' },
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'login-user-1', email: PROBE_EMAIL, user_metadata: {} }] },
      error: null,
    });
    const confirmError = Object.assign(new Error(`Could not confirm ${PROBE_EMAIL}`), {
      details: `Email update failed for ${PROBE_EMAIL}`,
    });
    mockUpdateUserById.mockRejectedValue(confirmError);

    const response = await login(
      request('login', { email: PROBE_EMAIL, password: 'Password123!' }),
    );

    expect(response.status).toBe(401);
    expect(leakedValues([PROBE_EMAIL])).toEqual([]);
  });
});
