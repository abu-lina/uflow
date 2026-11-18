// @vitest-environment jsdom
/**
 * #943: browser list on /food/<city>/<category> ignores the Category from the path.
 *
 * Seam 1 — server wiring: renderProvidersPage passes the route's category id
 * to ProvidersContent as `pageCategory`.
 *
 * Seam 2 — client wiring: ProvidersContent passes `pageCategory` as an
 * override to readDiscoveryQueryInBrowser so the browser's category matches
 * the server's on every page load.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';

// ── Seam 1: server wiring ──────────────────────────────────────────────

const mockSearch = vi.fn().mockResolvedValue({ results: [], hasMore: false, totalCount: 0 });

vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: (...args: unknown[]) => mockSearch(...args),
  getCityCenter: async () => null,
}));

vi.mock('@/services/categories', () => ({
  getCategoryById: async () => null,
}));

vi.mock('@/app/(public)/providers/ProvidersContent', () => ({
  ProvidersContent: () => null,
}));

import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

const CATEGORY_ID = '9026edb0-490a-4395-a3d7-27c5eacde0e2';
const ANOTHER_CATEGORY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

async function contentProps(opts: Parameters<typeof renderProvidersPage>[0]) {
  const element = (await renderProvidersPage(opts)) as ReactElement;
  const children = Array.isArray(element.props.children)
    ? element.props.children
    : [element.props.children];
  const suspense = children.find((c: ReactElement) => c && c.props?.children);
  const content = suspense.props.children as ReactElement;
  expect(content.type).toBe(ProvidersContent);
  return content.props as Record<string, unknown>;
}

describe('#943 seam 1: renderProvidersPage passes pageCategory to ProvidersContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: [], hasMore: false, totalCount: 0 });
  });

  it('AC1: route category is passed as pageCategory when no query category exists', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Berlin',
      routeCategory: CATEGORY_ID,
    });

    expect(props.pageCategory).toBe(CATEGORY_ID);
  });

  it('AC2: route category wins over query category (?category=<another>)', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({ category: ANOTHER_CATEGORY_ID }),
      routeSection: 'food',
      routeCity: 'Berlin',
      routeCategory: CATEGORY_ID,
    });

    expect(props.pageCategory).toBe(CATEGORY_ID);
  });

  it('AC4 (pin): no route category + query category → pageCategory is absent', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({ category: CATEGORY_ID }),
      routeSection: 'food',
    });

    expect(props.pageCategory).toBeUndefined();
  });

  it('AC5 (pin): no route category + no query category → pageCategory is absent', async () => {
    const props = await contentProps({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
    });

    expect(props.pageCategory).toBeUndefined();
  });
});
