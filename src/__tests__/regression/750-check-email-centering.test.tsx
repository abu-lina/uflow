// @vitest-environment jsdom
/**
 * Issue #750: /signup/check-email content sat above the visual centre.
 * PageContentWrapper already reserves the bottom navbar height (pb-16) when
 * centring, so an extra BottomSpacer double-counted it and pushed the content up.
 * jsdom has no layout engine, so these tests assert the classes that centre it.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { en } from '@/translations/en';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const tEn = (key: string): string =>
  (key
    .split('.')
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], en) as string) ?? key;

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ language: 'en' as const, t: tEn, setLanguage: vi.fn() }),
}));

vi.mock('@/components/ui/Icon', () => ({ Icon: () => <span /> }));

import CheckEmailPage from '@/app/(public)/signup/check-email/page';

describe('#750 check-email vertical centring', () => {
  it('centres the content block in the space above the bottom navigation', () => {
    render(<CheckEmailPage />);
    const heading = screen.getByText(en.signup.checkEmail.successTitle);
    const wrapper = heading.closest('.justify-center');
    expect(wrapper).not.toBeNull();
    const classes = wrapper?.className ?? '';
    expect(classes).toContain('flex-1');
    expect(classes).toContain('items-center');
    expect(classes).toContain('pb-16');
  });

  it('does not add a second bottom spacer that would shift the content up', () => {
    const { container } = render(<CheckEmailPage />);
    expect(container.querySelector('[class*="h-bottom-spacing"]')).toBeNull();
  });
});
