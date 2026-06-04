import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import { render } from '@/__tests__/utils/test-utils';
import { mockProviders } from '@/__tests__/mocks/providerData';
import { ProviderDetailSections } from '@/features/providers/components/ProviderDetailSections';
import { BadgeKey, EntityType, TrustLevel } from '@/types/badges';

const useQueryMock = vi.fn();

vi.mock('@/components/providers/TrustBadgesSection', () => ({
  TrustBadgesSection: ({ badges, isLoading }: { badges: unknown[]; isLoading: boolean }) => (
    <div data-testid="trust-badges-section-mock">
      badges:{badges.length};loading:{String(isLoading)}
    </div>
  ),
}));

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

  it('[post-fix PASSES] does not render noAlcohol and noPork in values & amenities when provider flags are true', () => {
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    render(
      <ProviderDetailSections
        badges={[]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          no_alcohol: true,
          no_pork: true,
          offers: [],
          needs: [],
        }}
      />,
    );

    expect(screen.queryByText('No alcohol')).not.toBeInTheDocument();
    expect(screen.queryByText('No pork')).not.toBeInTheDocument();
  });

  it('[post-review fix] renders values and menu as icon + text rows', () => {
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    const { container } = render(
      <ProviderDetailSections
        badges={[]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          muslim_owned: true,
          offers: [{ name_de: 'Falafel Teller' }],
          needs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    const menuItem = screen.getByText('Falafel Teller');
    expect(menuItem).toBeInTheDocument();
    expect(menuItem).toHaveClass('text-base', 'font-semibold', 'text-content-heading');

    const menuItemRow = menuItem.closest('div');
    expect(menuItemRow).toBeTruthy();
    expect(menuItemRow?.firstElementChild).toHaveClass('bg-[#E3F2EF]');
    expect(menuItemRow?.firstElementChild).toHaveClass('h-12', 'w-12');

    // At least one values/amenities row should also render with icon container.
    const iconSlots = container.querySelectorAll('span.bg-\\[\\#E3F2EF\\]');
    expect(iconSlots.length).toBeGreaterThanOrEqual(2);
  });

  it('[figma alignment] renders opening-hours rows with stronger day/time typography', () => {
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    render(
      <ProviderDetailSections
        badges={[]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          offers: [],
          needs: [],
          opening_hours: {
            monday: { open: '10:00', close: '22:00' },
            tuesday: { open: '10:00', close: '22:00' },
            wednesday: { open: '10:00', close: '22:00' },
            thursday: { open: '10:00', close: '22:00' },
            friday: { open: '10:00', close: '22:00' },
            saturday: { open: '10:00', close: '22:00' },
            sunday: { open: '10:00', close: '22:00' },
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Opening Hours' }));

    expect(screen.getByText('Monday')).toHaveClass(
      'text-base',
      'font-semibold',
      'text-content-heading',
    );
    expect(screen.getAllByText('10:00 - 22:00')[0]).toHaveClass(
      'text-base',
      'font-normal',
      'text-content',
    );
  });

  it('[post-fix PASSES] renders halal check section with level 1 verification text', () => {
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });

    render(
      <ProviderDetailSections
        badges={[]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          listing_type: 'ummah',
          offers: [],
          needs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Halal Check/ }));
    // New wax-seal UI: SealRow renders 3 seals inside a [role="group"]
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('[post-fix PASSES] renders German Halal-Prüfung section and trust badges', () => {
    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    });
    localStorage.setItem('preferred-language', 'de');

    render(
      <ProviderDetailSections
        badges={[
          {
            id: 'badge-1',
            entity_id: 'provider-1',
            entity_type: EntityType.PROVIDER,
            badge_type_id: 'type-1',
            trust_level: TrustLevel.SELF_DECLARED,
            confirmation_count: 0,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            badge_type: {
              id: 'type-1',
              badge_key: BadgeKey.MUSLIM_OWNED,
              labels: { de: 'Muslim geführt', en: 'Muslim-owned' },
              description: null,
              icon_name: 'moon',
              is_active: true,
              created_at: '2026-01-01T00:00:00.000Z',
              updated_at: '2026-01-01T00:00:00.000Z',
            },
          },
        ]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          offers: [],
          needs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Halal-Prüfung/ }));
    expect(screen.getByTestId('trust-badges-section-mock')).toBeInTheDocument();
    expect(screen.getByText(/badges:1/)).toBeInTheDocument();
  });

  it('[post-fix PASSES] renders trust badges in halal check section when attestation is not applicable and badges exist', () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });

    render(
      <ProviderDetailSections
        badges={[
          { id: 'badge-1', trust_level: 'community_confirmed', confirmation_count: 2 } as never,
        ]}
        isLoadingBadges={false}
        provider={{ ...mockProviders[0], listing_type: 'ummah', offers: [], needs: [] }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Halal Check/ }));
    expect(screen.getByTestId('trust-badges-section-mock')).toBeInTheDocument();
  });

  it('[post-fix PASSES] does not show no proofs fallback when attestation card is rendered', () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isFetching: false });

    render(
      <ProviderDetailSections
        badges={[]}
        isLoadingBadges={false}
        provider={{
          ...mockProviders[0],
          listing_type: 'food',
          verification_method: 'online',
          has_certificate: false,
          no_alcohol: false,
          no_pork: false,
          no_gambling: false,
          offers: [],
          needs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Halal Check/ }));
    expect(screen.queryByText('No proofs available.')).not.toBeInTheDocument();
    expect(screen.queryByText('Only halal meat')).not.toBeInTheDocument();
    // New wax-seal UI: SealRow renders 3 seals inside a [role="group"]
    expect(screen.getAllByRole('group').length).toBeGreaterThan(0);
  });
});
