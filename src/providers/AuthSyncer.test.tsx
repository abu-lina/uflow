// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/auth-js';

const ACCESS = 'access-token-value-123';
const REFRESH = 'refresh-token-value-456';
const session = { access_token: ACCESS, refresh_token: REFRESH };

const authMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
const authState = vi.hoisted(() => ({
  current: { user: null as unknown, session: null as unknown },
}));

vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: authMock } }));
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => authState.current }));

import { AuthSyncer } from './AuthSyncer';

let emitAuthEvent: (event: string, s: unknown) => Promise<void>;
const fetchMock = vi.fn();

const foreignTokenError = () => new AuthApiError('invalid JWT', 401, 'bad_jwt');
const syncedCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/auth/set');

beforeEach(() => {
  vi.clearAllMocks();
  authState.current = { user: null, session: null };
  authMock.signOut.mockResolvedValue({ error: null });
  authMock.onAuthStateChange.mockImplementation(
    (cb: (event: string, s: unknown) => Promise<void>) => {
      emitAuthEvent = async (event, s) => {
        await cb(event, s);
      };
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  );
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('AuthSyncer', () => {
  describe('session issued by a different Supabase stack', () => {
    beforeEach(() => {
      authMock.getUser.mockResolvedValue({ data: { user: null }, error: foreignTokenError() });
    });

    it('is not written to sb-access-token or sb-refresh-token (persisted session on load)', async () => {
      authState.current = { user: null, session };
      render(<AuthSyncer />);

      await waitFor(() => expect(authMock.signOut).toHaveBeenCalled());
      expect(syncedCalls()).toHaveLength(0);
    });

    it('is not written to sb-access-token or sb-refresh-token (auth state change)', async () => {
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('SIGNED_IN', session));

      expect(authMock.signOut).toHaveBeenCalled();
      expect(syncedCalls()).toHaveLength(0);
    });

    it('clears invalid persisted auth state from local storage so the client reaches signed-out', async () => {
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('INITIAL_SESSION', session));

      expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('clearing cookies and reloading does not recreate the stale cookie', async () => {
      authState.current = { user: null, session };
      const first = render(<AuthSyncer />);
      await waitFor(() => expect(authMock.signOut).toHaveBeenCalledWith({ scope: 'local' }));
      first.unmount();

      // Reload: the signed-out client no longer has a session to re-post.
      authMock.getUser.mockClear();
      authState.current = { user: null, session: null };
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('INITIAL_SESSION', null));

      expect(authMock.getUser).not.toHaveBeenCalled();
      expect(syncedCalls()).toHaveLength(0);
    });
  });

  it('does not sign out or sync when validation fails on a network error', async () => {
    authMock.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('offline', 0),
    });
    render(<AuthSyncer />);
    await act(() => emitAuthEvent('SIGNED_IN', session));

    expect(authMock.signOut).not.toHaveBeenCalled();
    expect(syncedCalls()).toHaveLength(0);
  });

  describe('valid sessions', () => {
    beforeEach(() => {
      authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    });

    const expectSynced = () => {
      expect(authMock.signOut).not.toHaveBeenCalled();
      expect(syncedCalls()).toHaveLength(1);
      const [, init] = syncedCalls()[0];
      expect(JSON.parse(init.body)).toEqual({ access_token: ACCESS, refresh_token: REFRESH });
    };

    it('valid sign-in still syncs both cookies', async () => {
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('SIGNED_IN', session));
      expectSynced();
    });

    it('token refresh still syncs both cookies', async () => {
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('TOKEN_REFRESHED', session));
      expectSynced();
    });

    it('persisted valid session on load still syncs both cookies', async () => {
      authState.current = { user: { id: 'u1' }, session };
      render(<AuthSyncer />);
      await waitFor(() => expect(syncedCalls()).toHaveLength(1));
      expectSynced();
    });
  });

  describe('transient network failures', () => {
    it('getUser rejecting with a retryable error neither signs out nor syncs (auth state change)', async () => {
      authMock.getUser.mockRejectedValue(new AuthRetryableFetchError('offline', 0));
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('SIGNED_IN', session));

      expect(authMock.signOut).not.toHaveBeenCalled();
      expect(syncedCalls()).toHaveLength(0);
    });

    it('getUser rejecting with a retryable error neither signs out nor syncs (persisted session on load)', async () => {
      authMock.getUser.mockRejectedValue(new AuthRetryableFetchError('offline', 0));
      authState.current = { user: null, session };
      render(<AuthSyncer />);

      await waitFor(() => expect(authMock.getUser).toHaveBeenCalled());
      await act(async () => {});
      expect(authMock.signOut).not.toHaveBeenCalled();
      expect(syncedCalls()).toHaveLength(0);
    });

    it('retries the same token after an inconclusive validation', async () => {
      authMock.getUser.mockRejectedValueOnce(new AuthRetryableFetchError('offline', 0));
      authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('SIGNED_IN', session));
      await act(() => emitAuthEvent('SIGNED_IN', session));

      expect(syncedCalls()).toHaveLength(1);
    });
  });

  describe('one sync path per access token', () => {
    beforeEach(() => {
      authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    });

    it('validates and posts once when the session effect and the auth event carry the same token', async () => {
      authState.current = { user: { id: 'u1' }, session };
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('INITIAL_SESSION', session));
      await act(() => emitAuthEvent('SIGNED_IN', session));
      await act(async () => {});

      expect(authMock.getUser).toHaveBeenCalledTimes(1);
      expect(syncedCalls()).toHaveLength(1);
    });

    it('validates and posts once for concurrent events with the same token', async () => {
      render(<AuthSyncer />);
      await act(async () => {
        await Promise.all([
          emitAuthEvent('SIGNED_IN', session),
          emitAuthEvent('SIGNED_IN', session),
        ]);
      });

      expect(authMock.getUser).toHaveBeenCalledTimes(1);
      expect(syncedCalls()).toHaveLength(1);
    });

    it('syncs again when the token changes', async () => {
      render(<AuthSyncer />);
      await act(() => emitAuthEvent('SIGNED_IN', session));
      await act(() =>
        emitAuthEvent('TOKEN_REFRESHED', { access_token: 'access-2', refresh_token: 'refresh-2' }),
      );

      expect(syncedCalls()).toHaveLength(2);
    });

    it('keeps one auth subscription across re-renders and expiry warnings', async () => {
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'token expired' }) });
      const { rerender } = render(<AuthSyncer />);
      await act(() => emitAuthEvent('SIGNED_IN', session));
      rerender(<AuthSyncer />);
      await act(() =>
        emitAuthEvent('TOKEN_REFRESHED', { access_token: 'a2', refresh_token: 'r2' }),
      );

      expect(authMock.onAuthStateChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation is bound to the current session', () => {
    const older = { access_token: 'access-old', refresh_token: 'refresh-old' };
    const newer = { access_token: 'access-new', refresh_token: 'refresh-new' };
    type UserResult = { data: { user: unknown }; error: unknown };

    function deferGetUser() {
      const pending = new Map<string, (r: UserResult) => void>();
      authMock.getUser.mockImplementation(
        (token: string) => new Promise<UserResult>((resolve) => pending.set(token, resolve)),
      );
      return pending;
    }
    const valid: UserResult = { data: { user: { id: 'u1' } }, error: null };
    const invalid = (): UserResult => ({ data: { user: null }, error: foreignTokenError() });

    it('an older session that validates late never overwrites a newer session cookie', async () => {
      const pending = deferGetUser();
      render(<AuthSyncer />);
      let first!: Promise<void>;
      let second!: Promise<void>;
      await act(async () => {
        first = emitAuthEvent('SIGNED_IN', older);
        second = emitAuthEvent('TOKEN_REFRESHED', newer);
      });
      await act(async () => {
        pending.get(newer.access_token)!(valid);
        await second;
        pending.get(older.access_token)!(valid);
        await first;
      });

      expect(syncedCalls()).toHaveLength(1);
      expect(JSON.parse(syncedCalls()[0][1].body)).toEqual(newer);
    });

    it('an older session that fails validation late never signs out a newer session', async () => {
      const pending = deferGetUser();
      render(<AuthSyncer />);
      let first!: Promise<void>;
      let second!: Promise<void>;
      await act(async () => {
        first = emitAuthEvent('SIGNED_IN', older);
        second = emitAuthEvent('TOKEN_REFRESHED', newer);
      });
      await act(async () => {
        pending.get(newer.access_token)!(valid);
        await second;
        pending.get(older.access_token)!(invalid());
        await first;
      });

      expect(authMock.signOut).not.toHaveBeenCalled();
      expect(JSON.parse(syncedCalls()[0][1].body)).toEqual(newer);
    });

    it('a session that validates after sign-out is not written to cookies', async () => {
      const pending = deferGetUser();
      render(<AuthSyncer />);
      let first!: Promise<void>;
      await act(async () => {
        first = emitAuthEvent('SIGNED_IN', older);
        await emitAuthEvent('SIGNED_OUT', null);
      });
      await act(async () => {
        pending.get(older.access_token)!(valid);
        await first;
      });

      expect(syncedCalls()).toHaveLength(0);
    });
  });

  it('never logs access or refresh token values', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spies = [
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
      vi.spyOn(console, 'log').mockImplementation(() => {}),
    ];
    authMock.getUser.mockRejectedValue(new Error('boom'));
    fetchMock.mockRejectedValue(new Error('network'));

    render(<AuthSyncer />);
    await act(() => emitAuthEvent('SIGNED_IN', session));
    authMock.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    await act(() => emitAuthEvent('SIGNED_IN', session));

    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(ACCESS);
    expect(logged).not.toContain(REFRESH);
  });
});
