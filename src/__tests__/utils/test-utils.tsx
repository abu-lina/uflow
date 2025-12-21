import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/auth-provider';
import { SearchProvider } from '@/providers/search-provider';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { LanguageProvider } from '@/providers/LanguageProvider';
import { mockAuthContext, mockSearchContext } from '../mocks/providerData';

// Mock Next.js router with stateful search params
// This allows tests to simulate URL changes
let mockSearchParams = new URLSearchParams();
let mockPathname = '/providers';
let searchParamsListeners: Array<() => void> = [];

const createMockRouter = () => ({
    push: vi.fn(),
  replace: vi.fn((url: string) => {
    // Update mock search params when router.replace is called
    const urlObj = new URL(url, 'http://localhost');
    mockSearchParams = urlObj.searchParams;
    mockPathname = urlObj.pathname;
    // Notify listeners (simulate re-render)
    searchParamsListeners.forEach(listener => listener());
  }),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => createMockRouter(),
  useSearchParams: () => {
    // Return current search params - this will be reactive in tests
    return mockSearchParams;
  },
  usePathname: () => mockPathname,
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Supabase client - must be at module level
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Also mock the auth helpers
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock services
vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: vi.fn(() => Promise.resolve([])),
  getBookmarkedProviders: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/communityServices', () => ({
  getCommunityServicesForProvider: vi.fn(() => Promise.resolve([])),
}));

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<typeof mockAuthContext>;
  searchContext?: Partial<typeof mockSearchContext>;
  withProviders?: boolean;
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const {
    // authContext = mockAuthContext, // Unused for now
    // searchContext = mockSearchContext, // Unused for now
    withProviders = true,
    ...renderOptions
  } = options;

  // Reset mock search params for each test
  // Note: This needs to be exported so tests can reset it
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__resetMockSearchParams = () => {
      mockSearchParams = new URLSearchParams();
      mockPathname = '/providers';
    };
    ((window as unknown as Record<string, unknown>).__resetMockSearchParams as () => void)();
  }

  if (!withProviders) {
    return render(ui, renderOptions);
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <SearchProvider>
              <LoadingProvider>
                {children}
              </LoadingProvider>
            </SearchProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper function to wait for async operations
export const waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to mock window.matchMedia
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Helper function to mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete store[key];
        });
      }),
    },
  });
  
  return store;
};

// Helper function to mock IntersectionObserver
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

// Helper function to mock ResizeObserver
export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
};
