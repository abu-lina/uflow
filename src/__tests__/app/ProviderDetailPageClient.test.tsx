// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';

import { render } from '@/__tests__/utils/test-utils';
import { mockProviders } from '@/__tests__/mocks/providerData';
import type { Provider } from '@/services/providers';
import type { ProviderDetailPageClient as PDPC_Type } from '@/app/(public)/p/[id]/ProviderDetailPageClient';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const { mockIsAdmin } = vi.hoisted(() => ({
  mockIsAdmin: vi.fn(() => ({ isAdmin: false, isLoading: false })),
}));

const { mockUseProvider } = vi.hoisted(() => ({
  mockUseProvider: vi.fn(() => ({
    data: null as Provider | null,
    isLoading: false,
    error: null as Error | null,
  })),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockIsAdmin(),
}));

vi.mock('@/hooks/useProvider', () => ({
  useProvider: () => mockUseProvider(),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
    dir: 'ltr',
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/admin/components/AdminProviderDetailButtons', () => ({
  AdminProviderDetailButtons: () => <div data-testid="admin-buttons" />,
}));

vi.mock('@/features/providers/pages/ProviderDetailModal', () => ({
  ProviderDetailModal: () => <div data-testid="provider-modal" />,
}));

vi.mock('@/features/providers/pages/ProviderDetailPage', () => ({
  ProviderDetailPage: () => <div data-testid="provider-page" />,
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    let Component: React.ComponentType | null = null;
    const promise = loader().then((mod) => {
      Component = mod.default;
    });
    const DynamicComponent = (props: Record<string, unknown>) => {
      if (!Component) throw promise;
      return <Component {...props} />;
    };
    return DynamicComponent;
  },
}));

let ProviderDetailPageClient: typeof PDPC_Type;

beforeAll(async () => {
  ProviderDetailPageClient = (await import('@/app/(public)/p/[id]/ProviderDetailPageClient'))
    .ProviderDetailPageClient;
}, 60_000);

describe('ProviderDetailPageClient review banner', () => {
  beforeEach(() => {
    mockIsAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    mockUseProvider.mockReset();
  });

  it('[AC1] admin sees neutral "pending review" banner for pending providers', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true, isLoading: false });
    mockUseProvider.mockReturnValue({
      data: { ...mockProviders[0], review_status: 'pending', offers: [], needs: [] } as Provider,
      isLoading: false,
      error: null,
    });

    render(<ProviderDetailPageClient providerId="provider-1" />);

    expect(screen.getByText('submissionStatus.pendingReviewAdmin')).toBeInTheDocument();
  });

  it('[AC2] admin sees neutral "rejected" banner for rejected providers', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true, isLoading: false });
    mockUseProvider.mockReturnValue({
      data: { ...mockProviders[0], review_status: 'rejected', offers: [], needs: [] } as Provider,
      isLoading: false,
      error: null,
    });

    render(<ProviderDetailPageClient providerId="provider-1" />);

    expect(screen.getByText('submissionStatus.rejectedBannerAdmin')).toBeInTheDocument();
  });

  it('[AC6] non-admin sees original submitter copy for pending providers', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    mockUseProvider.mockReturnValue({
      data: { ...mockProviders[0], review_status: 'pending', offers: [], needs: [] } as Provider,
      isLoading: false,
      error: null,
    });

    render(<ProviderDetailPageClient providerId="provider-1" />);

    expect(screen.getByText('submissionStatus.awaitingReview')).toBeInTheDocument();
  });

  it('[AC6] non-admin sees original submitter copy for rejected providers', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
    mockUseProvider.mockReturnValue({
      data: { ...mockProviders[0], review_status: 'rejected', offers: [], needs: [] } as Provider,
      isLoading: false,
      error: null,
    });

    render(<ProviderDetailPageClient providerId="provider-1" />);

    expect(screen.getByText('submissionStatus.rejectedBanner')).toBeInTheDocument();
  });
});
