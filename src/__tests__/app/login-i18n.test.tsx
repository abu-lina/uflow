// @vitest-environment jsdom
/**
 * Regression tests for issue #586: login error messages were hardcoded
 * German literals even though the login.* keys exist in all six locales.
 * t() resolves against the real `en` bundle, so a missing key or a
 * hardcoded literal turns these red.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockUseAuth = vi.fn();
const mockSignIn = vi.fn();
const mockToastError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args), success: vi.fn() },
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

const lookup = (bundle: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], bundle);

const tEn = (key: string): string => (lookup(en, key) as string) ?? key;

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ language: 'en' as const, t: tEn, setLanguage: vi.fn() }),
}));

vi.mock('@/lib/auth', () => ({
  signInWithEmailConfirmation: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock('@/components/ui/Logo', () => ({ Logo: () => <div /> }));
vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('@/components/ui/TitleAndText', () => ({
  TitleAndText: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));
vi.mock('@/components/ui/EmailVerificationAlert', () => ({
  default: ({ message }: { message: string }) => <div role="alert">{message}</div>,
}));
vi.mock('@/components/ui/FormInput', () => ({
  FormInput: ({
    label,
    type,
    value,
    onChange,
  }: {
    label: string;
    type?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input aria-label={label} type={type} value={value} onChange={onChange} />,
}));
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, type }: { children: React.ReactNode; type?: 'submit' | 'button' }) => (
    <button type={type}>{children}</button>
  ),
}));
vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { LoginPageContent } from '@/app/(public)/login/LoginPageContent';

const KEYS = [
  'login.emailNotConfirmed',
  'login.emailNotFound',
  'login.invalidCredentials',
  'login.loginFailedToast',
  'login.loginFailedDescription',
] as const;

const OLD_GERMAN = [
  'Bitte überprüfe deine E-Mail und bestätige',
  'Diese E-Mail-Adresse ist nicht registriert',
  'Ungültige E-Mail oder Passwort',
  'Anmeldung fehlgeschlagen',
  'Bitte überprüfe deine Anmeldedaten',
];

async function submitWithError(message: string) {
  mockSignIn.mockResolvedValue({ data: null, error: { message } });
  render(<LoginPageContent />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
}

describe('Login page i18n (issue #586)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('EMAIL_NOT_CONFIRMED renders the en text of login.emailNotConfirmed', async () => {
    await submitWithError('EMAIL_NOT_CONFIRMED');
    await waitFor(() => {
      expect(screen.getByText(en.login.emailNotConfirmed)).toBeTruthy();
    });
  });

  it('EMAIL_NOT_FOUND renders the en text of login.emailNotFound', async () => {
    await submitWithError('EMAIL_NOT_FOUND');
    await waitFor(() => {
      expect(screen.getByText(en.login.emailNotFound)).toBeTruthy();
    });
  });

  it('any other error renders the en text of login.invalidCredentials', async () => {
    await submitWithError('Invalid login credentials');
    await waitFor(() => {
      expect(screen.getByText(en.login.invalidCredentials)).toBeTruthy();
    });
  });

  it('any other error calls toast.error with login.loginFailedToast and login.loginFailedDescription', async () => {
    await submitWithError('Invalid login credentials');
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        en.login.loginFailedToast,
        expect.objectContaining({ description: en.login.loginFailedDescription }),
      );
    });
  });

  it('all five keys exist in all six locale files', () => {
    const bundles = { en, de, ar, tr, ur, ps };
    for (const [name, bundle] of Object.entries(bundles)) {
      for (const key of KEYS) {
        const value = lookup(bundle, key);
        expect(typeof value, `${name}: ${key}`).toBe('string');
        expect((value as string).length, `${name}: ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('the rendered page contains none of the old German literals', async () => {
    await submitWithError('Invalid login credentials');
    await waitFor(() => {
      expect(screen.getByText(en.login.invalidCredentials)).toBeTruthy();
    });
    const text = document.body.textContent ?? '';
    for (const literal of OLD_GERMAN) {
      expect(text).not.toContain(literal);
    }
    expect(mockToastError.mock.calls.flat().map(String).join(' ')).not.toMatch(/Anmeldung|Anmeldedaten/);
  });
});
