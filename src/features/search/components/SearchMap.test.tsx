import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SearchMap } from './SearchMap';

const mockPush = vi.fn();
const mockMarkerOn = vi.fn();
let capturedClickHandler: (() => void) | undefined;

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

    capturedClickHandler!();
    expect(mockPush).toHaveBeenCalledWith('/providers/p1');
  });
});
