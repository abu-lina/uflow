// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { EnrichmentReviewPanel } from '../EnrichmentReviewPanel';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const WOLT_URL = 'https://wolt.com/de/deu/berlin/restaurant/tevhid';

function mockCandidates(data: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const rows = url.includes('view=history') ? [] : data;
      return {
        ok: true,
        json: async () => ({
          data: rows,
          pagination: { total: rows.length, limit: 50, offset: 0, hasMore: false },
        }),
      };
    }),
  );
}

describe('#801 the admin enrichment review shows delivery candidates with platform and URL', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the platform name and the proposed URL instead of an item count', async () => {
    mockCandidates([
      {
        id: 'c1',
        provider_id: 'p1',
        provider_name: 'Tevhid',
        source: 'provider_website:wolt',
        source_url: 'https://tevhid.example/',
        field_name: 'delivery_links',
        proposed_value: [
          { platform: 'wolt', platform_url: WOLT_URL, platform_slug: 'tevhid', is_active: true },
        ],
        current_value: null,
        status: 'pending',
        enriched_at: '2026-10-26T10:00:00Z',
      },
    ]);

    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(screen.getByText('Tevhid')).toBeTruthy());
    expect(screen.getByText('Wolt')).toBeTruthy();
    const link = screen.getByRole('link', { name: WOLT_URL });
    expect(link.getAttribute('href')).toBe(WOLT_URL);
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.queryByText('[1 items]')).toBeNull();
  });

  it('shows the page the link was found on', async () => {
    mockCandidates([
      {
        id: 'c1',
        provider_id: 'p1',
        provider_name: 'Tevhid',
        source: 'provider_website:lieferando',
        source_url: 'https://tevhid.example/',
        field_name: 'delivery_links',
        proposed_value: [
          {
            platform: 'lieferando',
            platform_url: 'https://www.lieferando.de/speisekarte/tevhid',
            platform_slug: 'tevhid',
            is_active: true,
          },
        ],
        current_value: null,
        status: 'pending',
        enriched_at: '2026-10-26T10:00:00Z',
      },
    ]);

    render(<EnrichmentReviewPanel />);

    await waitFor(() => expect(screen.getByText('Lieferando')).toBeTruthy());
    expect(screen.getByText(/Found on/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'https://tevhid.example/' })).toBeTruthy();
  });
});
