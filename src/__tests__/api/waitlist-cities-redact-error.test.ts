import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP, leakedValues, spyOnConsole } from '@/__tests__/utils/pii-probe';

const mockInsert = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
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

const probeError = (source: string) => ({
  message: `${source} failed for ${PROBE_EMAIL}`,
  details: `Key (email)=(${PROBE_EMAIL})`,
  hint: null,
  code: 'XX000',
});

const thrownProbeError = (source: string) =>
  Object.assign(new Error(`${source} threw for ${PROBE_EMAIL}`), {
    details: `Key (email)=(${PROBE_EMAIL})`,
  });

const joinBody = { email: PROBE_EMAIL, isProvider: false };
const subscribeBody = { email: PROBE_EMAIL, cityName: 'Berlin', waitlistToken: 'waitlist-token' };
const updateBody = { email: PROBE_EMAIL, waitlistToken: 'waitlist-token', selected_city: 'Berlin' };

describe('waitlist and cities routes (#669)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spyOnConsole();
    mockInsert.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: { success: true, updated: 1 }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC2: route errors go through redactError', () => {
    it.each([
      [
        'waitlist/join error path',
        () => mockInsert.mockResolvedValue({ error: probeError('insert') }),
        () => joinWaitlist(request('waitlist/join', 'POST', joinBody)),
      ],
      [
        'waitlist/join catch-all',
        () => mockInsert.mockRejectedValue(thrownProbeError('insert')),
        () => joinWaitlist(request('waitlist/join', 'POST', joinBody)),
      ],
      [
        'waitlist/subscribe-city error path',
        () => mockRpc.mockResolvedValue({ data: null, error: probeError('rpc') }),
        () => subscribeCity(request('waitlist/subscribe-city', 'POST', subscribeBody)),
      ],
      [
        'waitlist/subscribe-city catch-all',
        () => mockRpc.mockRejectedValue(thrownProbeError('rpc')),
        () => subscribeCity(request('waitlist/subscribe-city', 'POST', subscribeBody)),
      ],
      [
        'waitlist/update RPC error',
        () => mockRpc.mockResolvedValue({ data: null, error: probeError('rpc') }),
        () => updateWaitlist(request('waitlist/update', 'PATCH', updateBody)),
      ],
      [
        'waitlist/update catch-all',
        () => mockRpc.mockRejectedValue(thrownProbeError('rpc')),
        () => updateWaitlist(request('waitlist/update', 'PATCH', updateBody)),
      ],
      [
        'cities rpcError',
        () => mockRpc.mockResolvedValue({ data: null, error: probeError('get_cities_with_counts') }),
        () => listCities(request('cities', 'GET')),
      ],
      [
        'cities catch-all',
        () => mockRpc.mockRejectedValue(thrownProbeError('get_cities_with_counts')),
        () => listCities(request('cities', 'GET')),
      ],
    ] as const)('%s', async (_name, arrange, call) => {
      arrange();

      const response = await call();

      expect(response.status).toBe(500);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });

  describe('AC3: waitlist/update logs no raw zod issues', () => {
    it.each([
      ['malformed email', { email: `${PROBE_EMAIL} `, waitlistToken: 'waitlist-token' }],
      ['wrong field types', { email: PROBE_EMAIL, waitlistToken: 'waitlist-token', selected_city: PROBE_EMAIL.length, has_seen_early_access: PROBE_EMAIL }],
    ])('%s', async (_name, body) => {
      const response = await updateWaitlist(request('waitlist/update', 'PATCH', body));

      expect(response.status).toBe(400);
      expect(leakedValues([PROBE_EMAIL])).toEqual([]);
    });
  });
});
