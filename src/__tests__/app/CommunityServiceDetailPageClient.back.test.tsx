// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import type { CommunityServiceDetailPageClient as Client } from '@/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient';

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, push }),
  usePathname: () => '/community-services/cs-1',
  notFound: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: true, // desktop: the modal branch mounts
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: false }) }));
vi.mock('@/hooks/useCommunityServices', () => ({
  useCommunityService: () => ({
    data: { community_service_id: 'cs-1', community_service_name: 'Zakat Foundation' },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/features/admin/components/AdminCommunityServiceDetailButtons', () => ({
  AdminCommunityServiceDetailButtons: () => null,
}));
vi.mock('@/components/community-services/CommunityServiceDetailModal', () => ({
  CommunityServiceDetailModal: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>close</button>
  ),
}));
vi.mock('@/features/providers/pages/ProviderDetailPage', () => ({
  ProviderDetailPage: () => null,
}));
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    let Component: React.ComponentType | null = null;
    const promise = loader().then((mod) => {
      Component = mod.default;
    });
    const DynamicComponent = (props: Record<string, unknown>) => {
      if (!Component) throw promise;
      return <Component {...props} />;
    };
    return DynamicComponent;
  },
}));

let CommunityServiceDetailPageClient: typeof Client;

beforeAll(async () => {
  CommunityServiceDetailPageClient = (
    await import('@/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient')
  ).CommunityServiceDetailPageClient;
});

describe('CommunityServiceDetailPageClient back behaviour (#986)', () => {
  beforeEach(() => {
    back.mockClear();
    push.mockClear();
  });

  it('desktop close on a direct link goes to /food', async () => {
    render(<CommunityServiceDetailPageClient communityServiceId="cs-1" />);

    fireEvent.click(await screen.findByText('close'));

    expect(push).toHaveBeenCalledWith('/food');
    expect(back).not.toHaveBeenCalled();
  });

  it('browser back does not trigger a second router.back()', async () => {
    render(<CommunityServiceDetailPageClient communityServiceId="cs-1" />);
    await screen.findByText('close');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(back).not.toHaveBeenCalled();
  });
});
