// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  stage: 'stage2',
  flowState: null as string | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/components/common/MobileFooterBar', () => ({
  MobileFooterBar: () => <nav data-testid="footer-nav" />,
}));
vi.mock('@/components/shared/CityEarlyAccessNavbar', () => ({
  CityEarlyAccessNavbar: () => <nav data-testid="city-nav" />,
}));
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

const navCount = () =>
  screen.queryAllByTestId('footer-nav').length + screen.queryAllByTestId('city-nav').length;

describe('#549 single mobile navbar', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.pathname = '/';
    mocks.stage = 'stage2';
    mocks.flowState = null;
  });

  it('at most one mobile navbar is in the DOM at a time, on every route and stage', () => {
    const paths = ['/', '/food', '/saved', '/profile', '/create', '/city/Berlin', '/login'];
    for (const stage of ['stage1', 'stage2', 'stage3']) {
      for (const path of paths) {
        mocks.stage = stage;
        mocks.pathname = path;
        const { unmount } = render(<RootClientLayout>content</RootClientLayout>);
        expect(navCount(), `${stage} ${path}`).toBeLessThanOrEqual(1);
        unmount();
      }
    }
  });

  it('mounts exactly the nav matching data-mobile-ui, and none for mode none', () => {
    mocks.pathname = '/profile';
    const { unmount } = render(<RootClientLayout>content</RootClientLayout>);
    expect(screen.getByTestId('footer-nav')).toBeInTheDocument();
    expect(screen.queryByTestId('city-nav')).not.toBeInTheDocument();
    unmount();

    mocks.pathname = '/';
    mocks.flowState = 'earlyAccess';
    render(<RootClientLayout>content</RootClientLayout>);
    expect(navCount()).toBe(0);
  });
});
