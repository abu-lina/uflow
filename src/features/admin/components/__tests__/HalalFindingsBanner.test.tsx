// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

import { HalalFindingsBanner } from '../HalalFindingsBanner';
import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const fetchMock = vi.fn();
const respond = (data: unknown[]) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HalalFindingsBanner (#841)', () => {
  it('appears when pending halal candidates exist', async () => {
    respond([{ id: 'c1', field_name: 'no_alcohol' }]);
    render(<HalalFindingsBanner providerId="p1" />);
    expect(await screen.findByText('adminHalalEdit.findingsBanner.text')).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toContain('providerId=p1');
  });

  it('links to the enrichment tab', async () => {
    respond([{ id: 'c1', field_name: 'no_pork' }]);
    render(<HalalFindingsBanner providerId="p1" />);
    const link = await screen.findByRole('link');
    expect(link.getAttribute('href')).toBe('/dashboard/providers/p1/edit/enrichment');
  });

  it('does not appear when no pending halal candidates exist', async () => {
    respond([
      { id: 'c2', field_name: 'delivery_links' },
      { id: 'c3', field_name: 'provider_images' },
    ]);
    render(<HalalFindingsBanner providerId="p1" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('has i18n keys in all six locales', () => {
    for (const cat of [en, de, ar, tr, ur, ps]) {
      const b = (cat as unknown as Record<string, Record<string, Record<string, string>>>)
        .adminHalalEdit?.findingsBanner;
      expect(b?.text).toBeTruthy();
      expect(b?.link).toBeTruthy();
    }
  });
});
