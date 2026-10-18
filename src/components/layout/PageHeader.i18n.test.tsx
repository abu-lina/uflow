// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const lookup = (bundle: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], bundle);

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'en' as const,
    t: (key: string) => (lookup(en, key) as string) ?? key,
  }),
}));

import { PageHeader } from './PageHeader';

describe('PageHeader back button i18n (issue #719)', () => {
  it('back button aria-label is the English label and not "Zurück"', () => {
    render(<PageHeader title="Title" variant="back-and-title" onBack={() => {}} />);
    const button = screen.getByRole('button', { name: en.common.back });
    expect(button.getAttribute('aria-label')).toBe('Back');
    expect(screen.queryByLabelText('Zurück')).toBeNull();
  });

  it('common.back exists in all six locales', () => {
    for (const [name, bundle] of Object.entries({ en, de, ar, tr, ur, ps })) {
      const value = lookup(bundle, 'common.back');
      expect(typeof value, name).toBe('string');
      expect((value as string).length, name).toBeGreaterThan(0);
    }
  });
});
