import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/hooks/use-auth';
import { AuthProvider } from '@/providers/auth-provider';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        // Simulate initial auth state change
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

describe('useAuth', () => {
  it('throws if not wrapped in AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleError.mockRestore();
  });

  it('returns auth context when wrapped in AuthProvider', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
    });

    // Wait for both async operations to complete
    await act(async () => {
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    // Then check the rest of the values
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
  });
});
