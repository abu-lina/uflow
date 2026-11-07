// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import { HalalReviewQueue } from '../HalalReviewQueue';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const item = {
  providerId: 'p1',
  providerName: 'Doner House',
  oldestPendingAt: '2026-01-01T00:00:00Z',
  mapsMatch: { url: 'https://maps.example/place', category: 'Restaurant' },
  deliveryLinks: [{ platform: 'wolt', url: 'https://wolt.example/x' }],
  flaggedItems: [{ name: 'Bacon Burger', substance: 'pork' }],
  toggles: { no_alcohol: true, no_pork: false, no_gambling: true },
};

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HalalReviewQueue', () => {
  it('shows the empty state when no candidates are pending', async () => {
    fetchMock.mockResolvedValue(json({ data: [] }));
    render(<HalalReviewQueue />);
    expect(await screen.findByText('halalReview.empty')).toBeTruthy();
  });

  it('expands a row to show maps match, delivery links, flagged items and prefilled toggles', async () => {
    fetchMock.mockResolvedValue(json({ data: [item] }));
    render(<HalalReviewQueue />);

    fireEvent.click(await screen.findByRole('button', { name: /Doner House/ }));

    expect(screen.getByRole('link', { name: /Restaurant/ }).getAttribute('href')).toBe(
      'https://maps.example/place',
    );
    expect(screen.getByRole('link', { name: /wolt/i }).getAttribute('href')).toBe(
      'https://wolt.example/x',
    );
    expect(screen.getByText('Bacon Burger')).toBeTruthy();
    expect((screen.getByLabelText('halalReview.noAlcohol') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('halalReview.noPork') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('halalReview.noGambling') as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('confirms with the toggled values and removes the row', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: [item] }))
      .mockResolvedValueOnce(json({ success: true }));
    render(<HalalReviewQueue />);

    fireEvent.click(await screen.findByRole('button', { name: /Doner House/ }));
    fireEvent.click(screen.getByLabelText('halalReview.noPork'));
    fireEvent.click(screen.getByRole('button', { name: 'halalReview.confirm' }));

    await waitFor(() => expect(screen.queryByText('Doner House')).toBeNull());
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/admin/halal-review/confirm');
    expect(JSON.parse(init.body)).toEqual({
      providerId: 'p1',
      no_alcohol: true,
      no_pork: true,
      no_gambling: true,
    });
  });

  it('keeps the row and shows an error when confirm fails', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: [item] }))
      .mockResolvedValueOnce(json({ error: 'nope' }, 400));
    render(<HalalReviewQueue />);

    fireEvent.click(await screen.findByRole('button', { name: /Doner House/ }));
    fireEvent.click(screen.getByRole('button', { name: 'halalReview.confirm' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Doner House')).toBeTruthy();
  });
});
