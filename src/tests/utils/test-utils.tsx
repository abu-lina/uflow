import React from 'react';

import { render as rtlRender } from '@testing-library/react';

import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/ThemeProvider';

interface RenderOptions {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  [key: string]: unknown;
}

function render(
  ui: React.ReactElement,
  { wrapper: Wrapper, ...renderOptions }: RenderOptions = {}
) {
  const defaultWrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );

  return rtlRender(ui, {
    wrapper: Wrapper || defaultWrapper,
    ...renderOptions,
  });
}

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { render };
