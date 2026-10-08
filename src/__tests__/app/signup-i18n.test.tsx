// @vitest-environment jsdom
/**
 * Regression tests for issue #577, defect A (i18n) and AC5 (sentinel codes).
 *
 * The signup page rendered hardcoded German literals regardless of locale,
 * and printed the raw English `error` prose returned by /api/auth/signup.
 * These tests drive the real component with `t()` resolving against the
 * actual `en` bundle, so they go red on any untranslated literal and on any
 * error path that bypasses the code -> t() mapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { en } from '@/translations/en';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockUseAuth = vi.fn();
const mockSignUp = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Resolve t() against the real en bundle: a missing key returns the key
// itself, so assertions on English copy fail if a key was never added.
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

vi.mock('@/lib/auth', () => ({
  signUpWithLanguage: (...args: unknown[]) => mockSignUp(...args),
}));

vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ui/TitleAndText', () => ({
  TitleAndText: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/FormInput', () => ({
  FormInput: ({
    label,
    placeholder,
    type,
    value,
    onChange,
  }: {
    label: string;
    placeholder?: string;
    type?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <label>{label}</label>
      <input
        aria-label={label}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={onChange}
      />
    </div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    type,
    loading,
    loadingText,
  }: {
    children: React.ReactNode;
    type?: 'submit' | 'button';
    loading?: boolean;
    loadingText?: string;
  }) => <button type={type}>{loading ? loadingText : children}</button>,
}));

vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { SignupPageContent } from '@/app/(public)/signup/SignupPageContent';

function fillValidForm(container: HTMLElement) {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'new@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'abcd1234' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'abcd1234' },
  });
  const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
  fireEvent.click(checkbox);
}

describe('Signup page i18n (issue #577)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
    mockSignUp.mockResolvedValue({ data: null, error: null });
    sessionStorage.clear();
  });

  it('renders every user-visible string in English when the locale is English', () => {
    render(<SignupPageContent />);

    // German literals that used to be hardcoded
    const german = ['Registrieren', 'Willkommen', 'E-Mail', 'Passwort', 'Weiterleitung'];
    const bodyText = document.body.textContent ?? '';
    for (const word of german) {
      expect(bodyText).not.toContain(word);
    }

    // English copy resolved through t()
    expect(screen.getByText('Welcome to Ummah Flow')).toBeTruthy();
    expect(screen.getByText("Discover Muslim offerings in your area insha'Allah.")).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeTruthy();
    expect(screen.getByText(/Already have an account\?/)).toBeTruthy();
    expect(screen.getByTestId('page-header').textContent).toBe('Sign up');
  });

  it('shows the translated consent block without German fallbacks', () => {
    render(<SignupPageContent />);
    expect(screen.getByText(/I accept the/)).toBeTruthy();
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Allgemeinen Geschäftsbedingungen');
  });

  it('translates client-side validation errors', async () => {
    const { container } = render(<SignupPageContent />);
    // fireEvent.submit bypasses jsdom constraint validation so handleSubmit's
    // own validateForm path runs with an empty email field.
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => {
      expect(screen.getByText(/Please enter your email address/)).toBeTruthy();
    });
  });

  it('maps a known server error code to the translated message', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: {
        message: 'User with this email already exists',
        code: 'EMAIL_ALREADY_REGISTERED',
      },
    });

    const { container } = render(<SignupPageContent />);
    fillValidForm(container);
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeTruthy();
    });
    // Raw server prose / code must never reach the user
    expect(document.body.textContent).not.toContain('User with this email already exists');
    expect(document.body.textContent).not.toContain('EMAIL_ALREADY_REGISTERED');
  });

  it('falls back to the generic translated message for unknown error codes', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'some internal detail', code: 'SOME_FUTURE_CODE' },
    });

    const { container } = render(<SignupPageContent />);
    fillValidForm(container);
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(screen.getByText(/error occurred/i)).toBeTruthy();
    });
    expect(document.body.textContent).not.toContain('SOME_FUTURE_CODE');
    expect(document.body.textContent).not.toContain('some internal detail');
  });
});
