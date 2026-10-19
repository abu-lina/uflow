// @vitest-environment jsdom
/**
 * #731: the pre-launch home page shows LandingHero on desktop.
 *
 * Desktop vs mobile is CSS-only (`hidden md:block` / `md:hidden`), so jsdom renders
 * both trees. The desktop branch is asserted through its container.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gate, appStage } = vi.hoisted(() => ({
  gate: { ready: true as boolean | null, city: 'Berlin' as string | null },
  appStage: { stage: 'stage1' as string },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/hooks/useOnboardingGate', () => ({
  useOnboardingGate: () => ({ ready: gate.ready, city: gate.city, isRecovering: false }),
}));

vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => ({ stage: appStage.stage, cityName: gate.city, isLoading: false }),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: () => false,
}));

vi.mock('@/components/shared/LandingHero', () => ({
  LandingHero: () => <div data-testid="landing-hero" />,
}));
vi.mock('@/components/shared/MobileSplashScreen', () => ({
  MobileSplashScreen: () => <div data-testid="mobile-splash" />,
}));
vi.mock('@/components/shared/CityEarlyAccessEmptyState', () => ({
  CityEarlyAccessEmptyState: () => <div data-testid="stage1-empty" />,
}));
vi.mock('@/components/shared/AboutSection', () => ({ AboutSection: () => <div /> }));
vi.mock('@/components/shared/ExploreSection', () => ({ ExploreSection: () => <div /> }));
vi.mock('@/components/shared/DesktopWaitlistSection', () => ({
  DesktopWaitlistSection: () => <div />,
}));

import { RootPageContent } from '@/components/shared/RootPageContent';

const desktopContainer = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.hidden.md\\:block');
const mobileContainer = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.md\\:hidden');

beforeEach(() => {
  gate.ready = true;
  gate.city = 'Berlin';
  appStage.stage = 'stage1';
});

describe('#731: RootPageContent desktop branch', () => {
  it('AC1: renders LandingHero inside the desktop-only container', () => {
    const { container } = render(<RootPageContent />);

    const desktop = desktopContainer(container);
    expect(desktop).not.toBeNull();
    expect(screen.getByTestId('landing-hero')).toBeInTheDocument();
    expect(desktop).toContainElement(screen.getByTestId('landing-hero'));
  });

  it('AC2: MobileSplashScreen renders only in the mobile container, not the desktop one', () => {
    gate.ready = false;
    gate.city = null;

    const { container } = render(<RootPageContent />);

    const splash = screen.getByTestId('mobile-splash');
    expect(mobileContainer(container)).toContainElement(splash);
    expect(desktopContainer(container)).not.toContainElement(splash);
    expect(desktopContainer(container)).toContainElement(screen.getByTestId('landing-hero'));
  });

  it('AC2: CityEarlyAccessEmptyState renders only in the mobile container, not the desktop one', () => {
    const { container } = render(<RootPageContent />);

    const empty = screen.getByTestId('stage1-empty');
    expect(mobileContainer(container)).toContainElement(empty);
    expect(desktopContainer(container)).not.toContainElement(empty);
    expect(desktopContainer(container)).toContainElement(screen.getByTestId('landing-hero'));
  });
});
