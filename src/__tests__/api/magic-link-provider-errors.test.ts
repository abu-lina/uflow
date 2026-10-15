import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';

const INTERNAL = 'internal-detail-xyz';

const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockConsentInsert = vi.fn();
const mockTokenInsert = vi.fn();
const mockSendAuthEmail = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip') || 'unknown'}`,
}));

vi.mock('@/utils/security', () => ({
  getClientIP: (request: Request) => request.headers.get('x-real-ip') || 'unknown',
  checkIPBlocked: () => false,
  markSuspiciousIP: vi.fn(),
  isDisposableEmail: () => false,
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
      insert: (...args: unknown[]) =>
        table === 'consent_logs'
          ? mockConsentInsert(...args)
          : { select: () => ({ single: () => mockTokenInsert(...args) }) },
    }),
  }),
}));

vi.mock('@/services/emailService', () => ({
  sendAuthEmail: (...args: unknown[]) => mockSendAuthEmail(...args),
}));

import { POST } from '@/app/api/auth/magic-link/route';

function request(email: string = PROBE_EMAIL): Request {
  return new Request('http://localhost/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': PROBE_IP,
      origin: 'http://localhost',
    },
    body: JSON.stringify({ email, language: 'en' }),
  });
}

const providerError = (source: string) => ({
  name: 'provider_error',
  message: `${source} failed for ${PROBE_EMAIL}: ${INTERNAL}`,
  details: `recipient=${PROBE_EMAIL} ${INTERNAL}`,
  code: 'XX000',
});

const thrownProviderError = (source: string) =>
  Object.assign(new Error(`${source} threw for ${PROBE_EMAIL}: ${INTERNAL}`), {
    details: `recipient=${PROBE_EMAIL} ${INTERNAL}`,
  });

async function bodyText(response: Response): Promise<string> {
  return JSON.stringify(await response.json());
}

function expectGenericBody(body: string): void {
  expect(body).not.toContain(PROBE_EMAIL);
  expect(body).not.toContain(INTERNAL);
  expect(JSON.parse(body).error).toEqual(expect.any(String));
}

describe('POST /api/auth/magic-link provider errors (#669)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spyOnConsole();
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'ml-669-user', email: PROBE_EMAIL, email_confirmed_at: null, user_metadata: {} } },
      error: null,
    });
    mockConsentInsert.mockResolvedValue({ error: null });
    mockTokenInsert.mockResolvedValue({ error: null });
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('AC1: magic-link 500 bodies carry no provider detail', () => {
    it('token step fails', async () => {
      mockTokenInsert.mockResolvedValue({ data: null, error: providerError('token insert') });

      const response = await POST(request());

      expect(response.status).toBe(500);
      expectGenericBody(await bodyText(response));
    });

    it('email step returns a Resend error', async () => {
      mockSendAuthEmail.mockResolvedValue({ data: null, error: providerError('resend') });

      const response = await POST(request());

      expect(response.status).toBe(500);
      expectGenericBody(await bodyText(response));
    });

    it('email step throws', async () => {
      mockSendAuthEmail.mockRejectedValue(thrownProviderError('resend'));

      const response = await POST(request());

      expect(response.status).toBe(500);
      expectGenericBody(await bodyText(response));
    });
  });

  describe('AC2: route errors go through redactError', () => {
    it.each([
      [
        'listError',
        () => mockListUsers.mockResolvedValue({ data: { users: [] }, error: providerError('listUsers') }),
        500,
      ],
      [
        'consentError',
        () => mockConsentInsert.mockResolvedValue({ error: providerError('consent insert') }),
        200,
      ],
      [
        'tokenError',
        () => mockTokenInsert.mockResolvedValue({ data: null, error: providerError('token insert') }),
        500,
      ],
      [
        'catch-all',
        () => mockListUsers.mockRejectedValue(thrownProviderError('listUsers')),
        500,
      ],
    ] as const)('%s', async (_name, arrange, status) => {
      arrange();

      const response = await POST(request());

      expect(response.status).toBe(status);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('AC6: magic-link stores the token email normalised', () => {
    it('lowercases the email written to email_confirmation_tokens', async () => {
      const response = await POST(request('Pii-Probe@Example.TEST'));

      expect(response.status).toBe(200);
      expect(mockTokenInsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'pii-probe@example.test', type: 'magic_link' }),
      );
    });
  });
});
