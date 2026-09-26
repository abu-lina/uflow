import { describe, it, expect } from 'vitest';
import { buildNearMeUrl } from '@/lib/search-params';

describe('buildNearMeUrl', () => {
  it('strips the city to the section root and sets near_me=1 when active', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: true,
      openNow: false,
      pathname: '/food/stuttgart',
      searchParams: new URLSearchParams(),
    });
    expect(url).toBe('/food?near_me=1');
  });

  it('keeps the current pathname when deactivating near-me', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: false,
      openNow: false,
      pathname: '/food',
      searchParams: new URLSearchParams('near_me=1'),
    });
    expect(url).toBe('/food');
  });

  it('preserves unrelated params and sets open_now', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: true,
      openNow: true,
      pathname: '/food/stuttgart',
      searchParams: new URLSearchParams('q=pizza&filters=muslim'),
    });
    expect(url).toBe('/food?q=pizza&filters=muslim&near_me=1&open_now=1');
  });

  it('deletes stale near_lat/near_lon/near_radius params', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: true,
      openNow: false,
      pathname: '/food',
      searchParams: new URLSearchParams('near_lat=48&near_lon=9&near_radius=5'),
    });
    expect(url).toBe('/food?near_me=1');
  });

  it('deletes open_now when openNow is false', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: false,
      openNow: false,
      pathname: '/food',
      searchParams: new URLSearchParams('open_now=1'),
    });
    expect(url).toBe('/food');
  });
});
