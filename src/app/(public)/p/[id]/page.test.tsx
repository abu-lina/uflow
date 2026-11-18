// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidElement, type ReactElement } from 'react';

const state = vi.hoisted(() => ({
  provider: null as Record<string, unknown> | null,
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

import ProviderDetailPage, { generateMetadata } from './page';

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

function meta() {
  return generateMetadata({ params: Promise.resolve({ id: 'p1' }) });
}

describe('/p/[id] generateMetadata (#949)', () => {
  beforeEach(() => {
    state.provider = null;
    state.canView = false;
    state.canViewCalls = 0;
  });

  it('approved provider title contains provider name and city', async () => {
    state.provider = {
      provider_name: 'Halal Meats',
      address_city: 'Berlin',
      review_status: 'approved',
      provider_images: null,
      description: 'Fresh halal meat',
    };
    const m = await meta();
    expect(m.title).toContain('Halal Meats');
    expect(m.title).toContain('Berlin');
  });

  it('approved provider canonical is its own URL, not site root', async () => {
    state.provider = {
      provider_name: 'Halal Meats',
      address_city: 'Berlin',
      review_status: 'approved',
      provider_images: null,
    };
    const m = await meta();
    const canonical =
      typeof m.alternates?.canonical === 'string'
        ? m.alternates.canonical
        : ((m.alternates?.canonical as { url: string })?.url ?? m.alternates?.canonical);
    expect(canonical).toContain('/p/p1');
    expect(canonical).not.toBe('/');
  });

  it('approved provider og:title, og:description, og:url describe the provider', async () => {
    state.provider = {
      provider_name: 'Halal Meats',
      address_city: 'Berlin',
      review_status: 'approved',
      provider_images: null,
      description: 'Fresh halal meat in Berlin',
    };
    const m = await meta();
    expect(m.openGraph).toBeDefined();
    const og = m.openGraph as NonNullable<typeof m.openGraph>;
    expect(og.title).toContain('Halal Meats');
    expect(og.description).toContain('Fresh halal meat');
    expect(og.url).toContain('/p/p1');
  });

  it('approved provider with images uses first image as og:image', async () => {
    state.provider = {
      provider_name: 'Halal Meats',
      address_city: 'Berlin',
      review_status: 'approved',
      provider_images: JSON.stringify({ urls: ['https://example.supabase.co/img.jpg'] }),
      description: null,
    };
    const m = await meta();
    expect(m.openGraph).toBeDefined();
    const og = m.openGraph as NonNullable<typeof m.openGraph>;
    const images = Array.isArray(og.images) ? og.images : [og.images];
    const firstUrl =
      typeof images[0] === 'string' ? images[0] : (images[0] as { url: string })?.url;
    expect(firstUrl).toBe('https://example.supabase.co/img.jpg');
  });

  it('approved provider without images uses default icon as og:image', async () => {
    state.provider = {
      provider_name: 'Halal Meats',
      address_city: 'Berlin',
      review_status: 'approved',
      provider_images: null,
      description: null,
    };
    const m = await meta();
    expect(m.openGraph).toBeDefined();
    const og = m.openGraph as NonNullable<typeof m.openGraph>;
    const images = Array.isArray(og.images) ? og.images : [og.images];
    const firstUrl =
      typeof images[0] === 'string' ? images[0] : (images[0] as { url: string })?.url;
    expect(firstUrl).toContain('icon-512x512.png');
  });

  it('unknown provider still sends noindex, nofollow', async () => {
    state.provider = null;
    const m = await meta();
    expect(m.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
  });

  it('non-approved provider still sends noindex, nofollow', async () => {
    state.provider = { review_status: 'pending', provider_name: 'Test' };
    const m = await meta();
    expect(m.robots).toEqual(expect.objectContaining({ index: false, follow: false }));
  });
});
