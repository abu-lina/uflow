// @vitest-environment jsdom
/**
 * Regression tests for issue #577, AC4.
 *
 * /signup/check-email was 100% hardcoded German and its resend button was a
 * dead `alert()`. These tests drive the page with `t()` resolving the real
 * `en` bundle and verify the resend hits the real confirmation-token and
 * send-auth-email endpoints for the address captured at signup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { en } from '@/translations/en';

const mockPush = vi.fn();
const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

const tEn = (key: string): string =>
  (key
    .split('.')
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], en) as string) ?? key;

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'en' as const,
    t: tEn,
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => <span data-testid="icon" />,
}));

vi.mock('@/components/ui/IconWithTitle', () => ({
  IconWithTitle: ({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/SecondaryButton', () => ({
  SecondaryButton: ({
    children,
    onClick,
    loading,
    loadingText,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    loading?: boolean;
    loadingText?: string;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {loading ? loadingText : children}
    </button>
  ),
}));

vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/BottomActionNavbar', () => ({
  BottomActionNavbar: ({
    primaryButton,
  }: {
    primaryButton: { label: string; 'aria-label'?: string; onClick?: () => void };
  }) => <button aria-label={primaryButton['aria-label']}>{primaryButton.label}</button>,
}));

import CheckEmailPage from '@/app/(public)/signup/check-email/page';

const okJson = (body: Record<string, unknown>) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

describe('Check-email page i18n (issue #577)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockFetch.mockImplementation(() => okJson({ token: 'tok-1' }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders in English when the locale is English', () => {
    render(<CheckEmailPage />);

    const bodyText = document.body.textContent ?? '';
    for (const word of ['bestätigen', 'Überprüfe', 'erneut', 'Andere', 'Bestätigung']) {
      expect(bodyText).not.toContain(word);
    }

    expect(screen.getByTestId('page-header').textContent).toBe('Confirm email');
    expect(screen.getByText('Check your email inbox')).toBeTruthy();
    expect(screen.getByText(/confirmation email/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Use a different email/i })).toBeTruthy();
    // The navbar button's accessible name is its aria-label, not its text
    expect(screen.getByRole('button', { name: /login after email confirmation/i })).toBeTruthy();
    expect(screen.getByText('Login after confirmation')).toBeTruthy();
  });

  it('wires resend to the real endpoints instead of an alert', async () => {
    sessionStorage.setItem('signup-pending-email', 'user@example.com');
    render(<CheckEmailPage />);

    fireEvent.click(screen.getByRole('button', { name: /Resend email/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/generate-confirmation-token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'user@example.com', type: 'signup' }),
        }),
      );
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/send-auth-email',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('shows a translated confirmation after a successful resend', async () => {
    sessionStorage.setItem('signup-pending-email', 'user@example.com');
    render(<CheckEmailPage />);

    fireEvent.click(screen.getByRole('button', { name: /Resend email/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirmation email sent/i)).toBeTruthy();
    });
  });

  it('does not render a dead resend control when no email is known', () => {
    render(<CheckEmailPage />);
    expect(screen.queryByRole('button', { name: /Resend email/i })).toBeNull();
  });
});
