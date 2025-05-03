import { vi } from 'vitest';

export const createClient = vi.fn().mockReturnValue({
  auth: {
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
});
