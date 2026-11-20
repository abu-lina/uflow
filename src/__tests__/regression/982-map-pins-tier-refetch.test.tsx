// @vitest-environment jsdom
/**
 * #982: changing the tier refetches the map pins, and a slower response for
 * the previous tier never overwrites the pins for the current one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { RawLocationRow } from '@/services/providers';
import type { HalalTier } from '@/features/search/discoveryQuery';

const { mockGetMapLocations } = vi.hoisted(() => ({
  mockGetMapLocations: vi.fn<(opts: { tier?: string }) => Promise<RawLocationRow[]>>(),
}));

vi.mock('@/services/providers', () => ({ getMapLocations: mockGetMapLocations }));

import { useMapDiscovery } from '@/features/search/hooks/useMapDiscovery';

const geo = { status: 'idle', coords: null };

function row(id: string): RawLocationRow {
  return {
    provider_id: id,
    location_latitude: 48.78,
    location_longitude: 9.18,
    providers: { provider_name: id },
  };
}

function renderWithTier(tier: HalalTier | undefined) {
  return renderHook(
    ({ tier }: { tier: HalalTier | undefined }) =>
      useMapDiscovery(geo, 'map', null, undefined, { section: 'food', tier }),
    { initialProps: { tier } },
  );
}

beforeEach(() => {
  mockGetMapLocations.mockReset();
});

describe('#982: map pins follow the tier', () => {
  it('refetches pins with the new tier when the tier changes', async () => {
    mockGetMapLocations.mockResolvedValue([]);
    const { rerender } = renderWithTier(undefined);
    await waitFor(() => expect(mockGetMapLocations).toHaveBeenCalledTimes(1));

    rerender({ tier: 'gold' });

    await waitFor(() =>
      expect(mockGetMapLocations).toHaveBeenLastCalledWith(
        expect.objectContaining({ section: 'food', tier: 'gold' }),
      ),
    );
    expect(mockGetMapLocations).toHaveBeenCalledTimes(2);
  });

  it('keeps the gold pins when the earlier all-tier response arrives last', async () => {
    let resolveAll: (rows: RawLocationRow[]) => void = () => {};
    mockGetMapLocations
      .mockImplementationOnce(() => new Promise((resolve) => (resolveAll = resolve)))
      .mockResolvedValueOnce([row('gold')]);

    const { result, rerender } = renderWithTier(undefined);
    rerender({ tier: 'gold' });
    await waitFor(() => expect(result.current.pins.map((p) => p.providerId)).toEqual(['gold']));

    resolveAll([row('gold'), row('not-gold')]);
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.pins.map((p) => p.providerId)).toEqual(['gold']);
  });
});
