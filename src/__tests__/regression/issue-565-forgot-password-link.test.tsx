// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import { LoginPageContent } from '@/app/(public)/login/LoginPageContent';
import { LoginModal } from '@/features/auth/components/LoginModal';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockGetSearchParam = vi.fn<(key: string) => string | null>();

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
  LinkButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('Issue 565 Forgot Password Link Regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
    mockGetSearchParam.mockReturnValue(null);
  });

  it('LoginModal renders a forgot password link', () => {
    const { getByText } = render(<LoginModal onClose={vi.fn()} />);

    expect(getByText('login.forgotPassword')).toBeTruthy();
  });

  it('clicking the link closes the modal before navigating to /forgot-password', () => {
    const onClose = vi.fn();
    const { getByText } = render(<LoginModal onClose={onClose} />);

    fireEvent.click(getByText('login.forgotPassword'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
  });

  it('mobile /login page still renders its own forgot password link', () => {
    const { getByText } = render(<LoginPageContent />);

    expect(getByText('login.forgotPassword')).toBeTruthy();
  });
});
