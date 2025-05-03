import { vi } from 'vitest';

const mockSubscription = {
  unsubscribe: vi.fn(),
};

const mockAuth = {
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  onAuthStateChange: vi.fn().mockImplementation((callback) => {
    callback('SIGNED_IN', { user: null, session: null });
    return { data: { subscription: mockSubscription } };
  }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
};

const createClient = vi.fn().mockImplementation((url: string, key: string) => {
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return {
    auth: mockAuth,
  };
});

export { createClient }; 