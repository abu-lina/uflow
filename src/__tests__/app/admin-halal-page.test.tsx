// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { mockPush, mockBack, mockToast, mockInvalidateQueries, VALID_ID } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockInvalidateQueries: vi.fn(),
  VALID_ID: '123e4567-e89b-12d3-a456-426614174000',
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    use: <T,>(x: T): T => x,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, prefetch: vi.fn() }),
}));

vi.mock('@iconify/react', () => ({
  Icon: () => <span data-testid="icon" />,
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${JSON.stringify(vars)}` : key,
  }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock('@/components/layout/HeaderSpacer', () => ({
  HeaderSpacer: () => <div />,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import EditHalalPage from '@/app/(dashboard)/dashboard/providers/[id]/edit/halal/page';

interface ProviderOverrides {
  review_status?: string;
  listing_type?: string;
  food_providers?: Record<string, unknown> | null;
}

function providerRow(overrides: ProviderOverrides = {}) {
  return {
    provider_id: VALID_ID,
    provider_name: 'Halal Place',
    review_status: 'pending',
    updated_at: '2025-06-01T12:00:00Z',
    listing_type: 'food',
    food_providers: {
      no_alcohol: true,
      no_pork: true,
      no_gambling: true,
      verification_method: 'online',
      has_certificate: false,
      certificate_url: null,
    },
    store_providers: null,
    ...overrides,
  };
}

function mockRequests(providerOverrides: ProviderOverrides = {}, patchResponse?: Response) {
  mockFetch.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      return Promise.resolve(
        patchResponse ??
          new Response(
            JSON.stringify({ data: { provider_id: VALID_ID, review_status: 'approved' } }),
            { status: 200 },
          ),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ data: providerRow(providerOverrides) }), { status: 200 }),
    );
  });
}

function patchCalls() {
  return mockFetch.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'PATCH');
}

function lastPatchBody() {
  const calls = patchCalls();
  expect(calls.length).toBeGreaterThan(0);
  return JSON.parse((calls[calls.length - 1][1] as RequestInit).body as string);
}

function renderPage() {
  return render(<EditHalalPage params={{ id: VALID_ID } as unknown as Promise<{ id: string }>} />);
}

const STORAGE_KEY = `admin_edit_halal_${VALID_ID}`;

describe('EditHalalPage — admin review footer (#548)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRequests();
  });

  it('renders approve and reject actions for a pending provider', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'adminHalalEdit.review.reject' }),
    ).toBeInTheDocument();
  });

  it('offers no status action for a rejected provider and shows the decided notice (AC 8)', async () => {
    mockRequests({ review_status: 'rejected' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/adminHalalEdit\.review\.decidedNotice/)).toBeInTheDocument();
    });
    expect(screen.getByText(/rejected/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'adminHalalEdit.review.approve' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'adminHalalEdit.review.reject' }),
    ).not.toBeInTheDocument();
  });

  it('hides approve but still offers reject for an approved provider', async () => {
    mockRequests({ review_status: 'approved' });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.reject' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'adminHalalEdit.review.approve' }),
    ).not.toBeInTheDocument();
  });

  it('approve submits the full halal payload, clears the draft, redirects to the pending list (AC 2, 7, 11)', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        noAlcohol: true,
        noPork: true,
        noGambling: true,
        verificationMethod: 'onsite',
        hasCertificate: false,
        certificateUrl: null,
      }),
    );
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/food?status=pending');
    });

    const body = lastPatchBody();
    expect(body.providerId).toBe(VALID_ID);
    expect(body.reviewStatus).toBe('approved');
    expect(body.expectedUpdatedAt).toBe('2025-06-01T12:00:00Z');
    expect(body.halal).toMatchObject({
      noAlcohol: true,
      noPork: true,
      noGambling: true,
      verificationMethod: 'onsite',
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mockInvalidateQueries).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('adminHalalEdit.review.approved');
  });

  it('redirects store listings to the stores pending list', async () => {
    mockRequests({ listing_type: 'store', food_providers: null });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/stores?status=pending');
    });
  });

  it('a 422 verdict renders both groups with locale labels and a toast (AC 5)', async () => {
    mockRequests(
      {},
      new Response(
        JSON.stringify({
          error: 'Cannot approve: halal attestation incomplete.',
          denied: ['no_alcohol'],
          unanswered: ['no_gambling'],
        }),
        { status: 422 },
      ),
    );
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }));

    await waitFor(() => {
      expect(screen.getAllByText('halal.admin.declaredNonCompliant:')[0]).toBeInTheDocument();
    });
    expect(screen.getAllByText('halal.attestation.noAlcohol.label')[0]).toBeInTheDocument();
    expect(screen.getAllByText('halal.admin.unanswered:')[0]).toBeInTheDocument();
    expect(screen.getAllByText('halal.attestation.noGambling.label')[0]).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith('adminHalalEdit.review.gateBlocked');
    expect(mockPush).not.toHaveBeenCalled();
    // The offending radiogroups are marked for the admin.
    expect(document.querySelectorAll('[aria-invalid="true"]').length).toBe(2);
  });

  it('a 409 tells the admin to reload instead of retrying silently', async () => {
    mockRequests(
      {},
      new Response(JSON.stringify({ error: 'modified by another reviewer' }), { status: 409 }),
    );
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('adminHalalEdit.review.conflict');
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reject opens RejectModal, keeps confirm disabled until a reason is typed, then submits (AC 6)', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.reject' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminHalalEdit.review.reject' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirm.*reject/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Halal status could not be verified' },
    });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/food?status=pending');
    });
    const body = lastPatchBody();
    expect(body.reviewStatus).toBe('rejected');
    expect(body.reviewFeedback).toBe('Halal status could not be verified');
  });

  it('does not carry the stale "main edit page" instruction (AC 16)', () => {
    const source = readFileSync(
      path.join(__dirname, '../../app/(dashboard)/dashboard/providers/[id]/edit/halal/page.tsx'),
      'utf-8',
    );
    expect(source).not.toContain('main edit page');
    expect(source).not.toContain('reviewStatus in localStorage');
  });
});
