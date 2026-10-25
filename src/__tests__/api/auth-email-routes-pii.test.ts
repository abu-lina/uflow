import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';
import { RESEND_CAPABILITY_HEADER, issueResendCapability } from '@/lib/auth/resend-capability';

// Signs the resend capability the signup route issues (#746)
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

type Handler = (request: Request) => Promise<Response>;

const db: {
  row: Record<string, unknown> | null;
  rowError: Record<string, unknown> | null;
  verifyOtp: () => Promise<unknown>;
} = { row: null, rowError: null, verifyOtp: async () => ({}) };
const mockSendAuthEmail = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => ({ data: db.row, error: db.rowError }),
      update: () => ({ eq: async () => ({ error: null }) }),
    };
    return {
      from: () => builder,
      auth: {
        verifyOtp: () => db.verifyOtp(),
        admin: { updateUserById: async () => ({ error: null }) },
      },
    };
  },
}));

vi.mock('@/services/emailService', () => ({
  sendAuthEmail: (...args: unknown[]) => mockSendAuthEmail(...args),
}));

let confirmEmail: Handler;
let resetPassword: Handler;
let sendAuthEmail: Handler;

function request(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': PROBE_IP,
      [RESEND_CAPABILITY_HEADER]: issueResendCapability(PROBE_EMAIL),
    },
    body: JSON.stringify(body),
  });
}

function emailInError(source: string) {
  return {
    message: `${source} rejected ${PROBE_EMAIL}`,
    details: `email=${PROBE_EMAIL}`,
    hint: `check ${PROBE_EMAIL}`,
    code: '400',
  };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'mail-row-1',
  user_id: 'mail-user-1',
  email: PROBE_EMAIL,
  used: false,
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  ...overrides,
});

function expectNoProbeValues(): void {
  expect(leakedValues([PROBE_EMAIL, PROBE_IP])).toEqual([]);
}

describe('auth email routes log no raw PII', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ POST: confirmEmail } = await import('@/app/api/confirm-email/route'));
    ({ POST: resetPassword } = await import('@/app/api/auth/reset-password/route'));
    ({ POST: sendAuthEmail } = await import('@/app/api/send-auth-email/route'));
    vi.clearAllMocks();
    Object.assign(db, { row: null, rowError: null, verifyOtp: async () => ({}) });
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    spyOnConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('confirm-email', () => {
    it('AC8: missing input', async () => {
      const response = await confirmEmail(request('confirm-email', { email: PROBE_EMAIL }));
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC8: expired token', async () => {
      db.row = row({ expires_at: new Date(Date.now() - 1000).toISOString() });
      const response = await confirmEmail(
        request('confirm-email', { token: 'confirm-token', email: PROBE_EMAIL }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC8: used token', async () => {
      db.row = row({ used: true });
      const response = await confirmEmail(
        request('confirm-email', { token: 'confirm-token', email: PROBE_EMAIL }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC6: verifyOtp error with the email in message and details', async () => {
      db.verifyOtp = async () => ({
        data: { user: null },
        error: { ...emailInError('verifyOtp'), name: 'AuthApiError', status: 400 },
      });
      const response = await confirmEmail(
        request('confirm-email', { token: 'confirm-token', email: PROBE_EMAIL }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC6: verifyOtp throwing an error with the email in message and details', async () => {
      db.verifyOtp = async () => {
        throw Object.assign(new Error(`verifyOtp threw for ${PROBE_EMAIL}`), {
          details: `email=${PROBE_EMAIL}`,
        });
      };
      const response = await confirmEmail(
        request('confirm-email', { token: 'confirm-token', email: PROBE_EMAIL }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });
  });

  describe('reset-password', () => {
    it('AC8: missing fields', async () => {
      const response = await resetPassword(
        request('auth/reset-password', { email: PROBE_EMAIL, password: 'abc123' }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC8: short password', async () => {
      const response = await resetPassword(
        request('auth/reset-password', {
          token: 'reset-token',
          email: PROBE_EMAIL,
          password: 'abc',
        }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC8: token failure with the email in the DB error', async () => {
      db.rowError = emailInError('token lookup');
      const response = await resetPassword(
        request('auth/reset-password', {
          token: 'reset-token',
          email: PROBE_EMAIL,
          password: 'abc123',
        }),
      );
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });
  });

  describe('send-auth-email', () => {
    it.each([
      ['missing fields', { to: PROBE_EMAIL, language: 'en' }],
      ['invalid type', { to: PROBE_EMAIL, type: 'unsupported', language: 'en' }],
      ['invalid language', { to: PROBE_EMAIL, type: 'confirmSignup', language: 'xx' }],
    ])('AC8: %s', async (_name, body) => {
      const response = await sendAuthEmail(request('send-auth-email', body));
      expect(response.status).toBe(400);
      expectNoProbeValues();
    });

    it('AC6: service error with the email in message and details', async () => {
      mockSendAuthEmail.mockRejectedValue(
        Object.assign(new Error(`Resend refused ${PROBE_EMAIL}`), {
          details: `recipient=${PROBE_EMAIL}`,
        }),
      );
      const response = await sendAuthEmail(
        request('send-auth-email', { to: PROBE_EMAIL, type: 'confirmSignup', language: 'en' }),
      );
      expect(response.status).toBe(500);
      expectNoProbeValues();
    });
  });
});
