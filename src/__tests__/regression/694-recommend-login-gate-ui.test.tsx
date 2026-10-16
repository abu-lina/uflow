// @vitest-environment jsdom
/**
 * #694: anonymous visitors on the recommend flow see the shared LoginGate
 * (instead of a middleware bounce to /food) and come back after login.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RecommendPage from '@/app/(public)/create/recommend/page';
import SelectCategoryPage from '@/app/(public)/create/recommend/category/page';
import SelectOffersPage from '@/app/(public)/create/recommend/offers/page';
import { LoginPageContent } from '@/app/(public)/login/LoginPageContent';

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

const auth = vi.hoisted(() => ({
  state: { user: null as { id: string } | null, isLoading: false },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => nav.searchParams,
  usePathname: () => '/create/recommend',
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => auth.state,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('@/providers/form-provider', () => ({
  useFormData: () => ({
    formData: { category: '', offers_ids: [], creationMode: 'recommendation' },
    updateFormData: vi.fn(),
    setCreationMode: vi.fn(),
  }),
}));

vi.mock('@/features/providers/StreamlinedRecommendForm', () => ({
  StreamlinedRecommendForm: () => <div data-testid="recommend-form" />,
}));

vi.mock('@/lib/supabase/client', () => {
  const result = Promise.resolve({ data: [], error: null });
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'limit', 'order', 'insert', 'single']) {
    chain[method] = () => chain;
  }
  chain.then = result.then.bind(result);
  return { supabase: { from: () => chain } };
});

vi.mock('@/services/categories', () => ({ getCategories: vi.fn().mockResolvedValue([]) }));
vi.mock('@/utils/categoryUtils', () => ({ shouldCreateCommunityService: vi.fn() }));
vi.mock('@/services/category-suggestions', () => ({
  getSuggestedOffersForCategory: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/auth', () => ({ signInWithEmailConfirmation: vi.fn() }));

beforeEach(() => {
  nav.push.mockClear();
  nav.replace.mockClear();
  nav.searchParams = new URLSearchParams();
  auth.state = { user: null, isLoading: false };
});

describe('#694 AC2: anonymous /create/recommend shows the LoginGate', () => {
  it('renders the login-required screen instead of the recommend form', () => {
    render(<RecommendPage />);
    expect(screen.getByText('create.basics.loginRequired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'create.basics.goToLogin' })).toBeInTheDocument();
    expect(screen.queryByTestId('recommend-form')).not.toBeInTheDocument();
  });
});

describe('#694 AC3: after login from the gate the user returns to /create/recommend', () => {
  it('the gate sends the user to login with returnUrl=/create/recommend', () => {
    render(<RecommendPage />);
    fireEvent.click(screen.getByRole('button', { name: 'create.basics.goToLogin' }));
    expect(nav.push).toHaveBeenCalledWith('/login?returnUrl=%2Fcreate%2Frecommend');
  });

  it('login sends the now logged-in user back to /create/recommend', () => {
    nav.searchParams = new URLSearchParams('returnUrl=%2Fcreate%2Frecommend');
    auth.state = { user: { id: 'user-1' }, isLoading: false };
    render(<LoginPageContent />);
    expect(nav.replace).toHaveBeenCalledWith('/create/recommend');
  });
});

describe('#694 AC6: recommend subpaths show the LoginGate to anonymous users', () => {
  it.each([
    ['/create/recommend/category', SelectCategoryPage, 'create.category.searchCategories'],
    ['/create/recommend/offers', SelectOffersPage, 'create.offers.searchPlaceholder'],
  ] as const)('%s renders the login-required screen', (path, Page, formMarker) => {
    render(<Page />);
    expect(screen.getByText('create.basics.loginRequired')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(formMarker)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'create.basics.goToLogin' }));
    expect(nav.push).toHaveBeenCalledWith(`/login?returnUrl=${encodeURIComponent(path)}`);
  });
});

describe('#694: the gate only shows once auth has resolved to no user', () => {
  const pages = [
    ['/create/recommend', RecommendPage, () => screen.getByTestId('recommend-form')],
    [
      '/create/recommend/category',
      SelectCategoryPage,
      () => screen.getByPlaceholderText('create.category.searchCategories'),
    ],
    [
      '/create/recommend/offers',
      SelectOffersPage,
      () => screen.getByPlaceholderText('create.offers.searchPlaceholder'),
    ],
  ] as const;

  it.each(pages)('a logged-in user on %s sees the step, not the gate', (_path, Page, step) => {
    auth.state = { user: { id: 'user-1' }, isLoading: false };
    render(<Page />);
    expect(step()).toBeInTheDocument();
    expect(screen.queryByText('create.basics.loginRequired')).not.toBeInTheDocument();
  });

  it.each(pages)('while auth is loading %s renders the step, not the gate', (_path, Page, step) => {
    auth.state = { user: null, isLoading: true };
    render(<Page />);
    expect(step()).toBeInTheDocument();
    expect(screen.queryByText('create.basics.loginRequired')).not.toBeInTheDocument();
  });
});
