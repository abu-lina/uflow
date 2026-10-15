// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SearchMap } from './SearchMap';
import fs from 'node:fs';
import path from 'node:path';
import { logApp } from '@/lib/logger';

const mockPush = vi.fn();
let capturedClickHandler: (() => void) | undefined;

const mapRoot = path.resolve(__dirname, '../../../..');

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => ({
          not: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [
                  {
                    provider_id: 'p1',
                    location_latitude: 52.52,
                    location_longitude: 13.405,
                    providers: {
                      provider_name: 'Test Restaurant',
                    },
                  },
                ],
                error: null,
              })),
            })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('leaflet', () => {
  const markerInstance = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'click') capturedClickHandler = handler;
      return markerInstance;
    }),
  };
  const mapInstance = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  const tileLayerInstance = { addTo: vi.fn() };

  return {
    default: {
      map: vi.fn(() => mapInstance),
      latLngBounds: vi.fn((points: unknown) => ({ points })),
      tileLayer: vi.fn(() => tileLayerInstance),
      marker: vi.fn(() => markerInstance),
      icon: vi.fn(() => ({})),
      divIcon: vi.fn(() => ({})),
      Marker: { prototype: { options: {} } },
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logApp: vi.fn(),
}));

describe('SearchMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedClickHandler = undefined;
  });

  it('renders map container after data loads', async () => {
    const { container } = render(<SearchMap pins={[]} />);

    await waitFor(() => {
      expect(container.querySelector('.overflow-hidden')).toBeInTheDocument();
    });
  });

  it('navigates to provider detail on marker click', async () => {
    const pins = [{ providerId: 'p1', providerName: 'Test Restaurant', lat: 52.52, lng: 13.405 }];
    render(<SearchMap pins={pins} />);

    await waitFor(() => {
      expect(capturedClickHandler).toBeDefined();
    });

    expect(capturedClickHandler).toBeDefined();
    if (!capturedClickHandler) {
      throw new Error('expected capturedClickHandler to be defined');
    }
    capturedClickHandler();
    expect(mockPush).toHaveBeenCalledWith('/p/p1');
  });

  it('[pre-fix FAILS / post-fix PASSES] pans map when userCoords is provided', async () => {
    const pins: never[] = [];
    render(<SearchMap pins={pins} userCoords={{ lat: 52.52, lon: 13.405 }} />);

    const leaflet = await import('leaflet');
    const mapFn = vi.mocked(leaflet.default.map);
    const mapInstance = mapFn.mock.results[0]?.value;

    await waitFor(() => {
      expect(mapInstance.setView).toHaveBeenCalledWith([52.52, 13.405], 14);
    });
  });

  it('[pre-fix FAILS / post-fix PASSES] does not call setView again when rerendered with unchanged coords', async () => {
    const pins: never[] = [];
    const { rerender } = render(<SearchMap pins={pins} userCoords={{ lat: 52.52, lon: 13.405 }} />);

    const leaflet = await import('leaflet');
    const mapFn = vi.mocked(leaflet.default.map);
    const mapInstance = mapFn.mock.results[0]?.value;

    await waitFor(() => {
      expect(mapInstance.setView).toHaveBeenCalledWith([52.52, 13.405], 14);
    });

    rerender(<SearchMap pins={pins} userCoords={{ lat: 52.52, lon: 13.405 }} />);

    // One init setView + one near-me setView; unchanged rerender must not add another call.
    expect(mapInstance.setView).toHaveBeenCalledTimes(2);
  });

  it('[pre-fix FAILS / post-fix PASSES] SearchMap source does not call getCurrentPosition', () => {
    const source = fs.readFileSync(path.join(mapRoot, 'src/features/search/components/SearchMap.tsx'), 'utf8');
    expect(source).not.toContain('getCurrentPosition');
  });

  it('[pre-fix FAILS / post-fix PASSES] logs setView executed when userCoords is provided and map is initialized', async () => {
    const pins: never[] = [];
    render(<SearchMap pins={pins} userCoords={{ lat: 52.52, lon: 13.405 }} />);

    await waitFor(() => {
      expect(logApp).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({
          event: 'searchmap_setview_executed',
          lat: 52.52,
          lon: 13.405,
          zoom: 14,
        }),
      );
    });
  });

  it('[pre-fix FAILS / post-fix PASSES] logs setView skipped when mapRef is null', async () => {
    const L = await import('leaflet');
    const mapFn = vi.mocked(L.default.map);
    mapFn.mockReturnValueOnce(null as never);

    const pins: never[] = [];
    render(<SearchMap pins={pins} userCoords={{ lat: 52.52, lon: 13.405 }} />);

    await waitFor(() => {
      expect(logApp).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({
          event: 'searchmap_setview_skipped',
          lat: 52.52,
          lon: 13.405,
          zoom: 14,
          reason: 'mapRef null',
        }),
      );
    });
  });
});

describe('#674 SearchMap zooms to the focused city', () => {
  const pins = [
    { providerId: 'p1', providerName: 'A', lat: 53.55, lng: 9.99 },
    { providerId: 'p2', providerName: 'B', lat: 53.6, lng: 10.05 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  async function mapInstance() {
    const L = await import('leaflet');
    return vi.mocked(L.default.map).mock.results[0]?.value as {
      setView: ReturnType<typeof vi.fn>;
      fitBounds: ReturnType<typeof vi.fn>;
    };
  }

  it('centers the map on the city center at city zoom when the city has coordinates', async () => {
    render(
      <SearchMap focus={{ key: 'Hamburg', center: { lat: 53.55, lng: 10.0 } }} pins={pins} />,
    );

    const map = await mapInstance();
    await waitFor(() => expect(map.setView).toHaveBeenCalledWith([53.55, 10.0], 12));
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it('fits the map to the city pins when the city has no coordinates', async () => {
    render(<SearchMap focus={{ key: 'Hamburg', center: null }} pins={pins} />);

    const map = await mapInstance();
    await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
    expect(map.fitBounds.mock.calls[0]?.[0]).toEqual({
      points: [
        [53.55, 9.99],
        [53.6, 10.05],
      ],
    });
  });

  it('focuses once per city, so later pin updates do not undo the user panning', async () => {
    const { rerender } = render(
      <SearchMap focus={{ key: 'Hamburg', center: { lat: 53.55, lng: 10.0 } }} pins={pins} />,
    );
    rerender(
      <SearchMap
        focus={{ key: 'Hamburg', center: { lat: 53.55, lng: 10.0 } }}
        pins={[...pins]}
      />,
    );

    const map = await mapInstance();
    const cityCalls = map.setView.mock.calls.filter(([, zoom]) => zoom === 12);
    expect(cityCalls).toHaveLength(1);
  });

  it('keeps the saved or default view when no city is focused', async () => {
    render(<SearchMap pins={pins} />);

    const map = await mapInstance();
    await waitFor(() => expect(map.setView).toHaveBeenCalledWith([51.1657, 10.4515], 6));
    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});
