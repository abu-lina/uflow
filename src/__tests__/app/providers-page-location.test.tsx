import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchProvidersAndCommunityServices, mockProvidersContent } = vi.hoisted(() => ({
  mockSearchProvidersAndCommunityServices: vi.fn(),
  mockProvidersContent: vi.fn(() => null),
}));

vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: mockSearchProvidersAndCommunityServices,
}));

vi.mock('@/app/(public)/providers/ProvidersContent', () => ({
  ProvidersContent: mockProvidersContent,
}));

// Plan 228: /providers/page.tsx removed; test now exercises /food/page.tsx
// which delegates to the same renderProvidersPage with routeSection: 'food'.
import FoodPage from '@/app/(public)/food/page';

describe('FoodPage location normalization (Plan 228: migrated from ProvidersPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchProvidersAndCommunityServices.mockResolvedValue({ results: [], hasMore: false });
  });

  it('uses LOCATION_ALL for SSR when no location param is present', async () => {
    await FoodPage({ searchParams: Promise.resolve({}) });

    expect(mockSearchProvidersAndCommunityServices).toHaveBeenCalledWith(
      '',
      null,
      '',
      0,
      12,
      undefined,
      'food',
      undefined,
    );
  });

  it('uses LOCATION_ALL for SSR when location param is explicitly empty', async () => {
    await FoodPage({ searchParams: Promise.resolve({ location: '' }) });

    expect(mockSearchProvidersAndCommunityServices).toHaveBeenCalledWith(
      '',
      null,
      '',
      0,
      12,
      undefined,
      'food',
      undefined,
    );
  });

  it('normalizes legacy Everywhere labels to LOCATION_ALL for SSR', async () => {
    await FoodPage({ searchParams: Promise.resolve({ location: 'Everywhere' }) });

    expect(mockSearchProvidersAndCommunityServices).toHaveBeenCalledWith(
      '',
      null,
      '',
      0,
      12,
      undefined,
      'food',
      undefined,
    );
  });

  it('preserves real city filters for SSR', async () => {
    await FoodPage({ searchParams: Promise.resolve({ location: 'Berlin', q: 'halal' }) });

    expect(mockSearchProvidersAndCommunityServices).toHaveBeenCalledWith(
      'halal',
      null,
      'Berlin',
      0,
      12,
      undefined,
      'food',
      undefined,
    );
  });

  it('passes validated filters to SSR search request', async () => {
    await FoodPage({ searchParams: Promise.resolve({ q: 'pizza', filters: 'muslim,parken' }) });

    expect(mockSearchProvidersAndCommunityServices).toHaveBeenCalledWith(
      'pizza',
      null,
      '',
      0,
      12,
      undefined,
      'food',
      ['muslim', 'parken'],
    );
  });
});
