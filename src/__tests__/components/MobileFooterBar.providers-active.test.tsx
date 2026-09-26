// @vitest-environment jsdom
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

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
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

  it('marks Explore icon active on /food', () => {
    mocks.pathname = '/food';

    render(<MobileFooterBar />);

    expect(screen.getByTestId('explore-icon')).toHaveTextContent('active');
  });

  it('does not mark Explore icon active on provider detail path', () => {
    mocks.pathname = '/providers/123';

    render(<MobileFooterBar />);

    expect(screen.getByTestId('explore-icon')).toHaveTextContent('inactive');
  });
});

describe('4 tabs fit at mobile widths (255 #415)', () => {
  // The overflow that shipped before was invisible to a source scan: the bar
  // had to actually render and the rendered gap had to be measured against the
  // viewport. jsdom has no layout engine, so the check reads the gap class off
  // the rendered flex row and does the px arithmetic the browser would do:
  //   inner width = viewport - 48 (px-6 on each side)
  //   required    = 4 tabs * 40px + 3 gaps * gapPx
  // Fails if the gap grows without an sm breakpoint guarding it.
  it.each([320, 360, 430])('renders all 4 tabs and the rendered gap fits at %dpx', (width) => {
    render(<MobileFooterBar />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
    // All four aria-labels resolve through t() (S8: the mock returns the key).
    for (const key of [
      'navigation.home',
      'navigation.create',
      'navigation.saved',
      'navigation.profile',
    ]) {
      expect(screen.getByRole('link', { name: key })).toBeInTheDocument();
    }

    // The gap row is the parent of the fixed 40px tab wrappers.
    const tabWrapper = links[0].parentElement;
    const gapRow = tabWrapper?.parentElement;
    expect(gapRow).not.toBeNull();
    const cls = gapRow?.className ?? '';
    const gapMatch = cls.match(/(?:^|\s)gap-(\d+)/);
    const smGapMatch = cls.match(/(?:^|\s)sm:gap-(\d+)/);
    expect(gapMatch, 'rendered row has no base gap class').not.toBeNull();

    const gapPx = parseInt(gapMatch?.[1] ?? '0', 10) * 4;
    const smGapPx = smGapMatch ? parseInt(smGapMatch[1], 10) * 4 : gapPx;
    const effectiveGap = width >= 640 ? smGapPx : gapPx;

    const innerWidth = width - 48;
    const required = 4 * 40 + 3 * effectiveGap;
    expect(
      required,
      `4 tabs at ${effectiveGap}px gaps need ${required}px but only ${innerWidth}px fit at ${width}px`,
    ).toBeLessThanOrEqual(innerWidth);
  });

  it('a too-wide base gap would fail the arithmetic', () => {
    // Sanity for the assertion above: gap-10 (40px) overflows at 320px.
    const innerWidth = 320 - 48;
    expect(4 * 40 + 3 * 40).toBeGreaterThan(innerWidth);
  });
});
