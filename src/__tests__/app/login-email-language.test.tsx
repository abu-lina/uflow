// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { en } from '@/translations/en';

const mockSignIn = vi.fn();
let mockLanguage = 'de';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => ({ user: null }) }));

const lookup = (bundle: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], bundle);

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: mockLanguage,
    t: (key: string) => (lookup(en, key) as string) ?? key,
    setLanguage: vi.fn(),
  }),
}));
vi.mock('@/lib/auth', () => ({
  signInWithEmailConfirmation: (...args: unknown[]) => mockSignIn(...args),
}));
vi.mock('@/components/ui/Logo', () => ({ Logo: () => <div /> }));
vi.mock('@/components/layout/PageHeader', () => ({ PageHeader: () => <div /> }));
vi.mock('@/components/ui/TitleAndText', () => ({ TitleAndText: () => <div /> }));
vi.mock('@/components/ui/EmailVerificationAlert', () => ({
  default: ({ onResend }: { onResend: () => void }) => (
    <button type="button" onClick={onResend}>
      resend
    </button>
  ),
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
  LinkButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

import { LoginPageContent } from '@/app/(public)/login/LoginPageContent';

const fetchMock = vi.fn();

async function resendAndGetEmailBody() {
  mockSignIn.mockResolvedValue({ data: null, error: { message: 'EMAIL_NOT_CONFIRMED' } });
  render(<LoginPageContent />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  fireEvent.click(await screen.findByText('resend'));
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/send-auth-email')).toBe(true);
  });
  const call = fetchMock.mock.calls.find(([url]) => url === '/api/send-auth-email')!;
  return JSON.parse(call[1].body as string);
}

describe('Login email language (issue #719)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => (url === '/api/generate-confirmation-token' ? { token: 'tok' } : {}),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends language "de" when the UI language is de', async () => {
    mockLanguage = 'de';
    expect((await resendAndGetEmailBody()).language).toBe('de');
  });

  it('maps locales the API does not accept (ur, ps) to "en"', async () => {
    mockLanguage = 'ur';
    expect((await resendAndGetEmailBody()).language).toBe('en');
  });
});
