import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/components/ui/icons/ExploreIcon', () => ({
  ExploreIcon: ({ isActive }: { isActive?: boolean }) => (
    <span data-testid="explore-icon">{isActive ? 'active' : 'inactive'}</span>
  ),
}));

vi.mock('@/components/ui/icons/CreateIcon', () => ({
  CreateIcon: () => <span data-testid="create-icon">create</span>,
}));

vi.mock('@/components/ui/icons/SavedIcon', () => ({
  SavedIcon: () => <span data-testid="saved-icon">saved</span>,
}));

vi.mock('@/components/ui/icons/ProfileIcon', () => ({
  ProfileIcon: () => <span data-testid="profile-icon">profile</span>,
}));

import { MobileFooterBar } from '@/components/common/MobileFooterBar';

describe('MobileFooterBar providers active state (Plan 109)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
  });

  it('marks Explore icon active on /providers', () => {
    mocks.pathname = '/providers';

    render(<MobileFooterBar />);

    expect(screen.getByTestId('explore-icon')).toHaveTextContent('active');
  });

  it('does not mark Explore icon active on provider detail path', () => {
    mocks.pathname = '/providers/123';

    render(<MobileFooterBar />);

    expect(screen.getByTestId('explore-icon')).toHaveTextContent('inactive');
  });
});
