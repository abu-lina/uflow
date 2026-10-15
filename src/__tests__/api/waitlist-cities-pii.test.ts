import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';

const mockCheckRateLimit = vi.fn((..._args: unknown[]) => true);
const mockInsert = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (request: Request) => `ip:${request.headers.get('x-real-ip') || 'unknown'}`,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('@/services/email/waitlistEmail', () => ({
  sendWaitlistConfirmationEmail: async () => undefined,
}));

vi.mock('@/lib/utils/waitlist-token', () => ({
  generateWaitlistToken: () => 'waitlist-token',
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'waitlist-token' }) }),
}));

import { GET as listCities } from '@/app/api/cities/route';
import { POST as joinWaitlist } from '@/app/api/waitlist/join/route';
import { POST as subscribeCity } from '@/app/api/waitlist/subscribe-city/route';
import { PATCH as updateWaitlist } from '@/app/api/waitlist/update/route';

function request(path: string, method: string, body?: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-real-ip': PROBE_IP },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const dbError = (source: string) => ({
  message: `${source} failed for ${PROBE_EMAIL}`,
  details: `Key (email)=(${PROBE_EMAIL}) violates check constraint`,
  hint: null,
  code: '23514',
});

describe('waitlist and cities routes log no raw PII', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockInsert.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: { success: true, updated: 1 }, error: null });
    spyOnConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC6: raw DB errors do not echo the email', () => {
    it('waitlist/join DB error', async () => {
      mockInsert.mockResolvedValue({ error: dbError('insert') });

      const response = await joinWaitlist(
        request('waitlist/join', 'POST', { email: PROBE_EMAIL, isProvider: false }),
      );

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });

    it('waitlist/subscribe-city RPC error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: dbError('rpc') });

      const response = await subscribeCity(
        request('waitlist/subscribe-city', 'POST', {
          email: PROBE_EMAIL,
          cityName: 'Berlin',
          waitlistToken: 'waitlist-token',
        }),
      );

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('AC7: rate-limit paths log no raw IP', () => {
    it('waitlist/update', async () => {
      mockCheckRateLimit.mockReturnValue(false);

      const response = await updateWaitlist(
        request('waitlist/update', 'PATCH', { email: PROBE_EMAIL, waitlistToken: 'waitlist-token' }),
      );

      expect(response.status).toBe(429);
      expect(leakedValues([PROBE_IP])).toEqual([]);
    });

    it('cities', async () => {
      mockCheckRateLimit.mockReturnValue(false);

      const response = await listCities(request('cities', 'GET'));

      expect(response.status).toBe(429);
      expect(leakedValues([PROBE_IP])).toEqual([]);
    });
  });
});
