// @vitest-environment jsdom
/**
 * #254 post-QA: ProviderCard badge honours `displayCategory`.
 *
 * When a category filter is active the results grid hands every card the
 * FILTERED category, so a provider that matched on a secondary category
 * still shows the category the user asked for ("Kebab / Döner"), not its
 * primary ("Türkisch"). With no filter the card keeps showing the primary.
 * The override goes through the same locale-aware name resolution — no
 * second naming mechanism.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { render } from '../utils/test-utils';
import { ProviderCard } from '@/features/providers/components/ProviderCard';
import { mockProviders } from '../mocks/providerData';

const TURKISH_PRIMARY = { name_de: 'Türkisch', name_en: 'Turkish' };
const KEBAB_DOENER = { name_de: 'Kebab / Döner', name_en: 'Kebab / Döner' };

function renderCard(overrides: Record<string, unknown> = {}) {
  return render(
    <ProviderCard
      {...mockProviders[2]}
      category={TURKISH_PRIMARY}
      isBookmarked={false}
      listing_type="food"
      onBookmarkChange={() => {}}
      {...overrides}
    />,
  );
}

describe('#254 post-QA: ProviderCard displayCategory badge', () => {
  beforeEach(() => {
    localStorage.setItem('preferred-language', 'en');
  });

  afterEach(() => {
    localStorage.removeItem('preferred-language');
  });

  it('filter matched on a SECONDARY category → badge shows the filtered category, not the primary', async () => {
    renderCard({ displayCategory: KEBAB_DOENER });

    expect(await screen.findByText('Kebab / Döner')).toBeInTheDocument();
    expect(screen.queryByText('Turkish')).not.toBeInTheDocument();
  });

  it('filter matched on the PRIMARY category → badge still shows the filtered category explicitly', async () => {
    renderCard({
      category: KEBAB_DOENER,
      displayCategory: KEBAB_DOENER,
    });

    expect(await screen.findByText('Kebab / Döner')).toBeInTheDocument();
  });

  it('no displayCategory (no filter, free-text search) → badge shows the primary', async () => {
    renderCard();

    expect(await screen.findByText('Turkish')).toBeInTheDocument();
  });

  it('resolves the override through the same locale path: German UI shows name_de', async () => {
    localStorage.setItem('preferred-language', 'de');

    renderCard({ displayCategory: { name_de: 'Türkisch', name_en: 'Turkish' } });

    expect(await screen.findByText('Türkisch')).toBeInTheDocument();
    expect(screen.queryByText('Turkish')).not.toBeInTheDocument();
  });
});
