// @vitest-environment jsdom
/**
 * Plan 261: /food/[city] scroll block on iPhone SE PWA
 *
 * Root cause: ProvidersContent eagerly mounted the whole Leaflet map and
 * fetched every nationwide food pin while the map container was only
 * `visibility: hidden`, saturating the main thread during hydration so the
 * first touch could not start a scroll.
 *
 * Fix: useMapDiscovery gained an opt-in `deferPinsUntilMapOpened` option;
 * ProvidersContent uses it and mounts SearchMap only after the map view has
 * been opened once. RootPageContent (home page needs pins in list view)
 * keeps its eager behaviour.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { useMapDiscovery } from '@/features/search/hooks/useMapDiscovery';
import { getMapLocations } from '@/services/providers';

vi.mock('@/services/providers', () => ({
  getMapLocations: vi.fn(async () => []),
}));

const read = (relPath: string) => readFileSync(resolve(__dirname, '../..', relPath), 'utf-8');

const geo = { status: 'idle', coords: null };
const mockGetMapLocations = vi.mocked(getMapLocations);

function makeUrlSync(params: URLSearchParams, pathname = '/food/stuttgart') {
  return {
    searchParams: params,
    pathname,
    replace: vi.fn(),
  };
}

describe('Plan 261 deferred map pins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not fetch pins in list view when deferPinsUntilMapOpened is set', () => {
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, undefined, { deferPinsUntilMapOpened: true }),
    );

    expect(mockGetMapLocations).not.toHaveBeenCalled();
    expect(result.current.pinsLoading).toBe(false);
    expect(result.current.hasOpenedMap).toBe(false);
  });

  it('fetches pins exactly once after switching to map view', () => {
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, undefined, { deferPinsUntilMapOpened: true }),
    );

    act(() => result.current.setViewMode('map'));

    expect(result.current.hasOpenedMap).toBe(true);
    expect(mockGetMapLocations).toHaveBeenCalledTimes(1);
  });

  it('keeps hasOpenedMap true when switching back to list (map not torn down)', () => {
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, undefined, { deferPinsUntilMapOpened: true }),
    );

    act(() => result.current.setViewMode('map'));
    act(() => result.current.setViewMode('list'));

    expect(result.current.hasOpenedMap).toBe(true);
    expect(result.current.viewMode).toBe('list');
    expect(mockGetMapLocations).toHaveBeenCalledTimes(1);
  });

  it('fetches pins on mount when URL is ?view=map even with deferPinsUntilMapOpened', () => {
    const params = new URLSearchParams('view=map');
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, makeUrlSync(params), {
        deferPinsUntilMapOpened: true,
      }),
    );

    expect(result.current.viewMode).toBe('map');
    expect(result.current.hasOpenedMap).toBe(true);
    expect(mockGetMapLocations).toHaveBeenCalledTimes(1);
  });

  it('keeps eager pin fetch in list view without the options arg (home page)', () => {
    const { result } = renderHook(() => useMapDiscovery(geo, 'list'));

    expect(result.current.viewMode).toBe('list');
    expect(result.current.hasOpenedMap).toBe(false);
    expect(mockGetMapLocations).toHaveBeenCalledTimes(1);
  });
});

describe('Plan 261 source assertions', () => {
  it('ProvidersContent gates SearchMap on hasOpenedMap and opts into deferred pins', () => {
    const src = read('app/(public)/providers/ProvidersContent.tsx');
    expect(src).toContain('deferPinsUntilMapOpened: true');
    expect(src).toContain('hasOpenedMap &&');
    expect(src).toContain('<SearchMap');
  });

  it('RootPageContent does not defer pins (home list view needs them)', () => {
    const src = read('components/shared/RootPageContent.tsx');
    expect(src).not.toContain('deferPinsUntilMapOpened');
  });

  it('SearchMap uses a single SVG sprite instead of per-marker uid icons', () => {
    const src = read('features/search/components/SearchMap.tsx');
    expect(src).not.toContain('_pinUid');
    expect(src).toContain('uflow-pin-symbol');
    expect(src).toContain('<use');
  });

  it('globals.css: no universal-selector rule carries -webkit-overflow-scrolling', () => {
    const css = read('styles/globals.css');
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = ruleRe.exec(css))) {
      const body = m[2];
      if (!body || !body.includes('-webkit-overflow-scrolling')) continue;
      const selectors = (m[1] ?? '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (selectors.some((s) => s === '*' || /\s\*$/.test(s))) {
        offenders.push(selectors.join(', '));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('globals.css: real scroll containers keep -webkit-overflow-scrolling on iOS', () => {
    const css = read('styles/globals.css');
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    let covered = false;
    while ((m = ruleRe.exec(css))) {
      const selector = m[1] ?? '';
      const body = m[2] ?? '';
      if (
        body.includes('-webkit-overflow-scrolling') &&
        selector.includes('.overflow-y-auto') &&
        selector.includes('main')
      ) {
        covered = true;
      }
    }
    expect(covered).toBe(true);
  });
});
