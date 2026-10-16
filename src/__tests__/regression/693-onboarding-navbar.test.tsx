// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@supabase/supabase-js';

import { shouldShowCityEarlyAccessNavbar, shouldShowMobileFooter } from '@/utils/navigationUtils';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  stage: 'stage1',
  flowState: 'about',
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
const steps = ['splash', 'about', 'waitlist'] as const;

describe('#693 criterion 5: no navbar on / during splash, about and waitlist', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenSplashScreen', 'true');
    localStorage.setItem('ummahflow_onboarding', JSON.stringify({ earlyAccessUnlocked: true }));
    localStorage.setItem('selectedCity', 'Kleinstadt');
    mocks.pathname = '/';
    mocks.stage = 'stage1';
    mocks.flowState = 'about';
  });

  it.each(steps)('hides both navbars on / in the %s step even when the splash was seen', (step) => {
    for (const stage of ['stage1', 'stage2', 'stage3'] as const) {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, stage, step)).toBe(false);
      expect(shouldShowMobileFooter('/', false, user, false, stage, step)).toBe(false);
    }
  });

  it('keeps the Plan 063 navbar on / in the other flow states', () => {
    for (const step of ['loading', 'success', 'earlyAccess', null] as const) {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage1', step)).toBe(true);
    }
  });

  it('keeps the /create navbar while the flow is in an onboarding step', () => {
    expect(shouldShowCityEarlyAccessNavbar('/create', false, false, null, 'stage1', 'about')).toBe(
      true,
    );
  });

  it.each(['stage1', 'stage2', 'stage3'])(
    'RootClientLayout renders no mobile navbar on / in the about step (%s)',
    (stage) => {
      mocks.stage = stage;
      render(<RootClientLayout>content</RootClientLayout>);
      expect(screen.getByTestId('mobile-footer-bar').getAttribute('data-mobile-ui')).toBe('none');
    },
  );

  it('RootClientLayout still shows the navbar on / in the earlyAccess state', () => {
    mocks.flowState = 'earlyAccess';
    render(<RootClientLayout>content</RootClientLayout>);
    expect(screen.getByTestId('mobile-footer-bar').getAttribute('data-mobile-ui')).toBe('navbar');
  });
});
