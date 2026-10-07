/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { LanguageProvider, useLanguage } from '@/providers/LanguageProvider';
import { loadTranslations } from '@/translations';

const FSI = '\u2066';
const PDI = '\u2069';

function InterpolationProbe({ providerName }: { providerName: string }) {
  const { t } = useLanguage();
  return (
    <output data-testid="probe">
      {t('adminHalalEdit.review.approveConfirm.body', { name: providerName })}
    </output>
  );
}

describe('LanguageProvider document direction', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'de';
  });

  it('applies RTL document direction and language for Arabic', async () => {
    localStorage.setItem('preferred-language', 'ar');

    render(
      <LanguageProvider>
        <div>content</div>
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
    });
  });
});

describe('LanguageProvider bidi isolation (#548)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('wraps interpolated values in FSI/PDI for RTL locales', async () => {
    await loadTranslations('ar');
    localStorage.setItem('preferred-language', 'ar');

    render(
      <LanguageProvider>
        <InterpolationProbe providerName="Al-Sham Bakery" />
      </LanguageProvider>,
    );

    // A Latin-script provider name inside an Arabic sentence must be
    // bidi-isolated, or surrounding punctuation reorders (the "leading
    // full stop" defect seen on the halal check page).
    await waitFor(() => {
      const text = screen.getByTestId('probe').textContent ?? '';
      expect(text).toContain('تنشر');
      expect(text).toContain(`${FSI}Al-Sham Bakery${PDI}`);
    });
  });

  it('leaves interpolated values unwrapped in LTR locales', async () => {
    localStorage.setItem('preferred-language', 'de');

    render(
      <LanguageProvider>
        <InterpolationProbe providerName="Al-Sham Bakery" />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const text = screen.getByTestId('probe').textContent ?? '';
      expect(text).toContain('Al-Sham Bakery');
      expect(text).not.toContain(FSI);
    });
  });

  // #562 Code Review 2: the bidi hunk also swapped a string replacement for
  // a function replacer. String replacement interprets $-tokens in the
  // value — '$&' expanded to the matched '{{name}}', '$$' collapsed to '$',
  // '$1' resolved capture references. The function replacer renders them
  // literally. That is a real fix (prices, '$'-prefixed IDs) and it changes
  // LTR output too, so it is pinned on both directions.
  it('renders $-tokens in an interpolated value literally in an LTR locale', async () => {
    localStorage.setItem('preferred-language', 'de');

    render(
      <LanguageProvider>
        <InterpolationProbe providerName="$& $1 $$" />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const text = screen.getByTestId('probe').textContent ?? '';
      // Literal tokens — under the old string replacer this produced
      // "{{name}} $1 $" instead.
      expect(text).toContain('$& $1 $$');
      expect(text).not.toContain('{{name}}');
    });
  });

  it('renders $-tokens literally inside the bidi isolation in an RTL locale', async () => {
    await loadTranslations('ar');
    localStorage.setItem('preferred-language', 'ar');

    render(
      <LanguageProvider>
        <InterpolationProbe providerName="$& $1 $$" />
      </LanguageProvider>,
    );

    await waitFor(() => {
      const text = screen.getByTestId('probe').textContent ?? '';
      expect(text).toContain(FSI + '$& $1 $$' + PDI);
      expect(text).not.toContain('{{name}}');
    });
  });
});
