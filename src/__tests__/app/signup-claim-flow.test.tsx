import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'de',
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/auth', () => ({
  signUpWithLanguage: vi.fn(),
}));

vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/layout/ScrollablePageLayout', () => ({
  ScrollablePageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageContent', () => ({
  PageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/TitleSection', () => ({
  TitleSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/ContentSection', () => ({
  ContentSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/TitleAndText', () => ({
  TitleAndText: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/components/ui/FormInput', () => ({
  FormInput: () => <input />,
}));

vi.mock('@/components/ui/FormInputGroup', () => ({
  FormInputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

import { SignupPageContent } from '@/app/(public)/signup/SignupPageContent';

describe('Signup claim handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
  });

  it('claims the provider after authentication when a claim token is present', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'owner@example.com' },
    });

    mockUseSearchParams.mockReturnValue({
      get: (key: string) => {
        if (key === 'claim') return 'claim-token-123';
        if (key === 'provider') return 'provider-123';
        return null;
      },
    });

    render(<SignupPageContent />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/outreach/claim',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'claim-token-123' }),
        })
      );
    });
  });
});