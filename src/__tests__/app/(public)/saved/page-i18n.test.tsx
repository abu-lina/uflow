// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  stage: 'stage3' as 'stage2' | 'stage3',
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithEmailConfirmation: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false, error: null }),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/providers/search-provider', () => ({
  useSearch: () => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    selectedLocation: '',
    selectedSection: 'food',
  }),
}));

// Identity translator; interpolated params are appended so tests can verify them.
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}|${Object.values(params).join('|')}` : key,
  }),
}));

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({ stage: mocks.stage }),
}));

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageContentWrapper', () => ({
  PageContentWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/search/components/HomeSearchBar', () => ({
  HomeSearchBar: () => null,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => null,
}));

vi.mock('@/components/ui/FormInput', () => ({
  FormInput: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input aria-label={label} value={value} onChange={onChange} />,
}));

vi.mock('@/components/ui/EmailVerificationAlert', () => ({
  default: ({ message, onResend }: { message: string; onResend: () => void }) => (
    <div role="alert">
      <p>{message}</p>
      <button type="button" onClick={onResend}>
        resend
      </button>
    </div>
  ),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/services/bookmarks', () => ({
  deleteBookmark: vi.fn(),
}));

vi.mock('@/services/providers', () => ({
  getAllBookmarkedItems: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  signInWithEmailConfirmation: mocks.signInWithEmailConfirmation,
  signInWithMagicLink: mocks.signInWithMagicLink,
}));

import SavedProvidersPage from '@/app/(public)/saved/page';

function submitWith(email: string, password?: string) {
  fireEvent.change(screen.getByLabelText('login.emailLabel'), { target: { value: email } });
  if (password !== undefined) {
    fireEvent.change(screen.getByLabelText('login.passwordLabel'), { target: { value: password } });
  }
  const form = screen.getByLabelText('login.emailLabel').closest('form');
  if (!form) throw new Error('login form not rendered');
  fireEvent.submit(form);
}

describe('SavedProvidersPage login-required i18n (Code Review 264 HIGH-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stage = 'stage3';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('magic link (stage2)', () => {
    beforeEach(() => {
      mocks.stage = 'stage2';
    });

    it('renders the magic-link-sent state and toast via translation keys', async () => {
      mocks.signInWithMagicLink.mockResolvedValue({ data: {}, error: null });
      render(<SavedProvidersPage />);

      submitWith('user@example.com');

      expect(await screen.findByText('login.magicLinkSentTitle')).toBeInTheDocument();
      expect(screen.getByText('login.magicLinkSentDescription')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument();
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        'login.magicLinkSentTitle',
        expect.objectContaining({ description: 'login.magicLinkSentDescription' })
      );
    });

    it('uses translated fallback and diagnostic URL on generic failure', async () => {
      mocks.signInWithMagicLink.mockResolvedValue({
        data: null,
        error: { message: '', diagnosticUrl: 'https://diag.example/x' },
      });
      render(<SavedProvidersPage />);

      submitWith('user@example.com');

      expect(await screen.findByText('login.magicLinkFailedError')).toBeInTheDocument();
      expect(mocks.toastError).toHaveBeenCalledWith(
        'login.magicLinkFailedToast',
        expect.objectContaining({ description: 'login.magicLinkDiagnostic|https://diag.example/x' })
      );
    });

    it('uses translated support description when no diagnostic URL', async () => {
      mocks.signInWithMagicLink.mockResolvedValue({ data: null, error: { message: '' } });
      render(<SavedProvidersPage />);

      submitWith('user@example.com');

      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith(
          'login.magicLinkFailedToast',
          expect.objectContaining({ description: 'login.emailFailedDescription' })
        )
      );
    });

    it('translates EMAIL_NOT_FOUND', async () => {
      mocks.signInWithMagicLink.mockResolvedValue({ data: null, error: { message: 'EMAIL_NOT_FOUND' } });
      render(<SavedProvidersPage />);

      submitWith('user@example.com');

      expect(await screen.findByText('login.emailNotFound')).toBeInTheDocument();
    });
  });

  describe('password (stage3)', () => {
    it('translates invalid credentials message and toast', async () => {
      mocks.signInWithEmailConfirmation.mockResolvedValue({ data: null, error: { message: 'Invalid' } });
      render(<SavedProvidersPage />);

      submitWith('user@example.com', 'wrong');

      expect(await screen.findByText('login.invalidCredentials')).toBeInTheDocument();
      expect(mocks.toastError).toHaveBeenCalledWith(
        'login.loginFailedToast',
        expect.objectContaining({ description: 'login.loginFailedDescription' })
      );
    });

    it('translates login success toast', async () => {
      mocks.signInWithEmailConfirmation.mockResolvedValue({ data: { user: {} }, error: null });
      render(<SavedProvidersPage />);

      submitWith('user@example.com', 'secret');

      await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('login.loginSuccessToast'));
    });

    it('translates EMAIL_NOT_CONFIRMED and resend-confirmation success', async () => {
      mocks.signInWithEmailConfirmation.mockResolvedValue({
        data: null,
        error: { message: 'EMAIL_NOT_CONFIRMED' },
      });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'tok' }) })
          .mockResolvedValueOnce({ ok: true })
      );
      render(<SavedProvidersPage />);

      submitWith('user@example.com', 'secret');
      expect(await screen.findByText('login.emailNotConfirmed')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'resend' }));

      expect(await screen.findByText('login.confirmationEmailSent')).toBeInTheDocument();
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        'login.emailSentToast',
        expect.objectContaining({ description: 'login.emailSentDescription' })
      );
    });

    it('translates resend-confirmation failure', async () => {
      mocks.signInWithEmailConfirmation.mockResolvedValue({
        data: null,
        error: { message: 'EMAIL_NOT_CONFIRMED' },
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }));
      render(<SavedProvidersPage />);

      submitWith('user@example.com', 'secret');
      fireEvent.click(await screen.findByRole('button', { name: 'resend' }));

      expect(await screen.findByText('login.confirmationEmailFailed')).toBeInTheDocument();
      expect(mocks.toastError).toHaveBeenCalledWith(
        'login.emailFailedToast',
        expect.objectContaining({ description: 'login.emailFailedDescription' })
      );
    });

    it('translates resend-confirmation exception', async () => {
      mocks.signInWithEmailConfirmation.mockResolvedValue({
        data: null,
        error: { message: 'EMAIL_NOT_CONFIRMED' },
      });
      vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<SavedProvidersPage />);

      submitWith('user@example.com', 'secret');
      fireEvent.click(await screen.findByRole('button', { name: 'resend' }));

      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith(
          'login.errorOccurredToast',
          expect.objectContaining({ description: 'login.errorOccurredDescription' })
        )
      );
    });

    it('translates missing-email prompt on resend', async () => {
      mocks.signInWithEmailConfirmation.mockResolvedValue({
        data: null,
        error: { message: 'EMAIL_NOT_CONFIRMED' },
      });
      render(<SavedProvidersPage />);

      submitWith('user@example.com', 'secret');
      const resend = await screen.findByRole('button', { name: 'resend' });
      fireEvent.change(screen.getByLabelText('login.emailLabel'), { target: { value: '' } });
      fireEvent.click(resend);

      expect(await screen.findByText('login.enterEmailFirst')).toBeInTheDocument();
    });
  });
});
