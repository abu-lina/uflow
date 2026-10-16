import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';

type PostHandler = (request: Request) => Promise<Response>;
type GetHandler = (request: Request) => Promise<Response>;

const DETAIL = 'internal-detail-xyz';

const mockTokensResult = vi.fn();
const mockMaybeSingle = vi.fn();
const mockListUsers = vi.fn();
const eqCalls: Array<[string, unknown]> = [];
const ilikeCalls: Array<[string, unknown]> = [];

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        eqCalls.push([column, value]);
        return builder;
      },
      ilike: (column: string, value: unknown) => {
        ilikeCalls.push([column, value]);
        return builder;
      },
      order: () => builder,
      limit: () => mockTokensResult(),
      maybeSingle: () => mockMaybeSingle(),
    };
    return {
      from: () => builder,
      auth: {
        verifyOtp: async () => ({ data: { user: null }, error: null }),
        admin: { listUsers: () => mockListUsers() },
      },
    };
  },
}));

const dbError = () => ({ message: `lookup failed for ${PROBE_EMAIL}: ${DETAIL}`, code: 'XX000' });

const postRequest = (path: string, body: Record<string, unknown>) =>
  new Request(`http://localhost/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': PROBE_IP },
    body: JSON.stringify(body),
  });

const statusRequest = (email: string) =>
  new Request(`http://localhost/api/auth/magic-link-status?email=${encodeURIComponent(email)}`);

describe('auth error leaks (#680)', () => {
  let status: GetHandler;
  let resetPassword: PostHandler;
  let confirmEmail: PostHandler;

  beforeEach(async () => {
    vi.resetModules();
    eqCalls.length = 0;
    ilikeCalls.length = 0;
    ({ GET: status } = await import('@/app/api/auth/magic-link-status/route'));
    ({ POST: resetPassword } = await import('@/app/api/auth/reset-password/route'));
    ({ POST: confirmEmail } = await import('@/app/api/confirm-email/route'));
    vi.clearAllMocks();
    spyOnConsole();
    mockTokensResult.mockResolvedValue({ data: [], error: null });
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: dbError() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('magic-link-status', () => {
    it('bodies carry no provider detail (token lookup error)', async () => {
      mockTokensResult.mockResolvedValue({ data: null, error: dbError() });

      const response = await status(statusRequest(PROBE_EMAIL));
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain(PROBE_EMAIL);
      expect(text).not.toContain(DETAIL);
      expect(text).not.toContain('lookup failed');
      expect(JSON.parse(text).error).toEqual(expect.any(String));
    });

    it('bodies carry no provider detail (listUsers error)', async () => {
      mockListUsers.mockResolvedValue({ data: null, error: dbError() });

      const response = await status(statusRequest(PROBE_EMAIL));
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain(DETAIL);
      expect(text).not.toContain('lookup failed');
    });

    it('bodies carry no provider detail (thrown error)', async () => {
      mockTokensResult.mockRejectedValue(new Error(`boom ${PROBE_EMAIL} ${DETAIL}`));

      const response = await status(statusRequest(PROBE_EMAIL));
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).not.toContain(DETAIL);
      expect(text).not.toContain('boom');
    });

    it('matches email exactly with eq on the trimmed, lowercased email', async () => {
      await status(statusRequest('  A%@Example.Test '));

      expect(ilikeCalls).toEqual([]);
      expect(eqCalls).toContainEqual(['email', 'a%@example.test']);
    });

    it('treats _ and % as literals', async () => {
      await status(statusRequest('_b@example.test'));

      expect(ilikeCalls).toEqual([]);
      expect(eqCalls).toContainEqual(['email', '_b@example.test']);
    });

    it('logs stay redacted', async () => {
      mockTokensResult.mockResolvedValue({ data: null, error: dbError() });

      await status(statusRequest(PROBE_EMAIL));

      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('reset-password', () => {
    it('400 carries no DB message and logs stay redacted', async () => {
      const response = await resetPassword(
        postRequest('auth/reset-password', {
          token: 't',
          email: PROBE_EMAIL,
          password: 'abc123',
        }),
      );
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).not.toContain(DETAIL);
      expect(JSON.parse(text).error).toEqual(expect.any(String));
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('confirm-email', () => {
    it('400 carries no DB message and logs stay redacted', async () => {
      const response = await confirmEmail(
        postRequest('confirm-email', { token: 't', email: PROBE_EMAIL }),
      );
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).not.toContain(DETAIL);
      expect(JSON.parse(text).error).toEqual(expect.any(String));
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });
});
