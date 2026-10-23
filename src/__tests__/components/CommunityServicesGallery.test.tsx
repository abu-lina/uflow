// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { CommunityServicesGallery } from '@/components/shared/CommunityServicesGallery';
import { GEMEINSCHAFT_SPENDEN_CATEGORY_ID } from '@/config/sectionFilters';
import * as searchParams from '@/lib/search-params';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/services/communityServices', () => ({
  getCommunityServices: vi.fn().mockResolvedValue([{ community_service_id: 'cs-1' }]),
}));

vi.mock('@/components/shared/CommunityServiceGallery', () => ({
  default: () => null,
}));

async function clickCard() {
  render(<CommunityServicesGallery />);
  fireEvent.click(await screen.findByRole('button', { name: /Community Services/ }));
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
}

describe('CommunityServicesGallery navigation (#603)', () => {
  beforeEach(() => {
    push.mockClear();
    vi.restoreAllMocks();
  });

  it('produces a UMMAH URL containing category=<GEMEINSCHAFT_SPENDEN_CATEGORY_ID>', async () => {
    await clickCard();
    const url = new URL(push.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/ummah');
    expect(url.searchParams.get('category')).toBe(GEMEINSCHAFT_SPENDEN_CATEGORY_ID);
  });

  it('uses the slug community-support, never gemeinschaft-spenden', async () => {
    const spy = vi.spyOn(searchParams, 'buildResultsUrl');
    await clickCard();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: 'community-support' }),
    );
    expect(push.mock.calls[0][0]).not.toContain('gemeinschaft-spenden');
  });

  it('keeps section, category ID and city/query params unchanged', async () => {
    const spy = vi.spyOn(searchParams, 'buildResultsUrl');
    await clickCard();
    expect(spy).toHaveBeenCalledWith({
      section: 'ummah',
      categorySlug: 'community-support',
      categoryId: GEMEINSCHAFT_SPENDEN_CATEGORY_ID,
    });
  });
});
