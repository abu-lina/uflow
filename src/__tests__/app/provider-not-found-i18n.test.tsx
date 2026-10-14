// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ar } from '@/translations/ar';
import { de } from '@/translations/de';
import { en } from '@/translations/en';
import { ps } from '@/translations/ps';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import ProviderNotFound from '@/app/(public)/p/not-found';

const mockUseLanguage = vi.hoisted(() => vi.fn());

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: mockUseLanguage,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => null,
}));

const locales = [
  { language: 'en', translations: en },
  { language: 'de', translations: de },
  { language: 'ar', translations: ar },
  { language: 'tr', translations: tr },
  { language: 'ur', translations: ur },
  { language: 'ps', translations: ps },
] as const;

function translate(bundle: object, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((current, part) => (current as Record<string, unknown>)?.[part], bundle);
  return typeof value === 'string' ? value : key;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('provider not-found page localization', () => {
  it('renders not-found copy and actions from the selected locale', () => {
    for (const { language, translations } of locales) {
      mockUseLanguage.mockReturnValue({
        language,
        t: (key: string) => translate(translations, key),
      });

      const { unmount } = render(<ProviderNotFound />);

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        translate(translations, 'providers.notFound.title'),
      );
      expect(screen.getByText(translate(translations, 'providers.notFound.description'))).toBeInTheDocument();
      expect(screen.getByRole('link', { name: translate(translations, 'providers.notFound.browse') })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: translate(translations, 'providers.notFound.home') })).toBeInTheDocument();

      unmount();
    }
  });
});
