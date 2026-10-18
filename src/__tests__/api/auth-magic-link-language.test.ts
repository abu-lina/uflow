import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, spyOnConsole } from '@/__tests__/utils/pii-probe';

const mockSendAuthEmail = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: () => 'ip:test',
}));

vi.mock('@/utils/security', () => ({
  getClientIP: () => 'unknown',
  checkIPBlocked: () => false,
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

const post = (language: string) =>
  POST(
    new Request('http://localhost/api/auth/magic-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-real-ip': PROBE_IP,
        origin: 'http://localhost',
      },
      body: JSON.stringify({ email: PROBE_EMAIL, language }),
    }) as never
  );

describe('POST /api/auth/magic-link email language (#722 AC4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spyOnConsole();
    mockSendAuthEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('falls back to en for an unsupported language', async () => {
    await post('ur');
    expect(mockSendAuthEmail).toHaveBeenCalledTimes(1);
    expect(mockSendAuthEmail.mock.calls[0][2]).toBe('en');
  });

  it('keeps a supported language', async () => {
    await post('de');
    expect(mockSendAuthEmail.mock.calls[0][2]).toBe('de');
  });
});
