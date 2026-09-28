/** @vitest-environment jsdom */

import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/providers/LanguageProvider';

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
