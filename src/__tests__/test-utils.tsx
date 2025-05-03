import React from 'react';

import { render, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

import { AuthProvider } from '@/providers/auth-provider';

interface TestWrapperProps {
  children: React.ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

export async function renderWithProviders(
  ui: React.ReactElement,
  options = {}
) {
  const rendered = render(ui, {
    wrapper: TestWrapper,
    ...options,
  });

  await waitFor(() => {
    expect(rendered.container).toBeTruthy();
  });

  return rendered;
} 