// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import { ProviderReviewQueue } from '../ProviderReviewQueue';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const provider = {
  provider_id: 'p1',
  provider_name: 'Halal Kitchen',
  address_city: 'Berlin',
  created_at: '2026-01-01T00:00:00Z',
  review_status: 'pending',
  screening_status: 'clear',
  screening_flags: [],
  enrichment_links: [],
  halal_pending: false,
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProviderReviewQueue', () => {
  it('shows loading state initially', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<ProviderReviewQueue />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows error state when fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    render(<ProviderReviewQueue />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('shows empty state when queue is empty', async () => {
    fetchMock.mockResolvedValue(
      json({ data: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } }),
    );
    render(<ProviderReviewQueue />);
    expect(await screen.findByText('providerReview.empty')).toBeTruthy();
  });

  it('renders provider rows with name, city and screening badge', async () => {
    fetchMock.mockResolvedValue(
      json({ data: [provider], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }),
    );
    render(<ProviderReviewQueue />);
    expect(await screen.findByText('Halal Kitchen')).toBeTruthy();
    expect(screen.getByText('Berlin')).toBeTruthy();
  });

  it('expands a row on click to show approve and reject buttons', async () => {
    fetchMock.mockResolvedValue(
      json({ data: [provider], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }),
    );
    render(<ProviderReviewQueue />);
    fireEvent.click(await screen.findByRole('button', { name: /Halal Kitchen/i }));
    expect(screen.getByRole('button', { name: 'providerReview.approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'providerReview.reject' })).toBeTruthy();
  });

  it('removes row on approve success', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ data: [provider], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }),
      )
      .mockResolvedValueOnce(json({ success: true }));

    render(<ProviderReviewQueue />);
    fireEvent.click(await screen.findByRole('button', { name: /Halal Kitchen/i }));
    fireEvent.click(screen.getByRole('button', { name: 'providerReview.approve' }));

    await waitFor(() => expect(screen.queryByText('Halal Kitchen')).toBeNull());
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/admin/review-provider');
    expect(JSON.parse(init.body)).toMatchObject({ providerId: 'p1', reviewStatus: 'approved' });
  });

  it('reject requires feedback text before submitting', async () => {
    fetchMock.mockResolvedValue(
      json({ data: [provider], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }),
    );
    render(<ProviderReviewQueue />);
    fireEvent.click(await screen.findByRole('button', { name: /Halal Kitchen/i }));
    fireEvent.click(screen.getByRole('button', { name: 'providerReview.reject' }));

    // Textarea should appear
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeTruthy();

    // Submit button should be disabled when textarea is empty
    const submitBtn = screen.getByRole('button', { name: 'providerReview.submitReject' });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('removes row on reject success after providing feedback', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ data: [provider], pagination: { total: 1, limit: 50, offset: 0, hasMore: false } }),
      )
      .mockResolvedValueOnce(json({ success: true }));

    render(<ProviderReviewQueue />);
    fireEvent.click(await screen.findByRole('button', { name: /Halal Kitchen/i }));
    fireEvent.click(screen.getByRole('button', { name: 'providerReview.reject' }));

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Contains pork menu items' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'providerReview.submitReject' }));

    await waitFor(() => expect(screen.queryByText('Halal Kitchen')).toBeNull());
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/admin/review-provider');
    expect(JSON.parse(init.body)).toMatchObject({
      providerId: 'p1',
      reviewStatus: 'rejected',
      reviewFeedback: 'Contains pork menu items',
    });
  });

  it('shows load more button when hasMore is true', async () => {
    fetchMock.mockResolvedValue(
      json({ data: [provider], pagination: { total: 100, limit: 50, offset: 0, hasMore: true } }),
    );
    render(<ProviderReviewQueue />);
    expect(await screen.findByRole('button', { name: 'providerReview.loadMore' })).toBeTruthy();
  });
});
