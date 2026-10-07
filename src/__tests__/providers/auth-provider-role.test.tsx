// @vitest-environment jsdom
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Session, User } from '@supabase/supabase-js';

// Shared mocks for the browser supabase client. Hoisted so the vi.mock factory
// can reference them before the test module body runs.
const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const getSession = vi.fn();
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const listeners: Array<(event: string, session: Session | null) => void> = [];
  return { maybeSingle, eq, select, from, getSession, signOut, listeners };
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
        mocks.listeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn(),
      signOut: mocks.signOut,
      signUp: vi.fn(),
    },
    from: mocks.from,
  },
}));

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const emitAuth = (event: string, session: Session | null) => {
  act(() => {
    for (const listener of mocks.listeners) listener(event, session);
  });
};

const makeUser = (id: string, userMetadata: Record<string, unknown> = {}) =>
  ({ id, email: `${id}@example.com`, user_metadata: userMetadata }) as unknown as User;

const makeSession = (user: User) =>
  ({ user, access_token: 'token', refresh_token: 'refresh' }) as unknown as Session;

describe('AuthProvider role handling (#567)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listeners.length = 0;
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'user' }, error: null });
  });

  it('exposes the server-resolved DB role on first paint: admin in public.users, no JWT role claim', () => {
    const user = makeUser('u-admin'); // user_metadata.role intentionally absent
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => (
        <AuthProvider initialRole="admin" initialUser={user}>
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not trust a self-written user_metadata.role=admin when DB role is user', () => {
    const forged = makeUser('u-user', { role: 'admin' });
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => (
        <AuthProvider initialRole="user" initialUser={forged}>
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('keeps a non-admin non-admin', () => {
    const user = makeUser('u-plain');
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => (
        <AuthProvider initialRole="user" initialUser={user}>
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('fetches the DB role for a session restored via getSession when initialUser is absent', async () => {
    const user = makeUser('u-restored');
    mocks.getSession.mockResolvedValueOnce({
      data: { session: makeSession(user) },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValueOnce({ data: { role: 'moderator' }, error: null });

    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await vi.waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(mocks.from).toHaveBeenCalledWith('users');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'u-restored');
  });

  it('refreshes the role from public.users on SIGNED_IN', async () => {
    const user = makeUser('u-signin');
    mocks.maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });

    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);

    emitAuth('SIGNED_IN', makeSession(user));

    await vi.waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(mocks.from).toHaveBeenCalledWith('users');
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'u-signin');
  });

  it('clears admin state on SIGNED_OUT', async () => {
    const user = makeUser('u-admin');
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => (
        <AuthProvider initialRole="admin" initialUser={user}>
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.isAdmin).toBe(true);

    emitAuth('SIGNED_OUT', null);

    await vi.waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  it('clears the role when signOut() is called', async () => {
    const user = makeUser('u-admin');
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider initialRole="admin" initialUser={user}>
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.role).toBe('admin');

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('does not let a stale role fetch overwrite sign-out', async () => {
    const user = makeUser('u-race');
    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    // Sign in triggers a deferred role fetch that resolves slowly
    let resolveRole: (v: { data: { role: string } | null; error: null }) => void = () => {};
    mocks.maybeSingle.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRole = resolve;
        }),
    );
    emitAuth('SIGNED_IN', makeSession(user));
    // The fetch is deferred through setTimeout(0), so wait until it has
    // actually started; before this, resolveRole was still the no-op above
    // when called, which left the userIdRef stale-guard unexercised.
    await vi.waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalled());
    // Sign out before the fetch resolves
    emitAuth('SIGNED_OUT', null);

    await act(async () => {
      resolveRole({ data: { role: 'admin' }, error: null });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('drops a role response for the previous user when a different account signs in', async () => {
    const userA = makeUser('u-first');
    const userB = makeUser('u-second');
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    // A signs in; its role query stays pending
    let resolveA: (v: { data: { role: string } | null; error: null }) => void = () => {};
    mocks.maybeSingle.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveA = resolve;
        }),
    );
    emitAuth('SIGNED_IN', makeSession(userA));
    await vi.waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledTimes(1));

    // B signs in before A's query resolves; B's fetch answers 'user'
    emitAuth('SIGNED_IN', makeSession(userB));
    await vi.waitFor(() => expect(result.current.role).toBe('user'));

    // A's slow response arrives last and must be dropped by the stale-guard
    await act(async () => {
      resolveA({ data: { role: 'admin' }, error: null });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.role).toBe('user');
    expect(result.current.user?.id).toBe('u-second');
  });

  it('logs the PostgREST error and still fails closed when the role query returns one', async () => {
    const user = makeUser('u-rls');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'row level security' } });

    const { result } = renderHook(() => useIsAdmin(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    emitAuth('SIGNED_IN', makeSession(user));

    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith('[fetchRole] role lookup failed:', 'row level security'),
    );
    // Fail-closed: a returned error resolves to 'user', never 'admin'
    expect(result.current.isAdmin).toBe(false);
    warn.mockRestore();
  });
});
