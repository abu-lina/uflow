import { renderHook } from '@testing-library/react';

import { useAuth } from '@/hooks/use-auth';

// This test expects useAuth to throw if not wrapped in AuthProvider
it('throws if not wrapped in AuthProvider', () => {
  let error: Error | undefined;
  try {
    renderHook(() => useAuth());
  } catch (e) {
    error = e as Error;
  }
  expect(error).toBeDefined();
  expect(error?.message).toBe("useAuth must be used within an AuthProvider");
});
