// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const { mockPush, mockBack, mockToast, mockInvalidateQueries, mockUpload, VALID_ID } = vi.hoisted(
  () => ({
    mockPush: vi.fn(),
    mockBack: vi.fn(),
    mockToast: { success: vi.fn(), error: vi.fn() },
    mockInvalidateQueries: vi.fn(),
    mockUpload: vi.fn(),
    VALID_ID: '123e4567-e89b-12d3-a456-426614174000',
  }),
);

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

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/cert.pdf' } }),
      }),
    },
  },
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

// Approve is guarded by ApproveModal (#548 design fixes): open it and confirm.
async function confirmApprove() {
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'adminHalalEdit.review.approveConfirm.confirm',
    }),
  );
  return dialog;
}

describe('EditHalalPage — admin review footer (#548)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRequests();
    mockUpload.mockResolvedValue({ error: null });
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
    // AC 14: the interpolated status is the localized label key, not the
    // raw enum — "...ist bereits rejected" was the defect this replaces.
    expect(screen.getByText(/adminHalalEdit\.review\.status\.rejected/)).toBeInTheDocument();
    expect(screen.queryByText(/"status":\s*"rejected"/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'adminHalalEdit.review.approve' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'adminHalalEdit.review.reject' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the approve slot rendered but disabled for an approved provider (no destructive reflow)', async () => {
    // Design fix: unmounting approve let reject slide left into the slot a
    // finger had just tapped. The slot stays; the button is disabled.
    mockRequests({ review_status: 'approved' });
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.reject' }),
      ).toBeInTheDocument();
    });
    const approve = screen.getByRole('button', { name: 'adminHalalEdit.review.approve' });
    expect(approve).toBeInTheDocument();
    expect(approve).toBeDisabled();
  });

  it('approve does not PATCH until the confirmation modal is confirmed; cancel aborts (AC 1)', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }));

    // The modal is up, naming the consequence, and nothing has been sent.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/adminHalalEdit\.review\.approveConfirm\.body/)).toBeInTheDocument();
    expect(patchCalls()).toHaveLength(0);

    // Cancelling closes the dialog and leaves the row untouched.
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(patchCalls()).toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('approve submits the full halal payload after confirmation, clears the draft, redirects (AC 2, 7, 11)', async () => {
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
    await confirmApprove();

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
    await confirmApprove();

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
    await confirmApprove();

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
    await confirmApprove();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('adminHalalEdit.review.conflict');
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reject stays disabled while a certificate upload is in flight on the save path', async () => {
    // Design fix: Reject used to gate only on `reviewing`, so it stayed live
    // during a certificate upload triggered by Save. The upload must block
    // both review actions.
    let resolveUpload: ((v: { error: null }) => void) | undefined;
    mockUpload.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const { container } = renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.reject' }),
      ).toBeInTheDocument();
    });

    // The file input only mounts once the certificate toggle is on.
    const toggle = container.querySelector('button.w-11');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle as Element);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as Element, {
      target: { files: [new File(['x'], 'cert.pdf', { type: 'application/pdf' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });
    expect(screen.getByRole('button', { name: 'adminHalalEdit.review.reject' })).toBeDisabled();

    await act(async () => {
      resolveUpload?.({ error: null });
    });
    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('renders the review actions inside the single footer bar, not a second stacked bar', async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'adminHalalEdit.review.approve' }),
      ).toBeInTheDocument();
    });

    // One footer element owns one border/shadow/backdrop-filter; the review
    // pair renders inside it instead of a second fixed bar above.
    const footers = container.querySelectorAll('footer');
    expect(footers.length).toBe(1);
    const approve = screen.getByRole('button', { name: 'adminHalalEdit.review.approve' });
    const save = screen.getByRole('button', { name: 'common.save' });
    expect(approve.closest('footer')).toBe(footers[0]);
    expect(save.closest('footer')).toBe(footers[0]);
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
