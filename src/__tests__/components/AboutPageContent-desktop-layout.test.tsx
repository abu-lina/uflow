// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { AboutPageContent } from '@/components/shared/AboutPageContent';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

vi.mock('@/components/ui/MapIllustration', () => ({
  MapIllustration: () => <div data-testid="map-illustration" />,
}));

vi.mock('@/components/ui/AddButtonLottie', () => ({
  AddButtonLottie: () => <div data-testid="add-button-lottie" />,
}));

vi.mock('@/components/ui/OrigamiBirdIcon', () => ({
  OrigamiBirdIcon: () => <div data-testid="origami-bird" />,
}));

vi.mock('@/components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

describe('AboutPageContent desktop layout (#958)', () => {
  it('hides the mobile PageHeader on md breakpoint and above', () => {
    const { container } = render(<AboutPageContent />);

    // The wrapper around PageHeader + HeaderSpacer should have md:hidden
    // so it doesn't overlap the desktop Header from root layout
    const header = container.querySelector('header');
    expect(header).toBeTruthy();

    const headerWrapper = header!.closest('[class*="md:hidden"]');
    expect(headerWrapper).toBeTruthy();
  });

  it('constrains content width on desktop instead of full viewport', () => {
    const { container } = render(<AboutPageContent />);

    // The content area should have a constraining max-width class
    const contentWrapper = container.querySelector('[class*="items-center"][class*="gap-8"]');
    expect(contentWrapper).toBeTruthy();

    const classes = contentWrapper!.className;
    const hasConstrainedWidth = /max-w-(?!full)\S+/.test(classes);
    expect(hasConstrainedWidth).toBe(true);
  });

  it('does not render a full-width button on desktop', () => {
    const { container } = render(<AboutPageContent />);

    // The CTA button has w-full from fullWidth prop — find it specifically
    const ctaButton = container.querySelector('button.w-full');
    expect(ctaButton).toBeTruthy();

    const classes = ctaButton!.className;
    const hasDesktopWidthConstraint =
      classes.includes('md:w-auto') ||
      classes.includes('md:max-w') ||
      ctaButton!.closest('[class*="max-w-"]') !== null;
    expect(hasDesktopWidthConstraint).toBe(true);
  });
});
