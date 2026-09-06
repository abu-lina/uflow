/**
 * Plan 226: View toggle URL sync regression tests
 *
 * Verifies that toggling between map and list view updates the URL with
 * a ?view=map|list query parameter, and that the initial view mode is
 * read from the URL when present.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useMapDiscovery } from '@/features/search/hooks/useMapDiscovery';

// ─── Mock getMapLocations (useMapDiscovery calls it on mount) ────────────────
vi.mock('@/services/providers', () => ({
  getMapLocations: vi.fn(async () => []),
}));

describe('Plan 226 useMapDiscovery URL sync', () => {
  let mockReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const geo = { status: 'idle', coords: null };

  function makeUrlSync(params: URLSearchParams, pathname = '/') {
    return {
      searchParams: params,
      pathname,
      replace: mockReplace,
    };
  }

  // ── Initial view mode from URL ──────────────────────────────────────────────

  it('reads ?view=list from URL and uses it as initial view mode (overriding default map)', () => {
    const params = new URLSearchParams('view=list');
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'map', null, makeUrlSync(params)),
    );
    expect(result.current.viewMode).toBe('list');
  });

  it('reads ?view=map from URL and uses it as initial view mode (overriding default list)', () => {
    const params = new URLSearchParams('view=map');
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, makeUrlSync(params)),
    );
    expect(result.current.viewMode).toBe('map');
  });

  it('falls back to defaultViewMode when ?view= is absent', () => {
    const params = new URLSearchParams();
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'map', null, makeUrlSync(params)),
    );
    expect(result.current.viewMode).toBe('map');
  });

  it('falls back to defaultViewMode when ?view= has an invalid value', () => {
    const params = new URLSearchParams('view=grid');
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, makeUrlSync(params)),
    );
    expect(result.current.viewMode).toBe('list');
  });

  // ── Toggle updates URL ──────────────────────────────────────────────────────

  it('toggleViewMode updates URL with ?view=list when switching from map', () => {
    const params = new URLSearchParams();
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'map', null, makeUrlSync(params)),
    );

    act(() => result.current.toggleViewMode());

    expect(result.current.viewMode).toBe('list');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).toContain('view=list');
    expect(mockReplace.mock.calls[0][1]).toEqual({ scroll: false });
  });

  it('toggleViewMode updates URL with ?view=map when switching from list', () => {
    const params = new URLSearchParams('view=list');
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'map', null, makeUrlSync(params)),
    );

    act(() => result.current.toggleViewMode());

    expect(result.current.viewMode).toBe('map');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).toContain('view=map');
  });

  // ── Preserves existing query params ─────────────────────────────────────────

  it('preserves existing query params when toggling view', () => {
    const params = new URLSearchParams('q=shawarma&category=food');
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'list', null, makeUrlSync(params, '/providers')),
    );

    act(() => result.current.toggleViewMode());

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).toContain('q=shawarma');
    expect(url).toContain('category=food');
    expect(url).toContain('view=map');
    expect(url.startsWith('/providers?')).toBe(true);
  });

  // ── setViewMode also syncs URL ──────────────────────────────────────────────

  it('setViewMode syncs URL when urlSync is provided', () => {
    const params = new URLSearchParams();
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'map', null, makeUrlSync(params)),
    );

    act(() => result.current.setViewMode('list'));

    expect(result.current.viewMode).toBe('list');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const url = mockReplace.mock.calls[0][0] as string;
    expect(url).toContain('view=list');
  });

  // ── No urlSync = pure state (backward compat) ──────────────────────────────

  it('works as pure state when no urlSync is provided', () => {
    const { result } = renderHook(() =>
      useMapDiscovery(geo, 'map'),
    );

    expect(result.current.viewMode).toBe('map');

    act(() => result.current.toggleViewMode());

    expect(result.current.viewMode).toBe('list');
    // No router call since no urlSync
  });
});
