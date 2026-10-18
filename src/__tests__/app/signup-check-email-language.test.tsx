// @vitest-environment jsdom
/** #722 AC3: resend posts a supported auth-email language for ur. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'ur' as const,
    t: (key: string) => key,
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('@/components/ui/Icon', () => ({ Icon: () => <span /> }));
vi.mock('@/components/ui/IconWithTitle', () => ({
  IconWithTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/SecondaryButton', () => ({
  SecondaryButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
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
  BottomActionNavbar: () => <div />,
}));

import CheckEmailPage from '@/app/(public)/signup/check-email/page';
import { SIGNUP_PENDING_EMAIL_KEY } from '@/lib/signup-session';

const okJson = (body: Record<string, unknown>) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

describe('check-email resend language (#722 AC3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem(SIGNUP_PENDING_EMAIL_KEY, 'new@example.com');
    mockFetch.mockImplementation(() => okJson({ token: 'tok-1' }));
  });

  it('sends language "en" when the UI language is ur', async () => {
    render(<CheckEmailPage />);
    fireEvent.click(screen.getByText('signup.checkEmail.resendButton'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.language).toBe('en');
  });
});
