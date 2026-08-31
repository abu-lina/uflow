import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { render } from '../utils/test-utils';
import { ProviderDetailModal } from '@/features/providers/pages/ProviderDetailModal';
import { ProviderDetailPage } from '@/features/providers/pages/ProviderDetailPage';
import { mockProviders } from '../mocks/providerData';

describe('Provider detail enhancements (Plan 113)', () => {
  const providerWithEnhancements = {
    ...mockProviders[0],
    offers: [{ name_de: 'Falafel Teller' }],
    needs: [{ name_de: 'Freiwillige Helfer' }],
    muslim_owned: true,
    has_prayer_space: true,
    opening_hours: {
      monday: { open: '11:00', close: '22:00' },
      tuesday: { open: '11:00', close: '22:00' },
      wednesday: { open: '11:00', close: '22:00' },
      thursday: { open: '11:00', close: '22:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '12:00', close: '23:00' },
      sunday: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('preferred-language', 'en');
  });

  it('renders open-status line beneath provider title', () => {
    render(
      <ProviderDetailModal
        provider={providerWithEnhancements}
        onClose={vi.fn()}
        onBookmarkChange={vi.fn()}
      />,
    );

    const statusLabel = screen.getByText(/^(Open|Closed)$/);
    expect(statusLabel).toBeInTheDocument();
    expect(statusLabel).toHaveClass('text-base', 'font-medium');
  });

  it('renders new accordion section headings in modal', () => {
    render(
      <ProviderDetailModal
        provider={providerWithEnhancements}
        onClose={vi.fn()}
        onBookmarkChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Values & Amenities')).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Opening Hours')).toBeInTheDocument();
    expect(screen.getByText(/Halal Check/)).toBeInTheDocument();
    expect(screen.getByText('Nearby')).toBeInTheDocument();
  });

  it('[post-review fix] does not render trust and verification section on provider detail page', () => {
    render(<ProviderDetailPage provider={providerWithEnhancements} />);

    expect(
      screen.queryByText(/Trust & Verification|Vertrauen & Verifizierung/),
    ).not.toBeInTheDocument();
  });

  it('shows halal popup on first open and tracks open count', async () => {
    render(<ProviderDetailPage provider={providerWithEnhancements} />);

    expect(
      screen.getAllByText('Restaurants on Ummah Flow are checked for halal compliance').length,
    ).toBeGreaterThan(0);

    await waitFor(() => {
      expect(localStorage.getItem('uf_halal_popup_view_count')).toBe('1');
    });
  });

  it('[pre-fix FAILS] shows popup only for first 10 provider opens', async () => {
    for (let i = 0; i < 10; i += 1) {
      const { unmount } = render(<ProviderDetailPage provider={providerWithEnhancements} />);
      const closeButton = await screen.findByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      unmount();
    }

    const { queryByRole } = render(<ProviderDetailPage provider={providerWithEnhancements} />);

    await waitFor(() => {
      expect(queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    });

    expect(localStorage.getItem('uf_halal_popup_view_count')).toBe('10');
  });
});
