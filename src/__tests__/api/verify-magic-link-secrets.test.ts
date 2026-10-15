import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROBE_EMAIL,
  PROBE_IP,
  PROBE_TOKEN,
  leakedValues,
  sixCharSubstrings,
  spyOnConsole,
} from '@/__tests__/utils/pii-probe';

type DbError = { message: string; details?: string; code?: string } | null;

interface Scenario {
  byToken: Record<string, unknown> | null;
  byEmail: Record<string, unknown> | null;
  byEmailError: DbError;
  updateError: DbError;
  user: Record<string, unknown> | null;
  userError: DbError;
  metadataError: DbError;
  linkError: DbError;
  hashedToken: string | undefined;
  rateLimited: boolean;
  ipBlocked: boolean;
}

const scenario: Scenario = {} as Scenario;

function emailError(source: string): DbError {
  return {
    message: `${source} failed for ${PROBE_EMAIL}`,
    details: `Key (email)=(${PROBE_EMAIL})`,
    code: 'XX000',
  };
}

function resetScenario(): void {
  const validRow = {
    id: 'vml-row-1',
    user_id: 'vml-user-1',
    email: PROBE_EMAIL,
    type: 'magic_link',
    used: false,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  Object.assign(scenario, {
    byToken: validRow,
    byEmail: validRow,
    byEmailError: null,
    updateError: null,
    user: { id: 'vml-user-1', email: PROBE_EMAIL, email_confirmed_at: null, user_metadata: {} },
    userError: null,
    metadataError: null,
    linkError: null,
    hashedToken: 'hashed-value',
    rateLimited: false,
    ipBlocked: false,
  } satisfies Scenario);
}

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      let filteredByEmail = false;
      const builder = {
        select: () => builder,
        eq: () => builder,
        ilike: () => {
          filteredByEmail = true;
          return builder;
        },
        maybeSingle: async () =>
          filteredByEmail
            ? { data: scenario.byEmail, error: scenario.byEmailError }
            : { data: scenario.byToken, error: null },
        update: () => ({ eq: async () => ({ error: scenario.updateError }) }),
      };
      return builder;
    },
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: scenario.user }, error: scenario.userError }),
        updateUserById: async () => ({ error: scenario.metadataError }),
        generateLink: async () => ({
          data: { properties: { hashed_token: scenario.hashedToken } },
          error: scenario.linkError,
        }),
      },
    },
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => !scenario.rateLimited,
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip')}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: () => scenario.ipBlocked,
}));

let POST: (request: Request) => Promise<Response>;

function request(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/auth/verify-magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': PROBE_IP },
    body: JSON.stringify(body),
  });
}

const PROBE_BODY = { token: PROBE_TOKEN, email: PROBE_EMAIL };
const expiredAt = () => new Date(Date.now() - 1000).toISOString();

const rejectionPaths: Array<[string, () => void, Record<string, unknown>, number]> = [
  ['missing email', () => {}, { token: PROBE_TOKEN }, 400],
  ['missing token', () => {}, { email: PROBE_EMAIL }, 400],
  ['invalid email', () => {}, { token: PROBE_TOKEN, email: 'not-an-email' }, 400],
  ['not found', () => Object.assign(scenario, { byToken: null, byEmail: null }), PROBE_BODY, 400],
  [
    'expired',
    () => {
      const row = { ...scenario.byEmail, expires_at: expiredAt() };
      Object.assign(scenario, { byToken: row, byEmail: row });
    },
    PROBE_BODY,
    400,
  ],
  [
    'already used',
    () => Object.assign(scenario, { byToken: { ...scenario.byToken, used: true }, byEmail: null }),
    PROBE_BODY,
    400,
  ],
  [
    'email mismatch',
    () =>
      Object.assign(scenario, {
        byToken: { ...scenario.byToken, email: 'other@example.test' },
        byEmail: null,
      }),
    PROBE_BODY,
    400,
  ],
  [
    'rate limited',
    () => Object.assign(scenario, { byToken: null, byEmail: null, rateLimited: true }),
    PROBE_BODY,
    429,
  ],
  [
    'blocked IP',
    () => {
      vi.stubEnv('NODE_ENV', 'production');
      Object.assign(scenario, { byToken: null, byEmail: null, ipBlocked: true });
    },
    PROBE_BODY,
    403,
  ],
  [
    'database error',
    () => Object.assign(scenario, { byEmailError: emailError('token lookup') }),
    PROBE_BODY,
    500,
  ],
  [
    'user fetch error',
    () => Object.assign(scenario, { userError: emailError('getUserById') }),
    PROBE_BODY,
    500,
  ],
  ['user not found', () => Object.assign(scenario, { user: null }), PROBE_BODY, 404],
  [
    'user email missing',
    () => Object.assign(scenario, { user: { ...scenario.user, email: '' } }),
    PROBE_BODY,
    400,
  ],
  [
    'session link error',
    () => Object.assign(scenario, { linkError: emailError('generateLink') }),
    PROBE_BODY,
    500,
  ],
  [
    'missing hashed token',
    () => Object.assign(scenario, { hashedToken: undefined }),
    PROBE_BODY,
    500,
  ],
];

describe('POST /api/auth/verify-magic-link logs no token or PII material', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ POST } = await import('@/app/api/auth/verify-magic-link/route'));
    resetScenario();
    spyOnConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('AC2 + AC8: every rejection path', () => {
    it.each(rejectionPaths)('%s', async (_name, arrange, body, status) => {
      arrange();

      const response = await POST(request(body));

      expect(response.status).toBe(status);
      expect(leakedValues(['probe-to', ...sixCharSubstrings(PROBE_TOKEN)])).toEqual([]);
      expect(leakedValues([PROBE_EMAIL, PROBE_IP])).toEqual([]);
    });
  });

  describe('AC6: DB and auth errors do not echo the email', () => {
    it.each([
      [
        'token lookup error',
        () => Object.assign(scenario, { byEmailError: emailError('lookup') }),
        500,
      ],
      [
        'mark-used error',
        () => Object.assign(scenario, { updateError: emailError('update') }),
        200,
      ],
      [
        'getUserById error',
        () => Object.assign(scenario, { userError: emailError('getUser') }),
        500,
      ],
      [
        'metadata update error',
        () => Object.assign(scenario, { metadataError: emailError('updateUserById') }),
        200,
      ],
      ['generateLink error', () => Object.assign(scenario, { linkError: emailError('link') }), 500],
    ] as const)('%s', async (_name, arrange, status) => {
      arrange();

      const response = await POST(request(PROBE_BODY));

      expect(response.status).toBe(status);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });
});
