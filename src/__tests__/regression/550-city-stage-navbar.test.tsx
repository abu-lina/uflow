// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/city/Berlin',
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/components/common/MobileFooterBar', () => ({
  MobileFooterBar: () => <div data-testid="mobile-footer-bar">MobileFooterBar</div>,
}));

vi.mock('@/components/shared/CityEarlyAccessNavbar', () => ({
  CityEarlyAccessNavbar: () => (
    <div data-testid="city-early-access-navbar">CityEarlyAccessNavbar</div>
  ),
}));

vi.mock('@/components/layout/DesktopFooter', () => ({
  DesktopFooter: () => <div data-testid="desktop-footer">DesktopFooter</div>,
}));

vi.mock('@/components/ui/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/FooterAction', () => ({
  FooterAction: () => <div data-testid="footer-action">FooterAction</div>,
}));

vi.mock('@/components/ui/PushNotificationPrompt', () => ({
  PushNotificationPrompt: () => null,
}));

vi.mock('@/features/chat/components/ChatFloatingWidget', () => ({
  ChatFloatingWidget: () => <div data-testid="chat-floating-widget">ChatFloatingWidget</div>,
}));

vi.mock('@/providers/splash-provider', () => ({
  useSplash: () => ({ isSplashVisible: false }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: () => false,
}));

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({ stage: 'stage1', isLoading: false }),
}));

vi.mock('@/components/shared/CityEarlyAccessEmptyState', () => ({
  CityEarlyAccessEmptyState: ({ cityName }: { cityName: string }) => (
    <div data-testid="city-empty-state">{cityName}</div>
  ),
}));

import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { CityStage1Content } from '@/app/(public)/city/[cityName]/CityStage1Content';

describe('CityStage1Content navbar invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exactly one mobile navbar on the city stage route', () => {
    render(
      <RootClientLayout>
        <CityStage1Content cityName="Berlin" country="Germany" />
      </RootClientLayout>,
    );

    expect(screen.getAllByTestId('city-early-access-navbar')).toHaveLength(1);
  });
});
