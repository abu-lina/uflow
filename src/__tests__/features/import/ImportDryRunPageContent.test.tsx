/**
 * Tests for ImportDryRunPageContent - the operator preview UI component.
 * Written FIRST (TDD Red → Green → Refactor).
 *
 * Covers: idle state, loading state, result state, error state, copy-command surface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportDryRunPageContent } from '@/features/import/components/ImportDryRunPageContent';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

global.fetch = vi.fn();

const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

const MOCK_DRY_RUN_RESPONSE = {
  stats: {
    total: 20,
    parsed: 18,
    mapped: 15,
    unmapped: 3,
    skipped: 2,
    failed: 2,
    wouldInsert: 13,
  },
  unmappedGroups: [{ sourceCategory: 'pizza', count: 3, example: 'Pizza Roma' }],
  samples: [
    {
      provider_name: 'Halal Grill Berlin',
      address_city: 'Berlin',
      category_id: 'cat-001',
      address_street: 'Hauptstraße 1',
      social_website: 'https://halalgrillberlin.de',
      contact_email: 'info@halalgrillberlin.de',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportDryRunPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<ImportDryRunPageContent />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the limit selector with all four options', () => {
    render(<ImportDryRunPageContent />);
    expect(screen.getByLabelText(/limit/i)).toBeInTheDocument();
    const select = screen.getByLabelText(/limit/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('10');
    expect(options).toContain('50');
    expect(options).toContain('100');
    expect(options).toContain('all');
  });

  it('renders the run preview button', () => {
    render(<ImportDryRunPageContent />);
    expect(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i })).toBeInTheDocument();
  });

  it('does not show results panel in idle state', () => {
    render(<ImportDryRunPageContent />);
    expect(screen.queryByText(/URLs discovered/i)).not.toBeInTheDocument();
  });

  it('shows loading indicator while fetch is in progress', async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise(() => {
          /* never resolves in test */
        }),
    );
    render(<ImportDryRunPageContent />);

    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('renders stats table with result counts after successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DRY_RUN_RESPONSE,
    } as Response);

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      expect(screen.getByText(/URLs discovered/i)).toBeInTheDocument();
    });

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('renders sample records after success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DRY_RUN_RESPONSE,
    } as Response);

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      expect(screen.getByText('Halal Grill Berlin')).toBeInTheDocument();
    });
  });

  it('shows unmapped category groups after success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DRY_RUN_RESPONSE,
    } as Response);

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      const pizzaElements = screen.getAllByText(/pizza/i);
      expect(pizzaElements.length).toBeGreaterThan(0);
    });
  });

  it('renders copyable write command after success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DRY_RUN_RESPONSE,
    } as Response);

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/npx tsx scripts\/import-joinhalal\.ts --write/i),
      ).toBeInTheDocument();
    });
  });

  it('shows error message when fetch returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Sitemap unavailable' }),
    } as Response);

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows error message when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('clearly labels the preview as dry-run (not a real import)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DRY_RUN_RESPONSE,
    } as Response);

    render(<ImportDryRunPageContent />);
    fireEvent.click(screen.getByRole('button', { name: /run\s*dry.run\s*preview/i }));

    await waitFor(() => {
      // Page heading and "Dry-Run Summary" heading are both present after result
      const dryRunElements = screen.getAllByText(/dry.run/i);
      expect(dryRunElements.length).toBeGreaterThan(0);
    });
  });

  it('disables run button while loading', async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    render(<ImportDryRunPageContent />);

    const btn = screen.getByRole('button', { name: /run\s*dry.run\s*preview/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });
});
