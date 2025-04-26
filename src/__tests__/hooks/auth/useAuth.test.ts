/**
 * @fileoverview Tests for the useAuth hook
 * @module tests/hooks/auth
 */

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/auth/useAuth';
import { mockSupabaseClient } from '@/tests/mocks/supabase';

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
    
    await act(async () => {
      // Simulate successful authentication
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      });
    });

    expect(result.current.user).toEqual({ id: 'test-user' });
    expect(result.current.loading).toBe(false);
  });

  it('handles authentication error', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      // Simulate authentication error
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Auth error'),
      });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
}); 