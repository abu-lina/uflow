// @vitest-environment jsdom
/** #722 review: LoginModal resend uses the UI language, mapped to a supported one. */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  language: 'ur',
  signIn: vi.fn(),
}));
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/auth', () => ({ signInWithEmailConfirmation: mocks.signIn }));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ language: mocks.language, t: (k: string) => k }),
}));
vi.mock('@/components/ui/Logo', () => ({ Logo: () => null }));
vi.mock('@/components/ui/FormInputGroup', () => ({
  FormInputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
  default: ({ onResend }: { onResend: () => void }) => (
    <button type="button" onClick={onResend}>
      resend
    </button>
  ),
}));

import { LoginModal } from '@/features/auth/components/LoginModal';

async function resend() {
  render(<LoginModal onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('login.emailLabel'), {
    target: { value: 'user@example.com' },
  });
  fireEvent.change(screen.getByLabelText('login.passwordLabel'), { target: { value: 'secret' } });
  fireEvent.submit(screen.getByLabelText('login.emailLabel').closest('form')!);
  fireEvent.click(await screen.findByRole('button', { name: 'resend' }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  const call = mockFetch.mock.calls.find(([u]) => u === '/api/send-auth-email');
  return JSON.parse(call?.[1].body).language;
}

describe('LoginModal resend language (#722 review)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signIn.mockResolvedValue({ data: null, error: { message: 'EMAIL_NOT_CONFIRMED' } });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'tok' }) })
      .mockResolvedValueOnce({ ok: true });
  });

  it('sends en when the UI language is ur', async () => {
    mocks.language = 'ur';
    expect(await resend()).toBe('en');
  });

  it('sends the UI language when supported', async () => {
    mocks.language = 'tr';
    expect(await resend()).toBe('tr');
  });
});
