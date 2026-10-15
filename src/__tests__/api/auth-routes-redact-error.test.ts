import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';

type Handler = (request: Request) => Promise<Response>;

const mockMaybeSingle = vi.fn();
const mockUpdateToken = vi.fn();
const mockInsert = vi.fn();
const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => mockMaybeSingle(),
      update: () => ({ eq: () => mockUpdateToken() }),
      insert: (...args: unknown[]) => mockInsert(...args),
    };
    return {
      from: () => builder,
      auth: {
        verifyOtp: async () => ({ data: { user: null }, error: null }),
        admin: {
          listUsers: (...args: unknown[]) => mockListUsers(...args),
          createUser: (...args: unknown[]) => mockCreateUser(...args),
          updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
        },
      },
    };
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip')}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: () => false,
  markSuspiciousIP: vi.fn(),
  isDisposableEmail: () => false,
  validatePasswordComplexity: () => ({ valid: true }),
  isSuspiciousTiming: () => false,
}));

let resetPassword: Handler;
let confirmEmail: Handler;
let signup: Handler;

function request(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': PROBE_IP },
    body: JSON.stringify(body),
  });
}

const probeError = (source: string) => ({
  message: `${source} failed for ${PROBE_EMAIL}`,
  details: `Key (email)=(${PROBE_EMAIL})`,
  code: 'XX000',
});

const thrownProbeError = (source: string) =>
  Object.assign(new Error(`${source} threw for ${PROBE_EMAIL}`), {
    details: `Key (email)=(${PROBE_EMAIL})`,
  });

const validRow = () => ({
  id: 'row-669',
  user_id: 'user-669',
  email: PROBE_EMAIL,
  used: false,
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});

const SIGNUP_BODY = {
  email: PROBE_EMAIL,
  password: 'Password123!',
  language: 'en',
  honeypot: '',
  termsAccepted: true,
  privacyAccepted: true,
};

describe('AC2: auth route errors go through redactError (#669)', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ POST: resetPassword } = await import('@/app/api/auth/reset-password/route'));
    ({ POST: confirmEmail } = await import('@/app/api/confirm-email/route'));
    ({ POST: signup } = await import('@/app/api/auth/signup/route'));
    vi.clearAllMocks();
    spyOnConsole();
    mockMaybeSingle.mockResolvedValue({ data: validRow(), error: null });
    mockUpdateToken.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'signup-669', email: PROBE_EMAIL } },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('reset-password', () => {
    const body = { token: 'reset-token', email: PROBE_EMAIL, password: 'abc123' };

    it.each([
      ['updateTokenError', () => mockUpdateToken.mockResolvedValue({ error: probeError('update token') })],
      ['updateUserError', () => mockUpdateUserById.mockResolvedValue({ error: probeError('update user') })],
      ['catch-all', () => mockMaybeSingle.mockRejectedValue(thrownProbeError('token lookup'))],
    ] as const)('%s', async (_name, arrange) => {
      arrange();

      const response = await resetPassword(request('auth/reset-password', body));

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('confirm-email', () => {
    const body = { token: 'confirm-token', email: PROBE_EMAIL };

    it.each([
      ['updateTokenError', () => mockUpdateToken.mockResolvedValue({ error: probeError('update token') })],
      ['updateUserError', () => mockUpdateUserById.mockResolvedValue({ error: probeError('update user') })],
      ['catch-all', () => mockMaybeSingle.mockRejectedValue(thrownProbeError('token lookup'))],
    ] as const)('%s', async (_name, arrange) => {
      arrange();

      const response = await confirmEmail(request('confirm-email', body));

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('signup', () => {
    it.each([
      [
        'listError',
        () => mockListUsers.mockResolvedValue({ data: { users: [] }, error: probeError('listUsers') }),
        500,
      ],
      [
        'consentError',
        () => mockInsert.mockResolvedValueOnce({ error: probeError('consent insert') }),
        200,
      ],
      [
        'emailError',
        () => {
          vi.stubEnv('NODE_ENV', 'development');
          vi.stubGlobal('fetch', vi.fn().mockRejectedValue(thrownProbeError('send-auth-email')));
        },
        200,
      ],
      ['catch-all', () => mockListUsers.mockRejectedValue(thrownProbeError('listUsers')), 500],
    ] as const)('%s', async (_name, arrange, status) => {
      arrange();

      const response = await signup(request('auth/signup', SIGNUP_BODY));

      expect(response.status).toBe(status);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });
});
