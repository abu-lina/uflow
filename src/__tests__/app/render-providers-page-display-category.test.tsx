/**
 * #254 post-QA: renderProvidersPage resolves the filtered category once and
 * passes it to ProvidersContent as `displayCategory`, so every card in the
 * filtered grid can show the category the user filtered by.
 *
 * Covers both URL forms:
 *   /food?category=<uuid>           → label fetched once server-side
 *   /food/[city]/[category]         → the page already fetched the record,
 *                                     passed through without a second fetch
 * Sentinels, bogus values and free-text-only searches yield no label, so
 * cards keep showing the primary.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';

const mockSearch = vi.fn().mockResolvedValue({ results: [], hasMore: false, totalCount: 0 });
const mockGetCategoryById = vi.fn();

vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: (...args: unknown[]) => mockSearch(...args),
}));

vi.mock('@/services/categories', () => ({
  getCategoryById: (...args: unknown[]) => mockGetCategoryById(...args),
}));

// The page's client boundary — mocked so the async server component can run
// in a node test without the client tree. Props are read off the element.
vi.mock('@/app/(public)/providers/ProvidersContent', () => ({
  ProvidersContent: () => null,
}));

import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';
import { ALL_CATEGORIES_LABELS } from '@/constants/allCategoriesLabels';

const CATEGORY_ID = '9026edb0-490a-4395-a3d7-27c5eacde0e2';
const KEBAB_DOENER = {
  category_id: CATEGORY_ID,
  name_de: 'Kebab / Döner',
  name_en: 'Kebab / Döner',
};

async function contentProps(opts: Parameters<typeof renderProvidersPage>[0]) {
  const element = (await renderProvidersPage(opts)) as ReactElement;
  const content = element.props.children as ReactElement;
  expect(content.type).toBe(ProvidersContent);
  return content.props as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.mockResolvedValue({ results: [], hasMore: false, totalCount: 0 });
});

describe('#254 post-QA: renderProvidersPage displayCategory', () => {
  it('?category=<uuid> resolves the filtered category once for all cards', async () => {
    mockGetCategoryById.mockResolvedValue(KEBAB_DOENER);

    const props = await contentProps({
      searchParams: Promise.resolve({ category: CATEGORY_ID }),
      routeSection: 'food',
    });

    expect(mockGetCategoryById).toHaveBeenCalledWith(CATEGORY_ID);
    expect(props.displayCategory).toEqual({
      name_de: 'Kebab / Döner',
      name_en: 'Kebab / Döner',
    });
  });

  it('route form uses the record the page already fetched — no second query', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Berlin',
      routeCategory: CATEGORY_ID,
      routeCategoryRecord: KEBAB_DOENER,
    });

    expect(mockGetCategoryById).not.toHaveBeenCalled();
    expect(props.displayCategory).toEqual({
      name_de: 'Kebab / Döner',
      name_en: 'Kebab / Döner',
    });
  });

  it.each(ALL_CATEGORIES_LABELS)(
    '?category=%s is the all-categories sentinel — no label, primary badge',
    async (sentinel) => {
      const props = await contentProps({
        searchParams: Promise.resolve({ category: sentinel }),
        routeSection: 'food',
      });

      expect(props.displayCategory).toBeNull();
      expect(mockGetCategoryById).not.toHaveBeenCalled();
    },
  );

  it('?category=bogus yields no label (search fails closed separately)', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({ category: 'bogus' }),
      routeSection: 'food',
    });

    expect(props.displayCategory).toBeNull();
    expect(mockGetCategoryById).not.toHaveBeenCalled();
  });

  it('free-text search with no category yields no label — primary badge', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({ q: 'Turkish' }),
      routeSection: 'food',
    });

    expect(props.displayCategory).toBeNull();
    expect(mockGetCategoryById).not.toHaveBeenCalled();
  });
});
