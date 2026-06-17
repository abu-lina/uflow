/**
 * Plan 153: Desktop header section tabs
 *
 * Tests that the Header renders SectionSelector tabs and clicking a tab
 * navigates to /<section>?section=<section>.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render, mockRouterPush } from '../utils/test-utils';
import { Header } from '@/components/layout/Header';

describe('Header Section Tabs (Plan 153)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SectionSelector with three tabs', () => {
    render(<Header />);
    expect(screen.getByRole('tab', { name: /food/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ummah/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /stores/i })).toBeInTheDocument();
  });

  it('does not navigate when Ummah tab (inactive) is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /ummah/i }));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not navigate when Stores tab (inactive) is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /stores/i }));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('navigates to /food?section=food when Food tab is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /food/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/food?section=food');
  });
});
