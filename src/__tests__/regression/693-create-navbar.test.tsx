// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@supabase/supabase-js';

import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';
import { SplashProvider } from '@/providers/splash-provider';
import { shouldShowCityEarlyAccessNavbar, shouldShowMobileFooter } from '@/utils/navigationUtils';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/hooks/useWaitlistFlow', () => ({
  useWaitlistFlow: () => ({
    currentState: 'splash',
    flowData: {},
    isInitialized: true,
    handleContinue: vi.fn(),
    handleAboutComplete: vi.fn(),
    handleWaitlistSuccess: vi.fn(),
    handleSuccessComplete: vi.fn(),
    handleAboutCompleteFromEarlyAccess: vi.fn(),
    handleProviderQuestion: vi.fn(),
    handleWaitlistComplete: vi.fn(),
  }),
}));

vi.mock('@/components/layout/SplashLayout', () => ({
  SplashLayout: ({ children }: { children: React.ReactNode }) => (
    <div>
      {children}
      <button type="button">Continue</button>
    </div>
  ),
}));

vi.mock('@/components/shared/SplashContent', () => ({ SplashContent: () => null }));

const user = { id: 'u1' } as User;

function completeOnboarding() {
  localStorage.setItem('ummahflow_onboarding', JSON.stringify({ earlyAccessUnlocked: true }));
  localStorage.setItem('selectedCity', 'Kleinstadt');
}

describe('#693 /create navbar for early access users', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('1. anonymous user with onboarding done and a below-threshold city gets a navbar on /create, even before the splash flag is set', () => {
    completeOnboarding();
    for (const stage of ['stage1', 'stage2'] as const) {
      const footer = shouldShowMobileFooter('/create', true, null, false, stage);
      const navbar = shouldShowCityEarlyAccessNavbar('/create', true, false, null, stage);
      expect(footer || navbar).toBe(true);
    }
  });

  it('2. signed-in users still see the footer on /create, even before the splash flag is set', () => {
    completeOnboarding();
    expect(shouldShowMobileFooter('/create', false, user, false, 'stage2')).toBe(true);
    expect(shouldShowMobileFooter('/create', true, user, false, 'stage2')).toBe(true);
  });

  it('3. /create subpages keep hiding the navbar', () => {
    completeOnboarding();
    for (const path of ['/create/basics', '/create/recommend', '/create/media/images']) {
      expect(shouldShowMobileFooter(path, true, user, false, 'stage1')).toBe(false);
      expect(shouldShowCityEarlyAccessNavbar(path, true, false, null, 'stage1')).toBe(false);
    }
  });

  it('4. /city-selection and pre-onboarding /welcome and /about show no navbar', () => {
    expect(shouldShowCityEarlyAccessNavbar('/city-selection', true, false, null, 'stage1')).toBe(false);
    expect(shouldShowMobileFooter('/city-selection', true, user, false, 'stage1')).toBe(false);
    for (const path of ['/welcome', '/about']) {
      expect(shouldShowCityEarlyAccessNavbar(path, false, false, null, 'onboarding')).toBe(false);
      expect(shouldShowMobileFooter(path, false, user, false, 'onboarding')).toBe(false);
    }
  });

  it('5. the splash still hides the navbar on the root page', () => {
    completeOnboarding();
    expect(shouldShowCityEarlyAccessNavbar('/', true, false, null, 'stage1')).toBe(false);
  });

  it('6. clicking a button on the splash screen persists that the splash was seen', () => {
    render(
      <SplashProvider>
        <MobileSplashScreen />
      </SplashProvider>,
    );
    expect(localStorage.getItem('hasSeenSplashScreen')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(localStorage.getItem('hasSeenSplashScreen')).toBe('true');
  });
});
