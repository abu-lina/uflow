import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import { render } from '@/__tests__/utils/test-utils';
import { mockProviders } from '@/__tests__/mocks/providerData';
import { ProviderDetailSections } from '@/features/providers/components/ProviderDetailSections';

const useQueryMock = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  };
});

describe('ProviderDetailSections', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    localStorage.setItem('preferred-language', 'en');
  });

  it('[post-review fix] shows loading state instead of empty-state while nearby query is loading', () => {
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
    });

    render(
      <ProviderDetailSections
        badges={[]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          offers: [],
          needs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nearby' }));

    expect(screen.getByText('Loading providers...')).toBeInTheDocument();
    expect(screen.queryByText('No nearby providers found.')).not.toBeInTheDocument();
  });
});
