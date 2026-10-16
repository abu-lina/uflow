// @vitest-environment jsdom
/**
 * #698: the auth pages never navigate to an off-site returnUrl.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoginPageContent } from '@/app/(public)/login/LoginPageContent';
import { SignupPageContent } from '@/app/(public)/signup/SignupPageContent';
import { ForgotPasswordPageContent } from '@/app/(public)/forgot-password/ForgotPasswordPageContent';
import { ResetPasswordPageContent } from '@/app/(public)/reset-password/ResetPasswordPageContent';

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

const auth = vi.hoisted(() => ({
  state: { user: null as { id: string } | null, isLoading: false },
}));

const i18n = vi.hoisted(() => ({ t: (key: string) => key, language: 'en' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.searchParams,
  usePathname: () => '/login',
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => auth.state,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => i18n,
}));

vi.mock('@/lib/auth', () => ({
  signInWithEmailConfirmation: vi.fn(),
  signUpWithLanguage: vi.fn(),
  resetPasswordWithLanguage: vi.fn(),
}));

vi.mock('@/lib/signup-session', () => ({ storePendingSignupEmail: vi.fn() }));

const UNSAFE = ['//evil.example', 'https%3A%2F%2Fevil.example', '%2F%2Fevil.example'];

const withReturnUrl = (raw: string) => {
  nav.searchParams = new URLSearchParams(`returnUrl=${raw}`);
};

const logIn = () => {
  auth.state = { user: { id: 'user-1' }, isLoading: false };
};

const allNavigations = () => [...nav.push.mock.calls, ...nav.replace.mock.calls].flat();

beforeEach(() => {
  nav.push.mockClear();
  nav.replace.mockClear();
  nav.searchParams = new URLSearchParams();
  auth.state = { user: null, isLoading: false };
});

describe('#698 AC3: all seven returnUrl read sites go through the helper', () => {
  const files = [
    ['login/LoginPageContent.tsx', 2],
    ['signup/SignupPageContent.tsx', 2],
    ['forgot-password/ForgotPasswordPageContent.tsx', 2],
    ['reset-password/ResetPasswordPageContent.tsx', 1],
  ] as const;

  it.each(files)('%s reads returnUrl only through getSafeReturnUrl', (file, sites) => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/app/(public)', file), 'utf8');
    const reads = source.match(/searchParams\.get\(['"]returnUrl['"]\)/g) ?? [];
    const guarded = source.match(/getSafeReturnUrl\(searchParams\.get\(['"]returnUrl['"]\)/g) ?? [];
    expect(reads).toHaveLength(sites);
    expect(guarded).toHaveLength(sites);
    expect(source).not.toMatch(/decodeURIComponent\(returnUrl\)/);
  });

  describe.each(UNSAFE)('with returnUrl=%s', raw => {
    it('login: a logged-in user goes to /profile', () => {
      withReturnUrl(raw);
      logIn();
      render(<LoginPageContent />);
      expect(nav.replace).toHaveBeenCalledWith('/profile');
    });

    it('login: the signup link drops the returnUrl', () => {
      withReturnUrl(raw);
      render(<LoginPageContent />);
      fireEvent.click(screen.getByText('login.noAccount'));
      expect(nav.push).toHaveBeenCalledWith('/signup');
    });

    it('signup: a logged-in user goes to /profile', () => {
      withReturnUrl(raw);
      logIn();
      render(<SignupPageContent />);
      expect(nav.replace).toHaveBeenCalledWith('/profile');
    });

    it('signup: the login link drops the returnUrl', () => {
      withReturnUrl(raw);
      render(<SignupPageContent />);
      fireEvent.click(screen.getByText('signup.haveAccount'));
      expect(nav.push).toHaveBeenCalledWith('/login');
    });

    it('forgot-password: a logged-in user goes to /profile', () => {
      withReturnUrl(raw);
      logIn();
      render(<ForgotPasswordPageContent />);
      expect(nav.replace).toHaveBeenCalledWith('/profile');
    });

    it('forgot-password: back to login drops the returnUrl', () => {
      withReturnUrl(raw);
      render(<ForgotPasswordPageContent />);
      fireEvent.click(screen.getByText('forgotPassword.backToLogin'));
      expect(nav.push).toHaveBeenCalledWith('/login');
    });

    it('reset-password: a logged-in user goes to /profile', () => {
      withReturnUrl(raw);
      logIn();
      render(<ResetPasswordPageContent />);
      expect(nav.replace).toHaveBeenCalledWith('/profile');
    });

    it('never navigates anywhere containing evil.example', () => {
      withReturnUrl(raw);
      render(<LoginPageContent />);
      fireEvent.click(screen.getByText('login.noAccount'));
      expect(allNavigations().join(' ')).not.toContain('evil.example');
    });
  });

  it('safe returnUrl still carries over between login and signup', () => {
    withReturnUrl('%2Fcreate%2Frecommend');
    render(<LoginPageContent />);
    fireEvent.click(screen.getByText('login.noAccount'));
    expect(nav.push).toHaveBeenCalledWith('/signup?returnUrl=%2Fcreate%2Frecommend');
  });
});

describe('#698 AC4: a logged-in visit to /login?returnUrl=//evil.example goes to /profile', () => {
  it('replaces the route with /profile', () => {
    withReturnUrl('//evil.example');
    logIn();
    render(<LoginPageContent />);
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('/profile');
  });
});

describe('#698 AC5: /login?returnUrl=%2Fcreate%2Frecommend still returns to /create/recommend', () => {
  it('replaces the route with /create/recommend', () => {
    withReturnUrl('%2Fcreate%2Frecommend');
    logIn();
    render(<LoginPageContent />);
    expect(nav.replace).toHaveBeenCalledWith('/create/recommend');
  });
});
