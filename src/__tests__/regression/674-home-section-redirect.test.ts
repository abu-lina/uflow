// @vitest-environment node
/**
 * #674: `/` hands discovery to the active section route.
 *
 * Covers the server side of the home route and the section routes:
 *   AC1 `/` redirects to the active section route, derived from SECTION_META
 *   AC2 query params survive the redirect
 *   AC6 pre-launch `/` still renders onboarding, early-access goes to /welcome
 *   AC7 inactive sections still fall back to /food
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const { flags, redirectMock } = vi.hoisted(() => ({
  flags: { isAppLaunched: true } as Record<string, boolean>,
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => flags[key] ?? false,
}));

vi.mock('@/components/shared/RootPageContent', () => ({
  RootPageContent: () => null,
}));

vi.mock('@/app/(public)/providers/renderProvidersPage', () => ({
  renderProvidersPage: vi.fn(async () => null),
}));

import Home from '@/app/page';
import StoresPage from '@/app/(public)/stores/page';
import UmmahPage from '@/app/(public)/ummah/page';
import { RootPageContent } from '@/components/shared/RootPageContent';
import { SECTION_META } from '@/config/sectionFilters';

type Params = Record<string, string | string[] | undefined>;
type Page = (props: { searchParams: Promise<Params> }) => Promise<unknown>;

async function redirectTarget(page: Page, params: Params = {}): Promise<string> {
  await expect(page({ searchParams: Promise.resolve(params) })).rejects.toThrow('NEXT_REDIRECT');
  expect(redirectMock).toHaveBeenCalledTimes(1);
  return redirectMock.mock.calls[0]?.[0] as string;
}

const originalMeta = {
  food: SECTION_META.food.active,
  store: SECTION_META.store.active,
  ummah: SECTION_META.ummah.active,
};

beforeEach(() => {
  vi.clearAllMocks();
  flags.isAppLaunched = true;
});

afterEach(() => {
  SECTION_META.food.active = originalMeta.food;
  SECTION_META.store.active = originalMeta.store;
  SECTION_META.ummah.active = originalMeta.ummah;
});

describe('#674 AC1: / redirects to the active section route', () => {
  it('redirects / to /food while only food is active', async () => {
    expect(await redirectTarget(Home)).toBe('/food');
  });

  it('derives the target from SECTION_META, so activating another section needs no page change', async () => {
    SECTION_META.food.active = false;
    SECTION_META.store.active = true;

    expect(await redirectTarget(Home)).toBe('/stores');
  });

  it('uses a temporary redirect (no permanent redirect type passed)', async () => {
    await redirectTarget(Home);
    expect(redirectMock.mock.calls[0]).toHaveLength(1);
  });
});

describe('#674 AC2: query params survive the redirect', () => {
  it('/?view=list lands on /food?view=list', async () => {
    expect(await redirectTarget(Home, { view: 'list' })).toBe('/food?view=list');
  });

  it('/?view=map&<filter keys> keeps every param', async () => {
    const params = {
      view: 'map',
      filters: 'muslim,parken',
      location: 'Berlin',
      open_now: '1',
      category: ['a', 'b'],
    };

    const target = new URL(await redirectTarget(Home, params), 'https://ummahflow.com');

    expect(target.pathname).toBe('/food');
    expect(target.searchParams.get('view')).toBe('map');
    expect(target.searchParams.get('filters')).toBe('muslim,parken');
    expect(target.searchParams.get('location')).toBe('Berlin');
    expect(target.searchParams.get('open_now')).toBe('1');
    expect(target.searchParams.getAll('category')).toEqual(['a', 'b']);
  });
});

describe('#674 AC6: pre-launch and onboarding behaviour unchanged', () => {
  it('renders the onboarding content on / when the app is not launched', async () => {
    flags.isAppLaunched = false;

    const element = (await Home({ searchParams: Promise.resolve({}) })) as ReactElement<{
      children: ReactElement;
    }>;

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children.type).toBe(RootPageContent);
  });

  it('/?from=early-access still redirects to /welcome before launch', async () => {
    flags.isAppLaunched = false;

    expect(await redirectTarget(Home, { from: 'early-access' })).toBe('/welcome');
  });
});

describe('#674 AC7: inactive sections still fall back to /food', () => {
  it('/stores redirects to /food while store is inactive', async () => {
    SECTION_META.store.active = false;
    expect(await redirectTarget(StoresPage)).toBe('/food');
  });

  it('/ummah redirects to /food while ummah is inactive', async () => {
    SECTION_META.ummah.active = false;
    expect(await redirectTarget(UmmahPage)).toBe('/food');
  });
});
