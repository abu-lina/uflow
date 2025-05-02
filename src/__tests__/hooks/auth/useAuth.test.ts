/**
 * @fileoverview Tests for the useAuth hook
 * @module tests/hooks/auth
 */

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/auth/useAuth';
import { mockSupabaseClient } from '@/tests/mocks/supabase';
import { Session, User } from '@supabase/supabase-js';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('handles successful authentication', async () => {
    const { result } = renderHook(() => useAuth());

    const mockUser: User = {
      id: 'test-user',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    await act(async () => {
      const mock = mockSupabaseClient as unknown as { auth: { getSession: jest.Mock } };
      mock.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
  });

  it('handles authentication error', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const mock = mockSupabaseClient as unknown as { auth: { getSession: jest.Mock } };
      mock.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Auth error'),
      });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
