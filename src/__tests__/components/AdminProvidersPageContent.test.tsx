import { fireEvent, render, screen, waitFor } from '@/__tests__/utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/components/admin/ProviderCardSkeleton', () => ({
  ProviderCardSkeleton: () => <div data-testid="provider-card-skeleton">loading</div>,
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/admin/StatusFilter', () => ({
  StatusFilter: ({ selectedStatus }: { selectedStatus: string }) => (
    <div data-testid="status-filter">{selectedStatus}</div>
  ),
}));

vi.mock('@/components/admin/ProviderReviewCard', () => ({
  ProviderReviewCard: ({ provider, onReview }: { provider: { provider_id: string; provider_name: string; updated_at: string }; onReview: (providerId: string, status: 'approved' | 'rejected' | 'needs_revision', feedback?: string, expectedUpdatedAt?: string) => Promise<void> }) => (
    <div>
      <span>{provider.provider_name}</span>
      <button onClick={() => void onReview(provider.provider_id, 'approved', undefined, provider.updated_at)}>
        Review {provider.provider_name}
      </button>
    </div>
  ),
}));

import { AdminProvidersPageContent } from '@/components/admin/AdminProvidersPageContent';

describe('AdminProvidersPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders providers from the API providers field', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider_id: 'provider-1',
            provider_name: 'Barakah Clinic',
            provider_images: null,
            category_id: null,
            address_city: 'Berlin',
            contact_email: 'info@example.com',
            review_status: 'pending',
            review_feedback: null,
            created_at: '2026-03-23T10:00:00.000Z',
            updated_at: '2026-03-23T10:00:00.000Z',
            user_created_id: null,
          },
        ],
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      }),
    }) as typeof fetch;

    render(<AdminProvidersPageContent />);

    expect(await screen.findByText('Barakah Clinic')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('shows a single conflict toast and refetches after a 409 review response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          providers: [
            {
              provider_id: 'provider-1',
              provider_name: 'Barakah Clinic',
              provider_images: null,
              category_id: null,
              address_city: 'Berlin',
              contact_email: 'info@example.com',
              review_status: 'pending',
              review_feedback: null,
              created_at: '2026-03-23T10:00:00.000Z',
              updated_at: '2026-03-23T10:00:00.000Z',
              user_created_id: null,
            },
          ],
          pagination: {
            total: 1,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'This provider was modified by another reviewer. Please refresh and try again.',
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [
            {
              provider_id: 'provider-1',
              provider_name: 'Barakah Clinic',
              provider_images: null,
              category_id: null,
              address_city: 'Berlin',
              contact_email: 'info@example.com',
              review_status: 'pending',
              review_feedback: null,
              created_at: '2026-03-23T10:00:00.000Z',
              updated_at: '2026-03-23T10:00:01.000Z',
              user_created_id: null,
            },
          ],
          pagination: {
            total: 1,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        }),
      });

    global.fetch = fetchMock as typeof fetch;

    render(<AdminProvidersPageContent />);

    const reviewButton = await screen.findByRole('button', { name: /review barakah clinic/i });
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'This provider was modified by another reviewer. The list has been refreshed.'
      );
    });

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/review-provider',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"expectedUpdatedAt":"2026-03-23T10:00:00.000Z"'),
      })
    );

    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/admin/pending-providers?status=pending')).toHaveLength(3);
  });
});
