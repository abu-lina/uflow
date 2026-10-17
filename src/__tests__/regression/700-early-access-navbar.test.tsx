// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@supabase/supabase-js';

import { shouldShowCityEarlyAccessNavbar, shouldShowMobileFooter } from '@/utils/navigationUtils';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  stage: 'stage1',
  flowState: 'earlyAccess',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
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
  useSplash: () => ({ isSplashVisible: false, onboardingStep: mocks.flowState }),
}));
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));
vi.mock('@/config/feature-flags', () => ({ getFeatureFlag: () => false }));
vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({ stage: mocks.stage, isLoading: false }),
}));

import { RootClientLayout } from '@/components/layout/RootClientLayout';

const user = { id: 'u1' } as User;
const mode = () => screen.getByTestId('mobile-footer-bar').getAttribute('data-mobile-ui');

const completeOnboarding = () => {
  localStorage.setItem('hasSeenSplashScreen', 'true');
  localStorage.setItem('ummahflow_onboarding', JSON.stringify({ earlyAccessUnlocked: true }));
  localStorage.setItem('selectedCity', 'Ludwigsburg');
};

describe('#700', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = '/';
    mocks.stage = 'stage1';
    mocks.flowState = 'earlyAccess';
  });

  it('1. / in the earlyAccess step hides both navbars and RootClientLayout renders mode none', () => {
    for (const stage of ['stage1', 'stage2', 'stage3'] as const) {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, stage, 'earlyAccess')).toBe(
        false,
      );
      expect(shouldShowMobileFooter('/', false, user, false, stage, 'earlyAccess')).toBe(false);
    }
    render(<RootClientLayout>content</RootClientLayout>);
    expect(mode()).toBe('none');
  });

  it('2. the stage 1 empty state shows no navbar on / and /city/<name>', () => {
    completeOnboarding();
    for (const path of ['/', '/city/Ludwigsburg']) {
      expect(shouldShowCityEarlyAccessNavbar(path, false, false, null, 'stage1', null)).toBe(false);
      expect(shouldShowMobileFooter(path, false, user, false, 'stage1', null)).toBe(false);
      mocks.pathname = path;
      mocks.flowState = 'success';
      const { unmount } = render(<RootClientLayout>content</RootClientLayout>);
      expect(mode()).toBe('none');
      unmount();
    }
  });

  it('3. /create/recommend shows no navbar, logged in or not (superseded by #704)', () => {
    completeOnboarding();
    for (const stage of ['stage1', 'stage2', 'stage3'] as const) {
      for (const u of [null, user]) {
        expect(shouldShowCityEarlyAccessNavbar('/create/recommend', false, false, u, stage)).toBe(
          false,
        );
        expect(shouldShowMobileFooter('/create/recommend', false, u, false, stage)).toBe(false);
      }
    }
    mocks.pathname = '/create/recommend';
    mocks.flowState = 'success';
    render(<RootClientLayout>content</RootClientLayout>);
    expect(mode()).toBe('none');
  });

  it('4. other /create subpages stay hidden and /create keeps its navbar', () => {
    completeOnboarding();
    for (const path of [
      '/create/basics',
      '/create/media/images',
      '/create/recommend/category',
      '/create/recommend/offers',
    ]) {
      expect(shouldShowMobileFooter(path, false, user, false, 'stage1')).toBe(false);
      expect(shouldShowCityEarlyAccessNavbar(path, false, false, null, 'stage1')).toBe(false);
    }
    expect(shouldShowCityEarlyAccessNavbar('/create', false, false, null, 'stage1')).toBe(true);
    expect(shouldShowMobileFooter('/create', false, user, false, 'stage2')).toBe(true);
  });

  it('5. /city-selection and the splash, about and waitlist steps stay hidden', () => {
    completeOnboarding();
    expect(shouldShowCityEarlyAccessNavbar('/city-selection', false, false, null, 'stage1')).toBe(
      false,
    );
    for (const step of ['splash', 'about', 'waitlist']) {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage1', step)).toBe(false);
      expect(shouldShowMobileFooter('/', false, user, false, 'stage1', step)).toBe(false);
    }
  });
});
