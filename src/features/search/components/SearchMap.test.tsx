import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { SearchMap } from './SearchMap';
import fs from 'node:fs';
import path from 'node:path';

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
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  const tileLayerInstance = { addTo: vi.fn() };

  return {
    default: {
      map: vi.fn(() => mapInstance),
      tileLayer: vi.fn(() => tileLayerInstance),
      marker: vi.fn(() => markerInstance),
      icon: vi.fn(() => ({})),
      divIcon: vi.fn(() => ({})),
      Marker: { prototype: { options: {} } },
    },
  };
});

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
    expect(mockPush).toHaveBeenCalledWith('/providers/p1');
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
});
