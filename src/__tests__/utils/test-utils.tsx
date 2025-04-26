/**
 * @fileoverview Test utilities for React Testing Library
 * @module tests/utils
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/providers/auth-provider';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return <AuthProvider>{children}</AuthProvider>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render }; 