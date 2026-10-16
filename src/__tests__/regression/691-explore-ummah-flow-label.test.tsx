// @vitest-environment jsdom
/**
 * #691: the early access button reads "Explore Ummah Flow" (brand with a space).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ar } from '@/translations/ar';
import { de } from '@/translations/de';
import { en } from '@/translations/en';
import { ps } from '@/translations/ps';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

import { CityEarlyAccessEmptyState } from '@/components/shared/CityEarlyAccessEmptyState';

describe('#691 Explore Ummah Flow label', () => {
  it('en: waitlist.cityEarlyAccess.exploreUmmahFlow is exactly "Explore Ummah Flow"', () => {
    expect(en.waitlist.cityEarlyAccess.exploreUmmahFlow).toBe('Explore Ummah Flow');
  });

  it('de, ar, tr, ur, ps: only "UmmahFlow" becomes "Ummah Flow"', () => {
    expect(de.waitlist.cityEarlyAccess.exploreUmmahFlow).toBe('Ummah Flow entdecken');
    expect(ar.waitlist.cityEarlyAccess.exploreUmmahFlow).toBe('استكشف Ummah Flow');
    expect(tr.waitlist.cityEarlyAccess.exploreUmmahFlow).toBe("Ummah Flow'u keşfet");
    expect(ur.waitlist.cityEarlyAccess.exploreUmmahFlow).toBe('Ummah Flow دریافت کریں');
    expect(ps.waitlist.cityEarlyAccess.exploreUmmahFlow).toBe('Ummah Flow وپلټئ');
  });

  it('the early access screen renders the button with label and aria-label "Explore Ummah Flow"', () => {
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    render(<CityEarlyAccessEmptyState cityName="Bielefeld" />);

    const button = screen.getByRole('button', { name: 'Explore Ummah Flow' });
    expect(button).toHaveTextContent('Explore Ummah Flow');
    expect(button).toHaveAttribute('aria-label', 'Explore Ummah Flow');
  });
});
