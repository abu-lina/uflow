// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidElement, type ReactElement } from 'react';

const state = vi.hoisted(() => ({
  provider: null as { review_status: string } | null,
  canView: true,
  canViewCalls: 0,
}));

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof import('react')>()),
  cache: <T,>(fn: T) => fn,
}));
vi.mock('@/services/providers', () => ({
  getProviderById: () => Promise.resolve(state.provider),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseCallerClient: () => Promise.resolve({}),
}));
vi.mock('@/services/communityServices', () => ({
  getCommunityServicesForProvider: () => Promise.resolve([]),
}));
vi.mock('@/features/admin/services/provider-screenings.server', () => ({
  canViewScreenings: () => {
    state.canViewCalls += 1;
    return Promise.resolve(state.canView);
  },
  getProviderScreenings: vi.fn(),
}));
vi.mock('./ProviderDetailPageClient', () => ({ ProviderDetailPageClient: () => null }));

import ProviderDetailPage from './page';

async function render(): Promise<{ screeningSlot?: unknown }> {
  const el = (await ProviderDetailPage({ params: Promise.resolve({ id: 'p1' }) })) as ReactElement<{
    screeningSlot?: unknown;
  }>;
  expect(isValidElement(el)).toBe(true);
  return el.props;
}

describe('/p/[id] screening panel mounting (#766)', () => {
  beforeEach(() => {
    state.provider = { review_status: 'pending' };
    state.canView = true;
    state.canViewCalls = 0;
  });

  it.each(['approved', 'rejected', 'needs_revision', 'removed_by_owner'])(
    'a %s provider gets no screening panel and no role or screenings lookup',
    async (review_status) => {
      state.provider = { review_status };
      const props = await render();
      expect(props.screeningSlot).toBeUndefined();
      expect(state.canViewCalls).toBe(0);
    },
  );

  it('a pending provider viewed by a non-admin gets no panel and no skeleton', async () => {
    state.canView = false;
    const props = await render();
    expect(props.screeningSlot).toBeUndefined();
  });

  it('a pending provider viewed by an admin gets the panel slot', async () => {
    const props = await render();
    expect(props.screeningSlot).toBeDefined();
    expect(state.canViewCalls).toBe(1);
  });
});
