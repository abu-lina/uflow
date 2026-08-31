import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for Plan 082 M8 (updated for unified providers module):
 * Profile provider Server Components must pass a server Supabase client
 * to getProviderById so that cookie-based auth context is used.
 * This verifies the injected client pattern works correctly.
 */

const mockGetProviderById = vi.fn();
const mockServerClient = { _tag: 'server-client' };

vi.mock('@/services/providers', () => ({
  getProviderById: (...args: unknown[]) => mockGetProviderById(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => mockServerClient,
}));

// Mock all components consumed by the profile pages (Server Components don't render in test env)
vi.mock('@/features/providers/pages/ProviderDetailPage', () => ({
  ProviderDetailPage: () => null,
}));
vi.mock('@/features/providers/pages/ProfileProviderDetailButtons', () => ({
  ProfileProviderDetailButtons: () => null,
}));
vi.mock('@/features/providers/pages/ProviderEditPage', () => ({
  ProviderEditPage: () => null,
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

const fakeProvider = {
  provider_id: 'prov-1',
  provider_name: 'Test Provider',
  review_status: 'pending',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('Profile provider detail page (M8 regression, unified module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetProviderById.mockResolvedValue(fakeProvider);
  });

  it('passes server client to getProviderById', async () => {
    const mod = await import(
      '@/app/(public)/profile/providers/[provider_id]/page'
    );

    await mod.default({ params: Promise.resolve({ provider_id: 'prov-1' }) });

    expect(mockGetProviderById).toHaveBeenCalledWith('prov-1', mockServerClient);
  });
});

describe('Profile provider edit page (M8 regression, unified module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetProviderById.mockResolvedValue(fakeProvider);
  });

  it('passes server client to getProviderById', async () => {
    const mod = await import(
      '@/app/(public)/profile/providers/[provider_id]/edit/page'
    );

    await mod.default({ params: Promise.resolve({ provider_id: 'prov-1' }) });

    expect(mockGetProviderById).toHaveBeenCalledWith('prov-1', mockServerClient);
  });
});
