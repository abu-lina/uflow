import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for Plan 082 M8: Profile provider Server Components must use
 * providers.server (cookie-based Supabase) not providers (anonymous Supabase client).
 * Session context is required to pass RLS for non-approved provider visibility.
 */

const mockServerGetProviderById = vi.fn();
const mockClientGetProviderById = vi.fn();

vi.mock('@/services/providers.server', () => ({
  getProviderById: (...args: unknown[]) => mockServerGetProviderById(...args),
}));

vi.mock('@/services/providers', () => ({
  getProviderById: (...args: unknown[]) => mockClientGetProviderById(...args),
}));

// Mock all components consumed by the profile pages (Server Components don't render in test env)
vi.mock('@/components/providers/ProviderDetailPage', () => ({
  ProviderDetailPage: () => null,
}));
vi.mock('@/components/providers/ProfileProviderDetailButtons', () => ({
  ProfileProviderDetailButtons: () => null,
}));
vi.mock('@/components/providers/ProviderEditPage', () => ({
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

describe('Profile provider detail page (M8 regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerGetProviderById.mockResolvedValue(fakeProvider);
    mockClientGetProviderById.mockResolvedValue(fakeProvider);
  });

  it('[post-fix PASSES] uses providers.server module (not client module)', async () => {
    const mod = await import(
      '@/app/(public)/profile/providers/[provider_id]/page'
    );

    await mod.default({ params: Promise.resolve({ provider_id: 'prov-1' }) });

    expect(mockServerGetProviderById).toHaveBeenCalledWith('prov-1');
    expect(mockClientGetProviderById).not.toHaveBeenCalled();
  });
});

describe('Profile provider edit page (M8 regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockServerGetProviderById.mockResolvedValue(fakeProvider);
    mockClientGetProviderById.mockResolvedValue(fakeProvider);
  });

  it('[post-fix PASSES] uses providers.server module (not client module)', async () => {
    const mod = await import(
      '@/app/(public)/profile/providers/[provider_id]/edit/page'
    );

    await mod.default({ params: Promise.resolve({ provider_id: 'prov-1' }) });

    expect(mockServerGetProviderById).toHaveBeenCalledWith('prov-1');
    expect(mockClientGetProviderById).not.toHaveBeenCalled();
  });
});
