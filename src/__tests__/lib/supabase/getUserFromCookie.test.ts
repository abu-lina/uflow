import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/headers before importing the module under test
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { cookies as nextCookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';

const mockNextCookies = vi.mocked(nextCookies);
const mockCreateClient = vi.mocked(createSupabaseServerClient);

function makeCookieStore(values: Record<string, string | undefined>) {
  return {
    get: (name: string) => (values[name] !== undefined ? { name, value: values[name] } : undefined),
  };
}

function makeSsrClient(user: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

// Plan 197 — auth-outcome reason-code regression tests for getUserFromCookie

describe('getUserFromCookie — auth-outcome reason codes (Plan 197)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('emits ssr_miss non-terminal event when SSR client finds no user, then falls through', async () => {
    // SSR client returns null user but fallback should continue
    mockCreateClient.mockReturnValue(makeSsrClient(null) as never);
    // No access-token cookie → triggers no_access_token_cookie terminal null after SSR miss
    mockNextCookies.mockResolvedValue(makeCookieStore({}) as never);

    await getUserFromCookie();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_attempt', result: 'ssr_miss', reason: 'ssr_client_no_user' }),
    );
    // Confirm this is NOT emitting result: no_user at the SSR fallthrough site
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'ssr_client_no_user' }),
    );
  });

  it('emits no_access_token_cookie when sb-access-token cookie is absent', async () => {
    mockCreateClient.mockReturnValue(makeSsrClient(null) as never);
    mockNextCookies.mockResolvedValue(makeCookieStore({}) as never);

    const result = await getUserFromCookie();

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'no_access_token_cookie' }),
    );
  });

  it('emits missing_env_vars when Supabase env vars are absent', async () => {
    mockCreateClient.mockReturnValue(makeSsrClient(null) as never);
    mockNextCookies.mockResolvedValue(makeCookieStore({ 'sb-access-token': 'some-token' }) as never);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const result = await getUserFromCookie();

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'missing_env_vars' }),
    );
  });

  it('emits auth_api_error when auth API returns a non-ok response (no refresh attempt)', async () => {
    mockCreateClient.mockReturnValue(makeSsrClient(null) as never);
    mockNextCookies.mockResolvedValue(
      makeCookieStore({ 'sb-access-token': 'bad-token' }) as never,
    );
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    // 403 forbidden (not a 401/403-triggered refresh because there's no refresh token)
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden', text: async () => 'Forbidden' });

    const result = await getUserFromCookie();

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'auth_api_error' }),
    );
  });

  it('emits token_expired_refresh_failed when token is expired and refresh also fails', async () => {
    mockCreateClient.mockReturnValue(makeSsrClient(null) as never);
    mockNextCookies.mockResolvedValue(
      makeCookieStore({ 'sb-access-token': 'expired-token', 'sb-refresh-token': 'bad-refresh' }) as never,
    );
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    // First call (user endpoint) → 401 (triggers refresh attempt)
    // Second call (refresh token endpoint) → not ok (refresh fails)
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'Unauthorized' })
      .mockResolvedValueOnce({ ok: false, status: 400, statusText: 'Bad Request', text: async () => 'invalid refresh token' });

    const result = await getUserFromCookie();

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'token_expired_refresh_failed' }),
    );
  });

  it('emits fetch_error when fetch throws a network error', async () => {
    mockCreateClient.mockReturnValue(makeSsrClient(null) as never);
    mockNextCookies.mockResolvedValue(
      makeCookieStore({ 'sb-access-token': 'token' }) as never,
    );
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await getUserFromCookie();

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'fetch_error' }),
    );
  });
});
