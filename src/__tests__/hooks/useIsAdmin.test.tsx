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

  it('returns true when user has admin role in metadata', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { role: 'admin' } },
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns true when user has moderator role in metadata', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { role: 'moderator' } },
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns false when user has regular user role', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: { role: 'user' } },
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns false when user has no role in metadata', () => {
    mockUseAuth.mockReturnValue({
      user: { user_metadata: {} },
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns false when user is null (not authenticated)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
  });

  it('returns isLoading true while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useIsAdmin());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
