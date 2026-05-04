import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { LoginPageContent } from '@/app/(public)/login/LoginPageContent';
import { LoginModal } from '@/features/auth/components/LoginModal';
import { signInWithEmailConfirmation } from '@/lib/auth';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockGetSearchParam = vi.fn<(key: string) => string | null>();
const mockSignInWithEmailConfirmation = vi.mocked(signInWithEmailConfirmation);

let mockAuthUser: { id: string } | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockGetSearchParam,
  }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
  }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'de',
  }),
}));

vi.mock('@/lib/auth', () => ({
  signInWithEmailConfirmation: vi.fn(),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));
vi.mock('@/components/layout/HeaderSpacer', () => ({
  HeaderSpacer: () => <div data-testid="header-spacer" />,
}));
vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/layout/PageContentWrapper', () => ({
  PageContentWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/layout/TitleSection', () => ({
  TitleSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/layout/ContentSection', () => ({
  ContentSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/TitleAndText', () => ({
  TitleAndText: () => <div data-testid="title-and-text" />,
}));
vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));
vi.mock('@/components/ui/EmailVerificationAlert', () => ({
  default: ({ message }: { message: string }) => <div>{message}</div>,
}));
vi.mock('@/components/ui/FormInputGroup', () => ({
  FormInputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/FormInput', () => ({
  FormInput: ({
    type = 'text',
    value,
    onChange,
    placeholder,
    required,
    disabled,
  }: {
    type?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
  }) => (
    <input
      aria-label={placeholder || 'input'}
      disabled={disabled}
      required={required}
      type={type}
      value={value}
      onChange={onChange}
    />
  ),
}));
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/components/ui/LinkButton', () => ({
  LinkButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

describe('Plan 123 Navbar Auth State Regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
    mockGetSearchParam.mockReturnValue(null);
    mockSignInWithEmailConfirmation.mockResolvedValue({
      data: {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
      },
      error: null,
    } as never);
  });

  it('[pre-fix FAILS] LoginPageContent must not navigate in handleSubmit before auth context user is committed', async () => {
    const { rerender, container } = render(<LoginPageContent />);

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'user@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'secret123' } });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(mockSignInWithEmailConfirmation).toHaveBeenCalledWith('user@test.com', 'secret123');
    });

    expect(mockPush).not.toHaveBeenCalled();

    mockAuthUser = { id: 'user-123' };
    rerender(<LoginPageContent />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/profile');
    });
  });

  it('[post-fix PASSES] LoginPageContent redirects to returnUrl only after auth context user is committed', async () => {
    mockGetSearchParam.mockImplementation((key: string) =>
      key === 'returnUrl' ? encodeURIComponent('/providers/abc?tab=overview') : null,
    );

    const { rerender, container } = render(<LoginPageContent />);

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'user@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'secret123' } });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(mockSignInWithEmailConfirmation).toHaveBeenCalled();
    });

    expect(mockPush).not.toHaveBeenCalled();

    mockAuthUser = { id: 'user-123' };
    rerender(<LoginPageContent />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/providers/abc?tab=overview');
    });
  });

  it('[pre-fix FAILS] LoginModal must close without router.push after successful submit', async () => {
    const onClose = vi.fn();

    const { container } = render(<LoginModal onClose={onClose} />);

    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'user@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'secret123' } });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(mockSignInWithEmailConfirmation).toHaveBeenCalledWith('user@test.com', 'secret123');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
