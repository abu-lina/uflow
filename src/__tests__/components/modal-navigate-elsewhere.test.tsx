// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, mockRouterPush } from '../utils/test-utils';
import { ProviderDetailModal } from '@/features/providers/pages/ProviderDetailModal';
import { CommunityServiceDetailModal } from '@/components/community-services/CommunityServiceDetailModal';
import { mockProviders } from '../mocks/providerData';
import type { CommunityService } from '@/services/communityServices';

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

const communityService = {
  community_service_id: 'cs-001',
  community_service_name: 'Zakat Foundation',
  community_service_images: [],
  category: { name_de: 'Soziales', name_en: 'Social' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as unknown as CommunityService;

// #986: onClose may push /food on a direct link, so buttons that navigate elsewhere
// must only push their target, or history gets an extra /food entry.
describe('modal buttons that navigate elsewhere only push the target (#986)', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('preferred-language', 'de');
  });

  it('Barakah effect button in ProviderDetailModal pushes the community service only', () => {
    render(
      <ProviderDetailModal
        initialCommunityServices={[communityService]}
        provider={mockProviders[0]}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Zakat Foundation/ }));

    expect(mockRouterPush).toHaveBeenCalledWith('/community-services/cs-001');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('provider row in CommunityServiceDetailModal pushes the provider only', async () => {
    // test-utils mocks the communityServices module without the supporters fetch; seed the cache.
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ['providers', 'community-service', 'cs-001'],
      [{ provider_id: 'prov-42', provider_name: 'Big Burger House', address_city: 'Stuttgart' }],
    );
    render(
      <QueryClientProvider client={queryClient}>
        <CommunityServiceDetailModal communityService={communityService} onClose={onClose} />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByText('Supporters'));
    fireEvent.click(await screen.findByRole('button', { name: /Big Burger House/ }));

    expect(mockRouterPush).toHaveBeenCalledWith('/p/prov-42');
    expect(onClose).not.toHaveBeenCalled();
  });
});
