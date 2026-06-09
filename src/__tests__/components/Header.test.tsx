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

  it('navigates to /ummah?section=ummah when Ummah tab is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /ummah/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/ummah?section=ummah');
  });

  it('navigates to /stores?section=store when Stores tab is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /stores/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/stores?section=store');
  });

  it('navigates to /food?section=food when Food tab is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /food/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/food?section=food');
  });
});
