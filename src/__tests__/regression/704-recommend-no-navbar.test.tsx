// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { shouldShowCityEarlyAccessNavbar, shouldShowMobileFooter } from '@/utils/navigationUtils';

const mocks = vi.hoisted(() => ({
  pathname: '/create/recommend',
  search: '',
  stage: 'stage1',
  user: null as { id: string } | null,
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.search),
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/components/common/MobileFooterBar', () => ({ MobileFooterBar: () => null }));
vi.mock('@/components/shared/CityEarlyAccessNavbar', () => ({ CityEarlyAccessNavbar: () => null }));
vi.mock('@/components/layout/DesktopFooter', () => ({ DesktopFooter: () => null }));
vi.mock('@/components/ui/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/FooterAction', () => ({ FooterAction: () => null }));
vi.mock('@/components/ui/PushNotificationPrompt', () => ({ PushNotificationPrompt: () => null }));
vi.mock('@/features/chat/components/ChatFloatingWidget', () => ({
  ChatFloatingWidget: () => null,
}));
vi.mock('@/providers/splash-provider', () => ({
  useSplash: () => ({ isSplashVisible: false, onboardingStep: null }),
}));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false }),
}));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));
vi.mock('@/config/feature-flags', () => ({ getFeatureFlag: () => false }));
vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({ stage: mocks.stage, isLoading: false }),
}));
vi.mock('@/providers/form-provider', () => ({
  useFormData: () => ({ formData: {}, updateFormData: vi.fn(), setCreationMode: vi.fn() }),
}));
vi.mock('@/features/providers/StreamlinedRecommendForm', () => ({
  StreamlinedRecommendForm: () => (
    <div data-testid="recommend-form">
      <div data-testid="recommend-action-bar" />
    </div>
  ),
}));

import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { LoginGate } from '@/components/shared/LoginGate';
import RecommendPage from '@/app/(public)/create/recommend/page';

const user = { id: 'u1' } as User;
const mode = () => screen.getByTestId('mobile-footer-bar').getAttribute('data-mobile-ui');

const completeOnboarding = () => {
  localStorage.setItem('hasSeenSplashScreen', 'true');
  localStorage.setItem('ummahflow_onboarding', JSON.stringify({ earlyAccessUnlocked: true }));
  localStorage.setItem('selectedCity', 'Ludwigsburg');
};

describe('#704', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = '/create/recommend';
    mocks.search = '';
    mocks.stage = 'stage1';
    mocks.user = null;
    mocks.push.mockClear();
  });

  it('1. /create/recommend shows neither navbar in every stage, logged in or not, incl. ?success=true', () => {
    completeOnboarding();
    for (const stage of ['stage1', 'stage2', 'stage3'] as const) {
      for (const u of [null, user]) {
        expect(shouldShowMobileFooter('/create/recommend', false, u, false, stage)).toBe(false);
        expect(shouldShowCityEarlyAccessNavbar('/create/recommend', false, false, u, stage)).toBe(
          false,
        );
      }
      mocks.stage = stage;
      for (const search of ['', 'success=true']) {
        mocks.search = search;
        for (const u of [null, user]) {
          mocks.user = u;
          const { unmount } = render(<RootClientLayout>content</RootClientLayout>);
          expect(mode()).toBe('none');
          unmount();
        }
      }
    }
  });

  it('2. logged in: the recommend form is in the DOM and no navbar renders over it', () => {
    completeOnboarding();
    mocks.user = { id: 'u1' };
    render(
      <RootClientLayout>
        <RecommendPage />
      </RootClientLayout>,
    );
    expect(screen.getByTestId('recommend-action-bar')).toBeVisible();
    expect(mode()).toBe('none');
  });

  it('3. anonymous: the recommend login gate has a back chevron that goes to /', () => {
    render(<RecommendPage />);
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(mocks.push).toHaveBeenCalledWith('/');
  });

  it('4. other LoginGate callers show no back button unless they opt in', () => {
    const { unmount } = render(<LoginGate returnPath="/create/basics" title="t" />);
    expect(screen.queryByRole('button', { name: 'common.back' })).not.toBeInTheDocument();
    unmount();
    render(<LoginGate returnPath="/create/basics" title="t" onBack="/" />);
    expect(screen.getByRole('button', { name: 'common.back' })).toBeInTheDocument();
  });

  it('5. /create keeps its navbar; other /create subpages and early steps show none', () => {
    completeOnboarding();
    expect(shouldShowCityEarlyAccessNavbar('/create', false, false, null, 'stage1')).toBe(true);
    expect(shouldShowMobileFooter('/create', false, user, false, 'stage2')).toBe(true);
    for (const path of ['/create/basics', '/create/recommend/category']) {
      expect(shouldShowMobileFooter(path, false, user, false, 'stage1')).toBe(false);
      expect(shouldShowCityEarlyAccessNavbar(path, false, false, null, 'stage1')).toBe(false);
    }
  });
});
