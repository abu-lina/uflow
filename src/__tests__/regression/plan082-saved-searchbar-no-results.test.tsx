import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import SavedProvidersPage from '@/app/(public)/saved/page';

const mockUseQuery = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockSetQueryData = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    setQueryData: mockSetQueryData,
  }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    isLoading: false,
  }),
}));

vi.mock('@/providers/search-provider', () => ({
  useSearch: () => ({
    searchQuery: 'zzz-no-match',
    selectedLocation: '',
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({
    stage: 'stage3',
  }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/layout/ScrollablePageLayout', () => ({
  ScrollablePageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageContent', () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageContentWrapper', () => ({
  PageContentWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/TitleSection', () => ({
  TitleSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/ContentSection', () => ({
  ContentSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/SelectableCard', () => ({
  SelectableCard: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/search/components/SearchBar', () => ({
  SearchBar: () => <div data-testid="saved-search-bar">search-bar</div>,
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/TitleAndText', () => ({
  TitleAndText: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => <span>icon</span>,
}));

vi.mock('@/components/ui/SkeletonCard', () => ({
  SkeletonCard: () => <div>skeleton-card</div>,
}));

vi.mock('@/components/ui/FormInput', () => ({
  FormInput: () => <input />,
}));

vi.mock('@/components/ui/FormInputGroup', () => ({
  FormInputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/EmailVerificationAlert', () => ({
  default: () => <div>email-verification-alert</div>,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: vi.fn(),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@/services/bookmarks', () => ({
  deleteBookmark: vi.fn(),
}));

vi.mock('@/services/providers', () => ({
  getAllBookmarkedItems: vi.fn(),
  fetchBookmarkedCities: vi.fn(),
}));

vi.mock('@/utils/imageUtils', () => ({
  getFirstImageUrl: () => null,
  formatProviderAddress: () => 'Address',
}));

vi.mock('@/lib/auth', () => ({
  signInWithEmailConfirmation: vi.fn(),
  signInWithMagicLink: vi.fn(),
}));

describe('Plan 082 - Saved page empty-state searchbar regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuery
      .mockReturnValueOnce({
        data: [
          {
            id: 'provider-1',
            name: 'Alpha Provider',
            address_street: 'Main St',
            address_city: 'Berlin',
            category: { name_de: 'Gesundheit' },
            images: null,
            type: 'provider',
          },
        ],
        isLoading: false,
        error: null,
      })
      .mockReturnValueOnce({
        data: ['Berlin'],
      });
  });

  it('[post-fix PASSES] keeps SearchBar visible when search has no matching saved providers', () => {
    render(<SavedProvidersPage />);

    expect(screen.getByTestId('saved-search-bar')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
