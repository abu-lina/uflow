import '@testing-library/jest-dom';
import { afterAll, vi } from 'vitest';

// Set up environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Silence React error boundary warnings in test
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

// Mock zod
const mockParse = vi.fn().mockReturnValue({
  email: 'test@example.com',
  password: 'password123',
});

const mockString = () => ({
  email: () => ({
    min: () => ({
      parse: mockParse,
    }),
  }),
});

const mockObject = () => ({
  shape: {
    email: { parse: mockParse },
    password: { parse: mockParse },
  },
  parse: mockParse,
});

vi.mock('zod', () => ({
  z: {
    object: mockObject,
    string: mockString,
    ZodError: class extends Error {
      errors = [{ path: [], message: 'Mock error' }];
    },
  },
}));

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
  }),
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

// Mock components
vi.mock('@/components/ui/skeleton/Skeleton', () => ({
  FormSkeleton: () => null,
}));

vi.mock('@/components/error-boundary/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/ui/form-skeleton', () => ({
  FormSkeleton: ({ children }: { children: React.ReactNode }) => children,
}));

// Cleanup
afterAll(() => {
  consoleSpy.mockRestore();
});
