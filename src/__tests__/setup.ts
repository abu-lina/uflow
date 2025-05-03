import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set up environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.com';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

// Mock zod
vi.mock('zod', () => {
  const string = () => ({
    email: () => string(),
    min: () => string(),
    max: () => string(),
  });

  return {
    z: {
      object: (_schema: Record<string, unknown>) => ({
        extend: () => ({
          refine: () => ({
            parse: vi.fn(),
          }),
        }),
        parse: vi.fn(),
        shape: {
          email: { parse: vi.fn() },
          password: { parse: vi.fn() },
        },
      }),
      string,
      ZodError: class extends Error {
        errors = [{ path: [], message: 'Mock error' }];
      },
    },
  };
});

// Mock supabase client
vi.mock('@/lib/supabase/client');

// Mock components
vi.mock('@/components/ui/skeleton/Skeleton', () => ({
  FormSkeleton: () => null,
}));

vi.mock('@/components/error-boundary/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
