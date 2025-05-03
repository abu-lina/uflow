import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { useAuth } from '@/hooks/use-auth';
import { AuthProvider } from '@/providers/auth-provider';

// Silence React error boundary warnings in test
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

it('throws an error when not wrapped in AuthProvider', () => {
  let error: Error | undefined;
  try {
    renderHook(() => useAuth());
  } catch (e) {
    error = e as Error;
  }
  expect(error).toBeDefined();
  expect(error?.message).toBe('useAuth must be used within an AuthProvider');
});

it('returns auth context when wrapped in AuthProvider', async () => {
  const rendered = renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });

  await act(async () => {
    // Wait for any state updates
  });

  expect(rendered.result.current).toBeDefined();
  expect(rendered.result.current.user).toBeNull();
  expect(rendered.result.current.session).toBeNull();
  expect(rendered.result.current.isLoading).toBe(false);
});

// Cleanup
consoleSpy.mockRestore();
