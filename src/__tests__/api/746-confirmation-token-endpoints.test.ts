/** #746: confirmation-token and resend endpoints: no enumeration, no DB leaks, capability-gated. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, capturedLogArgs, spyOnConsole } from '@/__tests__/utils/pii-probe';

const KNOWN_UNCONFIRMED = 'known-unconfirmed@example.test';
const KNOWN_CONFIRMED = 'known-confirmed@example.test';
const UNKNOWN = 'nobody-here@example.test';

const db = {
  users: [] as Array<{ id: string; email: string; email_confirmed_at: string | null }>,
  insertError: null as null | Record<string, unknown>,
  listError: null as null | Record<string, unknown>,
};
const mockInsert = vi.fn(async (_row: Record<string, unknown>) => ({ error: db.insertError }));
const mockSendAuthEmail = vi.fn();

const mockLookup = vi.fn();

// public.users is looked up by email, then auth.admin.getUserById supplies the confirmation state
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: db.users.find((u) => u.id === id) ?? null },
          error: null,
        }),
      },
    },
    from: (table: string) =>
      table === 'users'
        ? {
            select: () => ({
              eq: (_column: string, email: string) => ({
                maybeSingle: async () => {
                  mockLookup(email);
                  const user = db.users.find((u) => u.email === email);
                  return {
                    data: db.listError || !user ? null : { user_id: user.id },
                    error: db.listError,
                  };
                },
              }),
            }),
          }
        : { insert: (row: Record<string, unknown>) => mockInsert(row) },
  }),
}));

vi.mock('@/services/emailService', () => ({
  sendAuthEmail: (...args: unknown[]) => mockSendAuthEmail(...args),
}));

type Handler = (request: Request) => Promise<Response>;
let generateToken: Handler;
let sendAuthEmailRoute: Handler;
let capability: typeof import('@/lib/auth/resend-capability');

// The route answers before it looks up, inserts or mails; wait for that background work
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

let ipCounter = 0;
function post(
  path: string,
  body: Record<string, unknown>,
  opts: { capabilityFor?: string; ip?: string } = {},
): Request {
  ipCounter += 1;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-real-ip': opts.ip ?? `198.51.100.${ipCounter}`,
  };
  if (opts.capabilityFor) {
    headers.cookie = `${capability.RESEND_CAPABILITY_COOKIE}=${capability.issueResendCapability(opts.capabilityFor)}`;
  }
  return new Request(`http://localhost/api/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const tokenRequest = (
  email: string,
  type: string,
  opts: { capabilityFor?: string; ip?: string; extra?: Record<string, unknown> } = {},
) =>
  post(
    'generate-confirmation-token',
    { email, type, language: 'en', ...opts.extra },
    { capabilityFor: opts.capabilityFor, ip: opts.ip },
  );

const mailRequest = (to: string, opts: { capabilityFor?: string; ip?: string } = {}) =>
  post('send-auth-email', { to, type: 'confirmSignup', language: 'en' }, opts);

describe('#746 confirmation-token and resend endpoints', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://mock-supabase-url.com');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ummahflow.com');
    db.users = [
      { id: 'u-unconfirmed', email: KNOWN_UNCONFIRMED, email_confirmed_at: null },
      { id: 'u-confirmed', email: KNOWN_CONFIRMED, email_confirmed_at: '2026-01-01T00:00:00Z' },
    ];
    db.insertError = null;
    db.listError = null;
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'mail-1' }, error: null });
    capability = await import('@/lib/auth/resend-capability');
    ({ POST: generateToken } = await import('@/app/api/generate-confirmation-token/route'));
    ({ POST: sendAuthEmailRoute } = await import('@/app/api/send-auth-email/route'));
    spyOnConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('AC1: one indistinguishable response for unknown and known accounts', () => {
    it('password_reset: unknown and known accounts get the same status and body', async () => {
      const known = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
      const unknown = await generateToken(tokenRequest(UNKNOWN, 'password_reset'));
      expect(known.status).toBe(unknown.status);
      expect(await known.json()).toEqual(await unknown.json());
    });

    it('signup resend: unknown and known accounts get the same status and body', async () => {
      const known = await generateToken(
        tokenRequest(KNOWN_UNCONFIRMED, 'signup', { capabilityFor: KNOWN_UNCONFIRMED }),
      );
      const unknown = await generateToken(
        tokenRequest(UNKNOWN, 'signup', { capabilityFor: UNKNOWN }),
      );
      expect(known.status).toBe(unknown.status);
      expect(await known.json()).toEqual(await unknown.json());
    });

    it('never returns a 404 "User not found"', async () => {
      const res = await generateToken(tokenRequest(UNKNOWN, 'password_reset'));
      expect(res.status).not.toBe(404);
      expect(JSON.stringify(await res.json())).not.toMatch(/not found/i);
    });

    it('an internal failure after the account lookup does not differ from an unknown account', async () => {
      db.insertError = { message: 'insert failed' };
      const known = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
      const unknown = await generateToken(tokenRequest(UNKNOWN, 'password_reset'));
      expect(known.status).toBe(unknown.status);
      expect(await known.json()).toEqual(await unknown.json());
    });
  });

  describe('AC2: tokens are only issued for a verified flow', () => {
    it('signup: a bare email/userId pair without a capability issues nothing', async () => {
      const res = await generateToken(
        tokenRequest(KNOWN_UNCONFIRMED, 'signup', { extra: { userId: 'u-unconfirmed' } }),
      );
      expect(res.status).toBe(403);
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
    });

    it('signup: a capability issued for another email issues nothing', async () => {
      const res = await generateToken(
        tokenRequest(KNOWN_UNCONFIRMED, 'signup', { capabilityFor: UNKNOWN }),
      );
      expect(res.status).toBe(403);
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
    });

    it('signup: a tampered capability issues nothing', async () => {
      const request = new Request('http://localhost/api/generate-confirmation-token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '198.51.100.250',
          cookie: `${capability.RESEND_CAPABILITY_COOKIE}=${capability.issueResendCapability(KNOWN_UNCONFIRMED)}x`,
        },
        body: JSON.stringify({ email: KNOWN_UNCONFIRMED, type: 'signup', language: 'en' }),
      });
      const res = await generateToken(request);
      expect(res.status).toBe(403);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('signup: an expired capability issues nothing', async () => {
      const issued = capability.issueResendCapability(
        KNOWN_UNCONFIRMED,
        Date.now() - 2 * 60 * 60 * 1000,
      );
      expect(capability.verifyResendCapability(issued, KNOWN_UNCONFIRMED)).toBe(false);
      const res = await generateToken(
        new Request('http://localhost/api/generate-confirmation-token', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-real-ip': '198.51.100.251',
            cookie: `${capability.RESEND_CAPABILITY_COOKIE}=${issued}`,
          },
          body: JSON.stringify({ email: KNOWN_UNCONFIRMED, type: 'signup', language: 'en' }),
        }),
      );
      expect(res.status).toBe(403);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('signup: a valid capability stores a token and emails a server-built link, never returning the token', async () => {
      const res = await generateToken(
        tokenRequest(KNOWN_UNCONFIRMED, 'signup', { capabilityFor: KNOWN_UNCONFIRMED }),
      );
      expect(res.status).toBe(200);
      await settle();
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const stored = mockInsert.mock.calls[0][0] as {
        token: string;
        user_id: string;
        type: string;
      };
      expect(stored.user_id).toBe('u-unconfirmed');
      expect(stored.type).toBe('signup');

      expect(JSON.stringify(await res.json())).not.toContain(stored.token);
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(1);
      const [to, type, , url] = mockSendAuthEmail.mock.calls[0] as string[];
      expect(to).toBe(KNOWN_UNCONFIRMED);
      expect(type).toBe('confirmSignup');
      expect(url).toBe(
        `https://ummahflow.com/auth/confirm?token=${stored.token}&email=${encodeURIComponent(KNOWN_UNCONFIRMED)}`,
      );
    });

    it('password_reset: the token goes to the account owner by email and is never returned', async () => {
      const res = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
      expect(res.status).toBe(200);
      await settle();
      const stored = mockInsert.mock.calls[0][0] as { token: string; type: string };
      expect(stored.type).toBe('password_reset');
      expect(JSON.stringify(await res.json())).not.toContain(stored.token);
      const [to, type, , url] = mockSendAuthEmail.mock.calls[0] as string[];
      expect(to).toBe(KNOWN_CONFIRMED);
      expect(type).toBe('resetPassword');
      expect(url).toContain(`https://ummahflow.com/reset-password?token=${stored.token}`);
    });

    it('password_reset: unknown accounts get no token and no email', async () => {
      await generateToken(tokenRequest(UNKNOWN, 'password_reset'));
      await settle();
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
    });

    it('rejects token types other than signup and password_reset', async () => {
      const res = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'magic_link'));
      expect(res.status).toBe(400);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('AC3: error responses are generic and diagnostics stay redacted', () => {
    const leaky = {
      message: `duplicate key for ${PROBE_EMAIL}`,
      details: `Key (email)=(${PROBE_EMAIL}) already exists`,
      hint: 'secret backend hint',
      code: '23505',
    };

    function expectGeneric(body: unknown) {
      const text = JSON.stringify(body);
      expect(text).not.toContain(PROBE_EMAIL);
      expect(text).not.toContain('duplicate key');
      expect(text).not.toContain('secret backend hint');
      expect(text).not.toContain('23505');
      expect(body).not.toHaveProperty('details');
    }

    function expectLogsRedacted() {
      expect(capturedLogArgs().join('\n')).not.toContain(PROBE_EMAIL);
    }

    it('generate-confirmation-token: database error details never reach the client', async () => {
      db.users.push({
        id: 'u-probe',
        email: PROBE_EMAIL,
        email_confirmed_at: '2026-01-01T00:00:00Z',
      });
      db.insertError = leaky;
      const res = await generateToken(tokenRequest(PROBE_EMAIL, 'password_reset'));
      expectGeneric(await res.json());
      await settle();
      expectLogsRedacted();
    });

    it('generate-confirmation-token: user lookup errors are generic and logged redacted', async () => {
      db.listError = leaky;
      const res = await generateToken(tokenRequest(PROBE_EMAIL, 'password_reset'));
      expect(res.status).toBe(200);
      expectGeneric(await res.json());
      await settle();
      expect(capturedLogArgs().join('\n')).toContain('[TOKEN] Failed to issue token');
      expectLogsRedacted();
    });

    it('generate-confirmation-token: unexpected errors are generic', async () => {
      mockSendAuthEmail.mockRejectedValue(new Error(`Resend refused ${PROBE_EMAIL}`));
      db.users.push({
        id: 'u-probe',
        email: PROBE_EMAIL,
        email_confirmed_at: '2026-01-01T00:00:00Z',
      });
      const res = await generateToken(tokenRequest(PROBE_EMAIL, 'password_reset'));
      expectGeneric(await res.json());
      await settle();
      expectLogsRedacted();
    });

    it('send-auth-email: provider errors are generic and logs are redacted', async () => {
      mockSendAuthEmail.mockRejectedValue(
        Object.assign(new Error(`Resend refused ${PROBE_EMAIL}`), { details: PROBE_EMAIL }),
      );
      const res = await sendAuthEmailRoute(
        mailRequest(PROBE_EMAIL, { capabilityFor: PROBE_EMAIL }),
      );
      expect(res.status).toBe(500);
      expectGeneric(await res.json());
      expectLogsRedacted();
    });

    it('send-auth-email: success does not echo the provider result', async () => {
      mockSendAuthEmail.mockResolvedValue({ data: { id: 'internal-id-123' }, error: null });
      const res = await sendAuthEmailRoute(
        mailRequest(KNOWN_UNCONFIRMED, { capabilityFor: KNOWN_UNCONFIRMED }),
      );
      expect(res.status).toBe(200);
      expect(JSON.stringify(await res.json())).not.toContain('internal-id-123');
    });
  });

  describe('AC4: send-auth-email is capability-gated and limited per email as well as per IP', () => {
    it('rejects a request without a capability', async () => {
      const res = await sendAuthEmailRoute(mailRequest(KNOWN_UNCONFIRMED));
      expect(res.status).toBe(403);
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
    });

    it('rejects a capability issued for a different recipient', async () => {
      const res = await sendAuthEmailRoute(
        mailRequest(UNKNOWN, { capabilityFor: KNOWN_UNCONFIRMED }),
      );
      expect(res.status).toBe(403);
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
    });

    it('accepts the capability from the internal header used by the signup route', async () => {
      const request = new Request('http://localhost/api/send-auth-email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-real-ip': '198.51.100.240',
          [capability.RESEND_CAPABILITY_HEADER]:
            capability.issueResendCapability(KNOWN_UNCONFIRMED),
        },
        body: JSON.stringify({ to: KNOWN_UNCONFIRMED, type: 'confirmSignup', language: 'en' }),
      });
      const res = await sendAuthEmailRoute(request);
      expect(res.status).toBe(200);
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(1);
    });

    it('only sends confirmSignup mail', async () => {
      const res = await sendAuthEmailRoute(
        post(
          'send-auth-email',
          { to: KNOWN_UNCONFIRMED, type: 'resetPassword', language: 'en' },
          { capabilityFor: KNOWN_UNCONFIRMED },
        ),
      );
      expect(res.status).toBe(400);
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
    });

    it('limits sends per recipient across different IPs', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const res = await sendAuthEmailRoute(
          mailRequest(KNOWN_UNCONFIRMED, { capabilityFor: KNOWN_UNCONFIRMED }),
        );
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
      expect(statuses.slice(3)).toEqual([429, 429]);
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(3);
    });

    it('still limits per IP across different recipients', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 7; i += 1) {
        const email = `user${i}@example.test`;
        const res = await sendAuthEmailRoute(
          mailRequest(email, { capabilityFor: email, ip: '198.51.100.99' }),
        );
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
      expect(statuses.slice(5)).toEqual([429, 429]);
    });

    it('generate-confirmation-token limits signup resends per email across different IPs', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const res = await generateToken(
          tokenRequest(KNOWN_UNCONFIRMED, 'signup', { capabilityFor: KNOWN_UNCONFIRMED }),
        );
        statuses.push(res.status);
      }
      expect(statuses).toEqual([200, 200, 200, 429, 429]);
      await settle();
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(3);
    });

    it('password_reset: caps mail per account without a status that reveals the account', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const res = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
        statuses.push(res.status);
      }
      await settle();
      expect(statuses).toEqual([200, 200, 200, 200, 200]);
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(3);
    });

    it('password_reset: requests for unknown accounts do not spend the per-email budget', async () => {
      for (let i = 0; i < 5; i += 1) {
        await generateToken(tokenRequest(UNKNOWN, 'password_reset'));
      }
      await settle();
      db.users.push({
        id: 'u-late',
        email: UNKNOWN,
        email_confirmed_at: '2026-01-01T00:00:00Z',
      });
      await generateToken(tokenRequest(UNKNOWN, 'password_reset'));
      await settle();
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC1: response timing does not depend on the account', () => {
    it('answers before the insert and the mail are done', async () => {
      let releaseInsert: () => void = () => {};
      mockInsert.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseInsert = () => resolve({ error: null });
          }),
      );
      let releaseMail: () => void = () => {};
      mockSendAuthEmail.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseMail = () => resolve({ data: { id: 'mail-slow' }, error: null });
          }),
      );

      const res = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
      expect(res.status).toBe(200);
      expect(mockSendAuthEmail).not.toHaveBeenCalled();

      await vi.waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));
      releaseInsert();
      await vi.waitFor(() => expect(mockSendAuthEmail).toHaveBeenCalledTimes(1));
      releaseMail();
    });

    it('answers before the account lookup finishes', async () => {
      const res = await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
      expect(res.status).toBe(200);
      expect(mockSendAuthEmail).not.toHaveBeenCalled();
      await settle();
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(1);
    });

    it('looks accounts up directly instead of paging through every user', async () => {
      await generateToken(tokenRequest(KNOWN_CONFIRMED, 'password_reset'));
      await settle();
      expect(mockLookup).toHaveBeenCalledWith(KNOWN_CONFIRMED);
    });

    it('normalizes the email to lowercase before the lookup', async () => {
      await generateToken(tokenRequest(KNOWN_CONFIRMED.toUpperCase(), 'password_reset'));
      await settle();
      expect(mockLookup).toHaveBeenCalledWith(KNOWN_CONFIRMED);
      expect(mockSendAuthEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC4: the server issues the resend capability', () => {
    it('signup sets an httpOnly capability cookie and forwards it to send-auth-email', async () => {
      vi.resetModules();
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
      vi.stubGlobal('fetch', fetchMock);
      vi.stubEnv('NODE_ENV', 'production');
      vi.doMock('@/lib/rate-limit', () => ({
        checkRateLimit: () => true,
        getClientIdentifier: () => 'ip:test',
      }));
      vi.doMock('@/utils/security', () => ({
        getClientIP: () => '203.0.113.77',
        checkIPBlocked: () => false,
        markSuspiciousIP: vi.fn(),
        isDisposableEmail: () => false,
        validatePasswordComplexity: () => ({ valid: true }),
        isSuspiciousTiming: () => false,
      }));
      vi.doMock('@/lib/supabase/admin', () => ({
        getSupabaseAdmin: () => ({
          auth: {
            admin: {
              listUsers: async () => ({ data: { users: [] }, error: null }),
              createUser: async () => ({
                data: { user: { id: 'u-new', email: 'new@example.test' } },
                error: null,
              }),
            },
          },
          from: () => ({ insert: async () => ({ error: null }) }),
        }),
      }));
      const { POST: signup } = await import('@/app/api/auth/signup/route');
      const cap = await import('@/lib/auth/resend-capability');

      const res = await signup(
        new Request('http://localhost/api/auth/signup', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.77' },
          body: JSON.stringify({
            email: 'new@example.test',
            password: 'abcd1234',
            language: 'en',
            honeypot: '',
            termsAccepted: true,
            privacyAccepted: true,
          }),
        }),
      );

      const setCookie = res.headers.get('set-cookie') ?? '';
      expect(setCookie).toContain(`${cap.RESEND_CAPABILITY_COOKIE}=`);
      expect(setCookie.toLowerCase()).toContain('httponly');
      expect(setCookie.toLowerCase()).toContain('samesite=lax');
      expect(setCookie.toLowerCase()).toContain('secure');
      expect(setCookie).toContain('Path=/api');
      expect(setCookie).toContain('Max-Age=3600');

      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/api/send-auth-email'),
      );
      const headers = call?.[1].headers as Record<string, string>;
      expect(
        cap.verifyResendCapability(headers[cap.RESEND_CAPABILITY_HEADER], 'new@example.test'),
      ).toBe(true);
      vi.unstubAllGlobals();
    });

    it('login sets the capability cookie only after valid credentials hit an unconfirmed account', async () => {
      vi.resetModules();
      vi.stubEnv('NODE_ENV', 'production');
      const signIn = vi.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Email not confirmed' },
      });
      vi.doMock('@/lib/supabase/server', () => ({
        createSupabaseServerClient: () => ({ auth: { signInWithPassword: signIn } }),
      }));
      vi.doMock('@/lib/rate-limit', () => ({
        checkRateLimit: () => true,
        getClientIdentifier: () => 'ip:test',
      }));
      vi.doMock('@/utils/security', () => ({
        getClientIP: () => '203.0.113.77',
        checkIPBlocked: () => false,
        markSuspiciousIP: vi.fn(),
        unblockIP: vi.fn(),
        isDisposableEmail: () => false,
        validatePasswordComplexity: () => ({ valid: true }),
        isSuspiciousTiming: () => false,
      }));
      vi.doMock('@/lib/supabase/admin', () => ({
        getSupabaseAdmin: () => ({
          auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
          from: () => ({ insert: async () => ({ error: null }) }),
        }),
      }));
      const { POST: login } = await import('@/app/api/auth/login/route');
      const cap = await import('@/lib/auth/resend-capability');

      const res = await login(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.78' },
          body: JSON.stringify({ email: KNOWN_UNCONFIRMED, password: 'abcd1234' }),
        }),
      );
      expect(res.status).toBe(403);
      expect(res.headers.get('set-cookie') ?? '').toContain(`${cap.RESEND_CAPABILITY_COOKIE}=`);
    });
  });
});
