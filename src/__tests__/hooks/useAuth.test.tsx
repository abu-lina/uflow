import { renderHook } from '@testing-library/react';

import { useAuth } from '@/hooks/useAuth';

// This test expects useAuth to throw if not wrapped in AuthProvider
it('throws if not wrapped in AuthProvider', () => {
  expect(() => renderHook(() => useAuth())).toThrow();
});
