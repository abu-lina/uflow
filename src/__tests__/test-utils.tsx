import React from 'react';

import { NextRouter } from 'next/router';

import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { AuthProvider } from '@/providers/auth-provider';

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

interface TestWrapperProps {
  children: React.ReactNode;
  router?: Partial<NextRouter>;
}

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  { router = {}, ...options } = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper router={router}>
        {children}
      </TestWrapper>
    ),
    ...options,
  });
} 