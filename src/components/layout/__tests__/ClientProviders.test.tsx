import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import { ClientProviders } from '../ClientProviders';

const mockCleanupServiceWorkers = vi.fn();
const mockToaster = vi.fn((props?: unknown) => <div data-props={JSON.stringify(props)} data-testid="sonner-toaster" />);

vi.mock('sonner', () => ({
  Toaster: (props: unknown) => mockToaster(props),
  toast: vi.fn(),
}));

vi.mock('@/lib/pwa/serviceWorkerCleanup', () => ({
  cleanupServiceWorkers: () => mockCleanupServiceWorkers(),
}));

vi.mock('@/design-system', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/PWAInstallPrompt', () => ({
  PWAInstallPrompt: () => null,
}));

vi.mock('@/providers/auth-provider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/AuthSyncer', () => ({
  AuthSyncer: () => null,
}));

vi.mock('@/providers/filter-provider', () => ({
  FilterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/form-provider', () => ({
  FormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/search-provider', () => ({
  SearchProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/splash-provider', () => ({
  SplashProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/LanguageUpdater', () => ({
  LanguageUpdater: () => null,
}));

describe('ClientProviders toaster safe-area config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes safe-area aware offset values to Sonner Toaster', async () => {
    render(
      <ClientProviders initialUser={null}>
        <div>content</div>
      </ClientProviders>
    );

    await waitFor(() => {
      expect(mockToaster).toHaveBeenCalled();
    });

    const firstCall = mockToaster.mock.calls.at(0);
    expect(firstCall).toBeDefined();

    const firstCallProps = firstCall?.[0] as {
      offset?: { top?: string; left?: string; right?: string };
      mobileOffset?: { top?: string; left?: string; right?: string };
      position?: string;
    };

    expect(firstCallProps.position).toBe('top-center');
    expect(firstCallProps.offset).toEqual({
      top: 'calc(env(safe-area-inset-top) + 16px)',
      left: '16px',
      right: '16px',
    });
    expect(firstCallProps.mobileOffset).toEqual({
      top: 'calc(env(safe-area-inset-top) + 16px)',
      left: '12px',
      right: '12px',
    });
  });
});
