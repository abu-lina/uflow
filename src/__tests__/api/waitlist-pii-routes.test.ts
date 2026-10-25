import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, capturedLogArgs } from '@/__tests__/utils/pii-probe';
import { RESEND_CAPABILITY_HEADER, issueResendCapability } from '@/lib/auth/resend-capability';

const mockCheckRateLimit = vi.fn((..._args: unknown[]) => true);
const mockGetClientIdentifier = vi.fn(
  (request: Request) => `ip:${request.headers.get('x-real-ip') || 'unknown'}`,
);
const mockInsert = vi.fn((..._args: unknown[]): Promise<{ error: { code: string } | null }> =>
  Promise.resolve({ error: null }),
);
const mockRpc = vi.fn(
  (
    ..._args: unknown[]
  ): Promise<{
    data: { success: boolean; updated?: number; error?: string } | null;
    error: { message: string } | null;
  }> => Promise.resolve({ data: { success: true, updated: 1 }, error: null }),
);
const mockSendWaitlistEmail = vi.fn((..._args: unknown[]): Promise<void> => Promise.resolve());
const mockSendAuthEmail = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ data: { id: 'email-1' }, error: null }),
);
// Signs the resend capability the send-auth-email route requires (#746)
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';

const EMAIL = PROBE_EMAIL;
const IP = '203.0.113.77';

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: [Request]) => mockGetClientIdentifier(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: (...args: unknown[]) => ({
      insert: (...insertArgs: unknown[]) => mockInsert(...args, ...insertArgs),
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('@/services/emailService', () => ({
  sendAuthEmail: (...args: unknown[]) => mockSendAuthEmail(...args),
}));

vi.mock('@/services/email/waitlistEmail', () => ({
  sendWaitlistConfirmationEmail: (...args: unknown[]) => mockSendWaitlistEmail(...args),
}));

vi.mock('@/lib/utils/waitlist-token', () => ({
  generateWaitlistToken: () => 'waitlist-token',
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'waitlist-token' }) }),
}));

import { POST as sendAuthEmail } from '@/app/api/send-auth-email/route';
import { POST as joinWaitlist } from '@/app/api/waitlist/join/route';
import { POST as subscribeCity } from '@/app/api/waitlist/subscribe-city/route';
import { PATCH as updateWaitlist } from '@/app/api/waitlist/update/route';

function request(path: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': IP,
      [RESEND_CAPABILITY_HEADER]: issueResendCapability(EMAIL),
    },
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

describe('waitlist and auth email routes do not log raw PII', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockInsert.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: { success: true, updated: 1 }, error: null });
    mockSendWaitlistEmail.mockResolvedValue(undefined);
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves waitlist join success and rejection responses while redacting logs', async () => {
    const success = await joinWaitlist(
      request('waitlist/join', { email: EMAIL, isProvider: false }),
    );
    expect(success.status).toBe(201);

    mockInsert.mockResolvedValueOnce({ error: { code: '23505' } });
    const duplicate = await joinWaitlist(
      request('waitlist/join', { email: EMAIL, isProvider: false }),
    );
    expect(duplicate.status).toBe(409);

    const invalid = await joinWaitlist(
      request('waitlist/join', { email: EMAIL, isProvider: 'invalid' }),
    );
    expect(invalid.status).toBe(400);

    mockCheckRateLimit.mockReturnValue(false);
    const limited = await joinWaitlist(
      request('waitlist/join', { email: EMAIL, isProvider: false }),
    );
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('p***@example.test');
    expect(logs).toContain('203.0.113.0');
  });

  it('preserves city subscription responses while redacting logs', async () => {
    const success = await subscribeCity(
      request('waitlist/subscribe-city', {
        email: EMAIL,
        cityName: 'Berlin',
        waitlistToken: 'waitlist-token',
      }),
    );
    expect(success.status).toBe(200);

    mockRpc.mockResolvedValueOnce({
      data: { success: false, error: 'Invalid token' },
      error: null,
    });
    const rejected = await subscribeCity(
      request('waitlist/subscribe-city', {
        email: EMAIL,
        cityName: 'Berlin',
        waitlistToken: 'waitlist-token',
      }),
    );
    expect(rejected.status).toBe(404);

    const invalid = await subscribeCity(
      request('waitlist/subscribe-city', {
        email: 'not-an-email',
        cityName: 'Berlin',
        waitlistToken: 'waitlist-token',
      }),
    );
    expect(invalid.status).toBe(400);

    mockCheckRateLimit.mockReturnValue(false);
    const limited = await subscribeCity(
      request('waitlist/subscribe-city', {
        email: EMAIL,
        cityName: 'Berlin',
        waitlistToken: 'waitlist-token',
      }),
    );
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('p***@example.test');
    expect(logs).toContain('203.0.113.0');
  });

  it('does not log the email on waitlist update paths', async () => {
    const makeUpdateRequest = () =>
      new Request('http://localhost/api/waitlist/update', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-real-ip': IP },
        body: JSON.stringify({
          email: EMAIL,
          waitlistToken: 'waitlist-token',
          selected_city: 'Berlin',
        }),
      });

    mockRpc.mockResolvedValueOnce({
      data: { success: false, error: 'Invalid email or token' },
      error: null,
    });
    const failed = await updateWaitlist(makeUpdateRequest());
    expect(failed.status).toBe(404);

    const success = await updateWaitlist(makeUpdateRequest());
    expect(success.status).toBe(200);

    expect(capturedLogArgs().some((argument) => argument.includes(EMAIL))).toBe(false);
  });

  it('preserves auth email dispatch behavior without logging request PII', async () => {
    const success = await sendAuthEmail(
      request('send-auth-email', {
        to: EMAIL,
        type: 'confirmSignup',
        language: 'en',
      }),
    );
    expect(success.status).toBe(200);

    const invalid = await sendAuthEmail(
      request('send-auth-email', {
        to: EMAIL,
        type: 'unsupported',
        language: 'en',
      }),
    );
    expect(invalid.status).toBe(400);

    mockCheckRateLimit.mockReturnValue(false);
    const limited = await sendAuthEmail(
      request('send-auth-email', {
        to: EMAIL,
        type: 'confirmSignup',
        language: 'en',
      }),
    );
    expect(limited.status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(EMAIL);
    expect(logs).not.toContain(IP);
  });
});
