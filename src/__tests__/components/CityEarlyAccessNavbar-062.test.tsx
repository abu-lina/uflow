/**
 * Plan 062 — CityEarlyAccessNavbar Component Tests
 *
 * TDD: Tests written BEFORE implementation.
 * The core assertion: CityEarlyAccessNavbar MUST render a Profile/Account entry
 * that redirects unauthenticated users to /login.
 *
 * [pre-fix FAILS] — Profile link does not exist in the component
 * [post-fix PASSES] — Profile link is rendered with correct auth-gated href
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

// Mock useAppStage
const mockUseAppStage = vi.fn();
vi.mock('@/hooks/useAppStage', () => ({
  useAppStage: () => mockUseAppStage(),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock usePathname
let mockPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock feature-flags
vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (flag: string) => {
    if (flag === 'isAppLaunched') return false;
    return false;
  },
}));

// Import the component under test AFTER mocks
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';

describe('Plan 062 — CityEarlyAccessNavbar Profile entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
    mockUseAppStage.mockReturnValue({ stage: 'stage1', isLoading: false });
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });
  });

  // ---------- [post-fix PASSES] — Profile icon rendered ----------

  it('[post-fix PASSES] renders a Profile link for unauthenticated Stage 1 user', () => {
    mockUseAppStage.mockReturnValue({ stage: 'stage1', isLoading: false });
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });

    render(<CityEarlyAccessNavbar />);

    const profileLink = screen.getByRole('link', { name: /profile|account/i });
    expect(profileLink).toBeInTheDocument();
    // Unauthenticated → href should point to /login
    expect(profileLink).toHaveAttribute('href', '/login');
  });

  it('[post-fix PASSES] renders a Profile link for unauthenticated Stage 2 user', () => {
    mockUseAppStage.mockReturnValue({ stage: 'stage2', isLoading: false });
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });

    render(<CityEarlyAccessNavbar />);

    const profileLink = screen.getByRole('link', { name: /profile|account/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/login');
  });

  it('[post-fix PASSES] renders Profile link pointing to /profile for authenticated user', () => {
    mockUseAppStage.mockReturnValue({ stage: 'stage2', isLoading: false });
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@example.com' },
      session: { access_token: 'tok' },
      loading: false,
    });

    render(<CityEarlyAccessNavbar />);

    const profileLink = screen.getByRole('link', { name: /profile|account/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/profile');
  });

  // ---------- Existing nav items remain ----------

  it('still renders Home link', () => {
    render(<CityEarlyAccessNavbar />);
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('still renders Create link', () => {
    render(<CityEarlyAccessNavbar />);
    expect(screen.getByRole('link', { name: /create/i })).toBeInTheDocument();
  });

  it('renders Saved link in Stage 2', () => {
    mockUseAppStage.mockReturnValue({ stage: 'stage2', isLoading: false });
    render(<CityEarlyAccessNavbar />);
    expect(screen.getByRole('link', { name: /saved/i })).toBeInTheDocument();
  });

  // ---------- Active state for Profile ----------

  it('marks Profile as active on /profile path', () => {
    mockPathname = '/profile';
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'test@example.com' },
      session: { access_token: 'tok' },
      loading: false,
    });

    render(<CityEarlyAccessNavbar />);

    const profileLink = screen.getByRole('link', { name: /profile|account/i });
    // Active state has border-primary class
    expect(profileLink.className).toMatch(/border-primary/);
  });

  it('marks Profile as active on /login path for unauthenticated user', () => {
    mockPathname = '/login';
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });

    render(<CityEarlyAccessNavbar />);

    const profileLink = screen.getByRole('link', { name: /profile|account/i });
    expect(profileLink.className).toMatch(/border-primary/);
  });
});
