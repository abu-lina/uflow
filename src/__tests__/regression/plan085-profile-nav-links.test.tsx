/**
 * Regression tests for Plan 085: Fix Profile Navigation Links
 *
 * Validates that provider cards in the profile page navigate to the public detail
 * route `/providers/:id`, NOT the owner-scoped `/profile/providers/:id`.
 *
 * Bug: ProfileContent was calling router.push('/profile/providers/:id') for
 * "Deine Inhalte" and router.push('/profile/providers/:id/edit') for
 * "Recommendations" — both produce 404 or middleware redirect in early-access mode.
 *
 * Fix: All profile provider card clicks now navigate to `/providers/:id`.
 *
 * Test strategy: client-state precedence regression pattern
 * - `[pre-fix FAILS]` describes how the broken code would behave
 * - `[post-fix PASSES]` verifies the fix is in place
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// -- Capturable router spy (overrides global setup mock) ---------------------
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/profile',
}));

// -- next/dynamic mock -------------------------------------------------------
vi.mock('next/dynamic', () => ({
  default:
    (_loader: unknown, _options?: unknown) =>
    ({ children }: { children?: React.ReactNode }) =>
      children ? <>{children}</> : null,
}));

// -- next/image --------------------------------------------------------------
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return <img alt={alt as string} src={src as string} {...rest} />;
  },
}));

// -- next/link ---------------------------------------------------------------
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// -- Auth / Language / isMobile hooks ----------------------------------------
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'owner@test.com',
      user_metadata: { full_name: 'Owner User' },
    },
    isLoading: false,
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'de',
  }),
}));

const mockIsSmallMobile = vi.fn(() => false);
vi.mock('@/hooks/useIsMobile', () => ({
  useIsSmallMobile: () => mockIsSmallMobile(),
  useIsMobile: () => mockIsSmallMobile(),
}));

// -- React Query mock -------------------------------------------------------
// queryKey[0] is the named key; return provider data for created+recommendations
const fakeProvider = {
  provider_id: 'prov-uuid-085',
  provider_name: 'Regression Provider 085',
  category: { name_de: 'Mosqueens', name_en: 'Mosqueens' },
  provider_images: null,
  bookmark_count: 0,
  address_street: null,
  address_city: null,
  provider_owner_id: 'user-1',
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const key = queryKey[0];
    if (key === 'created-providers' || key === 'recommendations') {
      return { data: [fakeProvider], isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));

// -- Services (fallback; useQuery mock makes them unreachable in render) -----
vi.mock('@/services/providers', () => ({
  getCreatedProviders: vi.fn(() => Promise.resolve([])),
  getAllBookmarkedItems: vi.fn(() => Promise.resolve([])),
  getRecommendations: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/communityServices', () => ({
  getCreatedCommunityServices: vi.fn(() => Promise.resolve([])),
  getRecommendedCommunityServices: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/dataExport', () => ({
  dataExportService: { exportUserData: vi.fn() },
}));

vi.mock('@/features/auth/services/authService', () => ({
  authService: { signOut: vi.fn() },
}));

// -- UI component mocks ------------------------------------------------------
// MobileProfileProviderCard: render a button so we can click it and capture onClick
vi.mock('@/components/shared/MobileProfileProviderCard', () => ({
  MobileProfileProviderCard: ({
    title,
    onClick,
  }: {
    title: string;
    onClick?: () => void;
  }) => (
    <button data-testid={`mobile-card-${title}`} onClick={onClick} type="button">
      {title}
    </button>
  ),
}));

// SelectableCard: render a button so we can click it and capture onClick
vi.mock('@/components/shared/SelectableCard', () => ({
  SelectableCard: ({
    title,
    onClick,
  }: {
    title: string;
    onClick?: () => void;
  }) => (
    <button data-testid={`selectable-card-${title}`} onClick={onClick} type="button">
      {title}
    </button>
  ),
}));

// UserNavigationTabs: expose tab buttons so tests can switch tabs
vi.mock('@/components/shared/UserNavigationTabs', () => ({
  UserNavigationTabs: ({
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <div>
      <button
        data-testid="tab-created"
        type="button"
        onClick={() => onTabChange('created')}
      >
        Created
      </button>
      <button
        data-testid="tab-recommendations"
        type="button"
        onClick={() => onTabChange('recommendations')}
      >
        Recommendations
      </button>
    </div>
  ),
  UserTab: {},
}));

vi.mock('@/features/providers/ProviderCreateForm', () => ({
  ProviderCreateForm: () => null,
}));

// Layout passthrough mocks
vi.mock('@/components/layout/ScrollablePageLayout', () => ({
  ScrollablePageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/components/layout/PageContent', () => ({
  PageContent: ({ children }: { children: React.ReactNode; className?: string; maxWidth?: string }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/components/layout/ContentSection', () => ({
  ContentSection: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

// UI primitive mocks
vi.mock('@/components/ui/LoadingSpinner', () => ({ LoadingSpinner: () => null }));
vi.mock('@/components/ui/SectionHeading', () => ({
  SectionHeading: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/EmptyState', () => ({ EmptyState: () => null }));
vi.mock('@/components/ui/IconWithTitle', () => ({
  IconWithTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/FormInput', () => ({ FormInput: () => null }));
vi.mock('@/components/ui/BrokenHeartIcon', () => ({ BrokenHeartIcon: () => null }));

vi.mock('@/components/common/error-boundary/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@iconify/react', () => ({ Icon: () => null }));
vi.mock('lucide-react', () => ({
  CircleHelp: () => null,
  LogOut: () => null,
  User: () => null,
  Lock: () => null,
  FileText: () => null,
  AlertTriangle: () => null,
  Heart: () => null,
  Download: () => null,
  Shield: () => null,
  Eye: () => null,
  EyeOff: () => null,
  Scale: () => null,
  Save: () => null,
  ChevronRight: () => null,
}));

vi.mock('@/utils/imageUtils', () => ({
  getFirstImageUrl: () => null,
  getAllTrustedImageUrls: () => [],
  PLACEHOLDER_IMAGE: '/placeholder.jpg',
}));

// -- Import under test -------------------------------------------------------
// Note: ProfileContent must be imported AFTER all mocks are hoisted
import { ProfileContent } from '@/app/(public)/profile/ProfileContent';

const fakeServerUser = {
  id: 'user-1',
  email: 'owner@test.com',
  user_metadata: { full_name: 'Owner User' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// ---------------------------------------------------------------------------
// Mobile layout tests (isMobile = true → mobileContent rendered)
// ---------------------------------------------------------------------------
describe('Plan 085 — Mobile "Deine Inhalte" provider card navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSmallMobile.mockReturnValue(true);
  });

  it('[post-fix PASSES] clicking provider card navigates to /providers/:id (not /profile/providers/:id)', () => {
    render(<ProfileContent user={fakeServerUser} />);

    // Both "Deine Inhalte" and "Recommendations" sections render a card with the same name.
    // Take index 0 — the first rendered card belongs to the "Deine Inhalte" section.
    const cards = screen.getAllByTestId(`mobile-card-${fakeProvider.provider_name}`);
    fireEvent.click(cards[0]);

    expect(mockPush).toHaveBeenCalledWith(`/providers/${fakeProvider.provider_id}`);
  });

  it('[pre-fix FAILS] clicking provider card must NOT navigate to /profile/providers/:id', () => {
    render(<ProfileContent user={fakeServerUser} />);

    const cards = screen.getAllByTestId(`mobile-card-${fakeProvider.provider_name}`);
    fireEvent.click(cards[0]);

    const brokenPath = `/profile/providers/${fakeProvider.provider_id}`;
    expect(mockPush).not.toHaveBeenCalledWith(brokenPath);
  });
});

describe('Plan 085 — Mobile Recommendations provider card navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSmallMobile.mockReturnValue(true);
  });

  it('[post-fix PASSES] clicking recommendation card navigates to /providers/:id (not /profile/providers/:id/edit)', () => {
    render(<ProfileContent user={fakeServerUser} />);

    // The Recommendations section renders all recommendation cards;
    // Both "Deine Inhalte" and "Recommendations" sections use the same provider name.
    // We click the LAST mobile card with this name (index 1 = recommendations row).
    const cards = screen.getAllByTestId(`mobile-card-${fakeProvider.provider_name}`);
    // Recommendations card is the second one (index 1)
    fireEvent.click(cards[1]);

    expect(mockPush).toHaveBeenCalledWith(`/providers/${fakeProvider.provider_id}`);
  });

  it('[pre-fix FAILS] clicking recommendation card must NOT navigate to /profile/providers/:id/edit', () => {
    render(<ProfileContent user={fakeServerUser} />);

    const cards = screen.getAllByTestId(`mobile-card-${fakeProvider.provider_name}`);
    fireEvent.click(cards[1]);

    const brokenEditPath = `/profile/providers/${fakeProvider.provider_id}/edit`;
    expect(mockPush).not.toHaveBeenCalledWith(brokenEditPath);
  });
});

// ---------------------------------------------------------------------------
// Desktop layout tests (isMobile = false → desktopContent rendered)
// ---------------------------------------------------------------------------
describe('Plan 085 — Desktop Recommendations provider card navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSmallMobile.mockReturnValue(false);
  });

  it('[post-fix PASSES] clicking recommendation card in desktop layout navigates to /providers/:id', () => {
    render(<ProfileContent user={fakeServerUser} />);

    // Switch to recommendations tab
    fireEvent.click(screen.getByTestId('tab-recommendations'));

    const card = screen.getByTestId(`selectable-card-${fakeProvider.provider_name}`);
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith(`/providers/${fakeProvider.provider_id}`);
  });

  it('[pre-fix FAILS] clicking recommendation card in desktop layout must NOT navigate to /profile/providers/:id/edit', () => {
    render(<ProfileContent user={fakeServerUser} />);

    fireEvent.click(screen.getByTestId('tab-recommendations'));

    const card = screen.getByTestId(`selectable-card-${fakeProvider.provider_name}`);
    fireEvent.click(card);

    const brokenEditPath = `/profile/providers/${fakeProvider.provider_id}/edit`;
    expect(mockPush).not.toHaveBeenCalledWith(brokenEditPath);
  });
});

describe('Plan 085 — Desktop Created tab provider card navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSmallMobile.mockReturnValue(false);
  });

  it('[post-fix PASSES] clicking created provider card in desktop layout navigates to /providers/:id', () => {
    render(<ProfileContent user={fakeServerUser} />);

    // Switch to created tab
    fireEvent.click(screen.getByTestId('tab-created'));

    const card = screen.getByTestId(`selectable-card-${fakeProvider.provider_name}`);
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith(`/providers/${fakeProvider.provider_id}`);
  });

  it('[pre-fix FAILS] clicking created card in desktop layout must NOT have onClick pointing to /profile/providers/', () => {
    render(<ProfileContent user={fakeServerUser} />);

    fireEvent.click(screen.getByTestId('tab-created'));

    const card = screen.getByTestId(`selectable-card-${fakeProvider.provider_name}`);
    fireEvent.click(card);

    // The old code had NO onClick — mockPush must be called (proves handler was added)
    // AND the path must be correct
    expect(mockPush).toHaveBeenCalledWith(`/providers/${fakeProvider.provider_id}`);
  });
});
