import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuth } from '@/hooks/use-auth';

describe('useAuth', () => {
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
});
