// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@supabase/supabase-js';

import { MobileSplashScreen } from '@/components/shared/MobileSplashScreen';
import { SplashProvider, useSplash } from '@/providers/splash-provider';
import { shouldShowCityEarlyAccessNavbar, shouldShowMobileFooter } from '@/utils/navigationUtils';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const flow = vi.hoisted(() => ({ currentState: 'splash' }));

vi.mock('@/hooks/useWaitlistFlow', () => ({
  useWaitlistFlow: () => ({
    currentState: flow.currentState,
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
      <a href="/about">Learn more</a>
    </div>
  ),
}));

vi.mock('@/components/shared/AboutPageContent', () => ({
  AboutPageContent: () => <button type="button">Continue</button>,
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
      expect(shouldShowMobileFooter('/create', true, null, false, stage)).toBe(false);
      expect(shouldShowCityEarlyAccessNavbar('/create', true, false, null, stage)).toBe(true);
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
      for (const splash of [true, false]) {
        expect(shouldShowMobileFooter(path, splash, user, false, 'stage1')).toBe(false);
        expect(shouldShowCityEarlyAccessNavbar(path, splash, false, null, 'stage1')).toBe(false);
      }
    }
  });

  it('4. /city-selection and pre-onboarding /welcome and /about show no navbar', () => {
    expect(shouldShowCityEarlyAccessNavbar('/city-selection', true, false, null, 'stage1')).toBe(
      false,
    );
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

  describe('6. a button or link press on the splash screen dismisses it', () => {
    function SplashState() {
      const { isSplashVisible } = useSplash();
      return <span data-testid="splash-visible">{String(isSplashVisible)}</span>;
    }

    function renderSplash() {
      render(
        <SplashProvider>
          <SplashState />
          <MobileSplashScreen />
        </SplashProvider>,
      );
      expect(screen.getByTestId('splash-visible').textContent).toBe('true');
    }

    beforeEach(() => {
      flow.currentState = 'splash';
    });

    it.each([
      ['button', 'Continue'],
      ['link', 'Learn more'],
    ])('persists the flag and hides the splash after a %s press', (_kind, name) => {
      renderSplash();
      fireEvent.click(screen.getByText(name));
      expect(localStorage.getItem('hasSeenSplashScreen')).toBe('true');
      expect(screen.getByTestId('splash-visible').textContent).toBe('false');
    });

    it('does not dismiss from later flow states', () => {
      flow.currentState = 'about';
      renderSplash();
      fireEvent.click(screen.getByText('Continue'));
      expect(localStorage.getItem('hasSeenSplashScreen')).toBeNull();
    });
  });
});
