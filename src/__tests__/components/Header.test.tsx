// @vitest-environment jsdom
/**
 * Plan 153: Desktop header section tabs
 * Plan 227: Desktop header height CSS variable
 *
 * Tests that the Header renders SectionSelector tabs and clicking a tab
 * navigates to /<section>. Also verifies the ResizeObserver publishes
 * --desktop-header-height on document.documentElement.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('navigates to /food when Food tab is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /food/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/food');
  });
});

describe('Header desktop height CSS variable (Plan 227)', () => {
  let observeCallback: (entries: { borderBoxSize: { blockSize: number }[] }[]) => void;
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock ResizeObserver to capture its callback and trigger it manually
    global.ResizeObserver = vi.fn().mockImplementation((cb) => {
      observeCallback = cb;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--desktop-header-height');
    global.ResizeObserver = originalResizeObserver;
  });

  it('sets --desktop-header-height on document.documentElement when header mounts', () => {
    render(<Header />);

    // Simulate a resize observation with a realistic header height
    observeCallback([{ borderBoxSize: [{ blockSize: 172 }] }]);

    expect(document.documentElement.style.getPropertyValue('--desktop-header-height')).toBe(
      '172px',
    );
  });

  it('updates --desktop-header-height when header resizes', () => {
    render(<Header />);

    observeCallback([{ borderBoxSize: [{ blockSize: 150 }] }]);
    expect(document.documentElement.style.getPropertyValue('--desktop-header-height')).toBe(
      '150px',
    );

    // Simulate a height change (e.g. user logged in, extra row)
    observeCallback([{ borderBoxSize: [{ blockSize: 180 }] }]);
    expect(document.documentElement.style.getPropertyValue('--desktop-header-height')).toBe(
      '180px',
    );
  });
});
