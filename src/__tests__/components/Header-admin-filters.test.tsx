// @vitest-environment jsdom
/**
 * Plan 235: Desktop admin status filters
 *
 * Verifies that the desktop Header renders AdminStatusFilter tabs
 * for admin users and hides them for non-admin users.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { Header } from '@/components/layout/Header';

// Default: non-admin user
const mockUseIsAdmin = vi.fn(() => ({ isAdmin: false, isLoading: false }));
vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockUseIsAdmin(),
}));

describe('Header admin status filters (Plan 235)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsAdmin.mockReturnValue({ isAdmin: false, isLoading: false });
  });

  it('does NOT render admin status filter tabs for non-admin users', () => {
    render(<Header />);

    // AdminStatusFilter renders role="tablist" with aria-label containing "status"
    expect(screen.queryByRole('tablist', { name: /status/i })).not.toBeInTheDocument();
    // None of the status tabs should appear
    expect(screen.queryByRole('tab', { name: /approved/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /pending/i })).not.toBeInTheDocument();
  });

  it('renders admin status filter tabs when user is admin', () => {
    mockUseIsAdmin.mockReturnValue({ isAdmin: true, isLoading: false });
    render(<Header />);

    // The AdminStatusFilter tablist should be present
    expect(screen.getByRole('tablist', { name: /status/i })).toBeInTheDocument();
    // Individual status tabs
    expect(screen.getByRole('tab', { name: /approved/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /rejected/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /needs.*revision/i })).toBeInTheDocument();
  });
});
