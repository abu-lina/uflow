// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProviderScreeningPanel } from '../ProviderScreeningPanel';
import type { ProviderScreeningsResult } from '@/features/admin/utils/provider-screenings';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const ready = (suggestNoAlcohol: boolean): ProviderScreeningsResult => ({
  state: 'ready',
  status: 'clear',
  risks: [],
  positives: [],
  suggestNoAlcohol,
});

describe('ProviderScreeningPanel no-alcohol suggestion (#792)', () => {
  it('shows the suggestion so the admin decides', () => {
    render(<ProviderScreeningPanel result={ready(true)} />);
    expect(screen.getByTestId('screening-no-alcohol-suggestion')).toHaveTextContent(
      'adminScreening.noAlcoholSuggestion',
    );
  });

  it('hides the suggestion when it does not apply', () => {
    render(<ProviderScreeningPanel result={ready(false)} />);
    expect(screen.queryByTestId('screening-no-alcohol-suggestion')).not.toBeInTheDocument();
  });
});
