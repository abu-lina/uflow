import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';

const mockCheckIPBlocked = vi.fn((..._args: unknown[]) => false);
const mockSendAuthEmail = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip') || 'unknown'}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: (...args: unknown[]) => mockCheckIPBlocked(...args),
  markSuspiciousIP: vi.fn(),
  isDisposableEmail: () => false,
  isSuspiciousTiming: () => false,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: [
              { id: 'ml-user-1', email: PROBE_EMAIL, email_confirmed_at: null, user_metadata: {} },
            ],
          },
          error: null,
        }),
      },
    },
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ error: null }) }) }),
    }),
  }),
}));

vi.mock('@/services/emailService', () => ({
  sendAuthEmail: (...args: unknown[]) => mockSendAuthEmail(...args),
}));

import { POST } from '@/app/api/auth/magic-link/route';

function request(): Request {
  return new Request('http://localhost/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': PROBE_IP,
      origin: 'http://localhost',
    },
    body: JSON.stringify({ email: PROBE_EMAIL, language: 'en' }),
  });
}

function expectNoIdentifyingData(body: string): void {
  expect(body).not.toContain(PROBE_EMAIL);
  expect(body).not.toContain(encodeURIComponent(PROBE_EMAIL));
  expect(body).not.toContain(PROBE_IP);
  expect(body).not.toContain('identifier');
  expect(body).not.toMatch(/diagnosticUrl[^,}]*email=/);
}

describe('POST /api/auth/magic-link responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spyOnConsole();
    mockCheckIPBlocked.mockReturnValue(false);
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('AC3: production responses carry no IP, identifier or email', () => {
    it('403 IP_BLOCKED response', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockCheckIPBlocked.mockReturnValue(true);

      const response = await POST(request());
      const body = JSON.stringify(await response.json());

      expect(response.status).toBe(403);
      expect(body).toContain('IP_BLOCKED');
      expectNoIdentifyingData(body);
    });

    it('success response', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await POST(request());
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expectNoIdentifyingData(JSON.stringify(json));
    });

    it('development success response still succeeds (debug payload allowed)', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect((await response.json()).success).toBe(true);
    });
  });

  describe('AC6: Resend errors do not echo the email in logs', () => {
    it('Resend error response with the email in message and details', async () => {
      mockSendAuthEmail.mockResolvedValue({
        data: null,
        error: {
          name: 'validation_error',
          message: `Invalid recipient ${PROBE_EMAIL}`,
          details: `to: ${PROBE_EMAIL}`,
        },
      });

      const response = await POST(request());

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });
});
