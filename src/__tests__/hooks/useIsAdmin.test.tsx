// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth provider
const mockUseAuth = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useIsAdmin } from '@/hooks/useIsAdmin';

describe('useIsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the DB role is admin even if user_metadata.role is absent (#567 regression)', () => {
    // umar.h.ullah@gmail.com: public.users.role = 'admin', raw_user_meta_data->>'role' = NULL
    mockUseAuth.mockReturnValue({
      user: { user_metadata: {} },
      role: 'admin',
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns true when the DB role is moderator', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: {} },
      role: 'moderator',
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns false when DB role is user even if user_metadata.role claims admin (self-writable claim)', () => {
    // Security: user_metadata.role is writable via supabase.auth.updateUser({ data: { role: 'admin' } })
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { role: 'admin' } },
      role: 'user',
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns false when DB role is a regular user role and metadata agrees', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { role: 'user' } },
      role: 'user',
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns false when role is null (signed out or unresolved)', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { role: 'admin' } },
      role: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns false when user is null (not authenticated)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns isLoading true while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
