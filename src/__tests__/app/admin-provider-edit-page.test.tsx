import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPush, mockInvalidateQueries, mockToast, VALID_ID } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  VALID_ID: '123e4567-e89b-12d3-a456-426614174000',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    use: <T,>(x: T): T => x,
  };
});

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock('@/features/providers/pages/ProviderEditForm', () => ({
  ProviderEditForm: () => <div data-testid="provider-edit-form" />,
}));

vi.mock('@/features/admin/components/RejectModal', () => ({
  RejectModal: () => <div data-testid="reject-modal" />,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import AdminProviderEditPage from '@/app/(dashboard)/dashboard/providers/[id]/edit/page';

function renderPage() {
  return render(
    <AdminProviderEditPage params={{ id: VALID_ID } as unknown as Promise<{ id: string }>} />
  );
}

describe('AdminProviderEditPage — delete flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          provider_id: VALID_ID,
          provider_name: 'Test Provider',
          review_status: 'approved',
        },
      }),
    });
  });

  it('renders the Delete Provider section after loading', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete provider permanently/i })).toBeInTheDocument();
    });
  });

  it('renders the irreversibility warning text', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  it('opens delete modal when Delete Provider button is clicked', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete provider permanently/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete provider permanently/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });
});
